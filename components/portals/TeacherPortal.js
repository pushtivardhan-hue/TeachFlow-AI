'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Sparkles, FileText, ClipboardCheck, Users, Bell,
  Wand2, Plus, Trash2, BarChart3, Send, CheckCircle2, Brain, Loader2, Pencil, Printer, Key,
  TrendingUp, AlertTriangle, Database, RefreshCw, Save, X, Lightbulb, Gauge,
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
import { AppShell, StatCard, Empty, Spinner, FadeIn } from '@/components/portals/shared'
import { toast } from 'sonner'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'generate', label: 'Generate', icon: Sparkles },
  { key: 'assessments', label: 'Assessments', icon: FileText },
  { key: 'evaluate', label: 'Evaluate', icon: ClipboardCheck },
  { key: 'bank', label: 'Question Bank', icon: Database },
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
      {tab === 'bank' && <QuestionBank onGenerate={() => setTab('generate')} />}
      {tab === 'students' && <Students />}
      {tab === 'alerts' && <Alerts />}
    </AppShell>
  )
}

/* ---------------- Dashboard (command center) ---------------- */
function Dashboard({ user, go }) {
  const [ov, setOv] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/teacher/overview').then((d) => setOv(d.overview)).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  const o = ov || {}
  const actions = [
    { label: 'Create Assessment', icon: Wand2, go: 'generate' },
    { label: 'Generate Questions', icon: Sparkles, go: 'generate' },
    { label: 'Question Bank', icon: Database, go: 'bank' },
    { label: 'View Students', icon: Users, go: 'students' },
  ]
  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-500 p-6 text-primary-foreground">
          <h2 className="text-2xl font-bold">Hi {user.name.split(' ')[0]} 👋</h2>
          <p className="mt-1 text-primary-foreground/85">Your teaching command center. Let AI handle the busywork.</p>
        </div>
      </FadeIn>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((a) => (
          <button key={a.label} onClick={() => go(a.go)}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><a.icon className="h-5 w-5" /></div>
            <span className="text-sm font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Students" value={o.totalStudents ?? 0} tone="violet" />
        <StatCard icon={FileText} label="Active Assessments" value={o.activeAssessments ?? 0} tone="primary" />
        <StatCard icon={ClipboardCheck} label="Submissions" value={o.completedSubmissions ?? 0} tone="green" />
        <StatCard icon={TrendingUp} label="Avg Class Score" value={`${o.avgClassScore ?? 0}%`} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Class Performance</CardTitle><CardDescription>Average score per assessment</CardDescription></CardHeader>
          <CardContent style={{ height: 260 }}>
            {(o.classPerformance || []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No submission data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={o.classPerformance}><XAxis dataKey="name" fontSize={11} interval={0} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip /><Bar dataKey="avg" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" /></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Needs Attention</CardTitle></CardHeader>
          <CardContent>
            {(o.needsAttention || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Everyone is on track 🎉</p>
            ) : (
              <div className="space-y-2">
                {o.needsAttention.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium">{s.name}{s.rollNo ? ` · #${s.rollNo}` : ''}</span>
                    <Badge className="border-0 bg-red-100 text-red-700">{s.avg}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Assessments</CardTitle></CardHeader>
          <CardContent>
            {(o.recentAssessments || []).length === 0 ? (
              <Empty icon={FileText} title="No assessments yet" hint="Generate your first AI question paper."
                action={<Button onClick={() => go('generate')}><Sparkles className="mr-2 h-4 w-4" />Generate</Button>} />
            ) : (
              <div className="divide-y divide-border/60">
                {o.recentAssessments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <div><div className="font-medium">{a.title}</div><div className="text-sm text-muted-foreground">{a.subject} · Class {a.className} · {a.questions} Qs</div></div>
                    <Badge variant="secondary">{a.submissionCount} subs</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Submissions</CardTitle></CardHeader>
          <CardContent>
            {(o.recentSubmissions || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet</p>
            ) : (
              <div className="divide-y divide-border/60">
                {o.recentSubmissions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div><div className="font-medium">{s.studentName}</div><div className="text-sm text-muted-foreground">{s.assessmentTitle}</div></div>
                    <span className="text-sm font-semibold">{s.totalScore}/{s.totalMax}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ---------------- Question Bank (teacher) ---------------- */
function QuestionBank({ onGenerate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ subject: '', theme: '', difficulty: 'all', type: 'all' })
  const [selected, setSelected] = useState({})
  const [buildOpen, setBuildOpen] = useState(false)

  const load = () => api('/questions').then((d) => setItems(d.questions || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function del(id) { await api(`/questions/${id}`, { method: 'DELETE' }); setItems((p) => p.filter((q) => q.id !== id)); setSelected((s) => { const n = { ...s }; delete n[id]; return n }) }

  const subjects = [...new Set(items.map((q) => q.subject).filter(Boolean))]
  const filtered = items.filter((q) =>
    (!filters.subject || q.subject === filters.subject) &&
    (!filters.theme || (q.theme || '').toLowerCase().includes(filters.theme.toLowerCase())) &&
    (filters.difficulty === 'all' || q.difficulty === filters.difficulty) &&
    (filters.type === 'all' || q.type === filters.type)
  )
  const selectedList = filtered.filter((q) => selected[q.id])

  if (loading) return <PageLoader />
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label className="text-xs">Subject</Label>
          <Select value={filters.subject || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, subject: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Topic</Label><Input className="w-40" placeholder="Search topic" value={filters.theme} onChange={(e) => setFilters((f) => ({ ...f, theme: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Difficulty</Label>
          <Select value={filters.difficulty} onValueChange={(v) => setFilters((f) => ({ ...f, difficulty: v }))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{['all', 'Easy', 'Medium', 'Hard', 'Mixed'].map((d) => <SelectItem key={d} value={d}>{d === 'all' ? 'Any' : d}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Type</Label>
          <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Any</SelectItem>{Object.keys(QTYPE).map((t) => <SelectItem key={t} value={t}>{QTYPE[t]}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">{filtered.length} shown</Badge>
          <Button size="sm" disabled={selectedList.length === 0} onClick={() => setBuildOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Build Assessment ({selectedList.length})</Button>
        </div>
      </CardContent></Card>

      {filtered.length === 0 ? (
        <Empty icon={Database} title="No questions match" hint="Adjust filters, or generate new questions."
          action={<Button onClick={onGenerate}><Sparkles className="mr-2 h-4 w-4" />Generate</Button>} />
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map((q) => (
            <Card key={q.id} className={selected[q.id] ? 'border-primary/50 bg-primary/5' : ''}>
              <CardContent className="flex items-start gap-3 p-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={!!selected[q.id]} onChange={(e) => setSelected((s) => ({ ...s, [q.id]: e.target.checked }))} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge className={TYPE_COLOR[q.type] + ' border-0'}>{QTYPE[q.type]}</Badge>
                    <span className="text-xs text-muted-foreground">{q.subject} · {q.theme} · {q.difficulty} · {q.marks}m</span>
                  </div>
                  <p className="text-sm">{q.question}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => del(q.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BuildAssessmentDialog open={buildOpen} onClose={() => setBuildOpen(false)} questions={selectedList} onDone={() => { setBuildOpen(false); setSelected({}) }} />
    </div>
  )
}

function BuildAssessmentDialog({ open, onClose, questions, onDone }) {
  const [f, setF] = useState({ title: '', className: '', subject: '', dueDate: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open && questions.length) setF((s) => ({ ...s, subject: questions[0].subject || '', className: questions[0].className || '', title: `${questions[0].subject || ''} — ${questions[0].theme || 'Assessment'}` }))
  }, [open])
  if (!open) return null
  async function build() {
    if (!f.title || !f.className) { toast.error('Title and class required'); return }
    setBusy(true)
    try {
      await api('/assessments', { method: 'POST', body: {
        title: f.title, className: f.className, subject: f.subject, theme: questions[0]?.theme || '',
        difficulty: questions[0]?.difficulty || 'Mixed',
        learningOutcomes: [...new Set(questions.map((q) => q.learningOutcome).filter(Boolean))],
        questions, dueDate: f.dueDate,
      } })
      toast.success('Assessment created & students notified'); onDone()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Build Assessment from {questions.length} question(s)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Class</Label><Input value={f.className} onChange={(e) => setF((s) => ({ ...s, className: e.target.value }))} placeholder="8A" /></div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={f.dueDate} onChange={(e) => setF((s) => ({ ...s, dueDate: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={build} disabled={busy}>{busy ? <Spinner className="mr-2" /> : null}Create & Assign</Button></DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [regenId, setRegenId] = useState(null)
  const [savingBank, setSavingBank] = useState(false)
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

  function patchQ(id, patch) { setGen((g) => ({ ...g, questions: g.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })) }
  function delQ(id) { setGen((g) => ({ ...g, questions: g.questions.filter((q) => q.id !== id) })) }
  async function regenQ(q) {
    setRegenId(q.id)
    try {
      const { question } = await api('/ai/regenerate', { method: 'POST', body: {
        className: f.className, subject: f.subject, syllabus: f.syllabus, theme: f.theme, difficulty: f.difficulty, type: q.type, learningOutcomes: gen.learningOutcomes,
      } })
      patchQ(q.id, { ...question, id: q.id })
      toast.success('Question regenerated')
    } catch (e) { toast.error(e.message) } finally { setRegenId(null) }
  }
  async function saveToBank() {
    setSavingBank(true)
    try {
      await api('/questions', { method: 'POST', body: { className: f.className, subject: f.subject, theme: f.theme, difficulty: f.difficulty, questions: gen.questions } })
      toast.success('Saved to Question Bank')
    } catch (e) { toast.error(e.message) } finally { setSavingBank(false) }
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">AI Evaluation</span>
                      {typeof ai.confidence === 'number' && (
                        <Badge variant="outline" className="ml-auto gap-1 font-normal"><Gauge className="h-3 w-3" />{ai.confidence}% confidence</Badge>
                      )}
                    </div>

                    <p className="text-sm">{ai.feedback}</p>

                    {ai.rubricBreakdown?.length > 0 && (
                      <div className="rounded-md border border-border/60 bg-card p-2">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Rubric breakdown</p>
                        <div className="space-y-1">
                          {ai.rubricBreakdown.map((r, ri) => (
                            <div key={ri} className="flex items-start justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">{r.criterion}{r.comment ? ` — ${r.comment}` : ''}</span>
                              <span className="shrink-0 font-medium">{r.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2">
                      {ai.strengths?.length > 0 && (
                        <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">
                          <p className="mb-0.5 font-medium">Strengths</p>
                          <ul className="list-disc pl-4">{ai.strengths.map((s, si) => <li key={si}>{s}</li>)}</ul>
                        </div>
                      )}
                      {ai.improvements?.length > 0 && (
                        <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                          <p className="mb-0.5 font-medium">Weaknesses</p>
                          <ul className="list-disc pl-4">{ai.improvements.map((s, si) => <li key={si}>{s}</li>)}</ul>
                        </div>
                      )}
                    </div>

                    {ai.misconception && ai.misconception !== 'None detected' && (
                      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span><span className="font-semibold">Misconception:</span> {ai.misconception}</span>
                      </div>
                    )}

                    {ai.remediation && ai.remediation.concept && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
                        <p className="flex items-center gap-1.5 font-medium text-primary"><Lightbulb className="h-3.5 w-3.5" />Recommended remediation
                          {ai.remediation.difficulty && <Badge variant="outline" className="ml-1 font-normal">{ai.remediation.difficulty}</Badge>}
                        </p>
                        <p className="mt-1"><span className="font-medium">Review:</span> {ai.remediation.concept}</p>
                        {ai.remediation.explanation && <p className="mt-0.5 text-muted-foreground">{ai.remediation.explanation}</p>}
                        {ai.remediation.practice && <p className="mt-0.5"><span className="font-medium">Practice:</span> {ai.remediation.practice}</p>}
                        {ai.remediation.nextStep && <p className="mt-0.5"><span className="font-medium">Next step:</span> {ai.remediation.nextStep}</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                      <span className="text-sm font-medium text-primary">AI Suggested: {ai.score}/{q.marks}</span>
                      <span className="ml-auto text-xs text-muted-foreground">Modify final score:</span>
                      <Input type="number" min="0" max={q.marks} step="0.5" className="h-8 w-20"
                        value={scores[q.id]} onChange={(e) => setScores((s) => ({ ...s, [q.id]: e.target.value }))} />
                      <span className="text-xs text-muted-foreground">/ {q.marks}</span>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Run AI grading to see the rubric score, misconception and remediation.</p>}
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
