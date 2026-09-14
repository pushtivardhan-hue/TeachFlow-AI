#!/usr/bin/env python3
"""
Backend API Test Suite for AI-Assisted Teacher Automation Platform
Tests all backend endpoints end-to-end with proper RBAC validation
"""

import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "https://teach-ai-grade.preview.emergentagent.com/api"
TIMESTAMP = int(time.time())

# Test data storage
test_data = {
    'superadmin': {},
    'teacher': {},
    'student1': {},
    'student2': {},
    'assessment': {},
    'submission': {},
    'questions': []
}

def log_test(group, test_name, passed, details=""):
    """Log test results"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status} [{group}] {test_name}")
    if details:
        print(f"   Details: {details}")
    return passed

def test_auth_and_rbac():
    """Test 1: AUTH & RBAC"""
    print("\n" + "="*80)
    print("TEST GROUP 1: AUTH & RBAC")
    print("="*80)
    
    results = []
    
    # 1.1 Register superadmin
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
                'email': payload['email'],
                'password': payload['password']
            }
            results.append(log_test("AUTH", "Register superadmin", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("AUTH", "Register superadmin", False, f"Status {resp.status_code}: {resp.text}"))
    except Exception as e:
        results.append(log_test("AUTH", "Register superadmin", False, str(e)))
    
    # 1.2 Register teacher
    try:
        payload = {
            "name": "Sarah Johnson",
            "email": f"teacher_{TIMESTAMP}@test.com",
            "password": "Teacher@123",
            "role": "teacher",
            "className": "8A",
            "subject": "Science"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            test_data['teacher'] = {
                'token': data.get('token'),
                'user': data.get('user'),
                'email': payload['email'],
                'password': payload['password']
            }
            results.append(log_test("AUTH", "Register teacher", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("AUTH", "Register teacher", False, f"Status {resp.status_code}: {resp.text}"))
    except Exception as e:
        results.append(log_test("AUTH", "Register teacher", False, str(e)))
    
    # 1.3 Register student 1
    try:
        payload = {
            "name": "Rahul Sharma",
            "email": f"student1_{TIMESTAMP}@test.com",
            "password": "Student@123",
            "role": "student",
            "className": "8A",
            "rollNo": "1"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            test_data['student1'] = {
                'token': data.get('token'),
                'user': data.get('user'),
                'email': payload['email'],
                'password': payload['password']
            }
            results.append(log_test("AUTH", "Register student 1", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("AUTH", "Register student 1", False, f"Status {resp.status_code}: {resp.text}"))
    except Exception as e:
        results.append(log_test("AUTH", "Register student 1", False, str(e)))
    
    # 1.4 Register student 2
    try:
        payload = {
            "name": "Priya Patel",
            "email": f"student2_{TIMESTAMP}@test.com",
            "password": "Student@123",
            "role": "student",
            "className": "8A",
            "rollNo": "2"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            test_data['student2'] = {
                'token': data.get('token'),
                'user': data.get('user'),
                'email': payload['email'],
                'password': payload['password']
            }
            results.append(log_test("AUTH", "Register student 2", True, f"User ID: {data['user']['id']}"))
        else:
            results.append(log_test("AUTH", "Register student 2", False, f"Status {resp.status_code}: {resp.text}"))
    except Exception as e:
        results.append(log_test("AUTH", "Register student 2", False, str(e)))
    
    # 1.5 Login with teacher credentials
    try:
        payload = {
            "email": test_data['teacher']['email'],
            "password": test_data['teacher']['password']
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if 'token' in data and 'user' in data:
                results.append(log_test("AUTH", "Login teacher", True, f"Token received, role: {data['user']['role']}"))
            else:
                results.append(log_test("AUTH", "Login teacher", False, "Missing token or user in response"))
        else:
            results.append(log_test("AUTH", "Login teacher", False, f"Status {resp.status_code}: {resp.text}"))
    except Exception as e:
        results.append(log_test("AUTH", "Login teacher", False, str(e)))
    
    # 1.6 GET /auth/me with teacher token
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('user', {}).get('role') == 'teacher':
                results.append(log_test("AUTH", "GET /auth/me", True, f"User: {data['user']['name']}"))
            else:
                results.append(log_test("AUTH", "GET /auth/me", False, "Wrong user data"))
        else:
            results.append(log_test("AUTH", "GET /auth/me", False, f"Status {resp.status_code}: {resp.text}"))
    except Exception as e:
        results.append(log_test("AUTH", "GET /auth/me", False, str(e)))
    
    # 1.7 RBAC: Student tries GET /users (should be 403)
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        resp = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        if resp.status_code == 403:
            results.append(log_test("RBAC", "Student GET /users -> 403", True, "Correctly forbidden"))
        else:
            results.append(log_test("RBAC", "Student GET /users -> 403", False, f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("RBAC", "Student GET /users -> 403", False, str(e)))
    
    # 1.8 RBAC: Student tries POST /ai/generate (should be 403)
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        payload = {"className": "8A", "subject": "Science", "theme": "Test", "difficulty": "Easy"}
        resp = requests.post(f"{BASE_URL}/ai/generate", json=payload, headers=headers, timeout=10)
        if resp.status_code == 403:
            results.append(log_test("RBAC", "Student POST /ai/generate -> 403", True, "Correctly forbidden"))
        else:
            results.append(log_test("RBAC", "Student POST /ai/generate -> 403", False, f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("RBAC", "Student POST /ai/generate -> 403", False, str(e)))
    
    # 1.9 RBAC: Student tries GET /admin/stats (should be 403)
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        resp = requests.get(f"{BASE_URL}/admin/stats", headers=headers, timeout=10)
        if resp.status_code == 403:
            results.append(log_test("RBAC", "Student GET /admin/stats -> 403", True, "Correctly forbidden"))
        else:
            results.append(log_test("RBAC", "Student GET /admin/stats -> 403", False, f"Expected 403, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("RBAC", "Student GET /admin/stats -> 403", False, str(e)))
    
    # 1.10 RBAC: Missing token on protected route (should be 401)
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        if resp.status_code == 401:
            results.append(log_test("RBAC", "Missing token -> 401", True, "Correctly unauthorized"))
        else:
            results.append(log_test("RBAC", "Missing token -> 401", False, f"Expected 401, got {resp.status_code}"))
    except Exception as e:
        results.append(log_test("RBAC", "Missing token -> 401", False, str(e)))
    
    return all(results)

def test_ai_exam_generation():
    """Test 2: AI EXAM GENERATION"""
    print("\n" + "="*80)
    print("TEST GROUP 2: AI EXAM GENERATION (OpenAI GPT-4o)")
    print("="*80)
    
    results = []
    
    # 2.1 Generate exam with teacher token
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        payload = {
            "className": "8A",
            "subject": "Science",
            "theme": "Photosynthesis",
            "difficulty": "Medium",
            "syllabus": "Basics of photosynthesis in plants",
            "counts": {
                "mcq": 2,
                "fill_blank": 1,
                "descriptive": 1
            }
        }
        print("   Calling OpenAI GPT-4o (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/ai/generate", json=payload, headers=headers, timeout=90)
        
        if resp.status_code == 200:
            data = resp.json()
            result = data.get('result', {})
            questions = result.get('questions', [])
            
            # Store questions for later use
            test_data['questions'] = questions
            
            # Validate response structure
            if len(questions) == 4:
                results.append(log_test("AI_GEN", "Generated 4 questions", True, f"MCQ: 2, Fill: 1, Desc: 1"))
            else:
                results.append(log_test("AI_GEN", "Generated 4 questions", False, f"Got {len(questions)} questions"))
            
            # Validate question types
            types = [q.get('type') for q in questions]
            mcq_count = types.count('mcq')
            fill_count = types.count('fill_blank')
            desc_count = types.count('descriptive')
            
            if mcq_count == 2 and fill_count == 1 and desc_count == 1:
                results.append(log_test("AI_GEN", "Correct question types", True, f"MCQ:{mcq_count}, Fill:{fill_count}, Desc:{desc_count}"))
            else:
                results.append(log_test("AI_GEN", "Correct question types", False, f"MCQ:{mcq_count}, Fill:{fill_count}, Desc:{desc_count}"))
            
            # Validate MCQ structure
            mcq_valid = True
            for q in questions:
                if q.get('type') == 'mcq':
                    if not q.get('learningOutcome'):
                        mcq_valid = False
                        break
                    if not q.get('marks'):
                        mcq_valid = False
                        break
                    options = q.get('options', [])
                    if len(options) != 4:
                        mcq_valid = False
                        break
                    answer = q.get('answer', '')
                    if answer not in options:
                        mcq_valid = False
                        break
            
            results.append(log_test("AI_GEN", "MCQ structure valid", mcq_valid, "Has learningOutcome, marks, 4 options, answer in options"))
            
            # Validate all questions have required fields
            all_valid = True
            for q in questions:
                if not all([q.get('learningOutcome'), q.get('marks'), q.get('type')]):
                    all_valid = False
                    break
            
            results.append(log_test("AI_GEN", "All questions have required fields", all_valid, "learningOutcome, marks, type"))
            
        else:
            results.append(log_test("AI_GEN", "Generate exam", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("AI_GEN", "Generate exam", False, str(e)))
    
    return all(results)

def test_assessments():
    """Test 3: ASSESSMENTS"""
    print("\n" + "="*80)
    print("TEST GROUP 3: ASSESSMENTS")
    print("="*80)
    
    results = []
    
    # 3.1 Create assessment with generated questions
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        payload = {
            "title": "Photosynthesis Assessment",
            "className": "8A",
            "subject": "Science",
            "theme": "Photosynthesis",
            "difficulty": "Medium",
            "learningOutcomes": [
                "Understand the process of photosynthesis",
                "Identify key components in photosynthesis",
                "Explain the importance of photosynthesis"
            ],
            "questions": test_data['questions'],
            "published": True
        }
        resp = requests.post(f"{BASE_URL}/assessments", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            assessment = data.get('assessment', {})
            test_data['assessment'] = assessment
            
            if assessment.get('id') and assessment.get('totalMarks'):
                results.append(log_test("ASSESSMENT", "Create assessment", True, f"ID: {assessment['id']}, Total: {assessment['totalMarks']} marks"))
            else:
                results.append(log_test("ASSESSMENT", "Create assessment", False, "Missing id or totalMarks"))
        else:
            results.append(log_test("ASSESSMENT", "Create assessment", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ASSESSMENT", "Create assessment", False, str(e)))
    
    # 3.2 GET assessments as teacher
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        resp = requests.get(f"{BASE_URL}/assessments", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            assessments = data.get('assessments', [])
            found = any(a.get('id') == test_data['assessment'].get('id') for a in assessments)
            has_submission_count = any('submissionCount' in a for a in assessments)
            
            if found and has_submission_count:
                results.append(log_test("ASSESSMENT", "GET assessments (teacher)", True, f"Found {len(assessments)} assessments with submissionCount"))
            else:
                results.append(log_test("ASSESSMENT", "GET assessments (teacher)", False, f"Found: {found}, Has submissionCount: {has_submission_count}"))
        else:
            results.append(log_test("ASSESSMENT", "GET assessments (teacher)", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ASSESSMENT", "GET assessments (teacher)", False, str(e)))
    
    # 3.3 GET single assessment as teacher (should include answers)
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        assessment_id = test_data['assessment'].get('id')
        resp = requests.get(f"{BASE_URL}/assessments/{assessment_id}", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            assessment = data.get('assessment', {})
            questions = assessment.get('questions', [])
            has_answers = any('answer' in q for q in questions)
            
            if has_answers:
                results.append(log_test("ASSESSMENT", "GET assessment/:id (teacher)", True, "Questions include answers"))
            else:
                results.append(log_test("ASSESSMENT", "GET assessment/:id (teacher)", False, "Questions missing answers"))
        else:
            results.append(log_test("ASSESSMENT", "GET assessment/:id (teacher)", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ASSESSMENT", "GET assessment/:id (teacher)", False, str(e)))
    
    # 3.4 Verify question bank populated
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        resp = requests.get(f"{BASE_URL}/questions", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            questions = data.get('questions', [])
            
            if len(questions) >= 4:
                results.append(log_test("ASSESSMENT", "Question bank populated", True, f"Found {len(questions)} questions"))
            else:
                results.append(log_test("ASSESSMENT", "Question bank populated", False, f"Only {len(questions)} questions"))
        else:
            results.append(log_test("ASSESSMENT", "Question bank populated", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ASSESSMENT", "Question bank populated", False, str(e)))
    
    return all(results)

def test_student_flow():
    """Test 4: STUDENT FLOW"""
    print("\n" + "="*80)
    print("TEST GROUP 4: STUDENT FLOW")
    print("="*80)
    
    results = []
    
    # 4.1 GET assessments as student (answers should be stripped)
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        resp = requests.get(f"{BASE_URL}/assessments", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            assessments = data.get('assessments', [])
            found = any(a.get('id') == test_data['assessment'].get('id') for a in assessments)
            
            # Check if answers are stripped
            answers_stripped = True
            for a in assessments:
                for q in a.get('questions', []):
                    if 'answer' in q:
                        answers_stripped = False
                        break
            
            if found and answers_stripped:
                results.append(log_test("STUDENT", "GET assessments (answers stripped)", True, f"Found assessment, answers not exposed"))
            else:
                results.append(log_test("STUDENT", "GET assessments (answers stripped)", False, f"Found: {found}, Stripped: {answers_stripped}"))
        else:
            results.append(log_test("STUDENT", "GET assessments (answers stripped)", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("STUDENT", "GET assessments (answers stripped)", False, str(e)))
    
    # 4.2 Submit answers as student
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        
        # Build answers - use correct answers for objective questions
        answers = {}
        for q in test_data['questions']:
            if q.get('type') == 'mcq':
                # Use the correct answer
                answers[q['id']] = q.get('answer', '')
            elif q.get('type') == 'fill_blank':
                # Use the correct answer
                answers[q['id']] = q.get('answer', '')
            elif q.get('type') == 'descriptive':
                # Provide a text answer
                answers[q['id']] = "Photosynthesis is the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water. It involves chlorophyll and generates oxygen as a byproduct. This process is essential for life on Earth as it produces oxygen and forms the base of the food chain."
        
        payload = {
            "assessmentId": test_data['assessment'].get('id'),
            "answers": answers
        }
        resp = requests.post(f"{BASE_URL}/submissions", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            submission = data.get('submission', {})
            test_data['submission'] = submission
            
            # Verify objective score computed
            objective_score = submission.get('objectiveScore', 0)
            status = submission.get('status')
            
            if submission.get('id') and status == 'submitted' and objective_score > 0:
                results.append(log_test("STUDENT", "Submit answers", True, f"ID: {submission['id']}, Objective: {objective_score}, Status: {status}"))
            else:
                results.append(log_test("STUDENT", "Submit answers", False, f"ID: {submission.get('id')}, Score: {objective_score}, Status: {status}"))
        else:
            results.append(log_test("STUDENT", "Submit answers", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("STUDENT", "Submit answers", False, str(e)))
    
    return all(results)

def test_teacher_evaluation():
    """Test 5: TEACHER EVALUATION"""
    print("\n" + "="*80)
    print("TEST GROUP 5: TEACHER EVALUATION")
    print("="*80)
    
    results = []
    
    # 5.1 GET submissions by assessment
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        assessment_id = test_data['assessment'].get('id')
        resp = requests.get(f"{BASE_URL}/submissions?assessmentId={assessment_id}", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            submissions = data.get('submissions', [])
            found = any(s.get('id') == test_data['submission'].get('id') for s in submissions)
            
            if found:
                results.append(log_test("TEACHER_EVAL", "GET submissions by assessment", True, f"Found {len(submissions)} submissions"))
            else:
                results.append(log_test("TEACHER_EVAL", "GET submissions by assessment", False, "Submission not found"))
        else:
            results.append(log_test("TEACHER_EVAL", "GET submissions by assessment", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("TEACHER_EVAL", "GET submissions by assessment", False, str(e)))
    
    # 5.2 AI grade submission
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        submission_id = test_data['submission'].get('id')
        print("   Calling OpenAI for AI grading (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/submissions/{submission_id}/aigrade", headers=headers, timeout=90)
        
        if resp.status_code == 200:
            data = resp.json()
            submission = data.get('submission', {})
            test_data['submission'] = submission  # Update with AI grades
            
            ai_grades = submission.get('ai', {})
            status = submission.get('status')
            
            # Check if descriptive questions have AI grades
            has_ai_grades = len(ai_grades) > 0
            has_score = any('score' in g for g in ai_grades.values())
            has_feedback = any('feedback' in g for g in ai_grades.values())
            
            if status == 'ai_graded' and has_ai_grades and has_score and has_feedback:
                results.append(log_test("TEACHER_EVAL", "AI grade submission", True, f"Status: {status}, AI grades: {len(ai_grades)}"))
            else:
                results.append(log_test("TEACHER_EVAL", "AI grade submission", False, f"Status: {status}, Grades: {has_ai_grades}, Score: {has_score}, Feedback: {has_feedback}"))
        else:
            results.append(log_test("TEACHER_EVAL", "AI grade submission", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("TEACHER_EVAL", "AI grade submission", False, str(e)))
    
    # 5.3 Approve submission
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        submission_id = test_data['submission'].get('id')
        
        # Build finalScores for descriptive questions
        final_scores = {}
        for q in test_data['questions']:
            if q.get('type') == 'descriptive':
                # Use AI suggested score
                ai_grade = test_data['submission'].get('ai', {}).get(q['id'], {})
                final_scores[q['id']] = ai_grade.get('score', 0)
        
        payload = {"finalScores": final_scores}
        resp = requests.post(f"{BASE_URL}/submissions/{submission_id}/approve", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            submission = data.get('submission', {})
            test_data['submission'] = submission  # Update with approval
            
            status = submission.get('status')
            total_score = submission.get('totalScore', 0)
            
            if status == 'approved' and total_score > 0:
                results.append(log_test("TEACHER_EVAL", "Approve submission", True, f"Status: {status}, Total: {total_score}"))
            else:
                results.append(log_test("TEACHER_EVAL", "Approve submission", False, f"Status: {status}, Total: {total_score}"))
        else:
            results.append(log_test("TEACHER_EVAL", "Approve submission", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("TEACHER_EVAL", "Approve submission", False, str(e)))
    
    return all(results)

def test_analytics_and_admin():
    """Test 6: ANALYTICS & ADMIN"""
    print("\n" + "="*80)
    print("TEST GROUP 6: ANALYTICS & ADMIN")
    print("="*80)
    
    results = []
    
    # 6.1 GET assessment analytics
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        assessment_id = test_data['assessment'].get('id')
        resp = requests.get(f"{BASE_URL}/analytics/assessment/{assessment_id}", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            analytics = data.get('analytics', {})
            
            has_count = 'count' in analytics
            has_avg = 'avg' in analytics
            has_distribution = 'distribution' in analytics
            has_per_question = 'perQuestion' in analytics
            
            if has_count and has_avg and has_distribution and has_per_question:
                results.append(log_test("ANALYTICS", "GET assessment analytics", True, f"Count: {analytics.get('count')}, Avg: {analytics.get('avg'):.2f}"))
            else:
                results.append(log_test("ANALYTICS", "GET assessment analytics", False, f"Count: {has_count}, Avg: {has_avg}, Dist: {has_distribution}, PerQ: {has_per_question}"))
        else:
            results.append(log_test("ANALYTICS", "GET assessment analytics", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ANALYTICS", "GET assessment analytics", False, str(e)))
    
    # 6.2 POST insights (AI mistake detection)
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        assessment_id = test_data['assessment'].get('id')
        print("   Calling OpenAI for insights generation (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/analytics/insights/{assessment_id}", headers=headers, timeout=90)
        
        if resp.status_code == 200:
            data = resp.json()
            insights = data.get('insights', {})
            
            has_mistakes = 'commonMistakes' in insights
            has_remedial = 'remedialTopics' in insights
            mistakes_is_array = isinstance(insights.get('commonMistakes'), list)
            remedial_is_array = isinstance(insights.get('remedialTopics'), list)
            
            if has_mistakes and has_remedial and mistakes_is_array and remedial_is_array:
                results.append(log_test("ANALYTICS", "POST insights", True, f"Mistakes: {len(insights['commonMistakes'])}, Remedial: {len(insights['remedialTopics'])}"))
            else:
                results.append(log_test("ANALYTICS", "POST insights", False, f"Mistakes: {has_mistakes}, Remedial: {has_remedial}"))
        else:
            results.append(log_test("ANALYTICS", "POST insights", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ANALYTICS", "POST insights", False, str(e)))
    
    # 6.3 GET student history
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        student_id = test_data['student1']['user']['id']
        resp = requests.get(f"{BASE_URL}/analytics/student/{student_id}", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            history = data.get('history', [])
            
            if isinstance(history, list) and len(history) > 0:
                results.append(log_test("ANALYTICS", "GET student history", True, f"Found {len(history)} submissions"))
            else:
                results.append(log_test("ANALYTICS", "GET student history", False, f"History: {len(history) if isinstance(history, list) else 'not array'}"))
        else:
            results.append(log_test("ANALYTICS", "GET student history", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ANALYTICS", "GET student history", False, str(e)))
    
    # 6.4 GET admin stats (superadmin)
    try:
        headers = {"Authorization": f"Bearer {test_data['superadmin']['token']}"}
        resp = requests.get(f"{BASE_URL}/admin/stats", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            stats = data.get('stats', {})
            
            has_teachers = 'teachers' in stats
            has_students = 'students' in stats
            has_assessments = 'assessments' in stats
            has_submissions = 'submissions' in stats
            
            if has_teachers and has_students and has_assessments and has_submissions:
                results.append(log_test("ADMIN", "GET admin stats", True, f"Teachers: {stats['teachers']}, Students: {stats['students']}, Assessments: {stats['assessments']}"))
            else:
                results.append(log_test("ADMIN", "GET admin stats", False, "Missing required stats fields"))
        else:
            results.append(log_test("ADMIN", "GET admin stats", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ADMIN", "GET admin stats", False, str(e)))
    
    return all(results)

def test_alerts():
    """Test 7: ALERTS"""
    print("\n" + "="*80)
    print("TEST GROUP 7: ALERTS")
    print("="*80)
    
    results = []
    
    # 7.1 POST alert (teacher)
    try:
        headers = {"Authorization": f"Bearer {test_data['teacher']['token']}"}
        payload = {
            "className": "8A",
            "message": "Test reminder: Complete your Photosynthesis assessment by Friday"
        }
        resp = requests.post(f"{BASE_URL}/alerts", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            sent = data.get('sent', 0)
            
            if sent > 0:
                results.append(log_test("ALERTS", "POST alert", True, f"Sent to {sent} students"))
            else:
                results.append(log_test("ALERTS", "POST alert", False, "No alerts sent"))
        else:
            results.append(log_test("ALERTS", "POST alert", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ALERTS", "POST alert", False, str(e)))
    
    # 7.2 GET alerts (student) - should include assignment alert + manual alert
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        resp = requests.get(f"{BASE_URL}/alerts", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            alerts = data.get('alerts', [])
            
            # Should have at least 2 alerts: assignment alert + manual reminder
            has_assignment = any(a.get('type') == 'assignment' for a in alerts)
            has_manual = any('reminder' in a.get('message', '').lower() for a in alerts)
            
            if len(alerts) >= 2 and has_assignment:
                results.append(log_test("ALERTS", "GET alerts (student)", True, f"Found {len(alerts)} alerts including assignment alert"))
            else:
                results.append(log_test("ALERTS", "GET alerts (student)", False, f"Alerts: {len(alerts)}, Assignment: {has_assignment}, Manual: {has_manual}"))
        else:
            results.append(log_test("ALERTS", "GET alerts (student)", False, f"Status {resp.status_code}: {resp.text[:200]}"))
    except Exception as e:
        results.append(log_test("ALERTS", "GET alerts (student)", False, str(e)))
    
    # 7.3 Mark alert as read
    try:
        headers = {"Authorization": f"Bearer {test_data['student1']['token']}"}
        # Get first alert
        resp = requests.get(f"{BASE_URL}/alerts", headers=headers, timeout=10)
        if resp.status_code == 200:
            alerts = resp.json().get('alerts', [])
            if alerts:
                alert_id = alerts[0].get('id')
                resp = requests.post(f"{BASE_URL}/alerts/{alert_id}/read", headers=headers, timeout=10)
                
                if resp.status_code == 200:
                    results.append(log_test("ALERTS", "Mark alert as read", True, f"Alert {alert_id} marked read"))
                else:
                    results.append(log_test("ALERTS", "Mark alert as read", False, f"Status {resp.status_code}"))
            else:
                results.append(log_test("ALERTS", "Mark alert as read", False, "No alerts to mark"))
        else:
            results.append(log_test("ALERTS", "Mark alert as read", False, "Could not fetch alerts"))
    except Exception as e:
        results.append(log_test("ALERTS", "Mark alert as read", False, str(e)))
    
    return all(results)

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("BACKEND API TEST SUITE")
    print("AI-Assisted Teacher Automation Platform")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {TIMESTAMP}")
    print("="*80)
    
    start_time = time.time()
    
    # Run all test groups
    results = {
        'auth_rbac': test_auth_and_rbac(),
        'ai_generation': test_ai_exam_generation(),
        'assessments': test_assessments(),
        'student_flow': test_student_flow(),
        'teacher_eval': test_teacher_evaluation(),
        'analytics_admin': test_analytics_and_admin(),
        'alerts': test_alerts()
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
    
    # Return exit code
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    exit(main())
