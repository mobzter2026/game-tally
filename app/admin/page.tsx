'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Player, ScoreHistory } from '@/lib/types'

export default function AdminDashboard() {
  const [players, setPlayers] = useState<Player[]>([])
  const [history, setHistory] = useState<ScoreHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!adminData) {
      await supabase.auth.signOut()
      router.push('/admin/login')
      return
    }

    setUser(user)
    fetchPlayers()
    fetchHistory()
    setLoading(false)
  }

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('score', { ascending: false })

    if (data) setPlayers(data)
  }

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('score_history')
      .select('*, players (name)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setHistory(data as any)
  }

  const updateScore = async (playerId: string, pointsChange: number, reason: string) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return

    const newScore = Math.max(0, player.score + pointsChange)

    await supabase
      .from('players')
      .update({ score: newScore })
      .eq('id', playerId)

    await supabase.from('score_history').insert({
      player_id: playerId,
      points_changed: pointsChange,
      reason,
      admin_email: user?.email,
    })

    fetchPlayers()
    fetchHistory()
  }

  const resetAll = async () => {
    if (!confirm('Reset ALL scores to 0?')) return

    await supabase
      .from('players')
      .update({ score: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    await supabase.from('score_history').insert(
      players.map(p => ({
        player_id: p.id,
        points_changed: -p.score,
        reason: 'Admin reset',
        admin_email: user?.email,
      }))
    )

    fetchPlayers()
    fetchHistory()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto mt-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            
              href="/"
              target="_blank"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              View Public Board
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-bold">Manage Scores</h2>
              <button
                onClick={resetAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Reset All
              </button>
            </div>

            <div className="space-y-4">
              {players.map((player) => (
                <div key={player.id} className="bg-slate-700 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="font-bold text-xl">{player.name}</div>
                    <div className="text-3xl font-bold text-yellow-400">{player.score}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateScore(player.id, 1, '+1')}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => updateScore(player.id, 5, '+5')}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => updateScore(player.id, -1, '-1')}
                      className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded"
                      disabled={player.score === 0}
                    >
                      -1
                    </button>
                    <button
                      onClick={() => updateScore(player.id, -5, '-5')}
                      className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded"
                      disabled={player.score === 0}
                    >
                      -5
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {history.map((entry) => (
                <div key={entry.id} className="bg-slate-700 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <div className="font-semibold">{(entry as any).players?.name}</div>
                    <div className={`font-bold ${
                      entry.points_changed > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {entry.points_changed > 0 ? '+' : ''}{entry.points_changed}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">{entry.reason}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-center text-slate-400 py-8">No activity yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}