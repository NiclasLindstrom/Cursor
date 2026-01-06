"""
Authentication Module
=====================
Handles JWT token creation and validation.

Learning Notes:
- JWT (JSON Web Token) is a stateless authentication method
- Tokens contain encoded data (payload) signed with a secret key
- No database lookups needed to verify tokens (unlike sessions)
- Tokens have expiration times for security
- Dependencies in FastAPI can enforce authentication on routes
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.config import settings
from backend.models.auth import TokenData


# HTTPBearer is a FastAPI security scheme
# It extracts the token from the Authorization header: "Bearer <token>"
security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT Access Token
    
    Generates a signed JWT token with an expiration time.
    
    Args:
        data: Dictionary of data to encode in the token (payload)
        expires_delta: How long until token expires (default: 24 hours)
    
    Returns:
        Encoded JWT token string
    
    How JWT works:
    1. Take payload data (e.g., {"authenticated": True})
    2. Add expiration time
    3. Sign with secret key using HS256 algorithm
    4. Encode to base64 string
    
    The token has three parts separated by dots:
    - Header: Algorithm and token type
    - Payload: Our data (visible but tamper-proof)
    - Signature: Proves token hasn't been modified
    """
    # Copy data to avoid modifying original
    to_encode = data.copy()
    
    # Calculate expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default: 24 hours from now
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    
    # Add expiration to payload
    to_encode.update({"exp": expire})
    
    # Create and sign the token
    encoded_jwt = jwt.encode(
        to_encode,  # Payload data
        settings.secret_key,  # Secret key for signing
        algorithm=settings.jwt_algorithm  # HS256
    )
    
    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """
    Verify and Decode JWT Token
    
    Validates the token signature and extracts the payload.
    
    Args:
        token: JWT token string
    
    Returns:
        TokenData object with decoded information
    
    Raises:
        HTTPException: If token is invalid or expired
    
    Security checks:
    1. Signature verification (prevents tampering)
    2. Expiration check (prevents token reuse)
    3. Payload validation (ensures required fields exist)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode and verify token
        # This will raise JWTError if:
        # - Signature is invalid (token was tampered with)
        # - Token is expired
        # - Token format is invalid
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        
        # Extract authenticated status from payload
        authenticated: bool = payload.get("authenticated")
        
        if authenticated is None:
            raise credentials_exception
        
        # Create and return TokenData
        token_data = TokenData(authenticated=authenticated)
        return token_data
        
    except JWTError:
        # JWT validation failed
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """
    FastAPI Dependency: Get Current Authenticated User
    
    This dependency:
    1. Extracts the token from Authorization header
    2. Verifies the token is valid
    3. Returns the decoded token data
    
    Usage in routes:
        @router.get("/protected")
        async def protected_route(user: TokenData = Depends(get_current_user)):
            # This route requires authentication
            # If token is invalid, FastAPI returns 401 automatically
            return {"message": "You are authenticated!"}
    
    How it works:
    - HTTPBearer extracts "Bearer <token>" from header
    - We verify the token
    - If valid, return user data
    - If invalid, raise 401 Unauthorized
    
    Why use a dependency?
    - DRY: Define authentication once, use everywhere
    - Automatic: FastAPI handles the dependency injection
    - Testable: Easy to mock for testing
    - Documented: Swagger UI knows this route needs auth
    """
    # credentials.credentials contains the token (without "Bearer " prefix)
    token = credentials.credentials
    
    # Verify and decode the token
    token_data = verify_token(token)
    
    # Check if user is authenticated
    if not token_data.authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    return token_data


# Optional dependency for routes that work with or without auth
async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[TokenData]:
    """
    Optional Authentication Dependency
    
    Similar to get_current_user but doesn't require authentication.
    Returns None if no token provided, TokenData if valid token provided.
    
    Useful for routes that have different behavior for authenticated users
    but are also accessible to anonymous users.
    """
    if credentials is None:
        return None
    
    try:
        return verify_token(credentials.credentials)
    except HTTPException:
        return None

