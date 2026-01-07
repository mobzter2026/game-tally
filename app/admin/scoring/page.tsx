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
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const [newSession, setNewSession] = useState({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [] as string[],
    threshold: 3
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/admin/login')
        return
      }
      setUser(data.user)
      setLoading(false)
    }
    checkAuth()
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
      win_threshold:
        newSession.game === 'Rung'
          ? 5
          : newSession.game === 'Blackjack'
          ? 1
          : newSession.threshold
    })

    const initialScores: Record<string, number> = {}
    newSession.players.forEach(p => (initialScores[p] = 0))
    setScores(initialScores)
  }

  const adjustScore = (player: string, amount: number) => {
    const updated = { ...scores }
    updated[player] = Math.max(0, (updated[player] || 0) + amount)
    setScores(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-800 via-purple-800 to-fuchsia-900 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-800 via-purple-800 to-fuchsia-900 text-white p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">⚔️ Points Royale ⚔️</h1>

        {activeSession ? (
          <div className="bg-gradient-to-br from-fuchsia-950/60 to-purple-950/60 rounded-xl border border-fuchsia-400/30 backdrop-blur-sm shadow-[0_0_20px_rgba(217,70,239,0.2)] p-6">
            <h2 className="text-2xl font-bold mb-4">
              {GAME_EMOJIS[activeSession.game_type]} {activeSession.game_type}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activeSession.players.map((player: string) => (
                <div
                  key={player}
                  className="bg-gradient-to-br from-fuchsia-900/90 to-purple-900/90 p-4 rounded border border-fuchsia-400/40 shadow-[0_0_12px_rgba(217,70,239,0.25)]"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold">{player}</span>
                    <span className="text-yellow-400 font-bold text-2xl">
                      {scores[player] || 0}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => adjustScore(player, -1)}
                      className="flex-1 bg-gradient-to-br from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 py-2 rounded border border-white/30 shadow-inner font-bold"
                    >
                      −
                    </button>
                    <button
                      onClick={() => adjustScore(player, 1)}
                      className="flex-1 bg-gradient-to-br from-green-700 to-emerald-900 hover:from-green-600 hover:to-emerald-800 py-2 rounded border border-white/30 shadow-inner font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-fuchsia-950/60 to-purple-950/60 rounded-xl border border-fuchsia-400/30 backdrop-blur-sm shadow-[0_0_20px_rgba(217,70,239,0.2)] p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">♠️ New Round</h2>

            {/* Date + Game */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block mb-1 text-sm font-bold text-center">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                  className="w-full p-3 bg-gradient-to-br from-fuchsia-900/80 to-purple-900/80 rounded-lg border border-white/30 shadow-inner text-center"
                />
              </div>
              <div className="flex-1">
                <label className="block mb-1 text-sm font-bold text-center">Game</label>
                <select
                  value={newSession.game}
                  onChange={e => setNewSession({ ...newSession, game: e.target.value })}
                  className="w-full p-3 bg-gradient-to-br from-fuchsia-900/80 to-purple-900/80 rounded-lg border border-white/30 shadow-inner text-center"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>
                      {GAME_EMOJIS[g]} {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  onClick={() =>
                    setNewSession(s =>
                      s.players.includes(p)
                        ? { ...s, players: s.players.filter(x => x !== p) }
                        : { ...s, players: [...s.players, p] }
                    )
                  }
                  className={`px-4 py-2 rounded-lg border-2 transition-all font-semibold ${
                    newSession.players.includes(p)
                      ? 'bg-gradient-to-br from-fuchsia-800 to-purple-800 border-fuchsia-300/50 shadow-[0_0_8px_rgba(217,70,239,0.35)]'
                      : 'bg-violet-900/80 border-white/20 hover:border-white/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Threshold */}
            {newSession.game !== 'Blackjack' && (
              <div className="mb-4">
                <label className="block mb-1 text-sm font-bold text-center">Win Threshold</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newSession.threshold}
                  onChange={e =>
                    setNewSession({ ...newSession, threshold: Number(e.target.value) })
                  }
                  className="w-full p-3 bg-gradient-to-br from-fuchsia-900/80 to-purple-900/80 rounded-lg border border-white/30 shadow-inner text-center font-bold"
                />
              </div>
            )}

            {/* Bottom Button – KEEP DARK */}
            <button
              onClick={createSession}
              className="w-full bg-gradient-to-br from-fuchsia-950 to-purple-950 hover:from-fuchsia-900 hover:to-purple-900 py-3 rounded-lg font-bold tracking-wide shadow-inner shadow-black/40 border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all"
            >
              👊 Let the Madness Begin 🎯
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
