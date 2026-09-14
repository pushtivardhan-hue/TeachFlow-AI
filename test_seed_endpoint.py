#!/usr/bin/env python3
"""
Focused test for POST /api/admin/seed endpoint + quick regression
Tests the new seed endpoint and verifies existing critical endpoints still work
"""

import requests
import time
import json

# Configuration
BASE_URL = "https://teach-ai-grade.preview.emergentagent.com/api"
TIMESTAMP = int(time.time())

# Test data storage
test_data = {
    'superadmin': {},
    'teacher': {},
    'student': {},
}

def log_test(test_name, passed, details=""):
    """Log test results"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status} {test_name}")
    if details:
        print(f"   {details}")
    return passed

def test_new_seed_endpoint():
    """Test the NEW POST /api/admin/seed endpoint"""
    print("\n" + "="*80)
    print("NEW ENDPOINT: POST /api/admin/seed")
    print("="*80)
    
    results = []
    
    # 1. Register superadmin
    try:
        payload = {
            "name": "Super Admin",
            "email": f"superadmin_{TIMESTAMP}@test.com",
            "password": "Admin@123",
            "role": "superadmin"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            test_data['superadmin'] = {
                'token': data.get('token'),
                'user': data.get('user'),
                'email': payload['email']
            }
            results.append(log_test("Register superadmin", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("Register superadmin", False, f"Status {resp.status_code}: {resp.text[:200]}"))
            return False
    except Exception as e:
        results.append(log_test("Register superadmin", False, str(e)))
        return False
    
    # 2. Call POST /api/admin/seed with superadmin token
    try:
        headers = {"Authorization": f"Bearer {test_data['superadmin']['token']}"}
        payload = {
            "className": "9",
            "subject": "Physics",
            "theme": "Newton's Laws",
            "difficulty": "Medium"
        }
        print("   Calling OpenAI GPT-4o to generate 20 questions (may take 15-60 seconds)...")
        resp = requests.post(f"{BASE_URL}/admin/seed", json=payload, headers=headers, timeout=90)
        
        if resp.status_code == 200:
            data = resp.json()
            seeded = data.get('seeded', 0)
            subject = data.get('subject', '')
            theme = data.get('theme', '')
            
            if seeded == 20 and subject == "Physics" and theme == "Newton's Laws":
                results.append(log_test("POST /api/admin/seed (superadmin)", True, 
                    f"Seeded: {seeded}, Subject: {subject}, Theme: {theme}"))
            else:
                results.append(log_test("POST /api/admin/seed (superadmin)", False, 
                    f"Expected seeded=20, got {seeded}. Response: {json.dumps(data)}"))
        else:
            results.append(log_test("POST /api/admin/seed (superadmin)", False, 
                f"Status {resp.status_code}: {resp.text[:300]}"))
    except Exception as e:
        results.append(log_test("POST /api/admin/seed (superadmin)", False, str(e)))
    
    # 3. GET /api/questions?subject=Physics to verify seeded questions
    try:
        headers = {"Authorization": f"Bearer {test_data['superadmin']['token']}"}
        resp = requests.get(f"{BASE_URL}/questions?subject=Physics", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            questions = data.get('questions', [])
            physics_questions = [q for q in questions if q.get('subject') == 'Physics']
            
            # Should have at least 20 Physics questions (the ones we just seeded)
            if len(physics_questions) >= 20:
                # Check if Newton's Laws questions are present
                newtons_questions = [q for q in physics_questions if "Newton" in q.get('theme', '')]
                results.append(log_test("GET /api/questions?subject=Physics", True, 
                    f"Found {len(physics_questions)} Physics questions, {len(newtons_questions)} Newton's Laws questions"))
            else:
                results.append(log_test("GET /api/questions?subject=Physics", False, 
                    f"Expected >= 20 Physics questions, got {len(physics_questions)}"))
        else:
            results.append(log_test("GET /api/questions?subject=Physics", False, 
                f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("GET /api/questions?subject=Physics", False, str(e)))
    
    return all(results)

def test_rbac_negative():
    """Test RBAC: teacher and student should NOT be able to call /api/admin/seed"""
    print("\n" + "="*80)
    print("RBAC NEGATIVE TESTS: POST /api/admin/seed")
    print("="*80)
    
    results = []
    
    # 1. Register teacher
    try:
        payload = {
            "name": "Teacher User",
            "email": f"teacher_{TIMESTAMP}@test.com",
            "password": "Teacher@123",
            "role": "teacher",
            "className": "9A",
            "subject": "Physics"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            test_data['teacher'] = {
                'token': data.get('token'),
                'user': data.get('user')
            }
            results.append(log_test("Register teacher", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("Register teacher", False, f"Status {resp.status_code}"))
            return False
    except Exception as e:
        results.append(log_test("Register teacher", False, str(e)))
        return False
    
    # 2. Register student
    try:
        payload = {
            "name": "Student User",
            "email": f"student_{TIMESTAMP}@test.com",
            "password": "Student@123",
            "role": "student",
            "className": "9A",
            "rollNo": "1"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            test_data['student'] = {
                'token': data.get('token'),
                'user': data.get('user')
            }
            results.append(log_test("Register student", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("Register student", False, f"Status {resp.status_code}"))
            return False
    except Exception as e:
        results.append(log_test("Register student", False, str(e)))
        return False
    
    # 3. Teacher tries POST /api/admin/seed -> should get 403
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        payload = {
            "className": "9",
            "subject": "Chemistry",
            "theme": "Periodic Table",
            "difficulty": "Easy"
        }
        resp = requests.post(f"{BASE_URL}/admin/seed", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 403:
            results.append(log_test("Teacher POST /api/admin/seed -> 403", True, "Correctly forbidden"))
        else:
            results.append(log_test("Teacher POST /api/admin/seed -> 403", False, 
                f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Teacher POST /api/admin/seed -> 403", False, str(e)))
    
    # 4. Student tries POST /api/admin/seed -> should get 403
    try:
        headers = {"Authorization": f"Bearer {test_data['student']['token']}"}
        payload = {
            "className": "9",
            "subject": "Biology",
            "theme": "Cell Structure",
            "difficulty": "Easy"
        }
        resp = requests.post(f"{BASE_URL}/admin/seed", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 403:
            results.append(log_test("Student POST /api/admin/seed -> 403", True, "Correctly forbidden"))
        else:
            results.append(log_test("Student POST /api/admin/seed -> 403", False, 
                f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Student POST /api/admin/seed -> 403", False, str(e)))
    
    # 5. No token -> should get 401
    try:
        payload = {
            "className": "9",
            "subject": "Math",
            "theme": "Algebra",
            "difficulty": "Easy"
        }
        resp = requests.post(f"{BASE_URL}/admin/seed", json=payload, timeout=10)
        
        if resp.status_code == 401:
            results.append(log_test("No token POST /api/admin/seed -> 401", True, "Correctly unauthorized"))
        else:
            results.append(log_test("No token POST /api/admin/seed -> 401", False, 
                f"Expected 401, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("No token POST /api/admin/seed -> 401", False, str(e)))
    
    return all(results)

def test_quick_regression():
    """Quick regression tests for critical endpoints"""
    print("\n" + "="*80)
    print("QUICK REGRESSION TESTS")
    print("="*80)
    
    results = []
    
    # 1. POST /api/auth/login still works
    try:
        payload = {
            "email": test_data['superadmin']['email'],
            "password": "Admin@123"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'token' in data and 'user' in data:
                results.append(log_test("POST /api/auth/login", True, "Returns token+user"))
            else:
                results.append(log_test("POST /api/auth/login", False, "Missing token or user"))
        else:
            results.append(log_test("POST /api/auth/login", False, f"Status {resp.status_code}"))
    except Exception as e:
        results.append(log_test("POST /api/auth/login", False, str(e)))
    
    # 2. GET /api/auth/me works
    try:
        headers = {"Authorization": f"Bearer {test_data['superadmin']['token']}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data:
                results.append(log_test("GET /api/auth/me", True, f"User: {data['user']['name']}"))
            else:
                results.append(log_test("GET /api/auth/me", False, "Missing user"))
        else:
            results.append(log_test("GET /api/auth/me", False, f"Status {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/auth/me", False, str(e)))
    
    # 3. GET /api/admin/stats (superadmin) - questions count should be >= 240
    try:
        headers = {"Authorization": f"Bearer {test_data['superadmin']['token']}"}
        resp = requests.get(f"{BASE_URL}/admin/stats", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            stats = data.get('stats', {})
            questions_count = stats.get('questions', 0)
            
            if questions_count >= 240:
                results.append(log_test("GET /api/admin/stats", True, 
                    f"Questions: {questions_count} (>= 240 as expected)"))
            else:
                results.append(log_test("GET /api/admin/stats", False, 
                    f"Questions: {questions_count} (expected >= 240)"))
        else:
            results.append(log_test("GET /api/admin/stats", False, f"Status {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/admin/stats", False, str(e)))
    
    # 4. GET /api/assessments (teacher) returns 200
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        resp = requests.get(f"{BASE_URL}/assessments", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            assessments = data.get('assessments', [])
            results.append(log_test("GET /api/assessments (teacher)", True, 
                f"Returns array with {len(assessments)} assessments"))
        else:
            results.append(log_test("GET /api/assessments (teacher)", False, f"Status {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/assessments (teacher)", False, str(e)))
    
    return all(results)

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("SEED ENDPOINT + REGRESSION TEST SUITE")
    print("Teacher AI Platform - Backend Testing")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {TIMESTAMP}")
    print("="*80)
    
    start_time = time.time()
    
    # Run test groups
    results = {
        'new_seed_endpoint': test_new_seed_endpoint(),
        'rbac_negative': test_rbac_negative(),
        'quick_regression': test_quick_regression(),
    }
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for group, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {group.upper().replace('_', ' ')}")
    
    total_passed = sum(1 for p in results.values() if p)
    total_tests = len(results)
    
    print("\n" + "="*80)
    print(f"OVERALL: {total_passed}/{total_tests} test groups passed")
    print(f"Duration: {duration:.2f} seconds")
    print("="*80)
    
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    exit(main())
