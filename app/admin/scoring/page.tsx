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

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    winner: string
    scores: Record<string, number>
  }>({ show: false, winner: '', scores: {} })

  const [scoreHistory, setScoreHistory] = useState<{ player: string; amount: number }[]>([])

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
      win_threshold: newSession.threshold
    })

    const initialScores: Record<string, number> = {}
    newSession.players.forEach(p => (initialScores[p] = 0))
    setScores(initialScores)
    setScoreHistory([])
  }

  const adjustScore = (player: string, amount: number) => {
    const updated = { ...scores }
    updated[player] = Math.max(0, (updated[player] || 0) + amount)
    setScores(updated)
    setScoreHistory([...scoreHistory, { player, amount }])

    const maxScore = Math.max(...Object.values(updated))
    if (maxScore >= activeSession.win_threshold) {
      const winner =
        Object.entries(updated).find(([, s]) => s === maxScore)?.[0] || ''
      setConfirmDialog({ show: true, winner, scores: updated })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-800 via-purple-700 to-fuchsia-900 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-800 via-purple-700 to-fuchsia-900 text-white p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">⚔️ Points Royale ⚔️</h1>

        {activeSession ? (
          <div className="bg-gradient-to-br from-fuchsia-950/70 to-purple-950/70 backdrop-blur-sm rounded-xl border border-fuchsia-400/40 shadow-[0_0_30px_rgba(217,70,239,0.25)] p-6">
            <h2 className="text-2xl font-bold mb-4">
              {GAME_EMOJIS[activeSession.game_type]} {activeSession.game_type}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activeSession.players.map((player: string) => (
                <div
                  key={player}
                  className="bg-gradient-to-br from-fuchsia-900/90 to-purple-900/90 p-4 rounded border border-fuchsia-400/40 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
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
                      className="flex-1 bg-gradient-to-br from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 py-2 rounded border border-white/30 shadow-inner font-bold"
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
          <div className="bg-gradient-to-br from-fuchsia-950/70 to-purple-950/70 backdrop-blur-sm rounded-xl border border-fuchsia-400/40 shadow-[0_0_30px_rgba(217,70,239,0.25)] p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">♠️ New Round</h2>

            <div className="grid grid-cols-3 gap-2 mb-6">
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
                  className={`px-4 py-2 rounded-lg border transition-all font-semibold ${
                    newSession.players.includes(p)
                      ? 'bg-gradient-to-br from-fuchsia-700 to-purple-700 border-white/50 shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                      : 'bg-fuchsia-950/70 border-white/20 hover:border-white/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={createSession}
              className={`w-full bg-gradient-to-br from-fuchsia-900 to-purple-900 hover:from-fuchsia-800 hover:to-purple-800 py-3 rounded-lg font-bold tracking-wide shadow-inner shadow-black/40 transition-all ${
                newSession.players.length > 0
                  ? 'border-2 border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.6)]'
                  : 'border-2 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
              }`}
            >
              👊 Let the Madness Begin 🎯
            </button>
          </div>
        )}

        {confirmDialog.show && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-fuchsia-950 to-purple-950 rounded-xl border-2 border-yellow-500 p-6 w-full max-w-md shadow-[0_0_40px_rgba(234,179,8,0.5)]">
              <h3 className="text-2xl font-bold mb-4">🏆 Game Complete!</h3>
              <p className="mb-4">
                Winner:{' '}
                <span className="text-yellow-400 font-bold">
                  {confirmDialog.winner}
                </span>
              </p>
              <button
                onClick={() => setConfirmDialog({ show: false, winner: '', scores: {} })}
                className="w-full bg-gradient-to-br from-green-700 to-emerald-900 hover:from-green-600 hover:to-emerald-800 py-2 rounded border border-white/30 font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
