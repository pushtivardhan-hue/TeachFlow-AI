'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api, getToken, clearToken } from '@/lib/apiClient'
import AuthScreen from '@/components/portals/AuthScreen'
import TeacherPortal from '@/components/portals/TeacherPortal'
import StudentPortal from '@/components/portals/StudentPortal'
import AdminPortal from '@/components/portals/AdminPortal'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    if (!t) { setLoading(false); return }
    api('/auth/me').then((d) => setUser(d.user)).catch(() => clearToken()).finally(() => setLoading(false))
  }, [])

  function logout() { clearToken(); setUser(null) }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!user) return <AuthScreen onAuth={setUser} />

  if (user.role === 'teacher') return <TeacherPortal user={user} onLogout={logout} />
  if (user.role === 'student') return <StudentPortal user={user} onLogout={logout} onUserUpdate={setUser} />
  if (user.role === 'superadmin') return <AdminPortal user={user} onLogout={logout} />
  return <div className="p-8">Unknown role</div>
}

export default App
