'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Blackjack', 'Shithead', 'Rung']

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎭'
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
    
    // Force light color scheme for form elements
    document.documentElement.style.colorScheme = 'light'
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

    try {
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

      if (error) return alert(`Database error: ${error.message}`)
      if (!data) return alert('No data returned from database')

      router.push(`/admin/scoring/${(data as any).id}`)
    } catch (error) {
      alert(`Failed to start new round: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950">
        Loading…
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-4 overflow-auto">
      <div className="max-w-3xl mx-auto flex flex-col justify-start">

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center select-none text-amber-400 mt-8 mb-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
          ⚔️ Points Royale ⚔️
        </h1>

        {/* SECTION BOX */}
        <div className="rounded-xl p-6 space-y-6 bg-gradient-to-br from-purple-900/50 to-slate-900/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.08)] shadow-[0_12px_25px_rgba(0,0,0,0.45)]">

          {/* NEW ROUND */}
          <h2 className="text-center text-3xl font-bold tracking-[3px] select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            New Round
          </h2>

          {/* DATE + GAME */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1">Date</label>
              <input
                type="date"
                value={newSession.date}
                onChange={e =>
                  setNewSession({ ...newSession, date: e.target.value })
                }
                className="h-11 w-full font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 text-center shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1">Game</label>
              <select
                value={newSession.game}
                onChange={e =>
                  setNewSession({ ...newSession, game: e.target.value })
                }
                className="h-11 w-full text-center font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 appearance-none px-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] transition-all"
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
              <Button onClick={selectAllPlayers} variant="pop" color="blue" className="flex-1 h-11">
                ♠ Deal All
              </Button>
            ) : (
              <Button onClick={clearPlayers} variant="pop" color="red" className="flex-1 h-11">
                ✖ Clear Table
              </Button>
            )}

            {/* Win Threshold switch (3/5) */}
            {newSession.game !== 'Blackjack' && (
              <div className="flex gap-2 items-center">
                {[3, 5].map(num => (
                  <Button
                    key={num}
                    onClick={() => toggleThreshold(num)}
                    variant="frosted"
                    color="purple"
                    className={`w-10 h-10 rounded-full ${
                      newSession.threshold === num ? 'brightness-110' : 'brightness-90'
                    }`}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* PLAYER SELECTION */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-6">
            {PLAYERS.map(p => {
              const selected = newSession.players.includes(p)
              return (
                <Button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  variant="frosted"
                  color="purple"
                  className={`h-10 text-sm font-semibold ${
                    selected ? 'brightness-110' : 'brightness-90'
                  }`}
                >
                  {p}
                </Button>
              )
            })}
          </div>

          {/* MADNESS BUTTON */}
          <Button
            onClick={startNewRound}
            disabled={newSession.players.length === 0}
            variant="frosted"
            color="purple"
            className="w-full py-3 text-lg rounded-xl"
          >
            👊 Let the Madness Begin
          </Button>

        </div>
      </div>
    </div>
  )
}
