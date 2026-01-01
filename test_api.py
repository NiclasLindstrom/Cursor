"""
Simple API test script to verify backend functionality
Run this after starting the Flask server
"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_health():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    print("✓ Health check passed")

def test_create_article():
    """Test creating an article"""
    print("\nTesting article creation...")
    article_data = {
        "ean_code": "1234567890123",
        "name": "Test Product",
        "description": "A test product for API testing",
        "quantity": 10,
        "price": 19.99
    }
    response = requests.post(f"{BASE_URL}/articles", json=article_data)
    assert response.status_code == 201
    print("✓ Article created successfully")

def test_get_article():
    """Test getting an article by EAN"""
    print("\nTesting get article by EAN...")
    response = requests.get(f"{BASE_URL}/articles/1234567890123")
    assert response.status_code == 200
    data = response.json()
    assert data["ean_code"] == "1234567890123"
    assert data["name"] == "Test Product"
    print("✓ Article retrieved successfully")

def test_get_all_articles():
    """Test getting all articles"""
    print("\nTesting get all articles...")
    response = requests.get(f"{BASE_URL}/articles")
    assert response.status_code == 200
    articles = response.json()
    assert isinstance(articles, list)
    assert len(articles) > 0
    print(f"✓ Retrieved {len(articles)} article(s)")

def test_search_articles():
    """Test searching articles"""
    print("\nTesting search functionality...")
    response = requests.get(f"{BASE_URL}/articles?search=Test")
    assert response.status_code == 200
    articles = response.json()
    assert len(articles) > 0
    print(f"✓ Search found {len(articles)} article(s)")

def test_update_article():
    """Test updating an article"""
    print("\nTesting article update...")
    update_data = {
        "quantity": 25,
        "price": 24.99
    }
    response = requests.put(f"{BASE_URL}/articles/1234567890123", json=update_data)
    assert response.status_code == 200
    # Verify update
    response = requests.get(f"{BASE_URL}/articles/1234567890123")
    data = response.json()
    assert data["quantity"] == 25
    assert float(data["price"]) == 24.99
    print("✓ Article updated successfully")

def test_duplicate_ean():
    """Test that duplicate EAN codes are rejected"""
    print("\nTesting duplicate EAN prevention...")
    article_data = {
        "ean_code": "1234567890123",
        "name": "Duplicate Test",
        "quantity": 5
    }
    response = requests.post(f"{BASE_URL}/articles", json=article_data)
    assert response.status_code == 409  # Conflict
    print("✓ Duplicate EAN correctly rejected")

def test_delete_article():
    """Test deleting an article"""
    print("\nTesting article deletion...")
    response = requests.delete(f"{BASE_URL}/articles/1234567890123")
    assert response.status_code == 200
    # Verify deletion
    response = requests.get(f"{BASE_URL}/articles/1234567890123")
    assert response.status_code == 404
    print("✓ Article deleted successfully")

def run_all_tests():
    """Run all tests"""
    print("=" * 50)
    print("API Test Suite")
    print("=" * 50)
    print("\nMake sure Flask server is running on http://localhost:5000")
    print("Press Enter to start tests...")
    input()
    
    try:
        test_health()
        test_create_article()
        test_get_article()
        test_get_all_articles()
        test_search_articles()
        test_update_article()
        test_duplicate_ean()
        test_delete_article()
        
        print("\n" + "=" * 50)
        print("✓ All tests passed!")
        print("=" * 50)
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to Flask server.")
        print("Make sure the server is running on http://localhost:5000")
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")

if __name__ == "__main__":
    run_all_tests()

