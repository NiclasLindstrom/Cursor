"""
Authentication Models
=====================
Pydantic models for authentication-related requests and responses.

Learning Notes:
- Pydantic models provide automatic validation
- Field(...) allows adding descriptions and validation rules
- Separate Request/Response models is a best practice
- Models automatically generate JSON schema for API docs
"""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """
    Login Request Model
    
    Defines what data is required for login.
    Pydantic will automatically validate incoming requests.
    """
    password: str = Field(
        ...,  # ... means required (no default value)
        min_length=1,
        description="Admin password for authentication",
        example="admin123"
    )
    
    class Config:
        """
        Model Configuration
        
        json_schema_extra: Provides example data for API documentation
        """
        json_schema_extra = {
            "example": {
                "password": "admin123"
            }
        }


class LoginResponse(BaseModel):
    """
    Login Response Model
    
    Defines the structure of the successful login response.
    Returns a JWT access token that the client will use for subsequent requests.
    """
    access_token: str = Field(
        ...,
        description="JWT access token for authentication"
    )
    token_type: str = Field(
        default="bearer",
        description="Type of token (always 'bearer' for JWT)"
    )
    message: str = Field(
        default="Login successful",
        description="Success message"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "message": "Login successful"
            }
        }


class TokenData(BaseModel):
    """
    Token Data Model
    
    Represents the decoded JWT payload.
    Used internally to validate and extract information from tokens.
    """
    authenticated: bool = Field(
        ...,
        description="Whether the user is authenticated"
    )

