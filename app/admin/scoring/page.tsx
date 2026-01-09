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
        <h1 className="text-4xl font-bold text-center select-none
          bg-clip-text text-transparent
          bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200
          dark:text-amber-400 dark:bg-none">
          ⚔️ Points Royale ⚔️
        </h1>

        {!activeSession && (
          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/60 backdrop-blur-lg border-2 border-purple-500/40 rounded-xl p-4 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">

            {/* NEW ROUND TITLE */}
            <h2 className="text-center text-3xl font-bold tracking-[3px] select-none
              text-white
              bg-clip-text text-transparent
              bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300
              dark:text-white dark:bg-none mb-4">
              New Round
            </h2>
            
            {/* DATE + GAME */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1 text-white select-none">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                  className="w-full p-2 text-center rounded-lg border-2 border-fuchsia-600/30 bg-purple-900/80 shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.2)] hover:shadow-[0_6px_10px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.25)] text-white transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1 text-white select-none">Game</label>
                <select
                  value={newSession.game}
                  onChange={e =>
                    setNewSession({ ...newSession, game: e.target.value })
                  }
                  className="w-full p-2 text-center rounded-lg border-2 border-fuchsia-600/30 bg-purple-900/80 shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.2)] hover:shadow-[0_6px_10px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.25)] text-white transition-all"
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
                  className="flex-1 py-2 rounded-lg border-2 border-fuchsia-400 bg-blue-700 hover:bg-blue-800 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.15)] font-semibold text-white transition-all"
                >
                  ♠ Deal All
                </button>
              ) : (
                <button
                  onClick={clearPlayers}
                  className="flex-1 py-2 rounded-lg border-2 border-fuchsia-400 bg-blue-700 hover:bg-blue-800 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.15)] font-semibold text-white transition-all"
                >
                  ✖ Clear Table
                </button>
              )}
            </div>

            {/* PLAYER BUTTONS */}
            <div className="grid grid-cols-3 gap-5 mt-2">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  className={`h-10 w-full rounded-md font-semibold text-sm text-white transition-all border-2 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_2px_3px_rgba(255,255,255,0.05)]
                    bg-gradient-to-br from-purple-950 to-blue-950
                    ${
                      newSession.players.includes(p)
                        ? 'border-blue-400/70'
                        : 'border-blue-400/30 hover:border-blue-400/50'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* MADNESS BUTTON */}
            <button
              onClick={createSession}
              className={`w-full py-3 rounded-xl font-bold text-lg border-2 transition-all shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.05)]
                bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900
                ${
                  newSession.players.length > 0
                    ? 'border-orange-400 hover:border-orange-300'
                    : 'border-orange-900 opacity-70 cursor-not-allowed'
                } text-white`}
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
