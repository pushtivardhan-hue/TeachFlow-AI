'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, BookOpen, Trophy, User, Bell, Loader2, CheckCircle2, Send, TrendingUp, Sparkles, Printer } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/apiClient'
import { AppShell, StatCard, Empty, Spinner } from '@/components/portals/shared'
import { openPrintWindow, reportCardHtml } from '@/lib/print'
import { toast } from 'sonner'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'assignments', label: 'Assignments', icon: BookOpen },
  { key: 'results', label: 'Results', icon: Trophy },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'profile', label: 'Profile', icon: User },
]

export default function StudentPortal({ user, onLogout, onUserUpdate }) {
  const [tab, setTab] = useState('dashboard')
  return (
    <AppShell user={user} onLogout={onLogout} nav={NAV} active={tab} onNav={setTab}>
      {tab === 'dashboard' && <Dashboard user={user} go={setTab} />}
      {tab === 'assignments' && <Assignments />}
      {tab === 'results' && <Results user={user} />}
      {tab === 'alerts' && <Alerts />}
      {tab === 'profile' && <Profile user={user} onUserUpdate={onUserUpdate} />}
    </AppShell>
  )
}

function Dashboard({ user, go }) {
  const [assessments, setAssessments] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api('/assessments'), api(`/analytics/student/${user.id}`)])
      .then(([a, h]) => { setAssessments(a.assessments || []); setHistory(h.history || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  const pending = assessments.filter((a) => !a.mySubmission)
  const done = assessments.filter((a) => a.mySubmission)
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.percentage, 0) / history.length) : 0
  const chartData = history.map((h, i) => ({ name: h.subject || `T${i + 1}`, score: h.percentage }))

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-500 p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold">Hey {user.name.split(' ')[0]}! 📚</h2>
        <p className="mt-1 text-primary-foreground/85">{pending.length ? `You have ${pending.length} assignment${pending.length > 1 ? 's' : ''} to complete.` : 'All caught up — great job!'}</p>
        {pending.length > 0 && <Button variant="secondary" className="mt-4" onClick={() => go('assignments')}><BookOpen className="mr-2 h-4 w-4" />Start now</Button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Pending" value={pending.length} tone="amber" />
        <StatCard icon={CheckCircle2} label="Completed" value={done.length} tone="green" />
        <StatCard icon={TrendingUp} label="Avg Score" value={`${avg}%`} tone="primary" />
      </div>

      {chartData.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Your Performance</CardTitle></CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip /><Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Assignments() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [taking, setTaking] = useState(null)

  const load = () => api('/assessments').then((d) => setList(d.assessments || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  if (loading) return <PageLoader />
  if (taking) return <TakeAssessment assessment={taking} onDone={() => { setTaking(null); load() }} onCancel={() => setTaking(null)} />

  const pending = list.filter((a) => !a.mySubmission)
  const done = list.filter((a) => a.mySubmission)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">TO DO ({pending.length})</h3>
        {pending.length === 0 ? <Empty icon={CheckCircle2} title="Nothing pending" hint="You've completed all assigned work." /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((a) => (
              <Card key={a.id}><CardHeader className="pb-3"><CardTitle className="text-base">{a.title}</CardTitle><CardDescription>{a.subject} · {a.questions.length} questions · {a.totalMarks} marks{a.dueDate ? ` · due ${a.dueDate}` : ''}</CardDescription></CardHeader>
                <CardContent><Button className="w-full" onClick={() => setTaking(a)}><BookOpen className="mr-2 h-4 w-4" />Start Assessment</Button></CardContent></Card>
            ))}
          </div>
        )}
      </div>
      {done.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">COMPLETED ({done.length})</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {done.map((a) => (
              <Card key={a.id} className="opacity-80"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">{a.title}</CardTitle><Badge className="border-0 bg-emerald-100 text-emerald-700">Done</Badge></div><CardDescription>{a.subject} · Scored {a.mySubmission.totalScore}/{a.totalMarks}</CardDescription></CardHeader></Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TakeAssessment({ assessment, onDone, onCancel }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const answered = Object.keys(answers).filter((k) => answers[k]).length
  const progress = Math.round((answered / assessment.questions.length) * 100)

  async function submit() {
    setSubmitting(true)
    try {
      const { submission } = await api('/submissions', { method: 'POST', body: { assessmentId: assessment.id, answers } })
      setResult(submission)
      toast.success('Submitted!')
    } catch (e) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  if (result) {
    const objMax = assessment.questions.filter((q) => q.type !== 'descriptive').reduce((s, q) => s + q.marks, 0)
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
        <h2 className="text-2xl font-bold">Submitted!</h2>
        <p className="text-muted-foreground">Your objective answers were graded instantly.</p>
        <Card><CardContent className="p-6">
          <div className="text-4xl font-bold text-primary">{result.objectiveScore}<span className="text-xl text-muted-foreground">/{objMax}</span></div>
          <p className="mt-1 text-sm text-muted-foreground">Objective score (auto-graded)</p>
          {assessment.questions.some((q) => q.type === 'descriptive') && <p className="mt-3 text-sm text-amber-600">Descriptive answers will be graded by your teacher soon.</p>}
        </CardContent></Card>
        <Button onClick={onDone} className="w-full">Back to Assignments</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">{assessment.title}</h2><p className="text-sm text-muted-foreground">{assessment.subject} · {assessment.totalMarks} marks</p></div>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
      <div className="sticky top-16 z-10 rounded-lg border bg-card p-3"><div className="mb-1 flex justify-between text-sm"><span>Progress</span><span>{answered}/{assessment.questions.length}</span></div><Progress value={progress} /></div>

      {assessment.questions.map((q, i) => (
        <Card key={q.id}><CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Question {i + 1}</span><Badge variant="secondary">{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge></div>
          <p className="mb-3 text-[15px]">{q.question}</p>
          {q.type === 'mcq' && (
            <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
              {q.options.map((o, oi) => (
                <label key={oi} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={o} id={`${q.id}-${oi}`} /><span className="text-sm">{o}</span>
                </label>
              ))}
            </RadioGroup>
          )}
          {q.type === 'fill_blank' && <Input placeholder="Your answer" value={answers[q.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />}
          {q.type === 'descriptive' && <Textarea rows={4} placeholder="Write your answer…" value={answers[q.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />}
        </CardContent></Card>
      ))}

      <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Submit Assessment</Button>
    </div>
  )
}

function Results({ user }) {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api('/submissions?mine=1').then((d) => setSubs(d.submissions || [])).finally(() => setLoading(false)) }, [])
  if (loading) return <PageLoader />
  if (subs.length === 0) return <Empty icon={Trophy} title="No results yet" hint="Complete an assignment to see your grades." />
  return (
    <div className="space-y-4">
      {subs.map((s) => {
        const pct = s.totalMax ? Math.round((s.totalScore / s.totalMax) * 100) : 0
        return (
          <Card key={s.id}><CardHeader className="pb-3"><div className="flex items-center justify-between">
            <div><CardTitle className="text-base">{s.assessmentTitle}</CardTitle><CardDescription>{s.subject}</CardDescription></div>
            <div className="text-right"><div className="text-2xl font-bold text-primary">{s.totalScore}/{s.totalMax}</div><Badge className="border-0 bg-slate-100 text-slate-700 mt-1">{s.status === 'approved' ? 'Final' : s.status === 'ai_graded' ? 'Preliminary' : 'Awaiting'}</Badge></div>
          </div></CardHeader>
          <CardContent><Progress value={pct} className="mb-3" />
            {Object.keys(s.ai || {}).length > 0 && (
              <div className="space-y-3 rounded-lg bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />AI Feedback & Personalized Improvement</p>
                {Object.values(s.ai).map((g, i) => (
                  <div key={i} className="space-y-1.5 rounded-md border border-border/60 bg-card p-2.5">
                    <p className="text-sm">{g.feedback}</p>
                    {g.misconception && g.misconception !== 'None detected' && (
                      <p className="text-xs text-red-700"><span className="font-medium">What went wrong:</span> {g.misconception}</p>
                    )}
                    {g.remediation && g.remediation.concept && (
                      <div className="rounded-md bg-primary/5 p-2 text-xs">
                        <p className="font-medium text-primary">💡 How to improve: {g.remediation.concept}</p>
                        {g.remediation.explanation && <p className="mt-0.5 text-muted-foreground">{g.remediation.explanation}</p>}
                        {g.remediation.practice && <p className="mt-0.5"><span className="font-medium">Try:</span> {g.remediation.practice}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => openPrintWindow('Report Card', reportCardHtml(s))}><Printer className="mr-1.5 h-3.5 w-3.5" />Download Report Card</Button>
            </div>
          </CardContent></Card>
        )
      })}
    </div>
  )
}

function Alerts() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const load = () => api('/alerts').then((d) => setList(d.alerts || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  async function markRead(id) { await api(`/alerts/${id}/read`, { method: 'POST' }); load() }
  if (loading) return <PageLoader />
  if (list.length === 0) return <Empty icon={Bell} title="No notifications" hint="Alerts from your teacher will show up here." />
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <Card key={a.id} className={a.read ? 'opacity-70' : 'border-primary/40'}>
          <CardContent className="flex items-start gap-3 p-4">
            <div className={'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ' + (a.type === 'assignment' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600')}><Bell className="h-4 w-4" /></div>
            <div className="flex-1"><p className="text-sm">{a.message}</p><p className="mt-1 text-xs text-muted-foreground">From {a.fromName} · {new Date(a.createdAt).toLocaleDateString()}</p></div>
            {!a.read && <Button variant="ghost" size="sm" onClick={() => markRead(a.id)}>Mark read</Button>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Profile({ user, onUserUpdate }) {
  const [f, setF] = useState({ name: user.name, className: user.className, rollNo: user.rollNo, guardian: user.guardian || '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  async function save() {
    setBusy(true)
    try { const { user: u } = await api(`/users/${user.id}`, { method: 'PUT', body: f }); toast.success('Profile updated'); onUserUpdate && onUserUpdate(u) }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Card className="max-w-lg"><CardHeader><CardTitle className="text-base">My Profile</CardTitle><CardDescription>Your data is private and secure.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={set('name')} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={user.email} disabled /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Class</Label><Input value={f.className} onChange={set('className')} /></div>
          <div className="space-y-1.5"><Label>Roll No.</Label><Input value={f.rollNo} onChange={set('rollNo')} /></div>
        </div>
        <div className="space-y-1.5"><Label>Guardian</Label><Input value={f.guardian} onChange={set('guardian')} /></div>
        <Button onClick={save} disabled={busy}>{busy ? <Spinner className="mr-2" /> : null}Save Changes</Button>
      </CardContent>
    </Card>
  )
}

function PageLoader() { return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> }
