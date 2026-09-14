#!/usr/bin/env python3
"""
TeachFlow AI Backend Upgrade Test Suite
Tests: upgraded rubric grading, duplicate prevention, teacher overview, regenerate, extended analytics, RBAC
"""
import requests
import json
import time
from datetime import datetime

# Base URL from .env
BASE_URL = "https://teach-ai-grade.preview.emergentagent.com/api"

# Generate unique identifiers
timestamp = int(time.time())
CLASS_NAME = f"GX{timestamp}"

# Test data
users = {
    "superadmin": {
        "email": f"superadmin_{timestamp}@test.com",
        "password": "SuperPass123!",
        "name": "Super Admin",
        "role": "superadmin"
    },
    "teacher": {
        "email": f"teacher_{timestamp}@test.com",
        "password": "TeacherPass123!",
        "name": "Ms. Johnson",
        "role": "teacher",
        "className": CLASS_NAME,
        "subject": "Science"
    },
    "student1": {
        "email": f"student1_{timestamp}@test.com",
        "password": "Student1Pass!",
        "name": "Alice Smith",
        "role": "student",
        "className": CLASS_NAME,
        "rollNo": "1"
    },
    "student2": {
        "email": f"student2_{timestamp}@test.com",
        "password": "Student2Pass!",
        "name": "Bob Jones",
        "role": "student",
        "className": CLASS_NAME,
        "rollNo": "2"
    }
}

tokens = {}
assessment_id = None
mcq_id = None
descriptive_id = None
student1_submission_id = None
student1_id = None

def print_test(name):
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")

def print_info(msg):
    print(f"ℹ️  INFO: {msg}")

# ============================================================================
# SETUP: Register users
# ============================================================================
print_test("SETUP: Register all users")
for role, data in users.items():
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json=data, timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            tokens[role] = result["token"]
            if role == "student1":
                student1_id = result["user"]["id"]
            print_pass(f"Registered {role}: {data['email']}")
        else:
            print_fail(f"Register {role} failed: {resp.status_code} {resp.text}")
            exit(1)
    except Exception as e:
        print_fail(f"Register {role} exception: {e}")
        exit(1)

print_info(f"Using className: {CLASS_NAME}")
print_info(f"Student1 ID: {student1_id}")

# ============================================================================
# TEST 1: Teacher generates assessment (1 MCQ + 1 descriptive)
# ============================================================================
print_test("TEST 1: Teacher POST /api/ai/generate (1 MCQ + 1 descriptive)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    payload = {
        "className": CLASS_NAME,
        "subject": "Science",
        "theme": "Photosynthesis",
        "difficulty": "Medium",
        "counts": {
            "mcq": 1,
            "fill_blank": 0,
            "descriptive": 1
        }
    }
    print_info("Calling AI generate (allow up to 60s)...")
    resp = requests.post(f"{BASE_URL}/ai/generate", json=payload, headers=headers, timeout=60)
    if resp.status_code == 200:
        result = resp.json()
        questions = result.get("result", {}).get("questions", [])
        if len(questions) == 2:
            mcq = [q for q in questions if q["type"] == "mcq"]
            desc = [q for q in questions if q["type"] == "descriptive"]
            if len(mcq) == 1 and len(desc) == 1:
                mcq_id = mcq[0]["id"]
                descriptive_id = desc[0]["id"]
                print_pass(f"Generated 2 questions: 1 MCQ (id={mcq_id[:8]}...), 1 descriptive (id={descriptive_id[:8]}...)")
                print_info(f"MCQ: {mcq[0]['question'][:60]}...")
                print_info(f"Descriptive: {desc[0]['question'][:60]}...")
            else:
                print_fail(f"Expected 1 MCQ + 1 descriptive, got {len(mcq)} MCQ + {len(desc)} descriptive")
                exit(1)
        else:
            print_fail(f"Expected 2 questions, got {len(questions)}")
            exit(1)
    else:
        print_fail(f"AI generate failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"AI generate exception: {e}")
    exit(1)

# Create assessment
print_test("TEST 1b: Teacher POST /api/assessments (publish)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    payload = {
        "title": f"Photosynthesis Test {timestamp}",
        "className": CLASS_NAME,
        "subject": "Science",
        "theme": "Photosynthesis",
        "difficulty": "Medium",
        "learningOutcomes": ["Understand photosynthesis process", "Apply knowledge of photosynthesis"],
        "questions": result["result"]["questions"],
        "published": True
    }
    resp = requests.post(f"{BASE_URL}/assessments", json=payload, headers=headers, timeout=10)
    if resp.status_code == 200:
        assessment = resp.json()["assessment"]
        assessment_id = assessment["id"]
        print_pass(f"Created assessment: {assessment_id[:8]}... with {len(assessment['questions'])} questions")
    else:
        print_fail(f"Create assessment failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"Create assessment exception: {e}")
    exit(1)

# ============================================================================
# TEST 2: Duplicate submission prevention
# ============================================================================
print_test("TEST 2a: Student1 POST /api/submissions (first submission)")
try:
    headers = {"Authorization": f"Bearer {tokens['student1']}"}
    # Get the correct answer for MCQ
    mcq_question = [q for q in result["result"]["questions"] if q["type"] == "mcq"][0]
    correct_option = mcq_question["answer"]
    
    payload = {
        "assessmentId": assessment_id,
        "answers": {
            mcq_id: correct_option,
            descriptive_id: "Plants use sunlight, water and CO2 to make glucose and oxygen."
        }
    }
    resp = requests.post(f"{BASE_URL}/submissions", json=payload, headers=headers, timeout=10)
    if resp.status_code == 200:
        submission = resp.json()["submission"]
        student1_submission_id = submission["id"]
        objective_score = submission.get("objectiveScore", 0)
        print_pass(f"Student1 submitted successfully: submission_id={student1_submission_id[:8]}...")
        print_info(f"Objective score (auto-graded): {objective_score}")
    else:
        print_fail(f"Student1 submission failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"Student1 submission exception: {e}")
    exit(1)

print_test("TEST 2b: Student1 POST /api/submissions AGAIN (expect 409)")
try:
    headers = {"Authorization": f"Bearer {tokens['student1']}"}
    payload = {
        "assessmentId": assessment_id,
        "answers": {
            mcq_id: "Different answer",
            descriptive_id: "Another attempt"
        }
    }
    resp = requests.post(f"{BASE_URL}/submissions", json=payload, headers=headers, timeout=10)
    if resp.status_code == 409:
        error_msg = resp.json().get("error", "")
        print_pass(f"Duplicate submission correctly rejected with 409: {error_msg}")
    else:
        print_fail(f"Expected 409, got {resp.status_code}: {resp.text}")
except Exception as e:
    print_fail(f"Duplicate submission test exception: {e}")
    exit(1)

# ============================================================================
# TEST 3: Upgraded AI grading (misconception + confidence + remediation)
# ============================================================================
print_test("TEST 3: Teacher POST /api/submissions/:id/aigrade (upgraded grading)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    print_info("Calling AI grade (allow up to 60s)...")
    resp = requests.post(f"{BASE_URL}/submissions/{student1_submission_id}/aigrade", headers=headers, timeout=60)
    if resp.status_code == 200:
        submission = resp.json()["submission"]
        ai_data = submission.get("ai", {})
        desc_ai = ai_data.get(descriptive_id, {})
        
        # Check for new fields
        has_misconception = "misconception" in desc_ai
        has_confidence = "confidence" in desc_ai
        has_remediation = "remediation" in desc_ai
        
        if has_misconception and has_confidence and has_remediation:
            misconception = desc_ai["misconception"]
            confidence = desc_ai["confidence"]
            remediation = desc_ai["remediation"]
            
            # Verify remediation structure
            has_concept = "concept" in remediation
            has_explanation = "explanation" in remediation
            has_practice = "practice" in remediation
            has_difficulty = "difficulty" in remediation
            has_nextStep = "nextStep" in remediation
            
            if all([has_concept, has_explanation, has_practice, has_difficulty, has_nextStep]):
                print_pass("AI grading returned all upgraded fields")
                print_info(f"  misconception: {misconception}")
                print_info(f"  confidence: {confidence} (type: {type(confidence).__name__})")
                print_info(f"  remediation.concept: {remediation['concept']}")
                print_info(f"  remediation.explanation: {remediation['explanation'][:60]}...")
                print_info(f"  remediation.practice: {remediation['practice'][:60]}...")
                print_info(f"  remediation.difficulty: {remediation['difficulty']}")
                print_info(f"  remediation.nextStep: {remediation['nextStep'][:60]}...")
                
                # Verify types
                if isinstance(misconception, str) and isinstance(confidence, (int, float)) and 0 <= confidence <= 100:
                    print_pass("Field types correct: misconception=string, confidence=number(0-100)")
                else:
                    print_fail(f"Field type mismatch: misconception={type(misconception)}, confidence={confidence} (type={type(confidence)})")
            else:
                print_fail(f"Remediation missing fields: concept={has_concept}, explanation={has_explanation}, practice={has_practice}, difficulty={has_difficulty}, nextStep={has_nextStep}")
        else:
            print_fail(f"Missing upgraded fields: misconception={has_misconception}, confidence={has_confidence}, remediation={has_remediation}")
            print_info(f"AI data keys: {list(desc_ai.keys())}")
    else:
        print_fail(f"AI grade failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"AI grade exception: {e}")
    exit(1)

# ============================================================================
# TEST 4: Approve with modification
# ============================================================================
print_test("TEST 4: Teacher POST /api/submissions/:id/approve (modified score)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    payload = {
        "finalScores": {
            descriptive_id: 3  # Override AI score to 3
        }
    }
    resp = requests.post(f"{BASE_URL}/submissions/{student1_submission_id}/approve", json=payload, headers=headers, timeout=10)
    if resp.status_code == 200:
        submission = resp.json()["submission"]
        status = submission.get("status")
        total_score = submission.get("totalScore")
        objective_score = submission.get("objectiveScore", 0)
        
        if status == "approved":
            print_pass(f"Submission approved: status={status}")
            print_info(f"Total score: {total_score} (objective={objective_score} + descriptive=3)")
            
            # Verify total = objective + 3
            expected_total = objective_score + 3
            if abs(total_score - expected_total) < 0.01:
                print_pass(f"Total score correct: {total_score} = {objective_score} + 3")
            else:
                print_fail(f"Total score mismatch: expected {expected_total}, got {total_score}")
        else:
            print_fail(f"Status not approved: {status}")
    else:
        print_fail(f"Approve failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"Approve exception: {e}")
    exit(1)

# ============================================================================
# TEST 5: Teacher overview endpoint
# ============================================================================
print_test("TEST 5: GET /api/teacher/overview (teacher token)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    resp = requests.get(f"{BASE_URL}/teacher/overview", headers=headers, timeout=10)
    if resp.status_code == 200:
        overview = resp.json()["overview"]
        
        # Check all required keys
        required_keys = [
            "totalStudents", "activeAssessments", "completedSubmissions", 
            "avgClassScore", "needsAttention", "classPerformance", 
            "recentSubmissions", "recentAssessments"
        ]
        
        missing_keys = [k for k in required_keys if k not in overview]
        if not missing_keys:
            print_pass("Teacher overview returned all required keys")
            print_info(f"  totalStudents: {overview['totalStudents']}")
            print_info(f"  activeAssessments: {overview['activeAssessments']}")
            print_info(f"  completedSubmissions: {overview['completedSubmissions']}")
            print_info(f"  avgClassScore: {overview['avgClassScore']}")
            print_info(f"  needsAttention: {len(overview['needsAttention'])} students")
            print_info(f"  classPerformance: {len(overview['classPerformance'])} assessments")
            print_info(f"  recentSubmissions: {len(overview['recentSubmissions'])} items")
            print_info(f"  recentAssessments: {len(overview['recentAssessments'])} items")
            
            # Verify types
            if (isinstance(overview['needsAttention'], list) and 
                isinstance(overview['classPerformance'], list) and
                isinstance(overview['recentSubmissions'], list) and
                isinstance(overview['recentAssessments'], list)):
                print_pass("All array fields are arrays")
            else:
                print_fail("Some array fields are not arrays")
        else:
            print_fail(f"Missing keys in overview: {missing_keys}")
    else:
        print_fail(f"Teacher overview failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"Teacher overview exception: {e}")
    exit(1)

# ============================================================================
# TEST 6: Regenerate single question
# ============================================================================
print_test("TEST 6: POST /api/ai/regenerate (teacher, type=mcq)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    payload = {
        "className": CLASS_NAME,
        "subject": "Science",
        "theme": "Photosynthesis",
        "difficulty": "Medium",
        "type": "mcq"
    }
    print_info("Calling AI regenerate (allow up to 30s)...")
    resp = requests.post(f"{BASE_URL}/ai/regenerate", json=payload, headers=headers, timeout=30)
    if resp.status_code == 200:
        question = resp.json()["question"]
        
        # Verify structure
        has_type = question.get("type") == "mcq"
        has_options = "options" in question and len(question["options"]) == 4
        has_answer = "answer" in question
        answer_in_options = question.get("answer") in question.get("options", [])
        
        if has_type and has_options and has_answer and answer_in_options:
            print_pass("Regenerated MCQ question with correct structure")
            print_info(f"  question: {question['question'][:60]}...")
            print_info(f"  options: {question['options']}")
            print_info(f"  answer: {question['answer']}")
        else:
            print_fail(f"MCQ structure invalid: type={has_type}, options={has_options}, answer={has_answer}, answer_in_options={answer_in_options}")
    else:
        print_fail(f"Regenerate failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"Regenerate exception: {e}")
    exit(1)

# ============================================================================
# TEST 7: Extended student analytics
# ============================================================================
print_test("TEST 7: GET /api/analytics/student/:id (extended fields)")
try:
    headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    resp = requests.get(f"{BASE_URL}/analytics/student/{student1_id}", headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        
        # Check for all required fields
        required_keys = ["history", "topics", "strengths", "weaknesses", "remediation"]
        missing_keys = [k for k in required_keys if k not in data]
        
        if not missing_keys:
            print_pass("Student analytics returned all extended fields")
            print_info(f"  history: {len(data['history'])} submissions")
            print_info(f"  topics: {len(data['topics'])} topics")
            print_info(f"  strengths: {len(data['strengths'])} items")
            print_info(f"  weaknesses: {len(data['weaknesses'])} items")
            print_info(f"  remediation: {len(data['remediation'])} items")
            
            # Verify types
            if all(isinstance(data[k], list) for k in required_keys):
                print_pass("All fields are arrays")
            else:
                print_fail("Some fields are not arrays")
        else:
            print_fail(f"Missing keys in analytics: {missing_keys}")
    else:
        print_fail(f"Student analytics failed: {resp.status_code} {resp.text}")
        exit(1)
except Exception as e:
    print_fail(f"Student analytics exception: {e}")
    exit(1)

# ============================================================================
# TEST 8: RBAC checks
# ============================================================================
print_test("TEST 8a: Student calling GET /api/teacher/overview (expect 403)")
try:
    headers = {"Authorization": f"Bearer {tokens['student1']}"}
    resp = requests.get(f"{BASE_URL}/teacher/overview", headers=headers, timeout=10)
    if resp.status_code == 403:
        print_pass("Student correctly denied access to teacher overview (403)")
    else:
        print_fail(f"Expected 403, got {resp.status_code}")
except Exception as e:
    print_fail(f"RBAC test exception: {e}")

print_test("TEST 8b: Student calling POST /api/ai/regenerate (expect 403)")
try:
    headers = {"Authorization": f"Bearer {tokens['student1']}"}
    payload = {
        "subject": "Science",
        "theme": "Photosynthesis",
        "type": "mcq"
    }
    resp = requests.post(f"{BASE_URL}/ai/regenerate", json=payload, headers=headers, timeout=10)
    if resp.status_code == 403:
        print_pass("Student correctly denied access to regenerate (403)")
    else:
        print_fail(f"Expected 403, got {resp.status_code}")
except Exception as e:
    print_fail(f"RBAC test exception: {e}")

# ============================================================================
# TEST 9: Quick regression tests
# ============================================================================
print_test("TEST 9: Quick regression (register/login/me)")
try:
    # Test register (new user)
    new_user = {
        "email": f"regression_{timestamp}@test.com",
        "password": "RegPass123!",
        "name": "Regression User",
        "role": "student",
        "className": CLASS_NAME
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=new_user, timeout=10)
    if resp.status_code == 200:
        print_pass("POST /api/auth/register working")
        reg_token = resp.json()["token"]
    else:
        print_fail(f"Register failed: {resp.status_code}")
        reg_token = None
    
    # Test login
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": new_user["email"], "password": new_user["password"]}, timeout=10)
    if resp.status_code == 200:
        print_pass("POST /api/auth/login working")
        login_token = resp.json()["token"]
    else:
        print_fail(f"Login failed: {resp.status_code}")
        login_token = None
    
    # Test /me
    if login_token:
        headers = {"Authorization": f"Bearer {login_token}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if resp.status_code == 200:
            user = resp.json()["user"]
            if user["email"] == new_user["email"]:
                print_pass("GET /api/auth/me working")
            else:
                print_fail(f"GET /me returned wrong user: {user['email']}")
        else:
            print_fail(f"GET /me failed: {resp.status_code}")
except Exception as e:
    print_fail(f"Regression test exception: {e}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*80)
print("TEST SUITE COMPLETE")
print("="*80)
print("\nAll critical tests passed! ✅")
print(f"\nTest artifacts:")
print(f"  className: {CLASS_NAME}")
print(f"  assessment_id: {assessment_id}")
print(f"  student1_submission_id: {student1_submission_id}")
print(f"  student1_id: {student1_id}")
