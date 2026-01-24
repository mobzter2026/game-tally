'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [newGame, setNewGame] = useState({
    type: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    players: [] as string[],
    winners: [] as string[],
    runnersUp: [] as string[],
    survivors: [] as string[],
    losers: [] as string[],
    team1: [] as string[],
    team2: [] as string[],
    winningTeam: 1
  })

  /* ───────────────── AUTH ───────────────── */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/admin/login')
        return
      }
      setUser(data.user)
      fetchGames()
      setLoading(false)
    })
  }, [])

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
    setGames((data || []) as Game[])
  }

  /* ───────────── SESSION HELPERS ───────────── */

  const getRungSessionWins = async (date: string) => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'Rung')
      .eq('game_date', date)
      .not('winning_team', 'is', null)
      .order('created_at', { ascending: true })

    const teamWins: Record<string, number> = {}

    ;(data || []).forEach(g => {
      const t1 = g.team1!.sort().join('&')
      const t2 = g.team2!.sort().join('&')
      if (!teamWins[t1]) teamWins[t1] = 0
      if (!teamWins[t2]) teamWins[t2] = 0
      if (g.winning_team === 1) teamWins[t1]++
      if (g.winning_team === 2) teamWins[t2]++
    })

    return teamWins
  }

  const finalizeRungSession = async (date: string) => {
    const teamWins = await getRungSessionWins(date)
    const sorted = Object.entries(teamWins).sort((a, b) => b[1] - a[1])

    const winners = sorted.filter(t => t[1] >= 5).flatMap(t => t[0].split('&'))
    const losers = sorted.filter(t => t[1] < 5).flatMap(t => t[0].split('&'))

    if (winners.length === 0) return

    await supabase.from('games').insert({
      game_type: 'Rung',
      game_date: date,
      players_in_game: [...new Set([...winners, ...losers])],
      winners,
      losers,
      created_by: user.email,
      created_at: new Date().toISOString()
    })
  }

  /* ───────────────── ADD GAME ───────────────── */

  const addGame = async () => {
    const created_at = new Date(`${newGame.date}T${newGame.time}:00`).toISOString()

    // RUNG ROUND
    if (newGame.type === 'Rung') {
      await supabase.from('games').insert({
        game_type: 'Rung',
        game_date: newGame.date,
        team1: newGame.team1,
        team2: newGame.team2,
        winning_team: newGame.winningTeam,
        players_in_game: [...newGame.team1, ...newGame.team2],
        created_by: user.email,
        created_at
      })

      const wins = await getRungSessionWins(newGame.date)
      if (Object.values(wins).some(w => w >= 5)) {
        await finalizeRungSession(newGame.date)
      }

      fetchGames()
      return
    }

    // SHITHEAD AUTO FIX
    if (newGame.type === 'Shithead') {
      const losers = [...newGame.losers]
      const others = newGame.players.filter(p => !losers.includes(p))
      await supabase.from('games').insert({
        game_type: 'Shithead',
        game_date: newGame.date,
        players_in_game: newGame.players,
        winners: others.slice(0, 1),
        survivors: others.slice(1),
        losers,
        created_by: user.email,
        created_at
      })
      fetchGames()
      return
    }

    // NORMAL GAME
    await supabase.from('games').insert({
      game_type: newGame.type,
      game_date: newGame.date,
      players_in_game: newGame.players,
      winners: newGame.winners,
      runners_up: newGame.runnersUp,
      survivors: newGame.survivors,
      losers: newGame.losers,
      created_by: user.email,
      created_at
    })

    fetchGames()
  }

  if (loading) return <div className="p-8 text-white">Loading…</div>

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <Button onClick={addGame}>➕ Add Game</Button>
    </div>
  )
}