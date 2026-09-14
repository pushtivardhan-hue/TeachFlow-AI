'use client'

import { motion } from 'framer-motion'
import {
  GraduationCap, Sparkles, ClipboardCheck, Brain, Target, BarChart3, ShieldCheck,
  ArrowRight, FileText, Send, CheckCircle2, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const HERO = 'https://images.unsplash.com/photo-1574130303188-31a915382726'

const STEPS = [
  { icon: FileText, label: 'Create Assessment' },
  { icon: Sparkles, label: 'AI Generates Questions' },
  { icon: Send, label: 'Students Submit' },
  { icon: Brain, label: 'AI Evaluates' },
  { icon: CheckCircle2, label: 'Teacher Approves' },
  { icon: TrendingUp, label: 'Students Improve' },
]

const FEATURES = [
  { icon: Sparkles, title: 'AI Question Generation', desc: 'Generate exam-ready MCQ, fill-in-the-blank and descriptive questions mapped to learning outcomes — in seconds.' },
  { icon: ClipboardCheck, title: 'Rubric-Based Evaluation', desc: 'Structured scoring with a rubric breakdown, strengths and weaknesses — not just a raw number.' },
  { icon: Target, title: 'Misconception Detection', desc: 'AI pinpoints the core misconception behind each wrong answer so you know exactly what to reteach.' },
  { icon: Brain, title: 'Personalized Remediation', desc: 'Every student gets a concept-to-review, an explanation and a practice suggestion tailored to their mistakes.' },
  { icon: BarChart3, title: 'Teacher Analytics', desc: 'Class averages, score distribution, per-question performance and common misconceptions at a glance.' },
  { icon: ShieldCheck, title: 'Human-in-the-loop AI', desc: 'AI suggests; the teacher approves or modifies. Deterministic rules guard marks, ranges and submissions.' },
]

export default function Landing({ onGetStarted, onSignIn }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><GraduationCap className="h-5 w-5" /></div>
            <span className="text-lg font-semibold tracking-tight">TeachFlow AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onSignIn}>Sign in</Button>
            <Button onClick={onGetStarted}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Powered by GPT-4o · Human-in-the-loop
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              AI-assisted assessment and <span className="text-primary">personalized learning</span> for teachers and students.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              TeachFlow AI generates assessments, evaluates answers with rubric-based scoring, detects misconceptions and recommends remediation — while the teacher stays in full control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={onGetStarted}>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="outline" onClick={onSignIn}>I already have an account</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative">
            <div className="overflow-hidden rounded-2xl border border-border/60 shadow-2xl shadow-primary/10">
              <img src={HERO} alt="Classroom" className="h-[380px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-y border-border/60 bg-muted/40 py-16">
        <div className="container">
          <h2 className="text-center text-2xl font-bold tracking-tight">How it works</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">One connected flow from creation to improvement.</p>
          <div className="mt-10 flex flex-wrap items-stretch justify-center gap-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.06 }}
                className="flex items-center gap-3">
                <div className="flex w-36 flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
                  <span className="text-sm font-medium leading-tight">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <h2 className="text-center text-2xl font-bold tracking-tight">Everything you need to grade smarter</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-blue-500 px-8 py-14 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold tracking-tight">Ready to give teachers their time back?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">Create your first AI-generated assessment in under a minute.</p>
            <Button size="lg" variant="secondary" className="mt-6" onClick={onGetStarted}>Get Started free <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} TeachFlow AI</span>
          <span>Human-in-the-loop AI for education</span>
        </div>
      </footer>
    </div>
  )
}
