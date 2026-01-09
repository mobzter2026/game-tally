'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Blackjack', 'Shithead', 'Rung']

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎴'
}

export default function LiveScoringPage() {
  const [activeSession, setActiveSession] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const [newSession, setNewSession] = useState({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [] as string[],
    threshold: 3
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/admin/login')
      else setLoading(false)
    })
  }, [])

  const createSession = () => {
    if (newSession.players.length < 2) {
      alert('Select at least 2 players')
      return
    }

    setActiveSession({
      game_type: newSession.game,
      game_date: newSession.date,
      players: newSession.players,
      win_threshold: newSession.game === 'Rung' ? 5 : newSession.threshold
    })

    const initialScores: Record<string, number> = {}
    newSession.players.forEach(p => (initialScores[p] = 0))
    setScores(initialScores)
  }

  const togglePlayer = (player: string) => {
    setNewSession(s => ({
      ...s,
      players: s.players.includes(player)
        ? s.players.filter(p => p !== player)
        : [...s.players, player]
    }))
  }

  const selectAllPlayers = () =>
    setNewSession(s => ({ ...s, players: [...PLAYERS] }))

  const clearPlayers = () =>
    setNewSession(s => ({ ...s, players: [] }))

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center text-white">
        Loading…
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 text-white p-4">
      <div className="max-w-3xl mx-auto h-full flex flex-col justify-center space-y-6">
        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(251,191,36,0.6)]">
          ⚔️ Points Royale ⚔️
        </h1>

        {!activeSession && (
          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/60 backdrop-blur-lg border-2 border-purple-500/40 rounded-xl p-4 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            
            {/* DATE + GAME */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                  className="w-full p-2 text-center rounded-lg border-2 border-fuchsia-600/30 bg-purple-900/80 shadow-sm hover:border-purple-300 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e =>
                    setNewSession({ ...newSession, game: e.target.value })
                  }
                  className="w-full p-2 text-center rounded-lg border-2 border-fuchsia-600/30 bg-purple-900/80 shadow-sm hover:border-purple-300 transition-all"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>
                      {GAME_EMOJIS[g]} {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SELECT / CLEAR PLAYERS */}
            <div className="flex flex-wrap gap-2">
              {newSession.players.length === 0 ? (
                <button
                  onClick={selectAllPlayers}
                  className="flex-1 py-2 rounded-lg border-2 border-fuchsia-400 bg-blue-700 hover:bg-blue-800 shadow-sm font-semibold transition-all"
                >
                  ♠ Deal All
                </button>
              ) : (
                <button
                  onClick={clearPlayers}
                  className="flex-1 py-2 rounded-lg border-2 border-fuchsia-400 bg-blue-700 hover:bg-blue-800 shadow-sm font-semibold transition-all"
                >
                  ✖ Clear Table
                </button>
              )}
            </div>

            {/* PLAYER BUTTONS */}
            <div className="grid grid-cols-3 gap-2">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  className={`h-10 w-full rounded-md font-semibold text-sm transition-colors border-2
                    ${
                      newSession.players.includes(p)
                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-blue-400 text-white shadow-sm'
                        : 'bg-gradient-to-br from-purple-900/80 to-blue-900/80 border-blue-900/30 text-white hover:border-blue-400'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* MADNESS BUTTON */}
            <button
              onClick={createSession}
              className={`w-full py-3 rounded-xl font-bold text-lg border-2 transition-colors
                ${
                  newSession.players.length > 0
                    ? 'border-orange-400 text-white bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 hover:border-orange-300'
                    : 'border-orange-900 text-white bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 opacity-70 cursor-not-allowed'
                }`}
              disabled={newSession.players.length === 0}
            >
              👊 Let the Madness Begin
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
