"""
Articles Router
===============
Handles CRUD operations for inventory articles.

Learning Notes:
- Path parameters: {ean_code} in URL
- Query parameters: ?search=value
- Request body: Pydantic model automatically validated
- Response model: Automatic serialization and docs
- Depends(): Dependency injection for auth and database
- async/await: Non-blocking database operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import aiomysql
from backend.models.article import ArticleCreate, ArticleUpdate, ArticleResponse
from backend.auth import get_current_user
from backend.models.auth import TokenData
from backend.database import get_db


# Create router with authentication dependency
# dependencies=[Depends(get_current_user)]: All routes require authentication
router = APIRouter(
    prefix="/articles",
    tags=["Articles"],
    dependencies=[Depends(get_current_user)],  # Protect all routes
    responses={
        401: {"description": "Unauthorized - Authentication required"}
    }
)


@router.get(
    "",
    response_model=List[ArticleResponse],
    summary="Get all articles",
    description="Retrieve all articles, optionally filtered by search term"
)
async def get_articles(
    search: Optional[str] = Query(
        None,
        description="Search term to filter by EAN code, name, or description"
    ),
    db: aiomysql.Connection = Depends(get_db)
):
    """
    Get Articles
    
    Retrieves all articles from the database.
    Optionally filters by search term.
    
    Async Pattern:
    1. await db.cursor(): Get cursor (async operation)
    2. await cursor.execute(): Run query (async, doesn't block)
    3. await cursor.fetchall(): Get results (async)
    4. Return data: FastAPI automatically converts to JSON
    
    Why async?
    - Server can handle other requests while waiting for database
    - Better performance under load
    - Scales to thousands of concurrent users
    """
    async with db.cursor(aiomysql.DictCursor) as cursor:
        # DictCursor returns rows as dictionaries instead of tuples
        # This makes it easier to work with column names
        
        if search:
            # Search across multiple columns
            # LIKE with %: Matches anywhere in the text
            await cursor.execute("""
                SELECT * FROM articles 
                WHERE ean_code LIKE %s 
                   OR name LIKE %s 
                   OR description LIKE %s
                ORDER BY name
            """, (f'%{search}%', f'%{search}%', f'%{search}%'))
        else:
            # Get all articles
            await cursor.execute("SELECT * FROM articles ORDER BY name")
        
        articles = await cursor.fetchall()
        
        # Pydantic will validate and serialize each article
        return articles


@router.get(
    "/{ean_code}",
    response_model=ArticleResponse,
    summary="Get article by EAN code",
    description="Retrieve a specific article by its EAN code"
)
async def get_article(
    ean_code: str,
    db: aiomysql.Connection = Depends(get_db)
):
    """
    Get Single Article
    
    Path parameter: {ean_code} is extracted from URL
    Example: GET /articles/7350123456789
    
    Returns 404 if article not found.
    """
    async with db.cursor(aiomysql.DictCursor) as cursor:
        await cursor.execute(
            "SELECT * FROM articles WHERE ean_code = %s",
            (ean_code,)
        )
        article = await cursor.fetchone()
        
        if not article:
            # Raise HTTP 404 Not Found
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found"
            )
        
        return article


@router.post(
    "",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new article",
    description="Create a new article in the inventory"
)
async def create_article(
    article: ArticleCreate,
    db: aiomysql.Connection = Depends(get_db)
):
    """
    Create Article
    
    Request body validation:
    - Pydantic automatically validates incoming JSON
    - If validation fails, returns 422 Unprocessable Entity
    - All required fields must be present
    - Types must match (int for quantity, etc.)
    
    Database transaction:
    1. Execute INSERT
    2. Get last inserted ID
    3. Commit transaction
    4. Fetch and return created article
    
    Why fetch after insert?
    - Database generates id, created_at, updated_at
    - Return complete object to client
    - Client has all data without second request
    """
    async with db.cursor(aiomysql.DictCursor) as cursor:
        try:
            # Insert new article
            await cursor.execute("""
                INSERT INTO articles (ean_code, name, description, quantity, price)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                article.ean_code,
                article.name,
                article.description,
                article.quantity,
                article.price
            ))
            
            # Commit the transaction
            await db.commit()
            
            # Get the created article with all fields
            article_id = cursor.lastrowid
            await cursor.execute(
                "SELECT * FROM articles WHERE id = %s",
                (article_id,)
            )
            created_article = await cursor.fetchone()
            
            return created_article
            
        except aiomysql.IntegrityError as e:
            # Duplicate EAN code (UNIQUE constraint violation)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="EAN code already exists"
            )
        except Exception as e:
            # Any other database error
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )


@router.put(
    "/{ean_code}",
    response_model=ArticleResponse,
    summary="Update article",
    description="Update an existing article by EAN code"
)
async def update_article(
    ean_code: str,
    article: ArticleUpdate,
    db: aiomysql.Connection = Depends(get_db)
):
    """
    Update Article
    
    Partial update pattern:
    - Only provided fields are updated
    - Omitted fields remain unchanged
    - Flexible and efficient
    
    Dynamic SQL building:
    - Build UPDATE query based on provided fields
    - Prevents unnecessary database writes
    - More efficient than always updating all fields
    """
    # Build update query dynamically
    # Only update fields that are provided (not None)
    update_fields = []
    values = []
    
    # Check each field and add to update if provided
    if article.name is not None:
        update_fields.append("name = %s")
        values.append(article.name)
    
    if article.description is not None:
        update_fields.append("description = %s")
        values.append(article.description)
    
    if article.quantity is not None:
        update_fields.append("quantity = %s")
        values.append(article.quantity)
    
    if article.price is not None:
        update_fields.append("price = %s")
        values.append(article.price)
    
    # Check if any fields to update
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Add EAN code to values for WHERE clause
    values.append(ean_code)
    
    # Build and execute query
    query = f"UPDATE articles SET {', '.join(update_fields)} WHERE ean_code = %s"
    
    async with db.cursor(aiomysql.DictCursor) as cursor:
        await cursor.execute(query, values)
        await db.commit()
        
        # Check if article was found and updated
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found"
            )
        
        # Fetch and return updated article
        await cursor.execute(
            "SELECT * FROM articles WHERE ean_code = %s",
            (ean_code,)
        )
        updated_article = await cursor.fetchone()
        
        return updated_article


@router.delete(
    "/{ean_code}",
    status_code=status.HTTP_200_OK,
    summary="Delete article",
    description="Delete an article by EAN code"
)
async def delete_article(
    ean_code: str,
    db: aiomysql.Connection = Depends(get_db)
):
    """
    Delete Article
    
    Permanently removes article from database.
    Returns 404 if article doesn't exist.
    
    Note: In production, consider soft deletes
    (marking as deleted instead of removing).
    """
    async with db.cursor() as cursor:
        await cursor.execute(
            "DELETE FROM articles WHERE ean_code = %s",
            (ean_code,)
        )
        await db.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found"
            )
        
        return {"message": "Article deleted successfully"}

