'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, UserPlus, Loader2, Trash2, School, GraduationCap, FileText, ClipboardCheck, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/apiClient'
import { AppShell, StatCard, Empty, Spinner } from '@/components/portals/shared'
import { toast } from 'sonner'

const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'onboard', label: 'Onboard', icon: UserPlus },
]

const ROLE_BADGE = {
  superadmin: 'bg-violet-100 text-violet-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-emerald-100 text-emerald-700',
}

export default function AdminPortal({ user, onLogout }) {
  const [tab, setTab] = useState('overview')
  return (
    <AppShell user={user} onLogout={onLogout} nav={NAV} active={tab} onNav={setTab}>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <UsersView />}
      {tab === 'onboard' && <Onboard onDone={() => setTab('users')} />}
    </AppShell>
  )
}

function Overview() {
  const [stats, setStats] = useState(null)
  useEffect(() => { api('/admin/stats').then((d) => setStats(d.stats)).catch((e) => toast.error(e.message)) }, [])
  if (!stats) return <PageLoader />
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-500 p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold">Platform Overview</h2>
        <p className="mt-1 text-primary-foreground/85">Monitor system health and manage schools, teachers and students.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={School} label="Schools" value={stats.schools} tone="primary" />
        <StatCard icon={GraduationCap} label="Teachers" value={stats.teachers} tone="violet" />
        <StatCard icon={Users} label="Students" value={stats.students} tone="green" />
        <StatCard icon={FileText} label="Assessments" value={stats.assessments} tone="amber" />
        <StatCard icon={ClipboardCheck} label="Submissions" value={stats.submissions} tone="slate" />
        <StatCard icon={BookOpen} label="Question Bank" value={stats.questions} tone="primary" />
        <StatCard icon={Users} label="Admins" value={stats.admins} tone="violet" />
      </div>
      <Card><CardContent className="flex items-center gap-3 p-5"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-sm font-medium">All systems operational</span><span className="ml-auto text-sm text-muted-foreground">AI engine: GPT-4o · online</span></CardContent></Card>
    </div>
  )
}

function UsersView() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('all')
  const load = () => api('/users').then((d) => setList(d.users || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  async function del(id) { await api(`/users/${id}`, { method: 'DELETE' }).catch((e) => toast.error(e.message)); toast.success('Removed'); load() }
  const filtered = role === 'all' ? list : list.filter((u) => u.role === role)
  if (loading) return <PageLoader />
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm">Filter:</Label>
        <Select value={role} onValueChange={setRole}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="teacher">Teachers</SelectItem><SelectItem value="student">Students</SelectItem><SelectItem value="superadmin">Admins</SelectItem></SelectContent></Select>
      </div>
      {filtered.length === 0 ? <Empty icon={Users} title="No users" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>School</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell><Badge className={(ROLE_BADGE[u.role] || '') + ' border-0'}>{u.role}</Badge></TableCell>
              <TableCell>{u.school || '—'}</TableCell>
              <TableCell>{u.className || '—'}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => del(u.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  )
}

function Onboard({ onDone }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'teacher', school: '', className: '', subject: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }))
  async function save() {
    if (!f.name || !f.email || !f.password) { toast.error('Name, email and password required'); return }
    setBusy(true)
    try { await api('/users', { method: 'POST', body: f }); toast.success(`${f.role} onboarded`); onDone() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Card className="max-w-xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-primary" />Onboard User</CardTitle><CardDescription>Add a teacher or student to the platform.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label>Role</Label><Select value={f.role} onValueChange={set('role')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="superadmin">Super Admin</SelectItem></SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={f.name} onChange={set('name')} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={set('email')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Temp password</Label><Input value={f.password} onChange={set('password')} /></div>
          <div className="space-y-1.5"><Label>School</Label><Input value={f.school} onChange={set('school')} /></div>
        </div>
        {f.role !== 'superadmin' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Class</Label><Input value={f.className} onChange={set('className')} /></div>
            {f.role === 'teacher' && <div className="space-y-1.5"><Label>Subject</Label><Input value={f.subject} onChange={set('subject')} /></div>}
          </div>
        )}
        <Button onClick={save} disabled={busy}>{busy ? <Spinner className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}Onboard</Button>
      </CardContent>
    </Card>
  )
}

function PageLoader() { return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> }
