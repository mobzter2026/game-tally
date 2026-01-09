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

  const toggleThreshold = (num: number) =>
    setNewSession(s => ({ ...s, threshold: num }))

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950">
        Loading…
      </div>
    )
  }

  // Frosted 3D shadow class for all buttons & inputs
  const frostedClass =
    "shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.15)] transition-all"

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 text-white p-4 overflow-auto">
      <div className="max-w-3xl mx-auto flex flex-col justify-start">

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center select-none text-amber-400 mt-8 mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
          ⚔️ Points Royale ⚔️
        </h1>

        {/* Spacer */}
        <div className="h-6" />

        {/* SECTION BOX */}
        <div className="
          rounded-xl p-6 space-y-6
          bg-gradient-to-br from-purple-900/50 to-slate-900/60
          border-2 border-purple-500/40
          shadow-[0_12px_25px_rgba(0,0,0,0.45)]
          [box-shadow:inset_0_2px_4px_rgba(255,255,255,0.08)]
        ">

          {/* NEW ROUND */}
          <h2 className="text-center text-3xl font-bold tracking-[3px] select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            New Round
          </h2>

          {/* DATE + GAME */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1">
                Date
              </label>
              <input
                type="date"
                value={newSession.date}
                onChange={e =>
                  setNewSession({ ...newSession, date: e.target.value })
                }
                className={`h-11 w-full text-center font-bold rounded-lg bg-purple-900/80 border border-white ${frostedClass}`}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1">
                Game
              </label>
              <select
                value={newSession.game}
                onChange={e =>
                  setNewSession({ ...newSession, game: e.target.value })
                }
                className={`h-11 w-full text-center font-bold rounded-lg bg-purple-900/80 border border-white ${frostedClass}`}
              >
                {SCORE_GAMES.map(g => (
                  <option key={g} value={g}>
                    {GAME_EMOJIS[g]} {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DEAL / CLEAR + WIN THRESHOLD */}
          <div className="flex items-center gap-3">
            {newSession.players.length === 0 ? (
              <button
                onClick={selectAllPlayers}
                className={`flex-1 h-11 font-semibold rounded-lg bg-blue-600 border-white ${frostedClass}`}
              >
                ♠ Deal All
              </button>
            ) : (
              <button
                onClick={clearPlayers}
                className={`flex-1 h-11 font-semibold rounded-lg bg-red-600 border-white ${frostedClass}`}
              >
                ✖ Clear Table
              </button>
            )}

            {/* Win Threshold switch (3/5) */}
            {newSession.game !== 'Blackjack' && (
              <div className="flex gap-2 items-center">
                {[3, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => toggleThreshold(num)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      newSession.threshold === num
                        ? 'bg-purple-900/80 border-blue-300/90'
                        : 'bg-purple-950/70 border-blue-400/30'
                    } ${frostedClass}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PLAYER SELECTION */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-6">
            {PLAYERS.map(p => {
              const selected = newSession.players.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  className={`h-10 text-sm font-semibold rounded-lg ${
                    selected
                      ? 'bg-gradient-to-br from-purple-900/80 to-blue-900/80 border-blue-300/90'
                      : 'bg-gradient-to-br from-purple-950 to-blue-950 border-blue-400/30'
                  } ${frostedClass}`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          {/* MADNESS BUTTON */}
          <button
            disabled={newSession.players.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 ${
              newSession.players.length
                ? 'border-orange-400'
                : 'border-orange-900 opacity-60 cursor-not-allowed'
            } ${frostedClass}`}
          >
            👊 Let the Madness Begin
          </button>

        </div>
      </div>
    </div>
  )
}
