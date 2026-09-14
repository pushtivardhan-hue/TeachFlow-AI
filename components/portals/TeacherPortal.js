'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Sparkles, FileText, ClipboardCheck, Users, Bell,
  Wand2, Plus, Trash2, BarChart3, Send, CheckCircle2, Brain, Loader2, Pencil, Printer, Key,
} from 'lucide-react'
import { openPrintWindow, questionPaperHtml } from '@/lib/print'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/apiClient'
import { AppShell, StatCard, Empty, Spinner } from '@/components/portals/shared'
import { toast } from 'sonner'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'generate', label: 'Generate', icon: Sparkles },
  { key: 'assessments', label: 'Assessments', icon: FileText },
  { key: 'evaluate', label: 'Evaluate', icon: ClipboardCheck },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'alerts', label: 'Alerts', icon: Bell },
]

const QTYPE = { mcq: 'MCQ', fill_blank: 'Fill in the blank', descriptive: 'Descriptive' }
const TYPE_COLOR = { mcq: 'bg-blue-100 text-blue-700', fill_blank: 'bg-violet-100 text-violet-700', descriptive: 'bg-amber-100 text-amber-700' }

export default function TeacherPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  return (
    <AppShell user={user} onLogout={onLogout} nav={NAV} active={tab} onNav={setTab}>
      {tab === 'dashboard' && <Dashboard user={user} go={setTab} />}
      {tab === 'generate' && <Generate onPublished={() => setTab('assessments')} />}
      {tab === 'assessments' && <Assessments />}
      {tab === 'evaluate' && <Evaluate />}
      {tab === 'students' && <Students />}
      {tab === 'alerts' && <Alerts />}
    </AppShell>
  )
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ user, go }) {
  const [assessments, setAssessments] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api('/assessments'), api('/users')])
      .then(([a, u]) => { setAssessments(a.assessments || []); setStudents(u.users || []) })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalSubs = assessments.reduce((s, a) => s + (a.submissionCount || 0), 0)

  if (loading) return <PageLoader />
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-500 p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold">Hi {user.name.split(' ')[0]} 👋</h2>
        <p className="mt-1 text-primary-foreground/85">Let AI handle the busywork. Generate a new assessment in under a minute.</p>
        <Button variant="secondary" className="mt-4" onClick={() => go('generate')}>
          <Wand2 className="mr-2 h-4 w-4" /> Generate Assessment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileText} label="Assessments" value={assessments.length} tone="primary" />
        <StatCard icon={ClipboardCheck} label="Submissions" value={totalSubs} tone="green" />
        <StatCard icon={Users} label="Students" value={students.length} tone="violet" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Assessments</CardTitle></CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <Empty icon={FileText} title="No assessments yet" hint="Generate your first AI question paper to get started."
              action={<Button onClick={() => go('generate')}><Sparkles className="mr-2 h-4 w-4" />Generate</Button>} />
          ) : (
            <div className="divide-y divide-border/60">
              {assessments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-muted-foreground">{a.subject} · Class {a.className} · {a.questions.length} questions</div>
                  </div>
                  <Badge variant="secondary">{a.submissionCount || 0} submissions</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------------- Generate ---------------- */
const emptyGen = { className: '', subject: '', syllabus: '', theme: '', difficulty: 'Medium', mcq: 4, fill_blank: 3, descriptive: 3 }

function Generate({ onPublished }) {
  const [f, setF] = useState(emptyGen)
  const [busy, setBusy] = useState(false)
  const [pub, setPub] = useState(false)
  const [gen, setGen] = useState(null)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }))

  async function generate() {
    if (!f.className || !f.subject || !f.theme) { toast.error('Fill class, subject and theme'); return }
    setBusy(true); setGen(null)
    try {
      const { result } = await api('/ai/generate', { method: 'POST', body: {
        className: f.className, subject: f.subject, syllabus: f.syllabus, theme: f.theme, difficulty: f.difficulty,
        counts: { mcq: Number(f.mcq), fill_blank: Number(f.fill_blank), descriptive: Number(f.descriptive) },
      } })
      setGen(result); setTitle(result.title)
      toast.success('Question paper generated')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function publish() {
    setPub(true)
    try {
      await api('/assessments', { method: 'POST', body: {
        title, className: f.className, subject: f.subject, syllabus: f.syllabus, theme: f.theme,
        difficulty: f.difficulty, learningOutcomes: gen.learningOutcomes, questions: gen.questions, dueDate,
      } })
      toast.success('Assessment published & students notified')
      onPublished()
    } catch (e) { toast.error(e.message) } finally { setPub(false) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> AI Question Generator</CardTitle>
          <CardDescription>Configure the paper. AI maps each question to a learning outcome.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Class</Label><Input value={f.className} onChange={set('className')} placeholder="8A" /></div>
            <div className="space-y-1.5"><Label>Subject</Label><Input value={f.subject} onChange={set('subject')} placeholder="Science" /></div>
          </div>
          <div className="space-y-1.5"><Label>Theme / Topic</Label><Input value={f.theme} onChange={set('theme')} placeholder="Photosynthesis" /></div>
          <div className="space-y-1.5"><Label>Syllabus context (optional)</Label><Textarea value={f.syllabus} onChange={set('syllabus')} placeholder="Paste syllabus points or chapter summary…" rows={3} /></div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={f.difficulty} onValueChange={set('difficulty')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>MCQ</Label><Input type="number" min="0" max="20" value={f.mcq} onChange={set('mcq')} /></div>
            <div className="space-y-1.5"><Label>Fill-ups</Label><Input type="number" min="0" max="20" value={f.fill_blank} onChange={set('fill_blank')} /></div>
            <div className="space-y-1.5"><Label>Descriptive</Label><Input type="number" min="0" max="10" value={f.descriptive} onChange={set('descriptive')} /></div>
          </div>
          <Button className="w-full" onClick={generate} disabled={busy}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : <><Wand2 className="mr-2 h-4 w-4" />Generate with AI</>}
          </Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-3">
        {!gen && !busy && <Empty icon={Sparkles} title="Your generated paper will appear here" hint="Fill the form and click Generate. You can review and edit before publishing." />}
        {busy && <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed"><Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">AI is crafting your question paper…</p></div>}
        {gen && (
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-base font-semibold" />
                <div className="flex flex-wrap gap-2">
                  {gen.learningOutcomes?.map((lo, i) => <Badge key={i} variant="outline" className="font-normal">{lo}</Badge>)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
                {gen.questions.map((q, i) => (
                  <div key={q.id} className="rounded-lg border border-border/60 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">Q{i + 1}.</span>
                      <Badge className={TYPE_COLOR[q.type] + ' border-0'}>{QTYPE[q.type]}</Badge>
                      <span className="ml-auto text-xs text-muted-foreground">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm">{q.question}</p>
                    {q.type === 'mcq' && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {q.options.map((o, oi) => (
                          <li key={oi} className={'rounded px-2 py-1 ' + (o === q.answer ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-muted-foreground')}>{String.fromCharCode(65 + oi)}. {o}</li>
                        ))}
                      </ul>
                    )}
                    {q.type !== 'mcq' && <p className="mt-2 text-sm text-emerald-700"><span className="font-medium">Answer:</span> {q.answer}</p>}
                    {q.rubric?.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Rubric: {q.rubric.join(' · ')}</p>}
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5"><Label>Due date (optional)</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-44" /></div>
                <Button className="ml-auto" onClick={publish} disabled={pub}>
                  {pub ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Publish to Class {f.className}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ---------------- Assessments (list + detail + analytics) ---------------- */
function Assessments() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)

  const load = () => api('/assessments').then((d) => setList(d.assessments || [])).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function del(id) {
    await api(`/assessments/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load()
  }

  if (loading) return <PageLoader />
  if (sel) return <AssessmentDetail id={sel} onBack={() => setSel(null)} />
  if (list.length === 0) return <Empty icon={FileText} title="No assessments yet" hint="Head to Generate to create your first AI paper." />

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((a) => (
        <Card key={a.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <CardDescription>{a.subject} · Class {a.className} · {a.difficulty}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex items-center justify-between">
            <div className="flex gap-3 text-sm text-muted-foreground">
              <span>{a.questions.length} Qs</span>
              <span>{a.totalMarks} marks</span>
              <span>{a.submissionCount || 0} subs</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSel(a.id)}><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Open</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AssessmentDetail({ id, onBack }) {
  const [a, setA] = useState(null)
  const [view, setView] = useState('questions')
  const [analytics, setAnalytics] = useState(null)
  const [insights, setInsights] = useState(null)
  const [insBusy, setInsBusy] = useState(false)

  useEffect(() => { api(`/assessments/${id}`).then((d) => { setA(d.assessment); setInsights(d.assessment.insights || null) }) }, [id])
  useEffect(() => { if (view === 'analytics' && !analytics) api(`/analytics/assessment/${id}`).then((d) => setAnalytics(d.analytics)) }, [view])

  async function runInsights() {
    setInsBusy(true)
    try { const d = await api(`/analytics/insights/${id}`, { method: 'POST' }); setInsights(d.insights); toast.success('AI insights ready') }
    catch (e) { toast.error(e.message) } finally { setInsBusy(false) }
  }

  if (!a) return <PageLoader />
  const distData = analytics ? Object.entries(analytics.distribution).map(([k, v]) => ({ range: k, students: v })) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div>
          <h2 className="text-lg font-semibold">{a.title}</h2>
          <p className="text-sm text-muted-foreground">{a.subject} · Class {a.className} · {a.totalMarks} marks</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openPrintWindow(a.title, questionPaperHtml(a, { withAnswers: false }))}><Printer className="mr-1.5 h-3.5 w-3.5" />Print Paper</Button>
          <Button variant="outline" size="sm" onClick={() => openPrintWindow(a.title + ' — Answer Key', questionPaperHtml(a, { withAnswers: true }))}><Key className="mr-1.5 h-3.5 w-3.5" />Answer Key</Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'questions' && (
        <div className="space-y-3">
          {a.questions.map((q, i) => (
            <Card key={q.id}><CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium">Q{i + 1}.</span>
                <Badge className={TYPE_COLOR[q.type] + ' border-0'}>{QTYPE[q.type]}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{q.learningOutcome}</span>
              </div>
              <p className="text-sm">{q.question}</p>
              {q.type === 'mcq' && <ul className="mt-2 space-y-1 text-sm">{q.options.map((o, oi) => <li key={oi} className={o === q.answer ? 'font-medium text-emerald-700' : 'text-muted-foreground'}>{String.fromCharCode(65 + oi)}. {o}</li>)}</ul>}
              {q.type !== 'mcq' && <p className="mt-2 text-sm text-emerald-700"><span className="font-medium">Answer:</span> {q.answer}</p>}
            </CardContent></Card>
          ))}
        </div>
      )}

      {view === 'analytics' && (!analytics ? <PageLoader /> : (
        analytics.count === 0 ? <Empty icon={BarChart3} title="No submissions yet" hint="Analytics will appear once students submit." /> : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <StatCard icon={Users} label="Submissions" value={analytics.count} />
              <StatCard icon={BarChart3} label="Average" value={`${analytics.avg.toFixed(1)}/${analytics.totalMax}`} tone="green" />
              <StatCard icon={CheckCircle2} label="Highest" value={analytics.max} tone="violet" />
              <StatCard icon={ClipboardCheck} label="Lowest" value={analytics.min} tone="amber" />
            </div>
            <Card><CardHeader><CardTitle className="text-base">Score Distribution</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distData}><XAxis dataKey="range" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="students" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Question-level performance (objective)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analytics.perQuestion.filter((q) => q.type !== 'descriptive').map((q, i) => {
                  const pct = q.attempts ? Math.round((q.correct / q.attempts) * 100) : 0
                  return (<div key={q.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-3">Q{i + 1}. {q.question}</span><span className="font-medium">{pct}%</span></div>
                    <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: pct >= 60 ? 'hsl(142 71% 45%)' : 'hsl(0 72% 55%)' }} /></div>
                  </div>)
                })}
              </CardContent>
            </Card>
          </div>
        )
      ))}

      {view === 'insights' && (
        <div className="space-y-4">
          <Card><CardContent className="flex items-center justify-between p-5">
            <div><div className="font-medium">AI Mistake Detection & Remedial</div><p className="text-sm text-muted-foreground">Analyze class-wide errors and get remedial topics.</p></div>
            <Button onClick={runInsights} disabled={insBusy}>{insBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}Run analysis</Button>
          </CardContent></Card>
          {insights && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card><CardHeader><CardTitle className="text-base">Common Mistakes</CardTitle></CardHeader><CardContent className="space-y-3">
                {insights.commonMistakes.map((m, i) => <div key={i} className="rounded-lg border border-border/60 p-3"><div className="flex items-center justify-between"><span className="font-medium">{m.topic}</span><Badge variant="secondary">{m.affected}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{m.description}</p></div>)}
              </CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Remedial Topics</CardTitle></CardHeader><CardContent className="space-y-3">
                {insights.remedialTopics.map((m, i) => <div key={i} className="rounded-lg border border-border/60 p-3"><div className="font-medium">{m.topic}</div><p className="mt-1 text-sm text-muted-foreground">{m.reason}</p><p className="mt-1 text-sm text-primary">💡 {m.suggestion}</p></div>)}
              </CardContent></Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Evaluate (bulk grading) ---------------- */
function Evaluate() {
  const [assessments, setAssessments] = useState([])
  const [selId, setSelId] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [gradingAll, setGradingAll] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { api('/assessments').then((d) => setAssessments(d.assessments || [])) }, [])

  async function loadSubs(id) {
    setSelId(id); setLoading(true); setExpanded(null)
    try {
      const [ad, sd] = await Promise.all([api(`/assessments/${id}`), api(`/submissions?assessmentId=${id}`)])
      setAssessment(ad.assessment); setSubs(sd.submissions || [])
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const hasDescriptive = assessment?.questions?.some((q) => q.type === 'descriptive')

  async function gradeOne(id) {
    const { submission } = await api(`/submissions/${id}/aigrade`, { method: 'POST' })
    setSubs((prev) => prev.map((s) => (s.id === id ? submission : s)))
    return submission
  }

  async function gradeAll() {
    setGradingAll(true)
    try {
      const pending = subs.filter((s) => s.status === 'submitted')
      for (const s of pending) { await gradeOne(s.id) }
      toast.success(`AI graded ${pending.length} submission(s)`)
    } catch (e) { toast.error(e.message) } finally { setGradingAll(false) }
  }

  return (
    <div className="space-y-5">
      <Card><CardContent className="flex flex-wrap items-center gap-3 p-4">
        <Label className="text-sm">Assessment:</Label>
        <Select value={selId} onValueChange={loadSubs}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select an assessment to evaluate" /></SelectTrigger>
          <SelectContent>{assessments.map((a) => <SelectItem key={a.id} value={a.id}>{a.title} ({a.submissionCount || 0})</SelectItem>)}</SelectContent>
        </Select>
        {assessment && hasDescriptive && (
          <Button className="ml-auto" onClick={gradeAll} disabled={gradingAll || subs.length === 0}>
            {gradingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}AI Grade All Pending
          </Button>
        )}
      </CardContent></Card>

      {loading && <PageLoader />}
      {!loading && selId && subs.length === 0 && <Empty icon={ClipboardCheck} title="No submissions yet" hint="Students haven't submitted this assessment." />}

      {!loading && subs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{subs.length} Submission{subs.length > 1 ? 's' : ''}</CardTitle>
            <CardDescription>Objective answers are auto-graded. Use AI to pre-grade descriptive answers, then approve.</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead><TableHead>Objective</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <>
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      <TableCell className="font-medium">{s.studentName}{s.rollNo ? ` · #${s.rollNo}` : ''}</TableCell>
                      <TableCell>{s.objectiveScore}</TableCell>
                      <TableCell className="font-semibold">{s.totalScore}/{s.totalMax}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        {hasDescriptive && s.status === 'submitted'
                          ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); gradeOne(s.id).then(() => toast.success('Graded')) }}><Brain className="mr-1.5 h-3.5 w-3.5" />AI Grade</Button>
                          : <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setExpanded(expanded === s.id ? null : s.id) }}>{expanded === s.id ? 'Hide' : 'Review'}</Button>}
                      </TableCell>
                    </TableRow>
                    {expanded === s.id && (
                      <TableRow><TableCell colSpan={5} className="bg-muted/40 p-0">
                        <SubmissionReview sub={s} assessment={assessment} onApproved={(u) => setSubs((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
                      </TableCell></TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SubmissionReview({ sub, assessment, onApproved }) {
  const [scores, setScores] = useState(() => {
    const init = {}
    assessment.questions.filter((q) => q.type === 'descriptive').forEach((q) => { init[q.id] = sub.ai?.[q.id]?.score ?? '' })
    return init
  })
  const [saving, setSaving] = useState(false)

  async function approve() {
    setSaving(true)
    try {
      const finalScores = {}
      Object.entries(scores).forEach(([k, v]) => { finalScores[k] = Number(v) || 0 })
      const { submission } = await api(`/submissions/${sub.id}/approve`, { method: 'POST', body: { finalScores } })
      toast.success('Grade approved & published')
      onApproved(submission)
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3 p-4">
      {assessment.questions.map((q, i) => {
        const ans = sub.answers?.[q.id]
        const obj = sub.objective?.[q.id]
        const ai = sub.ai?.[q.id]
        return (
          <div key={q.id} className="rounded-lg border border-border/60 bg-card p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium">Q{i + 1}.</span>
              <Badge className={TYPE_COLOR[q.type] + ' border-0'}>{QTYPE[q.type]}</Badge>
            </div>
            <p className="text-sm">{q.question}</p>
            <p className="mt-1 text-sm"><span className="text-muted-foreground">Answer: </span>{ans || <em className="text-muted-foreground">blank</em>}</p>
            {q.type !== 'descriptive' && obj && (
              <p className={'mt-1 text-sm ' + (obj.correct ? 'text-emerald-600' : 'text-red-600')}>{obj.correct ? '✓ Correct' : `✗ Wrong (correct: ${q.answer})`} · {obj.awarded}/{obj.max}</p>
            )}
            {q.type === 'descriptive' && (
              <div className="mt-2 rounded-md bg-muted/50 p-3">
                {ai ? (
                  <>
                    <p className="text-sm text-muted-foreground">{ai.feedback}</p>
                    {ai.improvements?.length > 0 && <p className="mt-1 text-xs text-amber-700">To improve: {ai.improvements.join(', ')}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <Label className="text-xs">Score (AI suggested {ai.score}/{q.marks}):</Label>
                      <Input type="number" min="0" max={q.marks} step="0.5" className="h-8 w-24"
                        value={scores[q.id]} onChange={(e) => setScores((s) => ({ ...s, [q.id]: e.target.value }))} />
                      <span className="text-xs text-muted-foreground">/ {q.marks}</span>
                    </div>
                  </>
                ) : <p className="text-sm text-muted-foreground">Run AI grading to see a suggested score.</p>}
              </div>
            )}
          </div>
        )
      })}
      <div className="flex justify-end">
        <Button onClick={approve} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Approve & Publish Grade</Button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    submitted: { label: 'Submitted', cls: 'bg-slate-100 text-slate-700' },
    ai_graded: { label: 'AI Graded', cls: 'bg-violet-100 text-violet-700' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  }
  const m = map[status] || map.submitted
  return <Badge className={m.cls + ' border-0'}>{m.label}</Badge>
}

/* ---------------- Students ---------------- */
function Students() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null) // {mode, data}

  const load = () => api('/users').then((d) => setList(d.users || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function del(id) { await api(`/users/${id}`, { method: 'DELETE' }).catch((e) => toast.error(e.message)); load() }

  if (loading) return <PageLoader />
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialog({ mode: 'add', data: { role: 'student', name: '', email: '', password: '', className: '', rollNo: '' } })}><Plus className="mr-2 h-4 w-4" />Add Student</Button>
      </div>
      {list.length === 0 ? <Empty icon={Users} title="No students yet" hint="Add students to assign assessments." /> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Class</TableHead><TableHead>Roll</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>{s.className || '—'}</TableCell>
                  <TableCell>{s.rollNo || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ mode: 'edit', data: s })}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
      <StudentDialog dialog={dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load() }} />
    </div>
  )
}

function StudentDialog({ dialog, onClose, onSaved }) {
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (dialog) setF({ ...dialog.data }) }, [dialog])
  if (!dialog) return null
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function save() {
    setBusy(true)
    try {
      if (dialog.mode === 'add') await api('/users', { method: 'POST', body: { ...f, role: 'student' } })
      else await api(`/users/${f.id}`, { method: 'PUT', body: { name: f.name, className: f.className, rollNo: f.rollNo, guardian: f.guardian } })
      toast.success('Saved'); onSaved()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{dialog.mode === 'add' ? 'Add Student' : 'Edit Student (Override)'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name || ''} onChange={set('name')} /></div>
          {dialog.mode === 'add' && <>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email || ''} onChange={set('email')} /></div>
            <div className="space-y-1.5"><Label>Temp Password</Label><Input value={f.password || ''} onChange={set('password')} /></div>
          </>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Class</Label><Input value={f.className || ''} onChange={set('className')} /></div>
            <div className="space-y-1.5"><Label>Roll No.</Label><Input value={f.rollNo || ''} onChange={set('rollNo')} /></div>
          </div>
          <div className="space-y-1.5"><Label>Guardian (optional)</Label><Input value={f.guardian || ''} onChange={set('guardian')} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner className="mr-2" /> : null}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Alerts ---------------- */
function Alerts() {
  const [students, setStudents] = useState([])
  const [target, setTarget] = useState('class')
  const [className, setClassName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api('/users').then((d) => setStudents(d.users || [])) }, [])
  const classes = [...new Set(students.map((s) => s.className).filter(Boolean))]

  async function send() {
    if (!message) { toast.error('Enter a message'); return }
    setBusy(true)
    try {
      const body = target === 'class' ? { className, message, type: 'reminder' } : { studentId, message, type: 'reminder' }
      const d = await api('/alerts', { method: 'POST', body })
      toast.success(`Alert sent to ${d.sent} student(s)`); setMessage('')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" />Send Alert</CardTitle>
        <CardDescription>Notify students about deadlines or new assignments.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label>Send to</Label>
          <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="class">Whole class</SelectItem><SelectItem value="student">Specific student</SelectItem></SelectContent></Select>
        </div>
        {target === 'class' ? (
          <div className="space-y-1.5"><Label>Class</Label>
            <Select value={className} onValueChange={setClassName}><SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
        ) : (
          <div className="space-y-1.5"><Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}><SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
          </div>
        )}
        <div className="space-y-1.5"><Label>Message</Label><Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reminder: Science test due tomorrow!" /></div>
        <Button onClick={send} disabled={busy}>{busy ? <Spinner className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}Send Alert</Button>
      </CardContent>
    </Card>
  )
}

function PageLoader() {
  return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
}
