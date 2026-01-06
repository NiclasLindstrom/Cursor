"""
Database Module
===============
Handles async MySQL database connections using aiomysql.

Learning Notes:
- aiomysql provides async MySQL connector
- Connection pooling improves performance by reusing connections
- Context managers (async with) ensure proper cleanup
- Dependency injection makes testing easier
- FastAPI's Depends() handles automatic cleanup
"""

import aiomysql
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from backend.config import settings


# Global connection pool
# Created once when app starts, shared across all requests
_pool: aiomysql.Pool = None


async def init_db_pool():
    """
    Initialize Database Connection Pool
    
    Creates a pool of reusable database connections.
    Called once during application startup.
    
    Why use a pool?
    - Avoids overhead of creating new connections for each request
    - Limits concurrent database connections
    - Automatically manages connection lifecycle
    """
    global _pool
    
    # Create connection pool with async context manager
    # minsize: minimum number of connections to keep alive
    # maxsize: maximum number of connections allowed
    _pool = await aiomysql.create_pool(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        db=settings.db_name,
        minsize=1,  # Keep at least 1 connection alive
        maxsize=10,  # Allow up to 10 concurrent connections
        autocommit=False,  # We'll commit manually for safety
        echo=False,  # Set to True for SQL query debugging
    )
    
    print(f"✓ Database pool created: {settings.db_user}@{settings.db_host}:{settings.db_port}/{settings.db_name}")


async def close_db_pool():
    """
    Close Database Connection Pool
    
    Cleanly closes all connections in the pool.
    Called during application shutdown.
    """
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        print("✓ Database pool closed")


@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[aiomysql.Connection, None]:
    """
    Get Database Connection (Context Manager)
    
    Async context manager that provides a database connection.
    Automatically returns connection to pool when done.
    
    Usage:
        async with get_db_connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT * FROM articles")
    
    Why context manager?
    - Guarantees connection is returned to pool
    - Exception-safe (returns connection even on error)
    - Clean syntax with 'async with'
    """
    if not _pool:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    
    # Acquire connection from pool
    async with _pool.acquire() as connection:
        try:
            yield connection
        except Exception as e:
            # Rollback on error to keep database consistent
            await connection.rollback()
            raise e


async def get_db() -> AsyncGenerator[aiomysql.Connection, None]:
    """
    Database Dependency for FastAPI
    
    This is used with FastAPI's Depends() to inject database connections.
    FastAPI automatically handles the async generator lifecycle.
    
    Usage in route:
        @router.get("/articles")
        async def get_articles(db: aiomysql.Connection = Depends(get_db)):
            async with db.cursor() as cursor:
                await cursor.execute("SELECT * FROM articles")
    
    Why dependency injection?
    - Automatic connection management
    - Easy to mock for testing
    - Clean separation of concerns
    - FastAPI handles async cleanup automatically
    """
    async with get_db_connection() as connection:
        yield connection


async def init_database_tables():
    """
    Initialize Database Tables
    
    Creates the articles table if it doesn't exist.
    Called during application startup.
    
    Note: In production, you'd use a migration tool like Alembic.
    This is kept simple for learning purposes.
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cursor:
            # Create articles table with proper indexes
            await cursor.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ean_code VARCHAR(13) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    quantity INT DEFAULT 0,
                    price DECIMAL(10, 2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_ean (ean_code)
                )
            """)
            await conn.commit()
            print("✓ Database tables initialized")

