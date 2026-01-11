'use client'

import React, { useEffect, useState } from 'react'
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

      if (error) {
        alert(`Database error: ${error.message}`)
        return
      }
      if (!data) {
        alert('No data returned from database')
        return
      }

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
        <h1
  className="
    w-full max-w-full
    text-center select-none
    whitespace-nowrap
    overflow-hidden
    text-[1.75rem] sm:text-[2.05rem]
    font-semibold
    tracking-[0.16em] sm:tracking-[0.2em]
    drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]
  "
>
  <span className="inline-block mr-2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
    ♠
  </span>

  <span
    className="
      bg-gradient-to-r
      from-amber-300 via-yellow-200 to-amber-400
      bg-clip-text text-transparent
      drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
    "
  >
    POINTS&nbsp;ROYAL
  </span>

  <span className="inline-block ml-2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
    ♠
  </span>
</h1>
        <div className="h-6" />

        {/* SECTION BOX */}
<div
  className="
    rounded-xl p-6 space-y-6
    bg-gradient-to-br from-purple-900/50 to-slate-900/60
    shadow-[0_12px_25px_rgba(0,0,0,0.45),
            inset_0_2px_8px_rgba(255,255,255,0.25)]
  "
>

          <h2 className="text-center text-3xl font-bold tracking-[3px] select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            New Round
          </h2>

          {/* DATE + GAME */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-center mb-1">
                Date
              </label>
              <div className="relative flex items-center justify-center">
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                  style={{ paddingLeft: '12px' }}
                  className="h-11 w-full font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 text-center shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all"
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
                className="h-11 w-full text-center font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 appearance-none px-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all"
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
    <Button
      onClick={selectAllPlayers}
      variant="pop"       // gives pop shadow + inner highlight
      color="blue"
      className="flex-1 h-11"
    >
      ♠ Deal All
    </Button>
  ) : (
    <Button
      onClick={clearPlayers}
      variant="pop"       // gives pop shadow + inner highlight
      color="red"
      className="flex-1 h-11"
    >
      ✖ Clear Table
    </Button>
  )}

  {/* Win Threshold switch */}
  {newSession.game !== 'Blackjack' && (
    <div className="flex gap-2 items-center">
      {[3, 5].map(num => (
        <Button
          key={num}
          onClick={() => toggleThreshold(num)}
          variant="frosted"
          color="purple"
          selected={newSession.threshold === num}
          className="w-10 h-10 rounded-full text-sm"
        >
          {num}
        </Button>
      ))}
    </div>
  )}
</div>

{/* PLAYER SELECTION */}
<div className="grid grid-cols-3 gap-x-4 gap-y-6">
  {PLAYERS.map(p => (
    <Button
      key={p}
      onClick={() => togglePlayer(p)}
      variant="frosted"
      color="purple"
      selected={newSession.players.includes(p)}
      className="h-10 text-sm font-semibold"
    >
      {p}
    </Button>
  ))}
</div>

{/* MADNESS BUTTON */}
<Button
  onClick={startNewRound}
  disabled={newSession.players.length === 0}
  variant="frosted"       // keep frosted for consistency
  color="purple"           // gradient color of the button
  className={`
    w-full py-3 rounded-xl font-bold text-lg
    ${newSession.players.length 
      ? 'ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.85),0_0_32px_rgba(251,191,36,0.55)]'
      : 'ring-0 shadow-none opacity-50 cursor-not-allowed'
    }
  `}
>
  👊 Let the Madness Begin
</Button>
        </div>
      </div>
    </div>
  )
                    }
