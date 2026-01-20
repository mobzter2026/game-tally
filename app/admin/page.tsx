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

type Standings = {
  winners: string[]
  runners: string[]
  survivors: string[]
  losers: string[]
  playerBestScore: Record<string, number>
}

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [editingGame, setEditingGame] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

  const [expandedGame, setExpandedGame] = useState<string | null>(null)
  const [rungRounds, setRungRounds] = useState<Record<string, Game[]>>({})

  const router = useRouter()
  const supabase = createClient()

  const [newGame, setNewGame] = useState({
    type: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    players: [] as string[],
    winners: [] as string[],
    runnersUp: [] as string[],
    losers: [] as string[],
    survivors: [] as string[],
    team1: [] as string[],
    team2: [] as string[],
    winningTeam: 1,
  })

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    const { data: auth } = await supabase.auth.getUser()
    const authedUser = auth?.user

    if (!authedUser) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', authedUser.id)
      .single()

    if (!adminData) {
      await supabase.auth.signOut()
      router.push('/admin/login')
      return
    }

    setUser(authedUser)
    await fetchGames()
    setLoading(false)
  }

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setGames(data as Game[])
  }

  // -------------------------
  // RUNG HELPERS (core fix)
  // -------------------------
  const computeRungSessionStandings = (sessionRounds: Game[]): Standings => {
    const teamWins: Record<string, number> = {}
    const allTeams = new Set<string>()

    sessionRounds.forEach((r) => {
      if (!r.team1 || !r.team2 || r.winning_team == null) return
      const t1 = r.team1.slice().sort().join('&')
      const t2 = r.team2.slice().sort().join('&')
      allTeams.add(t1)
      allTeams.add(t2)
      teamWins[t1] = teamWins[t1] ?? 0
      teamWins[t2] = teamWins[t2] ?? 0
      if (r.winning_team === 1) teamWins[t1]++
      if (r.winning_team === 2) teamWins[t2]++
    })

    const sessionTeams = Array.from(allTeams)

    // playerBestScore = best score a player achieved across ANY team they played in this session
    const playerBestScore: Record<string, number> = {}
    sessionTeams.forEach((teamKey) => {
      const score = teamWins[teamKey] ?? 0
      teamKey.split('&').forEach((p) => {
        if (playerBestScore[p] === undefined || score > playerBestScore[p]) {
          playerBestScore[p] = score
        }
      })
    })

    const allPlayers = Object.keys(playerBestScore)

    // Winners = any player who was on any team that reached 5
    const winnersTeams = sessionTeams.filter((t) => (teamWins[t] ?? 0) >= 5)
    const winnersSet = new Set<string>()
    winnersTeams.forEach((t) => t.split('&').forEach((p) => winnersSet.add(p)))
    const winners = Array.from(winnersSet)

    const remaining = allPlayers.filter((p) => !winnersSet.has(p))

    let runners: string[] = []
    let survivors: string[] = []
    let losers: string[] = []

    if (winners.length > 0) {
      if (remaining.length > 0) {
        const first = playerBestScore[remaining[0]] ?? 0
        const allSame = remaining.every((p) => (playerBestScore[p] ?? 0) === first)

        // ✅ YOUR RULE: winner exists + rest tied => NO runner-up, all losers
        if (allSame) {
          losers = remaining
        } else {
          const scores = remaining.map((p) => playerBestScore[p] ?? 0)
          const maxScore = Math.max(...scores)
          const minScore = Math.min(...scores)

          runners = remaining.filter((p) => (playerBestScore[p] ?? 0) === maxScore)
          losers = remaining.filter((p) => (playerBestScore[p] ?? 0) === minScore)
          survivors = remaining.filter((p) => !runners.includes(p) && !losers.includes(p))
        }
      }
    } else {
      // Ongoing session: top = runners, bottom = losers, middle = survivors
      if (allPlayers.length > 0) {
        const scores = allPlayers.map((p) => playerBestScore[p] ?? 0)
        const maxScore = Math.max(...scores)
        const minScore = Math.min(...scores)

        const allSame = maxScore === minScore
        if (allSame) {
          losers = allPlayers
        } else {
          runners = allPlayers.filter((p) => (playerBestScore[p] ?? 0) === maxScore)
          losers = allPlayers.filter((p) => (playerBestScore[p] ?? 0) === minScore)
          survivors = allPlayers.filter((p) => !runners.includes(p) && !losers.includes(p))
        }
      }
    }

    // de-dupe + priority (winner > runner > survivor > loser)
    const tier: Record<string, number> = {}
    winners.forEach((p) => (tier[p] = 1))
    runners.forEach((p) => (tier[p] = Math.min(tier[p] ?? 99, 2)))
    survivors.forEach((p) => (tier[p] = Math.min(tier[p] ?? 99, 3)))
    losers.forEach((p) => (tier[p] = Math.min(tier[p] ?? 99, 4)))

    const uniq = (arr: string[]) => Array.from(new Set(arr))

    return {
      winners: uniq(winners).sort((a, b) => (tier[a] ?? 99) - (tier[b] ?? 99) || a.localeCompare(b)),
      runners: uniq(runners).sort((a, b) => a.localeCompare(b)),
      survivors: uniq(survivors).sort((a, b) => a.localeCompare(b)),
      losers: uniq(losers).sort((a, b) => a.localeCompare(b)),
      playerBestScore,
    }
  }

  // -------------------------
  // SESSION GROUPING (admin list)
  // -------------------------
  const getGroupedGames = () => {
    const allGames = games
    const grouped: Game[] = []
    const rungGames = allGames.filter((g) => g.game_type === 'Rung' && g.team1 && g.team2 && g.winning_team != null)
    const nonRungGames = allGames.filter((g) => g.game_type !== 'Rung')

    const gamesByDate: Record<string, Game[]> = {}
    rungGames.forEach((g) => {
      gamesByDate[g.game_date] = gamesByDate[g.game_date] || []
      gamesByDate[g.game_date].push(g)
    })

    Object.keys(gamesByDate)
      .sort()
      .reverse()
      .forEach((date) => {
        const rounds = gamesByDate[date].slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        let sessionStart = 0
        let teamWins: Record<string, number> = {}

        const flushSession = (endIdx: number) => {
          if (sessionStart <= endIdx) grouped.push(rounds[sessionStart])
          sessionStart = endIdx + 1
          teamWins = {}
        }

        rounds.forEach((r, idx) => {
          const t1 = r.team1!.slice().sort().join('&')
          const t2 = r.team2!.slice().sort().join('&')
          teamWins[t1] = teamWins[t1] ?? 0
          teamWins[t2] = teamWins[t2] ?? 0
          if (r.winning_team === 1) teamWins[t1]++
          if (r.winning_team === 2) teamWins[t2]++

          const complete = Object.values(teamWins).some((w) => w >= 5)
          if (complete) flushSession(idx)
          else if (idx === rounds.length - 1) flushSession(idx)
        })
      })

    return [...grouped, ...nonRungGames]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const toggleArrayItem = (
    key: 'players' | 'winners' | 'runnersUp' | 'losers' | 'survivors' | 'team1' | 'team2',
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
        winners: newGame.winners.length > 0 ? newGame.winners : null,
        runners_up: newGame.runnersUp.length > 0 ? newGame.runnersUp : null,
        survivors: newGame.survivors.length > 0 ? newGame.survivors : null,
        losers: newGame.losers.length > 0 ? newGame.losers : null,
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

  const fetchRungRounds = async (gameDate: string) => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'Rung')
      .eq('game_date', gameDate)
      .not('winning_team', 'is', null)
      .order('created_at', { ascending: true })

    return (data as Game[]) || []
  }

  const toggleExpandGame = async (gameId: string, gameDate: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null)
      return
    }

    setExpandedGame(gameId)
    if (!rungRounds[gameId]) {
      const rounds = await fetchRungRounds(gameDate)
      setRungRounds((prev) => ({ ...prev, [gameId]: rounds }))
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

    const { error } = await (supabase.from('games').update as any)({
      game_date: editDate,
      created_at: timestamp,
    }).eq('id', gameId)

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
                          onClick={() => setNewGame({ ...newGame, winningTeam: n })}
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

                  {['winners', 'runnersUp', 'survivors', 'losers'].map((roleKey) => (
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
              {getGroupedGames().map((game) => {
                const isOngoingRung = game.game_type === 'Rung' && game.team1 && game.team2 && (!game.winners || game.winners.length === 0)

                return (
                  <div key={game.id} className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-base">
                            {GAME_EMOJIS[game.game_type]} {game.game_type}
                          </div>
                          {isOngoingRung && (
                            <span className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 text-black px-3 py-1 rounded-lg text-xs font-black tracking-wider shadow-[0_4px_12px_rgba(251,191,36,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)] animate-pulse">
                              🎭 ONGOING
                            </span>
                          )}
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
                              <button onClick={() => saveGameDateTime(game.id)} className="text-green-400 hover:text-green-300 font-bold text-xs">
                                ✓
                              </button>
                              <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 font-bold text-xs">
                                ✗
                              </button>
                            </div>
                          ) : (
                            <>
                              <span>
                                {new Date(game.game_date).toLocaleDateString()}
                                {game.created_at && ` • ${new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
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

                    {game.game_type === 'Rung' ? (
                      <>
                        {/* Session standings (FIXED) */}
                        {(() => {
                          // All rounds on this date (we use the grouping rep game to show the session it belongs to)
                          const allRoundsOnDate = games
                            .filter((g) => g.game_type === 'Rung' && g.game_date === game.game_date && g.winning_team != null && g.team1 && g.team2)
                            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                          // Find the session window this representative belongs to
                          let sessionRounds: Game[] = []
                          let currentSessionStart = 0
                          let found = false
                          let teamWins: Record<string, number> = {}

                          const flush = (endIdx: number) => {
                            if (found) sessionRounds = allRoundsOnDate.slice(currentSessionStart, endIdx + 1)
                            currentSessionStart = endIdx + 1
                            found = false
                            teamWins = {}
                          }

                          for (let i = 0; i < allRoundsOnDate.length; i++) {
                            const r = allRoundsOnDate[i]
                            const t1 = r.team1!.slice().sort().join('&')
                            const t2 = r.team2!.slice().sort().join('&')
                            teamWins[t1] = teamWins[t1] ?? 0
                            teamWins[t2] = teamWins[t2] ?? 0
                            if (r.winning_team === 1) teamWins[t1]++
                            if (r.winning_team === 2) teamWins[t2]++

                            if (r.id === game.id) found = true

                            const complete = Object.values(teamWins).some((w) => w >= 5)
                            if (complete) {
                              flush(i)
                              if (sessionRounds.length) break
                            } else if (i === allRoundsOnDate.length - 1) {
                              flush(i)
                            }
                          }

                          if (sessionRounds.length === 0) {
                            sessionRounds = allRoundsOnDate.slice(currentSessionStart)
                          }

                          const standings = computeRungSessionStandings(sessionRounds)

                          return (
                            <div className="flex gap-1 flex-wrap mb-2">
                              {standings.winners.map((p) => (
                                <span
                                  key={`w-${p}`}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                                >
                                  {p}
                                </span>
                              ))}
                              {standings.runners.map((p) => (
                                <span
                                  key={`r-${p}`}
                                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                                >
                                  {p}
                                </span>
                              ))}
                              {standings.survivors.map((p) => (
                                <span
                                  key={`s-${p}`}
                                  className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                                >
                                  {p}
                                </span>
                              ))}
                              {standings.losers.map((p) => (
                                <span
                                  key={`l-${p}`}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )
                        })()}

                        {/* Expand button */}
                        <button
                          onClick={() => toggleExpandGame(game.id, game.game_date)}
                          className="w-full mt-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-[0_4px_8px_rgba(29,78,216,0.4),inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all"
                        >
                          {expandedGame === game.id ? '▲ COLLAPSE ROUNDS' : '▼ EXPAND ROUNDS'}
                        </button>

                        {/* Expandable rounds */}
                        {expandedGame === game.id && (
                          <div className="mt-3 bg-slate-900/50 p-3 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-300 mb-2 text-center">All Rounds</h4>
                            {(rungRounds[game.id] || []).length === 0 ? (
                              <div className="text-xs text-slate-500 text-center">No rounds found</div>
                            ) : (
                              <div className="space-y-2">
                                {(rungRounds[game.id] || []).map((round: Game, idx: number) => {
                                  const teamScores: Record<string, number> = {}

                                  ;(rungRounds[game.id] || [])
                                    .slice(0, idx + 1)
                                    .forEach((r: Game) => {
                                      const t1 = r.team1!.slice().sort().join('&')
                                      const t2 = r.team2!.slice().sort().join('&')
                                      teamScores[t1] = teamScores[t1] ?? 0
                                      teamScores[t2] = teamScores[t2] ?? 0
                                      if (r.winning_team === 1) teamScores[t1]++
                                      if (r.winning_team === 2) teamScores[t2]++
                                    })

                                  const team1Key = round.team1!.slice().sort().join('&')
                                  const team2Key = round.team2!.slice().sort().join('&')

                                  return (
                                    <div key={round.id} className="bg-slate-800/50 p-2 rounded-lg flex items-center justify-between">
                                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs font-bold flex-1">
                                        <div className={`text-right ${round.winning_team === 1 ? 'text-green-400' : 'text-red-400'}`}>
                                          <span>{round.team1!.join(' & ')}</span>
                                          <span className="text-amber-400 ml-2">({teamScores[team1Key]})</span>
                                        </div>
                                        <span className="text-amber-400 text-center px-2">vs</span>
                                        <div className={`text-left ${round.winning_team === 2 ? 'text-green-400' : 'text-red-400'}`}>
                                          <span className="text-amber-400 mr-2">({teamScores[team2Key]})</span>
                                          <span>{round.team2!.join(' & ')}</span>
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

                                <div className="text-center text-amber-400 text-xs font-bold mt-2 pt-2 border-t border-slate-700">
                                  Total Rounds: {(rungRounds[game.id] || []).length}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {game.winners?.map((p) => (
                          <span
                            key={p}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                          >
                            {p}
                          </span>
                        ))}
                        {game.runners_up?.map((p) => (
                          <span
                            key={p}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                          >
                            {p}
                          </span>
                        ))}
                        {game.survivors?.map((p) => (
                          <span
                            key={p}
                            className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                          >
                            {p}
                          </span>
                        ))}
                        {game.losers?.map((p) => (
                          <span
                            key={p}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
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