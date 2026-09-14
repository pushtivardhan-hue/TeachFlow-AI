'use client'

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function setToken(t) {
  if (typeof window !== 'undefined') localStorage.setItem('token', t)
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('token')
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) headers.Authorization = `Bearer ${t}`
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try { data = await res.json() } catch { /* noop */ }
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed')
  return data
}
