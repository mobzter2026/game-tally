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
      <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center mb-6 mt-8 bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(251,191,36,0.6)]">
          ⚔️ Points Royale ⚔️
        </h1>

        {!activeSession && (
          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/60 backdrop-blur-lg border-2 border-purple-500/40 rounded-xl p-6 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            {/* NEW ROUND TITLE */}
            <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-wider">
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
                  className="w-full p-3 bg-gradient-to-b from-purple-800/80 to-purple-950/90 rounded-lg border-2 border-fuchsia-600/40 text-center shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.15)] hover:border-purple-300/60 transition-all"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e =>
                    setNewSession({ ...newSession, game: e.target.value })
                  }
                  className="w-full p-3 bg-gradient-to-b from-purple-800/80 to-purple-950/90 rounded-lg border-2 border-fuchsia-600/40 text-center shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.15)] hover:border-purple-300/60 transition-all"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>
                      {GAME_EMOJIS[g]} {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SELECT / CLEAR + THRESHOLD */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">
                  Players
                </label>
                {newSession.players.length === 0 ? (
                  <button
                    onClick={selectAllPlayers}
                    className="w-full py-2 rounded-lg border-2 border-fuchsia-500 bg-gradient-to-br from-blue-700 to-blue-900 shadow-[0_5px_15px_rgba(59,130,246,0.4),0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.6),0_6px_12px_rgba(0,0,0,0.6)] active:translate-y-[2px] transition-all font-semibold"
                  >
                    ♠ Deal All
                  </button>
                ) : (
                  <button
                    onClick={clearPlayers}
                    className="w-full py-2 rounded-lg border-2 border-fuchsia-500 bg-gradient-to-br from-blue-700 to-blue-900 shadow-[0_5px_15px_rgba(59,130,246,0.4),0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.6),0_6px_12px_rgba(0,0,0,0.6)] active:translate-y-[2px] transition-all font-semibold"
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
                  <div className="flex gap-3 bg-purple-950/70 rounded-full p-1 border-2 border-purple-400/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
                    {[3, 5].map(num => (
                      <button
                        key={num}
                        onClick={() =>
                          setNewSession({ ...newSession, threshold: num })
                        }
                        className={`px-3 py-1 rounded-full font-bold ${
                          newSession.threshold === num
                            ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-[0_3px_8px_rgba(147,51,234,0.5),inset_0_1px_2px_rgba(255,255,255,0.3)] border border-purple-300'
                            : 'bg-purple-900/40 text-purple-300/70 hover:bg-purple-800/50 border border-purple-700/30'
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
                  className={`p-3 rounded-lg border font-semibold text-center ${
                    newSession.players.includes(p)
                      ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-[0_3px_8px_rgba(147,51,234,0.5),inset_0_1px_2px_rgba(255,255,255,0.3)] border border-purple-300 border-white'
                      : 'bg-gradient-to-b from-purple-800/80 to-purple-950/90 text-white border-2 border-fuchsia-600/40 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.15)] hover:border-purple-300/60 active:translate-y-[2px]'
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
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-black via-blue-950 to-black text-white border-2 border-white/50 shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.2)] hover:shadow-[0_10px_25px_rgba(255,255,255,0.3),inset_0_2px_4px_rgba(255,255,255,0.25)] hover:border-white/70 active:translate-y-[2px] transition-all"
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
