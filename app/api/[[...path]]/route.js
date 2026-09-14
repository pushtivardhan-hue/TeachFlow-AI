import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { generateExam, gradeAnswer, generateInsights } from '@/lib/ai'
import { hashPassword, verifyPassword, signToken, verifyToken, sanitizeUser } from '@/lib/authServer'

// ---------------- MongoDB ----------------
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// ---------------- Helpers ----------------
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

function json(body, status = 200) {
  return handleCORS(NextResponse.json(body, { status }))
}

const clean = (doc) => {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

async function getAuthUser(request, db) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const user = await db.collection('users').findOne({ id: payload.id })
  return user || null
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ---------------- Router ----------------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // ===== Health =====
    if (route === '/' || route === '/root') {
      return json({ message: 'Teacher AI API running' })
    }

    // ===== AUTH =====
    if (route === '/auth/register' && method === 'POST') {
      const body = await request.json()
      const { name, email, password, role } = body
      if (!name || !email || !password || !role) return json({ error: 'name, email, password, role required' }, 400)
      if (!['superadmin', 'teacher', 'student'].includes(role)) return json({ error: 'invalid role' }, 400)
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return json({ error: 'Email already registered' }, 409)
      const user = {
        id: uuidv4(),
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        role,
        className: body.className || '',
        subject: body.subject || '',
        rollNo: body.rollNo || '',
        school: body.school || '',
        guardian: body.guardian || '',
        preferences: body.preferences || {},
        active: true,
        createdAt: new Date(),
      }
      await db.collection('users').insertOne(user)
      const token = signToken(user)
      return json({ token, user: sanitizeUser(user) })
    }

    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body
      if (!email || !password) return json({ error: 'email and password required' }, 400)
      const user = await db.collection('users').findOne({ email: (email || '').toLowerCase() })
      if (!user || !verifyPassword(password, user.passwordHash)) return json({ error: 'Invalid credentials' }, 401)
      const token = signToken(user)
      return json({ token, user: sanitizeUser(user) })
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getAuthUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, 401)
      return json({ user: sanitizeUser(user) })
    }

    // From here on, most routes require auth
    const me = await getAuthUser(request, db)

    // ===== USERS / STUDENT MANAGEMENT =====
    if (route === '/users' && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const url = new URL(request.url)
      const role = url.searchParams.get('role')
      const className = url.searchParams.get('className')
      const query = {}
      if (role) query.role = role
      if (className) query.className = className
      if (me.role === 'teacher') query.role = 'student'
      if (me.role === 'student') return json({ error: 'Forbidden' }, 403)
      const users = await db.collection('users').find(query).sort({ createdAt: -1 }).limit(500).toArray()
      return json({ users: users.map((u) => sanitizeUser(u)) })
    }

    if (route === '/users' && method === 'POST') {
      if (!me || !['superadmin', 'teacher'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const { name, email, password, role } = body
      if (!name || !email || !password || !role) return json({ error: 'name, email, password, role required' }, 400)
      if (me.role === 'teacher' && role !== 'student') return json({ error: 'Teachers can only add students' }, 403)
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return json({ error: 'Email already registered' }, 409)
      const user = {
        id: uuidv4(),
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        role,
        className: body.className || '',
        subject: body.subject || '',
        rollNo: body.rollNo || '',
        school: body.school || '',
        guardian: body.guardian || '',
        preferences: {},
        active: true,
        createdAt: new Date(),
        createdBy: me.id,
      }
      await db.collection('users').insertOne(user)
      return json({ user: sanitizeUser(user) })
    }

    if (route.startsWith('/users/') && method === 'PUT') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const id = path[1]
      const body = await request.json()
      if (me.role === 'student' && me.id !== id) return json({ error: 'Forbidden' }, 403)
      const allowed = ['name', 'className', 'subject', 'rollNo', 'school', 'guardian', 'preferences', 'active']
      const update = {}
      for (const k of allowed) if (k in body) update[k] = body[k]
      if (body.password) update.passwordHash = hashPassword(body.password)
      update.updatedAt = new Date()
      await db.collection('users').updateOne({ id }, { $set: update })
      const user = await db.collection('users').findOne({ id })
      return json({ user: sanitizeUser(user) })
    }

    if (route.startsWith('/users/') && method === 'DELETE') {
      if (!me || me.role !== 'superadmin') return json({ error: 'Forbidden' }, 403)
      const id = path[1]
      await db.collection('users').deleteOne({ id })
      return json({ ok: true })
    }

    // ===== AI: generate exam =====
    if (route === '/ai/generate' && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const { className, subject, syllabus, theme, difficulty } = body
      if (!className || !subject || !theme || !difficulty) return json({ error: 'className, subject, theme, difficulty required' }, 400)
      const learningOutcomes = Array.isArray(body.learningOutcomes) && body.learningOutcomes.length
        ? body.learningOutcomes
        : ['Understand core concepts of ' + theme, 'Apply knowledge of ' + theme, 'Analyze problems related to ' + theme]
      const result = await generateExam({
        className, subject, syllabus: syllabus || theme, theme, difficulty,
        learningOutcomes,
        counts: body.counts || { mcq: 4, fill_blank: 3, descriptive: 3 },
      })
      const questions = (result.questions || []).map((q) => ({ ...q, id: uuidv4() }))
      return json({ result: { ...result, questions } })
    }

    // ===== AI: regenerate a single question =====
    if (route === '/ai/regenerate' && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const { className, subject, syllabus, theme, difficulty, type } = body
      if (!subject || !theme || !type) return json({ error: 'subject, theme, type required' }, 400)
      const counts = { mcq: 0, fill_blank: 0, descriptive: 0 }
      counts[type] = 1
      const learningOutcomes = Array.isArray(body.learningOutcomes) && body.learningOutcomes.length
        ? body.learningOutcomes : ['Understand ' + theme, 'Apply ' + theme, 'Analyze ' + theme]
      const result = await generateExam({
        className: className || 'General', subject, syllabus: syllabus || theme, theme,
        difficulty: difficulty || 'Medium', learningOutcomes, counts,
      })
      const q = (result.questions || [])[0]
      if (!q) return json({ error: 'Could not regenerate' }, 502)
      return json({ question: { ...q, id: uuidv4() } })
    }

    // ===== AI: grade single answer =====
    if (route === '/ai/grade' && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const result = await gradeAnswer(body)
      return json({ result })
    }

    // ===== QUESTION BANK =====
    if (route === '/questions' && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const url = new URL(request.url)
      const q = {}
      for (const k of ['subject', 'className', 'theme', 'difficulty', 'type']) {
        const v = url.searchParams.get(k)
        if (v) q[k] = v
      }
      const items = await db.collection('questions').find(q).sort({ createdAt: -1 }).limit(500).toArray()
      return json({ questions: items.map(clean) })
    }

    if (route === '/questions' && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const items = (body.questions || []).map((qq) => ({
        id: uuidv4(),
        className: body.className || '',
        subject: body.subject || '',
        theme: body.theme || '',
        difficulty: qq.difficulty || body.difficulty || '',
        type: qq.type,
        question: qq.question,
        options: qq.options || [],
        answer: qq.answer || '',
        rubric: qq.rubric || [],
        marks: qq.marks || 1,
        learningOutcome: qq.learningOutcome || '',
        explanation: qq.explanation || '',
        createdBy: me.id,
        createdAt: new Date(),
      }))
      if (items.length) await db.collection('questions').insertMany(items)
      return json({ saved: items.length, questions: items })
    }

    if (route.startsWith('/questions/') && method === 'DELETE') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      await db.collection('questions').deleteOne({ id: path[1] })
      return json({ ok: true })
    }

    // ===== ASSESSMENTS =====
    if (route === '/assessments' && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const questions = (body.questions || []).map((q) => ({ ...q, id: q.id || uuidv4() }))
      const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
      const assessment = {
        id: uuidv4(),
        title: body.title || 'Untitled Assessment',
        className: body.className || '',
        subject: body.subject || '',
        syllabus: body.syllabus || '',
        theme: body.theme || '',
        difficulty: body.difficulty || '',
        learningOutcomes: body.learningOutcomes || [],
        questions,
        totalMarks,
        assignedTo: body.assignedTo || [],
        dueDate: body.dueDate || '',
        published: body.published !== false,
        createdBy: me.id,
        createdByName: me.name,
        createdAt: new Date(),
      }
      await db.collection('assessments').insertOne(assessment)

      const bankItems = questions.map((qq) => ({
        id: uuidv4(),
        className: assessment.className,
        subject: assessment.subject,
        theme: assessment.theme,
        difficulty: qq.difficulty || assessment.difficulty,
        type: qq.type,
        question: qq.question,
        options: qq.options || [],
        answer: qq.answer || '',
        rubric: qq.rubric || [],
        marks: qq.marks || 1,
        learningOutcome: qq.learningOutcome || '',
        explanation: qq.explanation || '',
        createdBy: me.id,
        assessmentId: assessment.id,
        createdAt: new Date(),
      }))
      if (bankItems.length) await db.collection('questions').insertMany(bankItems)

      await createAssignmentAlerts(db, assessment)

      return json({ assessment: clean(assessment) })
    }

    if (route === '/assessments' && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      let list = []
      if (me.role === 'student') {
        list = await db.collection('assessments').find({
          published: true,
          className: me.className,
          $or: [{ assignedTo: { $size: 0 } }, { assignedTo: me.id }],
        }).sort({ createdAt: -1 }).limit(200).toArray()
        const subs = await db.collection('submissions').find({ studentId: me.id }).toArray()
        const byAssessment = {}
        subs.forEach((s) => { byAssessment[s.assessmentId] = s })
        list = list.map((a) => ({
          ...clean(a),
          questions: a.questions.map((q) => ({ id: q.id, type: q.type, question: q.question, marks: q.marks, options: q.options })),
          mySubmission: byAssessment[a.id] ? { id: byAssessment[a.id].id, status: byAssessment[a.id].status, totalScore: byAssessment[a.id].totalScore } : null,
        }))
        return json({ assessments: list })
      }
      const q = me.role === 'teacher' ? { createdBy: me.id } : {}
      list = await db.collection('assessments').find(q).sort({ createdAt: -1 }).limit(200).toArray()
      const out = []
      for (const a of list) {
        const subCount = await db.collection('submissions').countDocuments({ assessmentId: a.id })
        out.push({ ...clean(a), submissionCount: subCount })
      }
      return json({ assessments: out })
    }

    if (route.startsWith('/assessments/') && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const id = path[1]
      const a = await db.collection('assessments').findOne({ id })
      if (!a) return json({ error: 'Not found' }, 404)
      if (me.role === 'student') {
        return json({ assessment: {
          ...clean(a),
          questions: a.questions.map((q) => ({ id: q.id, type: q.type, question: q.question, marks: q.marks, options: q.options })),
        } })
      }
      return json({ assessment: clean(a) })
    }

    if (route.startsWith('/assessments/') && method === 'DELETE') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      await db.collection('assessments').deleteOne({ id: path[1] })
      return json({ ok: true })
    }

    // ===== SUBMISSIONS =====
    if (route === '/submissions' && method === 'POST') {
      if (!me || me.role !== 'student') return json({ error: 'Only students can submit' }, 403)
      const body = await request.json()
      const a = await db.collection('assessments').findOne({ id: body.assessmentId })
      if (!a) return json({ error: 'Assessment not found' }, 404)
      const answers = body.answers || {}
      const objective = {}
      let objectiveScore = 0
      let totalMax = 0
      for (const q of a.questions) {
        totalMax += Number(q.marks) || 0
        if (q.type === 'mcq' || q.type === 'fill_blank') {
          const given = (answers[q.id] || '').toString().trim().toLowerCase()
          const correct = (q.answer || '').toString().trim().toLowerCase()
          const isCorrect = given && given === correct
          objective[q.id] = { correct: !!isCorrect, awarded: isCorrect ? (Number(q.marks) || 0) : 0, max: Number(q.marks) || 0 }
          if (isCorrect) objectiveScore += Number(q.marks) || 0
        }
      }
      const existing = await db.collection('submissions').findOne({ assessmentId: a.id, studentId: me.id })
      if (existing) return json({ error: 'You have already submitted this assessment.', submission: clean(existing) }, 409)
      const sub = {
        id: existing ? existing.id : uuidv4(),
        assessmentId: a.id,
        assessmentTitle: a.title,
        subject: a.subject,
        className: a.className,
        studentId: me.id,
        studentName: me.name,
        rollNo: me.rollNo || '',
        answers,
        objective,
        ai: existing ? existing.ai || {} : {},
        finalScores: {},
        objectiveScore,
        descriptiveScore: 0,
        totalScore: objectiveScore,
        totalMax,
        status: 'submitted',
        submittedAt: new Date(),
      }
      await db.collection('submissions').replaceOne({ id: sub.id }, sub, { upsert: true })
      return json({ submission: clean(sub) })
    }

    if (route === '/submissions' && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const url = new URL(request.url)
      const assessmentId = url.searchParams.get('assessmentId')
      const mine = url.searchParams.get('mine')
      if (me.role === 'student' || mine) {
        const subs = await db.collection('submissions').find({ studentId: me.id }).sort({ submittedAt: -1 }).toArray()
        return json({ submissions: subs.map(clean) })
      }
      const q = assessmentId ? { assessmentId } : {}
      const subs = await db.collection('submissions').find(q).sort({ submittedAt: -1 }).limit(500).toArray()
      return json({ submissions: subs.map(clean) })
    }

    if (route.match(/^\/submissions\/[^/]+\/aigrade$/) && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const id = path[1]
      const sub = await db.collection('submissions').findOne({ id })
      if (!sub) return json({ error: 'Not found' }, 404)
      const a = await db.collection('assessments').findOne({ id: sub.assessmentId })
      const ai = { ...(sub.ai || {}) }
      for (const q of a.questions) {
        if (q.type !== 'descriptive') continue
        const studentAnswer = sub.answers[q.id] || ''
        try {
          const g = await gradeAnswer({
            question: q.question,
            referenceAnswer: q.answer,
            rubric: q.rubric || [],
            maxScore: Number(q.marks) || 5,
            studentAnswer,
          })
          ai[q.id] = { ...g, learningOutcome: q.learningOutcome || '', question: q.question }
        } catch (e) {
          ai[q.id] = { score: 0, maxScore: Number(q.marks) || 5, percentage: 0, feedback: 'AI grading failed, please grade manually.', strengths: [], improvements: [], rubricBreakdown: [], misconception: 'None detected', confidence: 0, remediation: null, learningOutcome: q.learningOutcome || '', question: q.question }
        }
      }
      const descriptiveScore = Object.values(ai).reduce((s, g) => s + (Number(g.score) || 0), 0)
      const totalScore = (sub.objectiveScore || 0) + descriptiveScore
      await db.collection('submissions').updateOne({ id }, { $set: { ai, descriptiveScore, totalScore, status: 'ai_graded', gradedAt: new Date(), gradedBy: me.id } })
      const updated = await db.collection('submissions').findOne({ id })
      return json({ submission: clean(updated) })
    }

    if (route.match(/^\/submissions\/[^/]+\/approve$/) && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const id = path[1]
      const body = await request.json()
      const sub = await db.collection('submissions').findOne({ id })
      if (!sub) return json({ error: 'Not found' }, 404)
      const a = await db.collection('assessments').findOne({ id: sub.assessmentId })
      const finalScores = body.finalScores || {}
      let total = 0
      for (const q of a.questions) {
        if (q.type === 'descriptive') {
          const v = q.id in finalScores ? Number(finalScores[q.id]) : (sub.ai?.[q.id]?.score ?? 0)
          total += Number(v) || 0
        } else {
          total += sub.objective?.[q.id]?.awarded || 0
        }
      }
      await db.collection('submissions').updateOne({ id }, { $set: { finalScores, totalScore: total, status: 'approved', approvedAt: new Date(), approvedBy: me.id } })
      const updated = await db.collection('submissions').findOne({ id })
      return json({ submission: clean(updated) })
    }

    // ===== ANALYTICS =====
    if (route.match(/^\/analytics\/assessment\/[^/]+$/) && method === 'GET') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const id = path[2]
      const a = await db.collection('assessments').findOne({ id })
      if (!a) return json({ error: 'Not found' }, 404)
      const subs = await db.collection('submissions').find({ assessmentId: id }).toArray()
      const count = subs.length
      const scores = subs.map((s) => s.totalScore || 0)
      const avg = count ? scores.reduce((x, y) => x + y, 0) / count : 0
      const max = count ? Math.max(...scores) : 0
      const min = count ? Math.min(...scores) : 0
      const perQuestion = a.questions.map((q) => {
        let correct = 0, attempts = 0
        const wrongAnswers = {}
        subs.forEach((s) => {
          if (q.type === 'descriptive') return
          const o = s.objective?.[q.id]
          if (o) { attempts++; if (o.correct) correct++; else { const ga = s.answers?.[q.id] || '(blank)'; wrongAnswers[ga] = (wrongAnswers[ga] || 0) + 1 } }
        })
        return { id: q.id, question: q.question, type: q.type, learningOutcome: q.learningOutcome, correct, attempts, wrongAnswers, correctAnswer: q.answer }
      })
      const totalMax = a.totalMarks || 1
      const buckets = { '0-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0 }
      scores.forEach((s) => {
        const p = (s / totalMax) * 100
        if (p < 40) buckets['0-40%']++
        else if (p < 60) buckets['40-60%']++
        else if (p < 80) buckets['60-80%']++
        else buckets['80-100%']++
      })
      return json({ analytics: { assessment: clean(a), count, avg, max, min, totalMax, perQuestion, distribution: buckets } })
    }

    if (route.match(/^\/analytics\/insights\/[^/]+$/) && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const id = path[2]
      const a = await db.collection('assessments').findOne({ id })
      if (!a) return json({ error: 'Not found' }, 404)
      const subs = await db.collection('submissions').find({ assessmentId: id }).toArray()
      const items = a.questions.map((q) => {
        const wrong = {}
        subs.forEach((s) => {
          const o = s.objective?.[q.id]
          if (o && !o.correct) { const ga = s.answers?.[q.id] || '(blank)'; wrong[ga] = (wrong[ga] || 0) + 1 }
        })
        return { question: q.question, learningOutcome: q.learningOutcome, correctAnswer: q.answer, type: q.type, commonWrongAnswers: wrong }
      })
      const insights = await generateInsights({ subject: a.subject, theme: a.theme, className: a.className, studentCount: subs.length, items })
      await db.collection('assessments').updateOne({ id }, { $set: { insights, insightsAt: new Date() } })
      return json({ insights })
    }

    if (route.match(/^\/analytics\/student\/[^/]+$/) && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const id = path[2]
      if (me.role === 'student' && me.id !== id) return json({ error: 'Forbidden' }, 403)
      const subs = await db.collection('submissions').find({ studentId: id }).sort({ submittedAt: 1 }).toArray()
      const history = subs.map((s) => ({
        assessmentTitle: s.assessmentTitle,
        subject: s.subject,
        totalScore: s.totalScore || 0,
        totalMax: s.totalMax || 0,
        percentage: s.totalMax ? Math.round(((s.totalScore || 0) / s.totalMax) * 100) : 0,
        status: s.status,
        date: s.submittedAt,
      }))

      // Topic strengths/weaknesses + personalized remediation
      const assessIds = [...new Set(subs.map((s) => s.assessmentId))]
      const assessments = assessIds.length ? await db.collection('assessments').find({ id: { $in: assessIds } }).toArray() : []
      const aMap = {}
      assessments.forEach((a) => { aMap[a.id] = a })
      const topicAgg = {}
      const remediation = []
      const seenConcepts = new Set()
      for (const s of subs) {
        const a = aMap[s.assessmentId]
        if (!a) continue
        for (const q of a.questions) {
          const topic = q.learningOutcome || a.theme || a.subject || 'General'
          const max = Number(q.marks) || 0
          let earned = 0
          if (q.type === 'descriptive') {
            earned = Number(s.finalScores?.[q.id] ?? s.ai?.[q.id]?.score ?? 0) || 0
            const rem = s.ai?.[q.id]?.remediation
            const weak = max > 0 && earned < max
            if (weak && rem && rem.concept && !seenConcepts.has(rem.concept)) {
              seenConcepts.add(rem.concept)
              remediation.push({ ...rem, misconception: s.ai?.[q.id]?.misconception || '', subject: a.subject })
            }
          } else {
            earned = Number(s.objective?.[q.id]?.awarded ?? 0) || 0
          }
          if (!topicAgg[topic]) topicAgg[topic] = { topic, earned: 0, possible: 0, subject: a.subject }
          topicAgg[topic].earned += earned
          topicAgg[topic].possible += max
        }
      }
      const topics = Object.values(topicAgg).map((t) => ({ ...t, percentage: t.possible ? Math.round((t.earned / t.possible) * 100) : 0 }))
      const sorted = [...topics].sort((x, y) => y.percentage - x.percentage)
      const strengths = sorted.filter((t) => t.percentage >= 70).slice(0, 4)
      const weaknesses = [...topics].sort((x, y) => x.percentage - y.percentage).filter((t) => t.percentage < 70).slice(0, 4)
      return json({ history, topics, strengths, weaknesses, remediation: remediation.slice(0, 6) })
    }

    // ===== TEACHER OVERVIEW (command center) =====
    if (route === '/teacher/overview' && method === 'GET') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const myAssessments = await db.collection('assessments').find(me.role === 'teacher' ? { createdBy: me.id } : {}).sort({ createdAt: -1 }).toArray()
      const ids = myAssessments.map((a) => a.id)
      const subs = ids.length ? await db.collection('submissions').find({ assessmentId: { $in: ids } }).sort({ submittedAt: -1 }).toArray() : []
      const pct = (s) => (s.totalMax ? (s.totalScore / s.totalMax) * 100 : 0)
      const avgClassScore = subs.length ? Math.round(subs.reduce((x, s) => x + pct(s), 0) / subs.length) : 0

      // per-assessment average (chart)
      const classPerformance = myAssessments.slice(0, 8).map((a) => {
        const asubs = subs.filter((s) => s.assessmentId === a.id)
        const avg = asubs.length ? Math.round(asubs.reduce((x, s) => x + pct(s), 0) / asubs.length) : 0
        return { name: (a.title || '').slice(0, 16), avg, submissions: asubs.length }
      }).reverse()

      // students needing attention (avg < 50%)
      const byStudent = {}
      subs.forEach((s) => {
        if (!byStudent[s.studentId]) byStudent[s.studentId] = { name: s.studentName, rollNo: s.rollNo, scores: [] }
        byStudent[s.studentId].scores.push(pct(s))
      })
      const needsAttention = Object.values(byStudent)
        .map((v) => ({ name: v.name, rollNo: v.rollNo, avg: Math.round(v.scores.reduce((x, y) => x + y, 0) / v.scores.length) }))
        .filter((v) => v.avg < 50)
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 6)

      const classNames = [...new Set(myAssessments.map((a) => a.className).filter(Boolean))]
      const studentQuery = { role: 'student' }
      if (me.role === 'teacher' && classNames.length) studentQuery.className = { $in: classNames }
      const totalStudents = await db.collection('users').countDocuments(studentQuery)

      const recentSubmissions = subs.slice(0, 6).map((s) => ({
        studentName: s.studentName, assessmentTitle: s.assessmentTitle,
        totalScore: s.totalScore, totalMax: s.totalMax, status: s.status,
      }))
      const recentAssessments = myAssessments.slice(0, 5).map((a) => ({
        id: a.id, title: a.title, subject: a.subject, className: a.className,
        questions: a.questions.length, submissionCount: subs.filter((s) => s.assessmentId === a.id).length,
      }))

      return json({ overview: {
        totalStudents,
        activeAssessments: myAssessments.length,
        completedSubmissions: subs.length,
        avgClassScore,
        needsAttention,
        classPerformance,
        recentSubmissions,
        recentAssessments,
      } })
    }

    // ===== ALERTS =====
    if (route === '/alerts' && method === 'POST') {
      if (!me || !['teacher', 'superadmin'].includes(me.role)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const targets = []
      if (body.studentId) targets.push(body.studentId)
      else if (body.className) {
        const students = await db.collection('users').find({ role: 'student', className: body.className }).toArray()
        students.forEach((s) => targets.push(s.id))
      }
      const alerts = targets.map((t) => ({
        id: uuidv4(),
        toStudentId: t,
        fromId: me.id,
        fromName: me.name,
        message: body.message || 'You have a new notification',
        type: body.type || 'info',
        read: false,
        createdAt: new Date(),
      }))
      if (alerts.length) await db.collection('alerts').insertMany(alerts)
      return json({ sent: alerts.length })
    }

    if (route === '/alerts' && method === 'GET') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      const alerts = await db.collection('alerts').find({ toStudentId: me.id }).sort({ createdAt: -1 }).limit(100).toArray()
      return json({ alerts: alerts.map(clean) })
    }

    if (route.match(/^\/alerts\/[^/]+\/read$/) && method === 'POST') {
      if (!me) return json({ error: 'Unauthorized' }, 401)
      await db.collection('alerts').updateOne({ id: path[1], toStudentId: me.id }, { $set: { read: true } })
      return json({ ok: true })
    }

    // ===== ADMIN =====
    if (route === '/admin/stats' && method === 'GET') {
      if (!me || me.role !== 'superadmin') return json({ error: 'Forbidden' }, 403)
      const [teachers, students, admins, assessments, submissions, questions] = await Promise.all([
        db.collection('users').countDocuments({ role: 'teacher' }),
        db.collection('users').countDocuments({ role: 'student' }),
        db.collection('users').countDocuments({ role: 'superadmin' }),
        db.collection('assessments').countDocuments({}),
        db.collection('submissions').countDocuments({}),
        db.collection('questions').countDocuments({}),
      ])
      const schools = await db.collection('users').distinct('school', { school: { $ne: '' } })
      return json({ stats: { teachers, students, admins, assessments, submissions, questions, schools: schools.length } })
    }

    // Seed 20 questions for a subject/theme into the question bank
    if (route === '/admin/seed' && method === 'POST') {
      if (!me || me.role !== 'superadmin') return json({ error: 'Forbidden' }, 403)
      const body = await request.json()
      const { className, subject, theme, difficulty } = body
      if (!subject || !theme) return json({ error: 'subject and theme required' }, 400)
      const learningOutcomes = ['Understand ' + theme, 'Apply ' + theme, 'Analyze ' + theme]
      const result = await generateExam({
        className: className || 'General', subject, syllabus: theme, theme,
        difficulty: difficulty || 'Mixed', learningOutcomes,
        counts: { mcq: 10, fill_blank: 5, descriptive: 5 },
      })
      const items = (result.questions || []).map((qq) => ({
        id: uuidv4(), className: className || '', subject, theme,
        difficulty: qq.difficulty || difficulty || 'Mixed', type: qq.type,
        question: qq.question, options: qq.options || [], answer: qq.answer || '',
        rubric: qq.rubric || [], marks: qq.marks || 1, learningOutcome: qq.learningOutcome || '',
        explanation: qq.explanation || '', createdBy: 'seed', createdAt: new Date(),
      }))
      if (items.length) await db.collection('questions').insertMany(items)
      return json({ seeded: items.length, subject, theme })
    }

    return json({ error: `Route ${route} not found` }, 404)
  } catch (error) {
    console.error('API Error:', error)
    return json({ error: 'Internal server error', detail: String(error?.message || error) }, 500)
  }
}

async function createAssignmentAlerts(db, assessment) {
  try {
    let students = []
    if (assessment.assignedTo && assessment.assignedTo.length) {
      students = await db.collection('users').find({ id: { $in: assessment.assignedTo } }).toArray()
    } else {
      students = await db.collection('users').find({ role: 'student', className: assessment.className }).toArray()
    }
    const alerts = students.map((s) => ({
      id: uuidv4(),
      toStudentId: s.id,
      fromId: assessment.createdBy,
      fromName: assessment.createdByName || 'Teacher',
      message: `New assignment: "${assessment.title}" (${assessment.subject})` + (assessment.dueDate ? ` due ${assessment.dueDate}` : ''),
      type: 'assignment',
      read: false,
      createdAt: new Date(),
    }))
    if (alerts.length) await db.collection('alerts').insertMany(alerts)
  } catch (e) {
    console.error('alert creation failed', e)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
