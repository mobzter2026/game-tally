'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/Components/Button'

export default function UserLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple password check - you can change this password
    if (password === 'cards2024') {
      // Redirect to scoring page
      router.push('/admin/scoring')
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md">
        <div className="rounded-xl shadow-2xl overflow-hidden bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
          <div className="p-6 border-b border-slate-700 text-center">
            <h1 className="text-2xl font-bold mb-2">🎮 User Login</h1>
            <p className="text-slate-400 text-sm">Enter password to access live scoring</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label className="block mb-2 text-sm font-bold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold text-center"
                placeholder="Enter password"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="pop"
              color="blue"
              className="w-full py-3 text-lg font-bold"
            >
              🎯 Enter Scoring
            </Button>

            <div className="mt-4 text-center">
              <a href="/" className="text-slate-400 hover:text-slate-200 text-sm">
                ← Back to Leaderboard
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
