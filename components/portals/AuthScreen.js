'use client'

import { useState } from 'react'
import { GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, setToken } from '@/lib/apiClient'
import { Spinner } from '@/components/portals/shared'
import { toast } from 'sonner'

const HERO = 'https://images.unsplash.com/photo-1574130303188-31a915382726'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'teacher',
    className: '', subject: '', school: '', rollNo: '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form
      const data = await api(path, { method: 'POST', body })
      setToken(data.token)
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      onAuth(data.user)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[46%] xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold tracking-tight">EduPilot AI</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Sign in to your teacher automation workspace.'
              : 'Set up your portal in seconds — no setup required.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="you@school.com" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <Select value={form.role} onValueChange={set('role')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {form.role !== 'superadmin' && (
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Input value={form.className} onChange={set('className')} placeholder="e.g. 8A" />
                    </div>
                  )}
                  {form.role === 'teacher' && (
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={form.subject} onChange={set('subject')} placeholder="e.g. Science" />
                    </div>
                  )}
                  {form.role === 'student' && (
                    <div className="space-y-2">
                      <Label>Roll No.</Label>
                      <Input value={form.rollNo} onChange={set('rollNo')} placeholder="e.g. 24" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>School</Label>
                    <Input value={form.school} onChange={set('school')} placeholder="Central High" />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner className="mr-2" /> : null}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Right: hero */}
      <div className="relative hidden lg:block lg:w-[54%]">
        <img src={HERO} alt="Classroom" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/85 via-primary/55 to-slate-900/50" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Powered by GPT-4o
          </div>
          <h2 className="max-w-lg text-3xl font-bold leading-tight xl:text-4xl">
            Give teachers their time back.
          </h2>
          <p className="mt-3 max-w-md text-white/85">
            Generate assessments, auto-grade objective answers, and let AI pre-evaluate descriptive responses — you stay in control.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/90">
            {['AI question paper generation', 'Instant objective grading', 'Rubric-based descriptive evaluation', 'Class analytics & remedial insights'].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
