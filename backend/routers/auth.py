"""
Authentication Router
=====================
Handles login and authentication endpoints.

Learning Notes:
- APIRouter groups related endpoints
- Responses model defines response schemas for docs
- HTTPException provides HTTP error responses
- Dependencies can be applied to entire routers or individual routes
"""

from fastapi import APIRouter, HTTPException, status
from backend.models.auth import LoginRequest, LoginResponse
from backend.auth import create_access_token
from backend.config import settings


# Create router with prefix and tags
# prefix: all routes will be under /auth
# tags: groups endpoints in Swagger UI documentation
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    responses={
        401: {"description": "Unauthorized - Invalid credentials"}
    }
)


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with password",
    description="""
    Authenticate with admin password and receive a JWT access token.
    
    The token should be included in subsequent requests as:
    `Authorization: Bearer <token>`
    
    Token expires after 24 hours by default.
    """,
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "message": "Login successful"
                    }
                }
            }
        },
        401: {
            "description": "Invalid password",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid password"}
                }
            }
        }
    }
)
async def login(login_data: LoginRequest):
    """
    Login Endpoint
    
    Validates password and returns JWT token.
    
    Flow:
    1. Client sends password
    2. Server validates against ADMIN_PASSWORD
    3. If valid, create JWT token
    4. Return token to client
    5. Client stores token (usually in localStorage)
    6. Client includes token in Authorization header for protected routes
    
    Why JWT instead of sessions?
    - Stateless: No server-side session storage needed
    - Scalable: Works across multiple servers
    - Mobile-friendly: No cookies needed
    - Self-contained: Token includes all needed info
    """
    
    # Validate password against configured admin password
    if login_data.password != settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Password is correct - create JWT token
    # We encode minimal data in the token
    access_token = create_access_token(
        data={"authenticated": True}
    )
    
    # Return token to client
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        message="Login successful"
    )


@router.post(
    "/logout",
    summary="Logout (client-side only)",
    description="""
    Logout endpoint for compatibility with frontend.
    
    Note: With JWT authentication, logout is primarily client-side
    (remove token from storage). The server doesn't track sessions.
    
    For production, consider implementing token blacklisting or
    using short-lived tokens with refresh tokens.
    """,
    responses={
        200: {
            "description": "Logout successful",
            "content": {
                "application/json": {
                    "example": {"message": "Logged out successfully"}
                }
            }
        }
    }
)
async def logout():
    """
    Logout Endpoint
    
    With JWT, logout is mainly client-side:
    - Client removes token from localStorage/memory
    - Token becomes invalid when it expires
    
    This endpoint exists for:
    - Frontend compatibility
    - Future enhancements (token blacklisting)
    - API completeness
    
    In production, you might:
    - Add token to blacklist/revocation list
    - Clear any server-side user data
    - Log the logout event
    """
    return {"message": "Logged out successfully"}

