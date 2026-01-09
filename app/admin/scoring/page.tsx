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
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 text-gray-900">
        Loading…
      </div>
    )
  }

  // Frosted inner shadow + subtle outer shadow for light mode
  const frostedClass =
    "shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_2px_6px_rgba(255,255,255,0.8)] transition-all"

  // Enhanced shadow for Deal/Clear buttons
  const popButtonClass =
    "shadow-[0_4px_8px_rgba(0,0,0,0.15),inset_0_2px_8px_rgba(255,255,255,0.9)] transition-all"

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 text-gray-900 p-4 overflow-auto">
      <div className="max-w-3xl mx-auto flex flex-col justify-start">

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center select-none bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mt-8 mb-2 drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]">
          ⚔️ Points Royale ⚔️
        </h1>

        {/* Spacer */}
        <div className="h-6" />

        {/* SECTION BOX */}
        <div className="
          rounded-xl p-6 space-y-6
          bg-white/80 backdrop-blur-sm
          [box-shadow:inset_0_2px_4px_rgba(255,255,255,0.5)]
          shadow-[0_12px_25px_rgba(0,0,0,0.1)]
        ">

          {/* NEW ROUND */}
          <h2 className="text-center text-3xl font-bold tracking-[3px] select-none text-gray-800 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
            New Round
          </h2>

          {/* DATE + GAME */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1 text-gray-700">
                Date
              </label>
              <div className="relative flex items-center justify-center">
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                  style={{
                    textAlign: 'center',
                    colorScheme: 'light'
                  }}
                  className={`h-11 w-full font-bold rounded-lg bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 text-gray-800 ${frostedClass}`}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1 text-gray-700">
                Game
              </label>
              <select
                value={newSession.game}
                onChange={e =>
                  setNewSession({ ...newSession, game: e.target.value })
                }
                className={`h-11 w-full text-center font-bold rounded-lg bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 text-gray-800 appearance-none px-4 ${frostedClass}`}
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
                className={`flex-1 h-11 font-semibold rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white ${popButtonClass}`}
              >
                ♠ Deal All
              </button>
            ) : (
              <button
                onClick={clearPlayers}
                className={`flex-1 h-11 font-semibold rounded-lg bg-gradient-to-br from-red-400 to-red-600 text-white ${popButtonClass}`}
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
                        ? 'bg-gradient-to-br from-blue-300 to-blue-500 text-white border-2 border-amber-400'
                        : 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700 border-2 border-transparent'
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
                      ? 'bg-gradient-to-br from-purple-400 to-blue-500 text-white'
                      : 'bg-gradient-to-br from-gray-100 to-gray-300 text-gray-700'
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
            className={`w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 text-white touch-manipulation ${
              newSession.players.length
                ? 'opacity-100 cursor-pointer border-2 border-amber-400 pointer-events-auto'
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
