'use client'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1e293b; margin: 40px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 4px; }
  .rule { border: none; border-top: 2px solid #0f172a; margin: 14px 0; }
  .instr { font-size: 13px; background: #f1f5f9; padding: 10px 12px; border-radius: 6px; margin-bottom: 18px; }
  .q { margin-bottom: 16px; page-break-inside: avoid; }
  .qhead { font-weight: bold; font-size: 14px; }
  .marks { float: right; font-weight: normal; color: #475569; }
  .opt { margin: 3px 0 3px 18px; font-size: 14px; }
  .ans { color: #047857; font-size: 13px; margin-left: 18px; }
  .rubric { color: #64748b; font-size: 12px; margin-left: 18px; font-style: italic; }
  .lo { display:inline-block; font-size: 11px; color:#2563eb; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-family: Arial, sans-serif; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #f1f5f9; }
  .score { font-size: 34px; font-weight: bold; color: #2563eb; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; background:#dcfce7; color:#166534; }
  .fb { background:#f8fafc; border-left:3px solid #2563eb; padding:8px 12px; margin:6px 0; font-size:13px; font-family: Arial, sans-serif; }
  @media print { body { margin: 20px; } }
`

export function openPrintWindow(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) { alert('Please allow pop-ups to enable printing / PDF export.'); return }
  w.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + STYLES + '</style></head><body>' +
    bodyHtml +
    '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},300)}</scr' + 'ipt>' +
    '</body></html>'
  )
  w.document.close()
}

const QLABEL = { mcq: 'MCQ', fill_blank: 'Fill in the blank', descriptive: 'Descriptive' }

export function questionPaperHtml(a, { withAnswers = false } = {}) {
  const header =
    '<h1>' + esc(a.title) + '</h1>' +
    '<div class="meta">Subject: ' + esc(a.subject) + ' &nbsp;|&nbsp; Class: ' + esc(a.className) +
    ' &nbsp;|&nbsp; Total Marks: ' + esc(a.totalMarks) + (a.dueDate ? ' &nbsp;|&nbsp; Due: ' + esc(a.dueDate) : '') + '</div>' +
    (withAnswers ? '<div class="meta"><strong>ANSWER KEY</strong></div>' : '<div class="meta">Name: _____________________  Roll: ________</div>') +
    '<hr class="rule"/>' +
    (a.instructions ? '<div class="instr">' + esc(a.instructions) + '</div>' : '')
  const qs = (a.questions || []).map((q, i) => {
    let inner = '<div class="qhead"><span class="marks">[' + esc(q.marks) + ' mark' + (q.marks > 1 ? 's' : '') + ']</span>Q' + (i + 1) + '. ' + esc(q.question) + '</div>'
    if (q.type === 'mcq') inner += (q.options || []).map((o, oi) => '<div class="opt">(' + String.fromCharCode(97 + oi) + ') ' + esc(o) + '</div>').join('')
    if (q.type === 'fill_blank' && !withAnswers) inner += '<div class="opt">_______________________________</div>'
    if (q.type === 'descriptive' && !withAnswers) inner += '<div class="opt">&nbsp;</div>'
    if (withAnswers) {
      inner += '<div class="ans">Answer: ' + esc(q.answer) + '</div>'
      if (q.rubric && q.rubric.length) inner += '<div class="rubric">Rubric: ' + esc(q.rubric.join(' \u00b7 ')) + '</div>'
    }
    return '<div class="q">' + inner + '</div>'
  }).join('')
  return header + qs
}

export function reportCardHtml(sub, questions = []) {
  const pct = sub.totalMax ? Math.round((sub.totalScore / sub.totalMax) * 100) : 0
  const rows = (questions || []).map((q, i) => {
    let awarded = '-'
    if (q.type === 'descriptive') awarded = (sub.finalScores?.[q.id] ?? sub.ai?.[q.id]?.score ?? '-')
    else awarded = (sub.objective?.[q.id]?.awarded ?? '-')
    return '<tr><td>Q' + (i + 1) + '</td><td>' + QLABEL[q.type] + '</td><td>' + esc(awarded) + ' / ' + esc(q.marks) + '</td></tr>'
  }).join('')
  const feedback = Object.values(sub.ai || {}).map((g) => '<div class="fb">' + esc(g.feedback) + '</div>').join('')
  return (
    '<h1>Student Report Card</h1>' +
    '<div class="meta">' + esc(sub.studentName) + (sub.rollNo ? ' &nbsp;|&nbsp; Roll: ' + esc(sub.rollNo) : '') + '</div>' +
    '<div class="meta">' + esc(sub.assessmentTitle) + ' &nbsp;|&nbsp; ' + esc(sub.subject) + '</div>' +
    '<hr class="rule"/>' +
    '<p><span class="score">' + esc(sub.totalScore) + '</span> / ' + esc(sub.totalMax) + ' &nbsp; <span class="badge">' + pct + '%</span></p>' +
    (questions.length ? ('<table><tr><th>Question</th><th>Type</th><th>Score</th></tr>' + rows + '</table>') : '') +
    (feedback ? '<h3 style="font-family:Arial;font-size:14px;">AI Feedback</h3>' + feedback : '')
  )
}
