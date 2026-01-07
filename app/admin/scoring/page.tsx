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
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/admin/login')
        return
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">♠️ Points Royale ♠️</h1>

        {!activeSession && (
          <div className="bg-gradient-to-br from-slate-900/80 to-black/80 rounded-xl border border-emerald-700/30 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.8)] p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">New Round</h2>

            {/* Date & Game */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label className="block mb-1 text-sm font-bold text-center">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                  className="w-full p-3 bg-black/80 rounded-lg border border-white/20 shadow-inner text-center"
                />
              </div>
              <div className="flex-1">
                <label className="block mb-1 text-sm font-bold text-center">Game</label>
                <select
                  value={newSession.game}
                  onChange={e => setNewSession({ ...newSession, game: e.target.value })}
                  className="w-full p-3 bg-black/80 rounded-lg border border-white/20 shadow-inner text-center"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>
                      {GAME_EMOJIS[g]} {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select / Threshold Row */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <button
                onClick={() => setNewSession({ ...newSession, players: PLAYERS })}
                className="px-4 py-2 bg-gradient-to-br from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 rounded-lg border border-white/20 shadow-inner font-bold"
              >
                Select All
              </button>

              <button
                onClick={() => setNewSession({ ...newSession, players: [] })}
                className="px-4 py-2 bg-gradient-to-br from-red-900 to-red-950 hover:from-red-800 hover:to-red-900 rounded-lg border border-white/20 shadow-inner font-bold"
              >
                Clear
              </button>

              {newSession.game !== 'Blackjack' && (
                <div className="ml-auto w-48">
                  <label className="block mb-1 text-sm font-bold text-center">
                    Win Threshold
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newSession.threshold}
                    onChange={e =>
                      setNewSession({
                        ...newSession,
                        threshold: Number(e.target.value)
                      })
                    }
                    className="w-full p-2 bg-black/80 rounded-lg border border-white/20 shadow-inner text-center font-bold"
                  />
                </div>
              )}
            </div>

            {/* Players */}
            <div className="grid grid-cols-3 gap-3 mb-6">
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
                  className={`px-4 py-3 rounded-lg border-2 transition-all font-bold ${
                    newSession.players.includes(p)
                      ? 'bg-gradient-to-br from-emerald-700 to-emerald-900 border-yellow-500/60 shadow-[0_0_10px_rgba(234,179,8,0.35)]'
                      : 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/20 hover:border-white/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Bottom Button – DARK & HEAVY */}
            <button
              onClick={createSession}
              className="w-full bg-gradient-to-br from-neutral-950 to-black hover:from-neutral-900 hover:to-neutral-950 py-3 rounded-lg font-bold tracking-wide border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.45)] transition-all"
            >
              👊 Let the Madness Begin 🎯
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
