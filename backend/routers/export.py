"""
Export Router
=============
Handles CSV export functionality.

Learning Notes:
- StreamingResponse: Efficient for large files
- io.StringIO: In-memory file for CSV generation
- csv module: Standard library CSV writer
- Content-Disposition: Triggers browser download
- Async iteration: Yields data in chunks
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import aiomysql
import csv
import io
from backend.auth import get_current_user
from backend.database import get_db


router = APIRouter(
    prefix="/export",
    tags=["Export"],
    dependencies=[Depends(get_current_user)],
    responses={
        401: {"description": "Unauthorized - Authentication required"}
    }
)


@router.get(
    "/csv",
    summary="Export articles to CSV",
    description="""
    Export all articles with quantity > 0 to CSV format.
    
    The file will be automatically downloaded by the browser.
    CSV format: EAN Code, Name, Description, Quantity, Price
    """,
    responses={
        200: {
            "description": "CSV file",
            "content": {"text/csv": {}}
        }
    }
)
async def export_csv(
    db: aiomysql.Connection = Depends(get_db)
):
    """
    Export Articles to CSV
    
    Process:
    1. Query articles with quantity > 0
    2. Generate CSV in memory
    3. Return as downloadable file
    
    Why StreamingResponse?
    - Memory efficient for large datasets
    - Starts download immediately
    - Doesn't load entire file in memory
    - Better user experience
    
    CSV Format:
    - First row: Headers
    - Subsequent rows: Data
    - Comma-separated values
    - Quoted strings (handles commas in descriptions)
    """
    async with db.cursor(aiomysql.DictCursor) as cursor:
        # Get articles with quantity > 0, sorted by name
        await cursor.execute("""
            SELECT ean_code, name, description, quantity, price 
            FROM articles 
            WHERE quantity > 0 
            ORDER BY name
        """)
        articles = await cursor.fetchall()
    
    # Create CSV in memory
    # StringIO: In-memory text stream (like a file but in RAM)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header row
    writer.writerow(['EAN Code', 'Name', 'Description', 'Quantity', 'Price'])
    
    # Write data rows
    for article in articles:
        writer.writerow([
            article['ean_code'],
            article['name'],
            article['description'] or '',  # Empty string if None
            article['quantity'],
            article['price'] or ''  # Empty string if None
        ])
    
    # Get CSV content
    csv_content = output.getvalue()
    output.close()
    
    # Create response with CSV content
    # StreamingResponse: Efficient for file downloads
    return StreamingResponse(
        # iter(): Convert string to iterable for streaming
        iter([csv_content]),
        media_type="text/csv",
        headers={
            # Content-Disposition: Tells browser to download file
            "Content-Disposition": "attachment; filename=inventory_export.csv"
        }
    )

