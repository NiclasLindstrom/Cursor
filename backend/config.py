"""
Configuration Management
========================
This module handles loading and validating environment variables.
Uses pydantic.BaseSettings for automatic type validation and environment variable loading.

Learning Notes:
- Pydantic Settings automatically loads from .env files
- Type hints provide runtime validation
- Default values make configuration flexible
- Config class inside enables .env file loading
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application Settings
    
    All settings are loaded from environment variables or .env file.
    Pydantic automatically converts types and validates values.
    """
    
    # Database Configuration
    # These settings define how we connect to MySQL
    db_host: str = "localhost"
    db_name: str = "inventory_db"
    db_user: str = "root"
    db_password: str = ""
    db_port: int = 3306
    
    # Server Configuration
    port: int = 8000
    
    # Authentication Configuration
    # IMPORTANT: Change these in production!
    admin_password: str = "admin"  # Password for login
    secret_key: str = "your-secret-key-change-in-production"  # For JWT signing
    
    # JWT Configuration
    # Algorithm for signing tokens (HS256 is HMAC with SHA-256)
    jwt_algorithm: str = "HS256"
    # Token expiration in hours
    jwt_expire_hours: int = 24
    
    # Language Configuration
    # All UI text strings - supports internationalization
    lang_app_title: str = "📦 Lagerhantering"
    lang_export_csv: str = "Exportera CSV"
    lang_logout: str = "Logga ut"
    lang_search_placeholder: str = "Ange eller skanna EAN-kod..."
    lang_scan_barcode: str = "Skanna streckkod"
    lang_scan: str = "Skanna"
    lang_scanning: str = "Skannar..."
    lang_stop_scanning: str = "Stoppa skanning"
    lang_welcome_message: str = "Ange en EAN-kod eller skanna en streckkod för att komma igång"
    lang_current_quantity: str = "Nuvarande kvantitet"
    lang_price: str = "Pris"
    lang_apply: str = "Tillämpa"
    lang_edit_article: str = "Redigera artikel"
    lang_article_not_found: str = "Artikel hittades inte - Lägg till ny artikel"
    lang_ean_code: str = "EAN-kod"
    lang_name: str = "Namn"
    lang_description: str = "Beskrivning"
    lang_initial_quantity: str = "Initial kvantitet"
    lang_cancel: str = "Avbryt"
    lang_add_article: str = "Lägg till artikel"
    lang_edit_article_title: str = "Redigera artikel"
    lang_save_changes: str = "Spara ändringar"
    lang_currency: str = "SEK"
    lang_currency_position: str = "after"  # 'before' or 'after'
    lang_connected: str = "✓ Ansluten till"
    lang_connection_issue: str = "⚠ API-anslutningsproblem"
    lang_cannot_connect: str = "✗ Kan inte ansluta till API"
    lang_ean: str = "EAN"
    lang_required: str = "*"
    lang_please_enter_ean: str = "Vänligen ange en EAN-kod"
    lang_quantity_cannot_be_negative: str = "Kvantiteten kan inte vara negativ"
    lang_quantity_updated_to: str = "Kvantitet uppdaterad till"
    lang_failed_to_update_quantity: str = "Misslyckades att uppdatera kvantitet"
    lang_ean_code_and_name_required: str = "EAN-kod och namn krävs"
    lang_article_created_successfully: str = "Artikel skapad framgångsrikt"
    lang_article_updated_successfully: str = "Artikel uppdaterad framgångsrikt"
    lang_failed_to_create_article: str = "Misslyckades att skapa artikel"
    lang_failed_to_update_article: str = "Misslyckades att uppdatera artikel"
    lang_failed_to_lookup_article: str = "Misslyckades att söka artikel"
    lang_cannot_connect_to_server: str = "Kan inte ansluta till servern"
    lang_barcode_scanner_not_loaded: str = "Streckkodsskannerbiblioteket är inte laddat. Vänligen uppdatera sidan"
    lang_error_loading_video_stream: str = "Fel vid laddning av videoström. Försök igen"
    lang_csv_exported_successfully: str = "CSV exporterad framgångsrikt"
    lang_failed_to_export_csv: str = "Misslyckades att exportera CSV"
    
    class Config:
        """
        Pydantic Configuration
        
        env_file: Tells pydantic to load from .env file
        case_sensitive: Environment variable names are case-insensitive
        extra: Allow extra fields (ignores undefined env vars)
        """
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields not defined in model
        # This allows us to use uppercase env vars like DB_HOST


# Create a global settings instance
# This will be imported and used throughout the application
settings = Settings()

