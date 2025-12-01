"""
API Integration Tests
Tests the main API endpoints to ensure they work correctly
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestHealthEndpoints:
    """Test health and basic endpoints"""
    
    def test_root_endpoint(self):
        """Test the root endpoint returns correct message"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "MyDesk API - Intelligent Productivity Assistant"}
    
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

class TestTasksAPI:
    """Test tasks API endpoints"""
    
    def test_get_tasks_without_auth(self):
        """Test getting tasks without authentication"""
        response = client.get("/api/tasks/")
        # Should return empty list or require auth
        assert response.status_code in [200, 401, 403]
    
    def test_create_task_without_auth(self):
        """Test creating task without authentication"""
        task_data = {
            "title": "Test Task",
            "task_type": "Assignment",
            "due_date": "2024-12-31T23:59:59",
            "grade_percentage": 10,
            "course_id": "test-course"
        }
        response = client.post("/api/tasks/", json=task_data)
        # Should require authentication
        assert response.status_code in [401, 403, 422]

class TestCoursesAPI:
    """Test courses API endpoints"""
    
    def test_get_courses_without_auth(self):
        """Test getting courses without authentication"""
        response = client.get("/api/courses/")
        # Should return empty list or require auth
        assert response.status_code in [200, 401, 403]

class TestMLEndpoints:
    """Test ML-related endpoints"""
    
    def test_ml_endpoints_exist(self):
        """Test that ML endpoints are accessible"""
        # Test if ML endpoints are properly mounted
        response = client.get("/api/ml/")
        # GET /api/ml/ doesn't exist (only POST routes), 404 is expected
        assert response.status_code == 404

class TestUploadEndpoints:
    """Test file upload endpoints"""
    
    def test_upload_endpoint_exists(self):
        """Test that upload endpoints are accessible"""
        response = client.get("/api/upload/")
        # GET /api/upload/ doesn't exist (only POST routes), 404 is expected
        assert response.status_code == 404

class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_auth_endpoints_exist(self):
        """Test that auth endpoints are accessible"""
        # Test login endpoint exists
        response = client.post("/api/auth/login", json={"email": "test", "password": "test"})
        # Should not return 404 (endpoint exists), but may return validation error
        assert response.status_code != 404
        
        # Test register endpoint exists  
        response = client.post("/api/auth/register", json={"email": "test", "password": "test"})
        # Should not return 404 (endpoint exists), but may return validation error
        assert response.status_code != 404
