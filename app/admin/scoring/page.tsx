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
      <div className="max-w-3xl mx-auto h-full flex flex-col justify-center space-y-6">

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center select-none
          bg-clip-text text-transparent
          bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200
          dark:text-amber-400 dark:bg-none">
          ⚔️ Points Royale ⚔️
        </h1>

        {!activeSession && (
          <div className="bg-gradient-to-br from-purple-900/50 to-slate-900/60
            backdrop-blur-lg border-2 border-purple-500/40 rounded-xl p-4 space-y-6
            shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_2px_rgba(255,255,255,0.12)]">

            {/* NEW ROUND */}
            <h2 className="text-center text-3xl font-bold tracking-[3px] select-none
              bg-clip-text text-transparent
              bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300
              dark:text-white dark:bg-none">
              New Round
            </h2>

            {/* DATE + GAME */}
            <div className="flex gap-3">
              {[{
                label: 'Date',
                element: (
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                  />
                )
              }, {
                label: 'Game',
                element: (
                  <select
                    value={newSession.game}
                    onChange={e => setNewSession({ ...newSession, game: e.target.value })}
                  >
                    {SCORE_GAMES.map(g => (
                      <option key={g} value={g}>
                        {GAME_EMOJIS[g]} {g}
                      </option>
                    ))}
                  </select>
                )
              }].map(({ label, element }) => (
                <div className="flex-1" key={label}>
                  <label className="block text-sm font-bold text-center mb-1">{label}</label>
                  <div className="
                    rounded-lg border-2 border-fuchsia-600/30 bg-purple-900/80
                    shadow-[0_4px_6px_rgba(255,255,255,0.25),inset_0_2px_4px_rgba(255,255,255,0.15)]
                    hover:shadow-[0_6px_10px_rgba(255,255,255,0.3),inset_0_2px_4px_rgba(255,255,255,0.2)]
                    transition-all">
                    {element}
                  </div>
                </div>
              ))}
            </div>

            {/* DEAL / CLEAR – CASINO STYLE */}
            <div>
              {newSession.players.length === 0 ? (
                <button
                  onClick={selectAllPlayers}
                  className="
                    w-full py-2 rounded-lg font-semibold
                    bg-gradient-to-br from-blue-600 to-blue-800
                    border-2 border-white/70
                    shadow-[0_6px_14px_rgba(255,255,255,0.25),inset_0_2px_4px_rgba(255,255,255,0.25)]
                    active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)]
                    transition-all">
                  ♠ Deal All
                </button>
              ) : (
                <button
                  onClick={clearPlayers}
                  className="
                    w-full py-2 rounded-lg font-semibold
                    bg-gradient-to-br from-red-600 to-red-800
                    border-2 border-white/70
                    shadow-[0_6px_14px_rgba(255,255,255,0.25),inset_0_2px_4px_rgba(255,255,255,0.25)]
                    active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)]
                    transition-all">
                  ✖ Clear Table
                </button>
              )}
            </div>

            {/* PLAYER SELECTION */}
            <div className="grid grid-cols-3 gap-y-6 gap-x-4">
              {PLAYERS.map(p => {
                const selected = newSession.players.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => togglePlayer(p)}
                    className={`
                      h-10 rounded-md font-semibold text-sm
                      border-2 transition-all
                      shadow-[0_4px_6px_rgba(0,0,0,0.55),inset_0_1px_2px_rgba(255,255,255,0.08)]
                      ${selected
                        ? 'bg-gradient-to-br from-purple-900/80 to-blue-900/80 border-blue-300/80'
                        : 'bg-gradient-to-br from-purple-950 to-blue-950 border-blue-400/30'}
                    `}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            {/* MADNESS */}
            <button
              disabled={newSession.players.length === 0}
              className={`
                w-full py-3 rounded-xl font-bold text-lg
                bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900
                border-2 transition-all
                shadow-[0_6px_16px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.15)]
                ${newSession.players.length
                  ? 'border-orange-400 hover:border-orange-300'
                  : 'border-orange-900 opacity-60 cursor-not-allowed'}
              `}
            >
              👊 Let the Madness Begin
            </button>

          </div>
        )}
      </div>
    </div>
  )
}
