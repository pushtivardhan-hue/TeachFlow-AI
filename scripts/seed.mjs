// Bootstrap the question bank with 20 questions per subject/theme.
// Run with:  cd /app && node --env-file=.env scripts/seed.mjs
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { generateExam } from '../lib/ai.js'

const MATRIX = [
  { className: '6', subject: 'Science', themes: ['Human Body', 'Water Cycle', 'Light and Shadows'] },
  { className: '7', subject: 'Mathematics', themes: ['Fractions', 'Integers', 'Simple Equations'] },
  { className: '8', subject: 'Science', themes: ['Photosynthesis', 'Force and Pressure', 'Cell Structure'] },
  { className: '8', subject: 'English', themes: ['Nouns and Pronouns', 'Tenses', 'Reading Comprehension'] },
]

async function main() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  const db = client.db(process.env.DB_NAME)
  let total = 0
  for (const row of MATRIX) {
    for (const theme of row.themes) {
      // skip if already seeded for this combo
      const existing = await db.collection('questions').countDocuments({ subject: row.subject, theme, createdBy: 'seed' })
      if (existing >= 20) { console.log(`skip ${row.subject}/${theme} (already ${existing})`); continue }
      try {
        console.log(`Generating 20 for ${row.subject} / ${theme} (class ${row.className})...`)
        const result = await generateExam({
          className: row.className, subject: row.subject, syllabus: theme, theme,
          difficulty: 'Mixed', learningOutcomes: ['Understand ' + theme, 'Apply ' + theme, 'Analyze ' + theme],
          counts: { mcq: 10, fill_blank: 5, descriptive: 5 },
        })
        const items = (result.questions || []).map((qq) => ({
          id: uuidv4(), className: row.className, subject: row.subject, theme,
          difficulty: qq.difficulty || 'Mixed', type: qq.type, question: qq.question,
          options: qq.options || [], answer: qq.answer || '', rubric: qq.rubric || [],
          marks: qq.marks || 1, learningOutcome: qq.learningOutcome || '', explanation: qq.explanation || '',
          createdBy: 'seed', createdAt: new Date(),
        }))
        if (items.length) await db.collection('questions').insertMany(items)
        total += items.length
        console.log(`  -> inserted ${items.length}`)
      } catch (e) {
        console.error(`  !! failed ${row.subject}/${theme}:`, e.message)
      }
    }
  }
  console.log(`\nDone. Total seeded this run: ${total}`)
  await client.close()
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
