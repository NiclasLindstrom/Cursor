"""
Article Models
==============
Pydantic models for article-related operations.

Learning Notes:
- Base model contains common fields
- Separate models for Create/Update/Response is best practice
- Optional fields use Optional[type] or type | None (Python 3.10+)
- Validation rules ensure data integrity
- ConfigDict replaces old Config class in Pydantic v2
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class ArticleBase(BaseModel):
    """
    Base Article Model
    
    Contains fields common to all article operations.
    Other models inherit from this to avoid duplication.
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Article name",
        example="Example Product"
    )
    description: Optional[str] = Field(
        None,
        description="Optional article description",
        example="This is a sample product"
    )
    quantity: int = Field(
        default=0,
        ge=0,  # ge = greater than or equal to
        description="Current quantity in stock",
        example=10
    )
    price: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Price per unit",
        example=99.99
    )


class ArticleCreate(ArticleBase):
    """
    Article Creation Model
    
    Used when creating a new article.
    Requires EAN code in addition to base fields.
    """
    ean_code: str = Field(
        ...,
        min_length=1,
        max_length=13,
        description="EAN barcode (unique identifier)",
        example="7350123456789"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ean_code": "7350123456789",
                "name": "Example Product",
                "description": "A sample product",
                "quantity": 10,
                "price": 99.99
            }
        }
    )


class ArticleUpdate(BaseModel):
    """
    Article Update Model
    
    Used when updating an existing article.
    All fields are optional - only provided fields will be updated.
    This is called a "partial update" or "PATCH" pattern.
    """
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Updated article name"
    )
    description: Optional[str] = Field(
        None,
        description="Updated description"
    )
    quantity: Optional[int] = Field(
        None,
        ge=0,
        description="Updated quantity"
    )
    price: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Updated price"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Updated Product Name",
                "quantity": 15
            }
        }
    )


class ArticleResponse(ArticleBase):
    """
    Article Response Model
    
    Used when returning article data to the client.
    Includes all fields including database-generated ones.
    """
    id: int = Field(
        ...,
        description="Database ID (auto-generated)"
    )
    ean_code: str = Field(
        ...,
        description="EAN barcode"
    )
    created_at: datetime = Field(
        ...,
        description="Creation timestamp"
    )
    updated_at: datetime = Field(
        ...,
        description="Last update timestamp"
    )
    
    model_config = ConfigDict(
        # from_attributes allows creating model from ORM objects or dict with attribute access
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "ean_code": "7350123456789",
                "name": "Example Product",
                "description": "A sample product",
                "quantity": 10,
                "price": 99.99,
                "created_at": "2024-01-01T12:00:00",
                "updated_at": "2024-01-01T12:00:00"
            }
        }
    )

