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
        <h1 className="text-4xl font-bold text-center mb-6 mt-8">
          <span className="opacity-60">⚔️</span>{' '}
          <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300
                 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-200
                 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
  Points Royale
</span>{' '}
          <span className="opacity-60">⚔️</span>
        </h1>

        {!activeSession && (
          <div className="bg-gradient-to-br from-purple-950/80 to-black/80 backdrop-blur-md rounded-xl border-2 border-purple-400/40 shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.3)] p-6 space-y-6">
            {/* NEW ROUND TITLE */}
            <h2 className="text-3xl font-bold text-center mb-4
               bg-gradient-to-r from-slate-500 via-slate-300 to-slate-500
               dark:from-slate-300 dark:via-slate-100 dark:to-slate-300
               bg-clip-text text-transparent drop-shadow-[0_1px_8px_rgba(148,163,184,0.5)]">
  New Round
</h2>

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
                  className="w-full p-3 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-lg border-2 border-purple-400/30 text-center shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:border-purple-400/50 transition-all"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e =>
                    setNewSession({ ...newSession, game: e.target.value })
                  }
                  className="w-full p-3 bg-gradient-to-br from-purple-900/80 to-purple-950/90 rounded-lg border-2 border-purple-400/30 text-center shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:border-purple-400/50 transition-all"
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
                    className="w-full py-2 rounded-lg border border-blue-400/50 bg-gradient-to-br from-blue-700 to-blue-900 text-white font-semibold text-sm shadow-[0_4px_8px_rgba(0,0,0,0.4),0_0_20px_rgba(59,130,246,0.45)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.5),0_0_30px_rgba(59,130,246,0.6)] active:translate-y-[1px] transition-all"
                  >
                    ♠ Deal All
                  </button>
                ) : (
                  <button
                    onClick={clearPlayers}
                    className="w-full py-2 rounded-lg border border-red-400/50 bg-gradient-to-br from-red-700 to-red-900 text-white font-semibold text-sm shadow-[0_4px_8px_rgba(0,0,0,0.4),0_0_20px_rgba(239,68,68,0.45)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.5),0_0_30px_rgba(239,68,68,0.6)] active:translate-y-[1px] transition-all"
                  >
                    ✖ Clear Table
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
                        className={`px-3 py-1 rounded-full font-bold transition-all shadow-[0_3px_6px_rgba(0,0,0,0.3)] active:translate-y-[1px] ${
                          newSession.threshold === num
                            ? 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                            : 'bg-purple-800/40 text-purple-300/60 hover:bg-purple-700/50'
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
            <div className="grid grid-cols-2 gap-3">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  className={`p-3 rounded-lg border font-semibold transition-all text-center shadow-[0_6px_12px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6),0_8px_16px_rgba(0,0,0,0.7)] active:translate-y-[2px] active:shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                    newSession.players.includes(p)
                      ? 'bg-gradient-to-br from-purple-800 to-purple-900 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)]'
                      : 'bg-gradient-to-br from-purple-900 to-purple-950 border-purple-400/30 shadow-[0_0_8px_rgba(88,28,135,0.3)]'
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
                className={`w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-br from-blue-900 via-fuchsia-900 to-blue-950 text-white shadow-[0_6px_12px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.2)] active:translate-y-[1px] transition-all ${
                  newSession.players.length > 0
                    ? 'border-2 border-white shadow-[0_0_30px_rgba(255,255,255,0.8)]'
                    : 'border-2 border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                }`}
              >
                👊 Let the Madness Begin
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}