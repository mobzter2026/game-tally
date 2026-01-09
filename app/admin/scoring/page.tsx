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

  const startNewRound = async () => {
    if (newSession.players.length === 0) return

    console.log('Starting new round with data:', newSession)

    try {
      // Insert new game session into database
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          game: newSession.game,
          date: newSession.date,
          players: newSession.players,
          threshold: newSession.threshold,
          status: 'active'
        } as any)
        .select()
        .single()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        alert(`Database error: ${error.message}`)
        return
      }

      if (!data) {
        console.error('No data returned from insert')
        alert('No data returned from database')
        return
      }

      console.log('Session created successfully:', data)
      
      // Navigate to live scoring page with session ID
      const sessionId = (data as any).id
      console.log('Navigating to:', `/admin/scoring/${sessionId}`)
      router.push(`/admin/scoring/${sessionId}`)
    } catch (error) {
      console.error('Unexpected error:', error)
      alert(`Failed to start new round: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="light h-screen flex items-center justify-center text-white bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950">
        Loading…
      </div>
    )
  }

  // Frosted inner shadow + subtle black outer shadow for buttons and inputs
  const frostedClass =
    "shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] transition-all"

  // Enhanced shadow for Deal/Clear buttons to pop more
  const popButtonClass =
    "shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.3)] transition-all"

  return (
    <div className="light h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-4 overflow-auto">
      <style jsx global>{`
        @media (prefers-color-scheme: dark) {
          .light {
            color-scheme: light !important;
          }
          .light * {
            color-scheme: light !important;
          }
        }
      `}</style>
      
      <div className="max-w-3xl mx-auto flex flex-col justify-start">

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center select-none text-amber-400 mt-8 mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
          ⚔️ Points Royale ⚔️
        </h1>

        {/* Spacer */}
        <div className="h-6" />

        {/* SECTION BOX */}
        <div className="rounded-xl p-6 space-y-6 bg-gradient-to-br from-purple-900/50 to-slate-900/60 [box-shadow:inset_0_2px_4px_rgba(255,255,255,0.08)] shadow-[0_12px_25px_rgba(0,0,0,0.45)]">

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
              <div className="relative">
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                  className={`h-11 w-full text-center font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 ${frostedClass}`}
                />
              </div>
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
                className={`h-11 w-full text-center font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 appearance-none px-4 ${frostedClass}`}
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
                className={`flex-1 h-11 font-semibold rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 ${popButtonClass}`}
              >
                ♠ Deal All
              </button>
            ) : (
              <button
                onClick={clearPlayers}
                className={`flex-1 h-11 font-semibold rounded-lg bg-gradient-to-br from-red-700 to-red-900 ${popButtonClass}`}
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
                        ? 'bg-gradient-to-br from-lime-500 to-lime-700 border-2 border-amber-500/70'
                        : 'bg-gradient-to-br from-lime-800 to-lime-950 border-2 border-transparent'
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
                      ? 'bg-gradient-to-br from-purple-700 to-blue-800'
                      : 'bg-gradient-to-br from-purple-900 to-blue-950'
                  } ${frostedClass}`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          {/* MADNESS BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Button clicked!')
              startNewRound()
            }}
            disabled={newSession.players.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 touch-manipulation ${
              newSession.players.length
                ? 'opacity-100 cursor-pointer border-2 border-amber-500/70 pointer-events-auto'
                : 'opacity-60 cursor-not-allowed border-2 border-transparent pointer-events-none'
            } ${frostedClass}`}
          >
            👊 Let the Madness Begin
          </button>

        </div>
      </div>
    </div>
  )
}
