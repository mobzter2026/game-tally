'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎭',
}

type NewGameState = {
  type: string
  date: string
  time: string
  players: string[]
  winners: string[]
  runnersUp: string[]
  losers: string[]
  survivors: string[]
  team1: string[]
  team2: string[]
  winningTeam: 1 | 2
}

// ===== Helpers for Rung sessions =====
type RungRound = Game & {
  team1: string[]
  team2: string[]
  winning_team: 1 | 2
}

type RungSession = {
  key: string
  game_date: string
  startAt: string // ISO
  endAt: string // ISO
  rounds: RungRound[]
  allPlayers: string[]
  // playerBestScore = best score across any team that player played in, within session
  playerBestScore: Record<string, number>
  tiers: {
    winners: string[]
    runners: string[]
    survivors: string[]
    losers: string[]
  }
}

const teamKey = (team: string[]) => team.slice().sort().join('&')

const safeISO = (v: any) => {
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

const computeRungSessionTiers = (rounds: RungRound[]) => {
  // Compute team wins
  const wins: Record<string, number> = {}
  const teams = new Set<string>()
  rounds.forEach((r) => {
    const t1 = teamKey(r.team1)
    const t2 = teamKey(r.team2)
    teams.add(t1)
    teams.add(t2)
    if (wins[t1] === undefined) wins[t1] = 0
    if (wins[t2] === undefined) wins[t2] = 0
    if (r.winning_team === 1) wins[t1]++
    if (r.winning_team === 2) wins[t2]++
  })

  // Player best score across all teams they appeared in
  const playerBestScore: Record<string, number> = {}
  Array.from(teams).forEach((t) => {
    const score = wins[t] ?? 0
    t.split('&').forEach((p) => {
      if (playerBestScore[p] === undefined || score > playerBestScore[p]) playerBestScore[p] = score
    })
  })

  const allPlayers = Object.keys(playerBestScore)

  const winners = allPlayers.filter((p) => (playerBestScore[p] ?? 0) >= 5)
  const nonWinners = allPlayers.filter((p) => !winners.includes(p))

  let runners: string[] = []
  let survivors: string[] = []
  let losers: string[] = []

  if (nonWinners.length > 0) {
    const allSame =
      nonWinners.every((p) => (playerBestScore[p] ?? 0) === (playerBestScore[nonWinners[0]] ?? 0))

    if (winners.length > 0 && allSame) {
      // Winner exists, rest tied -> ALL losers (no runner-up)
      losers = nonWinners
    } else {
      const scores = nonWinners.map((p) => playerBestScore[p] ?? 0)
      const maxScore = Math.max(...scores)
      const minScore = Math.min(...scores)

      runners = nonWinners.filter((p) => (playerBestScore[p] ?? 0) === maxScore)
      losers = nonWinners.filter((p) => (playerBestScore[p] ?? 0) === minScore)
      survivors = nonWinners.filter((p) => !runners.includes(p) && !losers.includes(p))
    }
  }

  return {
    playerBestScore,
    allPlayers,
    tiers: { winners, runners, survivors, losers },
  }
}

const buildRungSessionsForDate = (roundsOnDate: RungRound[]) => {
  // roundsOnDate should be ASC by created_at
  const sessions: RungSession[] = []
  let current: RungRound[] = []
  let sessionIndex = 0

  const pushSession = () => {
    if (current.length === 0) return
    const startISO = safeISO(current[0].created_at) || new Date().toISOString()
    const endISO = safeISO(current[current.length - 1].created_at) || startISO
    const { playerBestScore, allPlayers, tiers } = computeRungSessionTiers(current)
    sessions.push({
      key: `${current[0].game_date}::${sessionIndex}`,
      game_date: current[0].game_date,
      startAt: startISO,
      endAt: endISO,
      rounds: current,
      allPlayers,
      playerBestScore,
      tiers,
    })
    sessionIndex++
    current = []
  }

  // Session ends when any player reaches 5 (i.e., any team a player is in hits 5) OR any team hits 5, practically
  // We'll just check "any player best score >= 5" after each round.
  for (const r of roundsOnDate) {
    current.push(r)
    const { playerBestScore } = computeRungSessionTiers(current)
    const sessionComplete = Object.values(playerBestScore).some((s) => (s ?? 0) >= 5)
    if (sessionComplete) pushSession()
  }
  pushSession()
  return sessions
}

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [editingGame, setEditingGame] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editSessionDate, setEditSessionDate] = useState('')
  const [editSessionTime, setEditSessionTime] = useState('')

  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [newGame, setNewGame] = useState<NewGameState>({
    type: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    players: [],
    winners: [],
    runnersUp: [],
    losers: [],
    survivors: [],
    team1: [],
    team2: [],
    winningTeam: 1,
  })

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    const { data: auth } = await supabase.auth.getUser()
    const u = auth?.user
    if (!u) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase.from('admin_users').select('*').eq('id', u.id).single()
    if (!adminData) {
      await supabase.auth.signOut()
      router.push('/admin/login')
      return
    }

    setUser(u)
    await fetchGames()
    setLoading(false)
  }

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false })
    if (data) setGames(data as Game[])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const toggleArrayItem = (
    key: keyof Pick<
      NewGameState,
      'players' | 'winners' | 'runnersUp' | 'losers' | 'survivors' | 'team1' | 'team2'
    >,
    player: string,
    max?: number
  ) => {
    const arr = newGame[key]
    if (!Array.isArray(arr)) return

    if (arr.includes(player)) {
      setNewGame({ ...newGame, [key]: arr.filter((p) => p !== player) })
    } else {
      if (max && arr.length >= max) {
        alert(`Maximum ${max} players allowed for ${key}`)
        return
      }
      setNewGame({ ...newGame, [key]: [...arr, player] })
    }
  }

  const selectAllPlayers = () => setNewGame({ ...newGame, players: PLAYERS })
  const clearPlayers = () => setNewGame({ ...newGame, players: [] })

  const addGame = async () => {
    const timestamp = new Date(`${newGame.date}T${newGame.time}:00`).toISOString()

    if (!newGame.type) return

    if (newGame.type === 'Rung') {
      if (newGame.team1.length === 0 || newGame.team2.length === 0) {
        alert('Please select players for both teams')
        return
      }
      if (newGame.team1.length > 2 || newGame.team2.length > 2) {
        alert('Each team can have maximum 2 players')
        return
      }

      const gameData: any = {
        game_type: newGame.type,
        game_date: newGame.date,
        players_in_game: [...newGame.team1, ...newGame.team2],
        team1: newGame.team1,
        team2: newGame.team2,
        winning_team: newGame.winningTeam,
        created_by: user?.email,
        created_at: timestamp,
      }

      const { error } = await (supabase.from('games').insert as any)(gameData)
      if (error) {
        console.error('Error adding Rung game:', error)
        alert('Error adding game. Check console for details.')
        return
      }
    } else {
      if (newGame.players.length === 0) {
        alert('Please select at least one player')
        return
      }

      const gameData: any = {
        game_type: newGame.type,
        game_date: newGame.date,
        players_in_game: newGame.players,
        winners: newGame.winners.length ? newGame.winners : null,
        runners_up: newGame.runnersUp.length ? newGame.runnersUp : null,
        survivors: newGame.survivors.length ? newGame.survivors : null,
        losers: newGame.losers.length ? newGame.losers : null,
        created_by: user?.email,
        created_at: timestamp,
      }

      const { error } = await (supabase.from('games').insert as any)(gameData)
      if (error) {
        console.error('Error adding game:', error)
        alert('Error adding game. Check console for details.')
        return
      }
    }

    setNewGame({
      type: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      players: [],
      winners: [],
      runnersUp: [],
      losers: [],
      survivors: [],
      team1: [],
      team2: [],
      winningTeam: 1,
    })

    fetchGames()
  }

  const deleteGame = async (id: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      await supabase.from('games').delete().eq('id', id)
      fetchGames()
    }
  }

  const startEditingGame = (game: Game) => {
    setEditingGame(game.id)
    setEditDate(game.game_date)
    setEditTime(game.created_at ? new Date(game.created_at).toTimeString().slice(0, 5) : '00:00')
  }

  const cancelEditing = () => {
    setEditingGame(null)
    setEditDate('')
    setEditTime('')
  }

  const saveGameDateTime = async (gameId: string) => {
    const timestamp = new Date(`${editDate}T${editTime}:00`).toISOString()
    const { error } = await (supabase.from('games').update as any)({ game_date: editDate, created_at: timestamp }).eq(
      'id',
      gameId
    )

    if (error) {
      console.error('Error updating game:', error)
      alert('Error updating game')
    } else {
      setEditingGame(null)
      setEditDate('')
      setEditTime('')
      fetchGames()
    }
  }

  const startEditingSession = (sessionKey: string, gameDate: string, endAtIso: string) => {
    setEditingSession(sessionKey)
    setEditSessionDate(gameDate)
    // use session end time as the editable time (keeps cards consistent with what you see)
    setEditSessionTime(new Date(endAtIso).toTimeString().slice(0, 5))
  }

  const cancelEditingSession = () => {
    setEditingSession(null)
    setEditSessionDate('')
    setEditSessionTime('')
  }

  const saveSessionDateTime = async (session: { sessionKey: string; rounds: Game[] }) => {
    // We update EVERY round in the session so grouping stays intact and nothing leaks into other sessions.
    const base = new Date(`${editSessionDate}T${editSessionTime}:00`).getTime()
    const roundsAsc = [...session.rounds].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const updates = roundsAsc.map((round, idx) => {
      const createdAt = new Date(base + idx * 1000).toISOString() // +1s per round keeps ordering stable
      return (supabase.from('games').update as any)({ game_date: editSessionDate, created_at: createdAt }).eq('id', round.id)
    })

    const results = await Promise.all(updates)
    const hasError = results.some(r => r.error)
    if (hasError) {
      console.error('Error updating session date/time:', results.find(r => r.error)?.error)
      alert('Error updating session date/time. Check console for details.')
      return
    }

    setEditingSession(null)
    setEditSessionDate('')
    setEditSessionTime('')
    fetchGames()
  }


  // Build Rung sessions from current games
  const rungSessions = useMemo(() => {
    const rungRounds = games
      .filter((g) => g.game_type === 'Rung' && g.team1 && g.team2 && g.winning_team !== null) as RungRound[]

    const byDate: Record<string, RungRound[]> = {}
    rungRounds.forEach((r) => {
      if (!byDate[r.game_date]) byDate[r.game_date] = []
      byDate[r.game_date].push(r)
    })

    const sessions: RungSession[] = []
    Object.keys(byDate)
      .sort()
      .reverse()
      .forEach((date) => {
        const roundsOnDate = byDate[date].slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        sessions.push(...buildRungSessionsForDate(roundsOnDate))
      })

    // newest first (by endAt)
    return sessions.sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime())
  }, [games])

  // Recent list combines sessions (as cards) + non-rung games (as cards)
  const recentCards = useMemo(() => {
    const nonRung = games.filter((g) => g.game_type !== 'Rung')
    const sessionCards = rungSessions.map((s) => ({
      kind: 'session' as const,
      id: s.key,
      created_at: s.endAt,
      game_date: s.game_date,
      session: s,
    }))
    const gameCards = nonRung.map((g) => ({
      kind: 'game' as const,
      id: g.id,
      created_at: g.created_at,
      game_date: g.game_date,
      game: g,
    }))
    return [...sessionCards, ...gameCards]
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 20)
  }, [games, rungSessions])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-4 font-mono">
      <div className="max-w-7xl mx-auto mt-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Admin Dashboard
          </h1>
          <p className="text-slate-300 mb-4 text-sm">Manage game results</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => router.push('/admin/scoring')} variant="pop" color="blue" className="px-4 py-2 text-sm">
              🎯 Live Scoring
            </Button>
            <Button onClick={() => router.push('/')} variant="pop" color="purple" className="px-4 py-2 text-sm">
              📊 View Leaderboard
            </Button>
            <Button onClick={handleSignOut} variant="pop" color="red" className="px-4 py-2 text-sm">
              🚪 Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Game Form */}
          <div className="rounded-xl p-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Add New Game
            </h2>
            <p className="text-xs text-slate-400 mb-4">💡 Tip: For round-based games, use Live Scoring for better tracking</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-xs font-bold">Game Type</label>
                  <select
                    value={newGame.type}
                    onChange={(e) => setNewGame({ ...newGame, type: e.target.value })}
                    className="w-full p-2.5 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg text-sm shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold"
                  >
                    <option value="" disabled>
                      Select a game
                    </option>
                    {Object.entries(GAME_EMOJIS).map(([gameType, emoji]) => (
                      <option key={gameType} value={gameType}>
                        {emoji} {gameType}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-xs font-bold">Date</label>
                  <input
                    type="date"
                    value={newGame.date}
                    onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                    className="w-full p-2.5 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg text-sm shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold text-center [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-bold">Time</label>
                  <input
                    type="time"
                    value={newGame.time}
                    onChange={(e) => setNewGame({ ...newGame, time: e.target.value })}
                    className="w-full p-2.5 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg text-sm shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold text-center [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>

              {newGame.type === 'Rung' ? (
                <>
                  <div>
                    <label className="block mb-2 text-xs font-bold">Team 1 (Max 2 players)</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map((p) => (
                        <Button
                          key={p}
                          onClick={() => toggleArrayItem('team1', p, 2)}
                          variant="frosted"
                          color="purple"
                          selected={newGame.team1.includes(p)}
                          className="px-3 py-1.5 text-xs"
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-bold">Team 2 (Max 2 players)</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map((p) => (
                        <Button
                          key={p}
                          onClick={() => toggleArrayItem('team2', p, 2)}
                          variant="frosted"
                          color="purple"
                          selected={newGame.team2.includes(p)}
                          className="px-3 py-1.5 text-xs"
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-bold">Winning Team</label>
                    <div className="flex gap-2">
                      {[1, 2].map((n) => (
                        <Button
                          key={n}
                          onClick={() => setNewGame({ ...newGame, winningTeam: n as 1 | 2 })}
                          variant="frosted"
                          color={newGame.winningTeam === n ? 'blue' : 'purple'}
                          selected={newGame.winningTeam === n}
                          className="flex-1 py-2 text-sm"
                        >
                          Team {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold">Players in Game</label>
                      <div className="flex gap-2">
                        <Button onClick={selectAllPlayers} variant="pop" color="blue" className="px-2 py-1 text-xs">
                          Select All
                        </Button>
                        {newGame.players.length > 0 && (
                          <Button onClick={clearPlayers} variant="pop" color="red" className="px-2 py-1 text-xs">
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map((p) => (
                        <Button
                          key={p}
                          onClick={() => toggleArrayItem('players', p)}
                          variant="frosted"
                          color="purple"
                          selected={newGame.players.includes(p)}
                          className="px-3 py-1.5 text-xs"
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {(['winners', 'runnersUp', 'survivors', 'losers'] as const).map((roleKey) => (
                    <div key={roleKey}>
                      <label className="block mb-2 text-xs font-bold">
                        {roleKey === 'winners'
                          ? '🏆 Winners'
                          : roleKey === 'runnersUp'
                            ? '🥈 Runners-up'
                            : roleKey === 'survivors'
                              ? '🤟 Survivors'
                              : '💀 Losers'}
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {newGame.players.length === 0 ? (
                          <p className="text-xs text-slate-500">Select players first</p>
                        ) : (
                          newGame.players.map((p) => (
                            <Button
                              key={p}
                              onClick={() => toggleArrayItem(roleKey as any, p)}
                              variant="frosted"
                              color={
                                roleKey === 'winners' && newGame.winners.includes(p)
                                  ? 'blue'
                                  : roleKey === 'runnersUp' && newGame.runnersUp.includes(p)
                                    ? 'blue'
                                    : roleKey === 'survivors' && newGame.survivors.includes(p)
                                      ? 'purple'
                                      : roleKey === 'losers' && newGame.losers.includes(p)
                                        ? 'red'
                                        : 'purple'
                              }
                              selected={
                                (roleKey === 'winners' && newGame.winners.includes(p)) ||
                                (roleKey === 'runnersUp' && newGame.runnersUp.includes(p)) ||
                                (roleKey === 'survivors' && newGame.survivors.includes(p)) ||
                                (roleKey === 'losers' && newGame.losers.includes(p))
                              }
                              className="px-3 py-1.5 text-xs"
                            >
                              {p}
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <Button
                onClick={addGame}
                variant="pop"
                className="w-full py-3 text-base font-bold bg-gradient-to-br from-emerald-600 to-emerald-900"
                disabled={newGame.type === ''}
              >
                ➕ Add Game
              </Button>
            </div>
          </div>

          {/* Recent Games */}
          <div className="rounded-xl p-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Recent Games
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {recentCards.map((card) => {
                if (card.kind === 'session') {
                  const s = card.session
                  const dateLabel = new Date(s.game_date).toLocaleDateString()
                  const timeLabel = new Date(s.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const isExpanded = expandedSessionKey === s.key

                  const renderBadge = (p: string) => {
                    const isW = s.tiers.winners.includes(p)
                    const isR = s.tiers.runners.includes(p)
                    const isS = s.tiers.survivors.includes(p)
                    const isL = s.tiers.losers.includes(p)
                    const cls = isW ? 'bg-green-600' : isR ? 'bg-blue-600' : isS ? 'bg-slate-600' : isL ? 'bg-red-600' : 'bg-slate-600'
                    return (
                      <span
                        key={p}
                        className={`${cls} text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]`}
                      >
                        {p}
                      </span>
                    )
                  }

                  return (
                    <div
                      key={s.key}
                      className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-base text-white">{GAME_EMOJIS.Rung} Rung</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                              {editingSession === s.sessionKey ? (
                                <>
                                  <input
                                    type="date"
                                    value={editSessionDate}
                                    onChange={(e) => setEditSessionDate(e.target.value)}
                                    className="p-1 bg-purple-700 rounded text-xs text-white"
                                  />
                                  <input
                                    type="time"
                                    value={editSessionTime}
                                    onChange={(e) => setEditSessionTime(e.target.value)}
                                    className="p-1 bg-purple-700 rounded text-xs text-white"
                                  />
                                  <button
                                    onClick={() => saveSessionDateTime(s)}
                                    className="text-green-400 hover:text-green-300 font-bold text-xs"
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={cancelEditingSession}
                                    className="text-red-400 hover:text-red-300 font-bold text-xs"
                                    title="Cancel"
                                  >
                                    ✗
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span>{dateLabel} • {timeLabel}</span>
                                  <button
                                    onClick={() => startEditingSession(s.sessionKey, s.game_date, s.endAt)}
                                    className="text-slate-400 hover:text-slate-200 transition-colors"
                                    title="Edit session date/time"
                                  >
                                    ✏️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">Session rounds: {s.rounds.length}</div>
                        </div>

                        <button
                          onClick={() => {
                            // delete the whole session? no — keep per-round deletes inside expand
                            // so here just collapse/expand
                            setExpandedSessionKey(isExpanded ? null : s.key)
                          }}
                          className="text-slate-200 hover:text-white text-xs font-bold"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>

                      <div className="flex gap-1 flex-wrap mb-2">{s.allPlayers.map(renderBadge)}</div>

                      <button
                        onClick={() => setExpandedSessionKey(isExpanded ? null : s.key)}
                        className="w-full mt-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-[0_4px_8px_rgba(29,78,216,0.4),inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all"
                      >
                        {isExpanded ? '▲ COLLAPSE ROUNDS' : '▼ EXPAND ROUNDS'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 bg-slate-900/50 p-3 rounded-lg">
                          <h4 className="text-xs font-bold text-slate-300 mb-2 text-center">All Rounds (Most Recent First)</h4>

                          <div className="space-y-2">
                            {[...s.rounds].slice().reverse().map((round) => {
                              // compute progressive scores at THIS point in the session
                              const teamScores: Record<string, number> = {}
                              s.rounds.forEach((r) => {
                                const t1 = teamKey(r.team1)
                                const t2 = teamKey(r.team2)
                                if (teamScores[t1] === undefined) teamScores[t1] = 0
                                if (teamScores[t2] === undefined) teamScores[t2] = 0
                                if (r.winning_team === 1) teamScores[t1]++
                                if (r.winning_team === 2) teamScores[t2]++
                                if (r.id === round.id) return
                              })

                              const t1 = teamKey(round.team1)
                              const t2 = teamKey(round.team2)
                              const s1 = (teamScores[t1] ?? 0)
                              const s2 = (teamScores[t2] ?? 0)

                              const leftIsLoser = round.winning_team !== 1
                              const rightIsLoser = round.winning_team !== 2

                              return (
                                <div
                                  key={round.id}
                                  className="bg-slate-800/50 p-2 rounded-lg flex items-center justify-between"
                                >
                                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs font-bold flex-1">
                                    <div className={`text-right ${leftIsLoser ? 'text-red-400' : 'text-green-400'}`}>
                                      <span>{round.team1.join(' & ')}</span>
                                      <span className="text-amber-400 ml-2">({s1})</span>
                                    </div>
                                    <span className="text-amber-400 text-center px-2">vs</span>
                                    <div className={`text-left ${rightIsLoser ? 'text-red-400' : 'text-green-400'}`}>
                                      <span className="text-amber-400 mr-2">({s2})</span>
                                      <span>{round.team2.join(' & ')}</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => deleteGame(round.id)}
                                    className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                    title="Delete this round"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                // Non-rung normal game card
                const game = card.game
                const dateStr = new Date(game.game_date).toLocaleDateString()
                const timeStr = game.created_at
                  ? ` • ${new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''

                return (
                  <div
                    key={game.id}
                    className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-base text-white">
                            {GAME_EMOJIS[game.game_type] ?? '🎮'} {game.game_type}
                          </div>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          {editingGame === game.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="p-1 bg-purple-700 rounded text-xs text-white"
                              />
                              <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="p-1 bg-purple-700 rounded text-xs text-white"
                              />
                              <button
                                onClick={() => saveGameDateTime(game.id)}
                                className="text-green-400 hover:text-green-300 font-bold text-xs"
                              >
                                ✓
                              </button>
                              <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 font-bold text-xs">
                                ✗
                              </button>
                            </div>
                          ) : (
                            <>
                              <span>
                                {dateStr}
                                {timeStr}
                              </span>
                              <button
                                onClick={() => startEditingGame(game)}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                                title="Edit date/time"
                              >
                                ✏️
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <button onClick={() => deleteGame(game.id)} className="text-white-400 hover:text-white-300 text-sm transition-colors">
                        🗑️ Delete
                      </button>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {game.winners?.map((p) => (
                        <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                      {game.runners_up?.map((p) => (
                        <span key={p} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                      {game.survivors?.map((p) => (
                        <span key={p} className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                      {game.losers?.map((p) => (
                        <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
