'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Player } from '@/lib/types'

export default function PublicScoreboard() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .order('score', { ascending: false })

      if (data) setPlayers(data)
      setLoading(false)
    }

    fetchPlayers()

    const channel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => fetchPlayers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `${idx + 1}.`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading scoreboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3">🏆 Live Scoreboard</h1>
          <p className="text-slate-300 text-lg">Real-time Rankings</p>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold">Current Rankings</h2>
          </div>
          
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                <th className="text-left p-4">Rank</th>
                <th className="text-left p-4">Player</th>
                <th className="text-center p-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr
                  key={player.id}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                    idx < 3 ? 'bg-yellow-900/10' : ''
                  }`}
                >
                  <td className="p-4 text-3xl">{getMedal(idx)}</td>
                  <td className="p-4 font-bold text-xl">{player.name}</td>
                  <td className="p-4 text-center">
                    <span className={`text-2xl font-bold ${
                      idx === 0 ? 'text-yellow-400' :
                      idx === 1 ? 'text-slate-300' :
                      idx === 2 ? 'text-amber-600' :
                      'text-slate-400'
                    }`}>
                      {player.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-8">
          <a href="/admin/login" className="text-slate-400 hover:text-slate-200 text-sm">
            Admin Login
          </a>
        </div>
      </div>
    </div>
  )
}