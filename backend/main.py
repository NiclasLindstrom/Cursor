"""
FastAPI Inventory Management Application
=========================================
Main application entry point.

Learning Notes:
- FastAPI: Modern, fast web framework for building APIs
- Async/await: Non-blocking operations for better performance
- Automatic documentation: Swagger UI and ReDoc
- CORS: Allows frontend to call API from different origin
- Lifespan events: Startup and shutdown hooks
- Dependency injection: Clean, testable code architecture
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.config import settings
from backend.database import init_db_pool, close_db_pool, init_database_tables
from backend.routers import auth, articles, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Manager
    
    Handles startup and shutdown events.
    Code before yield runs on startup.
    Code after yield runs on shutdown.
    
    Why lifespan?
    - Initialize resources (database pool)
    - Clean up resources (close connections)
    - Ensures proper cleanup even on errors
    - Modern replacement for @app.on_event()
    """
    # Startup
    print("🚀 Starting FastAPI Inventory Application...")
    
    # Initialize database connection pool
    await init_db_pool()
    
    # Create tables if they don't exist
    await init_database_tables()
    
    print(f"✓ Server ready at http://localhost:{settings.port}")
    print(f"✓ API docs at http://localhost:{settings.port}/docs")
    print(f"✓ Alternative docs at http://localhost:{settings.port}/redoc")
    
    yield  # Application runs here
    
    # Shutdown
    print("\n🛑 Shutting down...")
    await close_db_pool()
    print("✓ Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Inventory Management API",
    description="""
    Modern FastAPI-based inventory management system with JWT authentication.
    
    ## Features
    * 🔐 JWT token authentication
    * 📦 Article CRUD operations
    * 🔍 Search functionality
    * 📊 CSV export
    * 🌍 Multi-language support
    * ⚡ Async database operations
    
    ## Authentication
    1. POST /api/auth/login with password
    2. Receive JWT access token
    3. Include token in subsequent requests:
       `Authorization: Bearer <token>`
    
    ## Technical Stack
    * FastAPI - Modern async web framework
    * Pydantic - Data validation with type hints
    * aiomysql - Async MySQL driver
    * JWT - Stateless authentication
    """,
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc UI
    lifespan=lifespan  # Startup/shutdown handler
)


# Configure CORS (Cross-Origin Resource Sharing)
# This allows the frontend (served from NGINX or different port) to call our API
app.add_middleware(
    CORSMiddleware,
    # In production, replace with specific origins like ["https://yourdomain.com"]
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Include routers
# Each router handles a specific area of functionality
# prefix="/api": All routes will be under /api
app.include_router(auth.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(export.router, prefix="/api")


# Health check endpoint (no authentication required)
@app.get(
    "/api/health",
    tags=["Health"],
    summary="Health check",
    description="Check if the API is running"
)
async def health_check():
    """
    Health Check Endpoint
    
    Returns a simple status message.
    Used by:
    - Load balancers to check if server is alive
    - Monitoring systems
    - Frontend to verify connection
    
    No authentication required.
    """
    return {"status": "ok", "message": "API is running"}


# Language configuration endpoint (no authentication required)
@app.get(
    "/api/language",
    tags=["Configuration"],
    summary="Get language configuration",
    description="Get all UI text strings for internationalization"
)
async def get_language():
    """
    Language Configuration Endpoint
    
    Returns all UI text strings from environment variables.
    Allows easy internationalization without changing frontend code.
    
    The frontend fetches these on startup and uses them throughout the app.
    """
    return {
        "appTitle": settings.lang_app_title,
        "exportCSV": settings.lang_export_csv,
        "logout": settings.lang_logout,
        "searchPlaceholder": settings.lang_search_placeholder,
        "scanBarcode": settings.lang_scan_barcode,
        "scan": settings.lang_scan,
        "scanning": settings.lang_scanning,
        "stopScanning": settings.lang_stop_scanning,
        "welcomeMessage": settings.lang_welcome_message,
        "currentQuantity": settings.lang_current_quantity,
        "price": settings.lang_price,
        "apply": settings.lang_apply,
        "editArticle": settings.lang_edit_article,
        "articleNotFound": settings.lang_article_not_found,
        "eanCode": settings.lang_ean_code,
        "name": settings.lang_name,
        "description": settings.lang_description,
        "initialQuantity": settings.lang_initial_quantity,
        "cancel": settings.lang_cancel,
        "addArticle": settings.lang_add_article,
        "editArticleTitle": settings.lang_edit_article_title,
        "saveChanges": settings.lang_save_changes,
        "currency": settings.lang_currency,
        "currencyPosition": settings.lang_currency_position,
        "connected": settings.lang_connected,
        "connectionIssue": settings.lang_connection_issue,
        "cannotConnect": settings.lang_cannot_connect,
        "ean": settings.lang_ean,
        "required": settings.lang_required,
        "pleaseEnterEan": settings.lang_please_enter_ean,
        "quantityCannotBeNegative": settings.lang_quantity_cannot_be_negative,
        "quantityUpdatedTo": settings.lang_quantity_updated_to,
        "failedToUpdateQuantity": settings.lang_failed_to_update_quantity,
        "eanCodeAndNameRequired": settings.lang_ean_code_and_name_required,
        "articleCreatedSuccessfully": settings.lang_article_created_successfully,
        "articleUpdatedSuccessfully": settings.lang_article_updated_successfully,
        "failedToCreateArticle": settings.lang_failed_to_create_article,
        "failedToUpdateArticle": settings.lang_failed_to_update_article,
        "failedToLookupArticle": settings.lang_failed_to_lookup_article,
        "cannotConnectToServer": settings.lang_cannot_connect_to_server,
        "barcodeScannerNotLoaded": settings.lang_barcode_scanner_not_loaded,
        "errorLoadingVideoStream": settings.lang_error_loading_video_stream,
        "csvExportedSuccessfully": settings.lang_csv_exported_successfully,
        "failedToExportCsv": settings.lang_failed_to_export_csv,
    }


# Root endpoint
@app.get(
    "/",
    tags=["Root"],
    summary="API root",
    description="Returns basic API information"
)
async def root():
    """
    Root Endpoint
    
    Provides basic information about the API.
    Helpful for verifying the API is accessible.
    """
    return {
        "message": "FastAPI Inventory Management API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


# Run with: uvicorn backend.main:app --reload --port 8000
# Or: python -m uvicorn backend.main:app --reload --port 8000

if __name__ == "__main__":
    """
    Direct execution with uvicorn
    
    This allows running: python backend/main.py
    Useful for development.
    
    For production, use:
    - gunicorn with uvicorn workers
    - Multiple worker processes for scaling
    """
    import uvicorn
    
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",  # Listen on all network interfaces
        port=settings.port,
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"
    )

