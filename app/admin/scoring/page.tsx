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
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center mb-6 mt-8">
          ⚔️ Points Royale ⚔️
        </h1>

        {!activeSession && (
          <div className="border border-white rounded-xl p-6 space-y-6">
            {/* NEW ROUND TITLE */}
            <h2 className="text-3xl font-bold text-center mb-4">
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
                  className="w-full p-3 bg-gray-900 rounded-lg border border-white text-center"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e =>
                    setNewSession({ ...newSession, game: e.target.value })
                  }
                  className="w-full p-3 bg-gray-900 rounded-lg border border-white text-center"
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
                    className="w-full py-2 rounded-lg border border-white bg-gray-800"
                  >
                    ♠ Deal All
                  </button>
                ) : (
                  <button
                    onClick={clearPlayers}
                    className="w-full py-2 rounded-lg border border-white bg-gray-800"
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
                  <div className="flex gap-3 bg-gray-900 rounded-full p-1 border border-white">
                    {[3, 5].map(num => (
                      <button
                        key={num}
                        onClick={() =>
                          setNewSession({ ...newSession, threshold: num })
                        }
                        className={`px-3 py-1 rounded-full font-bold ${
                          newSession.threshold === num
                            ? 'bg-white text-black'
                            : 'bg-gray-800 text-white'
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
                      ? 'bg-white text-black border-white'
                      : 'bg-gray-900 text-white border-white'
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
                className="w-full py-4 rounded-xl font-bold text-lg bg-gray-900 text-white border border-white"
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
