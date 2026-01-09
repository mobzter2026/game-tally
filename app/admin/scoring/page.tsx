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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950">
        Loading…
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 text-white p-4">
      <div className="max-w-3xl mx-auto h-full flex flex-col justify-center">

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center select-none text-amber-400 -mt-28 mb-4">
          ⚔️ Points Royale ⚔️
        </h1>

        {/* spacer */}
        <div className="h-6" />

        {/* SECTION BOX */}
        <div className="casino-control bg-gradient-to-br from-purple-900/50 to-slate-900/60 rounded-xl p-4 space-y-6">

          {/* NEW ROUND */}
          <h2 className="text-center text-3xl font-bold tracking-[3px] select-none text-white">
            New Round
          </h2>

          {/* DATE + GAME */}
          <div className="flex gap-3">
            {/* DATE */}
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
                className="casino-control bg-purple-900/80 border-fuchsia-600/30"
              />
            </div>

            {/* GAME */}
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1">
                Game
              </label>
              <select
                value={newSession.game}
                onChange={e =>
                  setNewSession({ ...newSession, game: e.target.value })
                }
                className="casino-control bg-purple-900/80 border-fuchsia-600/30"
              >
                {SCORE_GAMES.map(g => (
                  <option key={g} value={g}>
                    {GAME_EMOJIS[g]} {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DEAL / CLEAR */}
          {newSession.players.length === 0 ? (
            <button
              onClick={selectAllPlayers}
              className="casino-control bg-blue-600 border-white/70 font-semibold h-11"
            >
              ♠ Deal All
            </button>
          ) : (
            <button
              onClick={clearPlayers}
              className="casino-control bg-red-600 border-white/70 font-semibold h-11"
            >
              ✖ Clear Table
            </button>
          )}

          {/* WIN THRESHOLD */}
          {newSession.game !== 'Blackjack' && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="block text-sm font-bold text-center w-full mb-1">
                Win Threshold
              </label>
              <div className="flex gap-3">
                {[3, 5].map(num => (
                  <button
                    key={num}
                    onClick={() =>
                      setNewSession({ ...newSession, threshold: num })
                    }
                    className={`casino-control px-3 py-1 font-bold h-10
                      ${
                        newSession.threshold === num
                          ? 'bg-purple-900/80 border-blue-300/90'
                          : 'bg-purple-950/70 border-blue-400/30'
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PLAYER SELECTION */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-6">
            {PLAYERS.map(p => {
              const selected = newSession.players.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  className={`casino-control h-10 text-sm font-semibold
                    ${
                      selected
                        ? 'bg-gradient-to-br from-purple-900/80 to-blue-900/80 border-blue-300/90'
                        : 'bg-gradient-to-br from-purple-950 to-blue-950 border-blue-400/30'
                    }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          {/* MADNESS BUTTON */}
          <button
            disabled={newSession.players.length === 0}
            className={`casino-control w-full py-3 rounded-xl font-bold text-lg
              bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900
              ${newSession.players.length ? 'border-orange-400' : 'border-orange-900 opacity-60 cursor-not-allowed'}`}
          >
            👊 Let the Madness Begin
          </button>

        </div>
      </div>
    </div>
  )
}
