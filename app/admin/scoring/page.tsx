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
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-950 to-purple-950 flex items-center justify-center text-white font-mono">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-950 to-fuchsia-950 text-white p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          ⚔️ Points Royale ⚔️
        </h1>

        {!activeSession && (
	  <div className="bg-white/5 backdrop-blur-md rounded-xl border-2 border-white/20 p-6 space-y-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]">

            {/* NEW ROUND TITLE */}
            <h2 className="text-2xl font-bold text-center mb-4">♠️ New Round ♠️</h2>

            {/* DATE + GAME */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                  className="w-full p-3 bg-purple-900/70 rounded-lg border border-white/20 text-center"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e =>
                    setNewSession({ ...newSession, game: e.target.value })
                  }
                  className="w-full p-3 bg-purple-900/70 rounded-lg border border-white/20 text-center"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>
                      {GAME_EMOJIS[g]} {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SELECT / CLEAR + THRESHOLD TOGGLE */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">
                  Players
                </label>
                {newSession.players.length === 0 ? (
                  <button
                    onClick={selectAllPlayers}
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-800 rounded-lg border border-white/30 font-semibold text-sm"
                  >
                    Select All
                  </button>
                ) : (
                  <button
                    onClick={clearPlayers}
                    className="w-full py-2 bg-red-800 hover:bg-red-700 rounded-lg border border-white/30 font-semibold text-sm"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Win Threshold Toggle */}
              {newSession.game !== 'Blackjack' && (
                <div className="flex flex-col items-center">
                  <label className="block text-sm font-bold text-center mb-1">
                    Win Threshold
                  </label>
                  <div className="flex gap-3 bg-purple-900/70 rounded-full p-1 border border-white/20">
                    {[3, 5].map(num => (
                      <button
                        key={num}
                        onClick={() =>
                          setNewSession({ ...newSession, threshold: num })
                        }
                        className={`px-3 py-1 rounded-full font-bold transition-all ${
                          newSession.threshold === num
                            ? 'bg-fuchsia-700 text-white shadow-[0_0_10px_rgba(255,0,150,0.5)]'
                            : 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PLAYER BUTTONS */}
            <div className="grid grid-cols-3 gap-3">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  className={`py-3 rounded-lg border font-semibold transition-all text-center
                    ${
                      newSession.players.includes(p)
                        ? 'bg-purple-900 border-emerald-600/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                        : 'bg-purple-800 border-white/20 hover:border-white/40'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* MADNESS BUTTON */}
            {newSession.game !== 'Blackjack' && (
              <button
                onClick={createSession}
                className={`w-full bg-gradient-to-br from-fuchsia-950 to-purple-950 shadow-inner shadow-black/40 hover:from-fuchsia-900 hover:to-purple-900 py-3 rounded-lg font-bold transition-all ${
                  newSession.players.length > 0
                    ? 'border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.5)]'
                    : 'border-2 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                }`}
              >
                👊 Let the Madness Begin 🎯
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
