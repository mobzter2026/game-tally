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

type RungSession = {
  key: string
  gameDate: string
  rounds: Game[]
  teams: string[] // team keys in this session
  teamWins: Record<string, number>
  winnerTeams: string[] // team keys that hit target
  isComplete: boolean
  endAtIso: string | null
}

type FirstToNSession = {
  key: string
  gameType: 'Monopoly' | 'Tai Ti'
  gameDate: string
  games: Game[]
  playerWins: Record<string, number>
  winnerPlayers: string[]
  isComplete: boolean
  endAtIso: string | null
}

type RecentItem =
  | { kind: 'rungSession'; key: string; sortTime: number; session: RungSession }
  | { kind: 'firstToN'; key: string; sortTime: number; session: FirstToNSession }
  | { kind: 'game'; key: string; sortTime: number; game: Game }

const SESSION_GAMES: Array<'Monopoly' | 'Tai Ti'> = ['Monopoly', 'Tai Ti']

const toTeamKey = (team: string[] | null | undefined) =>
  (team || []).slice().sort().join(' & ')

const safeIsoTime = (g: Game) => {
  const iso = (g.created_at as any) || null
  const t = iso ? new Date(iso).getTime() : NaN
  return Number.isFinite(t) ? t : new Date(`${g.game_date}T23:59:59Z`).getTime()
}

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr))

function buildRungSessions(allGames: Game[], targetWins = 5): RungSession[] {
  const rungRounds = allGames
    .filter(g => g.game_type === 'Rung' && g.team1 && g.team2 && g.winning_team != null)
    .slice()
    .sort((a, b) => safeIsoTime(a) - safeIsoTime(b))

  const byDate: Record<string, Game[]> = {}
  rungRounds.forEach(r => {
    const d = r.game_date
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(r)
  })

  const sessions: RungSession[] = []

  Object.keys(byDate)
    .sort()
    .forEach(date => {
      const rounds = byDate[date]
      let startIdx = 0
      let teamWins: Record<string, number> = {}
      let teamsSet = new Set<string>()

      const flush = (endIdxInclusive: number) => {
        const chunk = rounds.slice(startIdx, endIdxInclusive + 1)
        const teams = Array.from(teamsSet)
        const winnerTeams = teams.filter(t => (teamWins[t] || 0) >= targetWins)
        const endAtIso = chunk.length ? ((chunk[chunk.length - 1].created_at as any) || null) : null
        sessions.push({
          key: `rung:${date}:${startIdx}:${endIdxInclusive}`,
          gameDate: date,
          rounds: chunk,
          teams,
          teamWins: { ...teamWins },
          winnerTeams,
          isComplete: winnerTeams.length > 0,
          endAtIso,
        })
        startIdx = endIdxInclusive + 1
        teamWins = {}
        teamsSet = new Set<string>()
      }

      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i]
        const t1 = toTeamKey(r.team1)
        const t2 = toTeamKey(r.team2)
        teamsSet.add(t1)
        teamsSet.add(t2)
        if (teamWins[t1] == null) teamWins[t1] = 0
        if (teamWins[t2] == null) teamWins[t2] = 0

        if (r.winning_team === 1) teamWins[t1]++
        if (r.winning_team === 2) teamWins[t2]++

        const complete = Object.values(teamWins).some(v => v >= targetWins)
        const last = i === rounds.length - 1
        if (complete || last) flush(i)
      }
    })

  // newest first
  return sessions.sort((a, b) => {
    const ta = a.endAtIso ? new Date(a.endAtIso).getTime() : new Date(`${a.gameDate}T23:59:59Z`).getTime()
    const tb = b.endAtIso ? new Date(b.endAtIso).getTime() : new Date(`${b.gameDate}T23:59:59Z`).getTime()
    return tb - ta
  })
}

function buildFirstToNSessions(allGames: Game[], gameType: 'Monopoly' | 'Tai Ti', targetWins = 3): FirstToNSession[] {
  const games = allGames
    .filter(g => g.game_type === gameType && Array.isArray(g.winners) && (g.winners?.length || 0) > 0)
    .slice()
    .sort((a, b) => safeIsoTime(a) - safeIsoTime(b))

  const byDate: Record<string, Game[]> = {}
  games.forEach(g => {
    const d = g.game_date
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(g)
  })

  const sessions: FirstToNSession[] = []

  Object.keys(byDate)
    .sort()
    .forEach(date => {
      const dayGames = byDate[date]
      let startIdx = 0
      let wins: Record<string, number> = {}

      const flush = (endIdxInclusive: number) => {
        const chunk = dayGames.slice(startIdx, endIdxInclusive + 1)
        const winnerPlayers = Object.keys(wins).filter(p => (wins[p] || 0) >= targetWins)
        const endAtIso = chunk.length ? ((chunk[chunk.length - 1].created_at as any) || null) : null
        sessions.push({
          key: `ftn:${gameType}:${date}:${startIdx}:${endIdxInclusive}`,
          gameType,
          gameDate: date,
          games: chunk,
          playerWins: { ...wins },
          winnerPlayers,
          isComplete: winnerPlayers.length > 0,
          endAtIso,
        })
        startIdx = endIdxInclusive + 1
        wins = {}
      }

      for (let i = 0; i < dayGames.length; i++) {
        const g = dayGames[i]
        ;(g.winners || []).forEach(w => {
          wins[w] = (wins[w] || 0) + 1
        })

        const complete = Object.values(wins).some(v => v >= targetWins)
        const last = i === dayGames.length - 1
        if (complete || last) flush(i)
      }
    })

  return sessions.sort((a, b) => {
    const ta = a.endAtIso ? new Date(a.endAtIso).getTime() : new Date(`${a.gameDate}T23:59:59Z`).getTime()
    const tb = b.endAtIso ? new Date(b.endAtIso).getTime() : new Date(`${b.gameDate}T23:59:59Z`).getTime()
    return tb - ta
  })
}

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  // Single game date edit
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editGameDate, setEditGameDate] = useState('')

  // Session date edit (updates ALL games in that session)
  const [editingSessionKey, setEditingSessionKey] = useState<string | null>(null)
  const [editSessionDate, setEditSessionDate] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const [newGame, setNewGame] = useState({
    type: '' as '' | 'Blackjack' | 'Monopoly' | 'Tai Ti' | 'Shithead' | 'Rung',
    date: new Date().toISOString().split('T')[0],
    // time still stored for created_at ordering; if you truly want none, you can hardcode "12:00"
    time: new Date().toTimeString().slice(0, 5),
    players: [] as string[],
    winners: [] as string[],
    runnersUp: [] as string[],
    losers: [] as string[],
    survivors: [] as string[],
    team1: [] as string[],
    team2: [] as string[],
    winningTeam: 1 as 1 | 2,
  })

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const u = auth?.user
      if (!u) {
        router.push('/admin/login')
        return
      }

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', u.id)
        .single()

      if (!adminData) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      setUser(u)
      await fetchGames()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false })
    if (data) setGames(data as Game[])
  }

  const rungSessions = useMemo(() => buildRungSessions(games, 5), [games])
  const monopolySessions = useMemo(() => buildFirstToNSessions(games, 'Monopoly', 3), [games])
  const taitiSessions = useMemo(() => buildFirstToNSessions(games, 'Tai Ti', 3), [games])

  const recentItems: RecentItem[] = useMemo(() => {
    const items: RecentItem[] = []

    rungSessions.forEach(s => {
      const sortTime = s.endAtIso
        ? new Date(s.endAtIso).getTime()
        : new Date(`${s.gameDate}T23:59:59Z`).getTime()
      items.push({ kind: 'rungSession', key: s.key, sortTime, session: s })
    })

    monopolySessions.forEach(s => {
      const sortTime = s.endAtIso
        ? new Date(s.endAtIso).getTime()
        : new Date(`${s.gameDate}T23:59:59Z`).getTime()
      items.push({ kind: 'firstToN', key: s.key, sortTime, session: s })
    })

    taitiSessions.forEach(s => {
      const sortTime = s.endAtIso
        ? new Date(s.endAtIso).getTime()
        : new Date(`${s.gameDate}T23:59:59Z`).getTime()
      items.push({ kind: 'firstToN', key: s.key, sortTime, session: s })
    })

    // Add non-session games as-is
    const skipIds = new Set<string>()
    rungSessions.forEach(s => s.rounds.forEach(r => skipIds.add(r.id)))
    monopolySessions.forEach(s => s.games.forEach(g => skipIds.add(g.id)))
    taitiSessions.forEach(s => s.games.forEach(g => skipIds.add(g.id)))

    games.forEach(g => {
      if (skipIds.has(g.id)) return
      items.push({ kind: 'game', key: `game:${g.id}`, sortTime: safeIsoTime(g), game: g })
    })

    return items.sort((a, b) => b.sortTime - a.sortTime).slice(0, 25)
  }, [games, rungSessions, monopolySessions, taitiSessions])

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
      setNewGame({ ...newGame, [key]: arr.filter(p => p !== player) })
      return
    }
    if (max && arr.length >= max) {
      alert(`Maximum ${max} players allowed for ${key}`)
      return
    }
    setNewGame({ ...newGame, [key]: [...arr, player] })
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
        game_type: 'Rung',
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
        console.error(error)
        alert('Error adding game. Check console.')
        return
      }
    } else {
      if (newGame.players.length === 0) {
        alert('Please select at least one player')
        return
      }

      // Stop duplicates across buckets
      const allCategorised = [...newGame.winners, ...newGame.runnersUp, ...newGame.survivors, ...newGame.losers]
      const dupes = allCategorised.filter((p, i) => allCategorised.indexOf(p) !== i)
      if (dupes.length) {
        alert(`Player(s) ${uniq(dupes).join(', ')} appear in multiple categories.`)
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
        console.error(error)
        alert('Error adding game. Check console.')
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

    await fetchGames()
  }

  const deleteGame = async (id: string) => {
    if (!confirm('Delete this game?')) return
    await supabase.from('games').delete().eq('id', id)
    await fetchGames()
  }

  const startEditingGameDate = (g: Game) => {
    setEditingGameId(g.id)
    setEditGameDate(g.game_date)
  }

  const cancelEditingGameDate = () => {
    setEditingGameId(null)
    setEditGameDate('')
  }

  const saveGameDate = async (gameId: string) => {
    if (!editGameDate) return
    const { error } = await (supabase.from('games').update as any)({ game_date: editGameDate }).eq('id', gameId)
    if (error) {
      console.error(error)
      alert('Error updating date')
      return
    }
    setEditingGameId(null)
    setEditGameDate('')
    await fetchGames()
  }

  const startEditingSessionDate = (sessionKey: string, currentDate: string) => {
    setEditingSessionKey(sessionKey)
    setEditSessionDate(currentDate)
  }

  const cancelEditingSessionDate = () => {
    setEditingSessionKey(null)
    setEditSessionDate('')
  }

  const saveSessionDate = async (sessionKey: string, ids: string[]) => {
    if (!editSessionDate) return
    // Update ALL rows in this session (keeps session integrity)
    const updates = ids.map(id => supabase.from('games').update({ game_date: editSessionDate } as any).eq('id', id))
    const results = await Promise.all(updates)
    const firstErr = results.find(r => (r as any).error)?.error
    if (firstErr) {
      console.error(firstErr)
      alert('Error updating session date')
      return
    }
    setEditingSessionKey(null)
    setEditSessionDate('')
    await fetchGames()
  }

  const toggleExpand = (key: string) => setExpandedKey(prev => (prev === key ? null : key))

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
                    onChange={e => setNewGame({ ...newGame, type: e.target.value as any })}
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
                    onChange={e => setNewGame({ ...newGame, date: e.target.value })}
                    className="w-full p-2.5 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg text-sm shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold">Time</label>
                  <input
                    type="time"
                    value={newGame.time}
                    onChange={e => setNewGame({ ...newGame, time: e.target.value })}
                    className="w-full p-2.5 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg text-sm shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold text-center"
                  />
                </div>
              </div>

              {newGame.type === 'Rung' ? (
                <>
                  <div>
                    <label className="block mb-2 text-xs font-bold">Team 1 (Max 2 players)</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
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
                      {PLAYERS.map(p => (
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
                      {[1, 2].map(n => (
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
                      {PLAYERS.map(p => (
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

                  {(['winners', 'runnersUp', 'survivors', 'losers'] as const).map(roleKey => (
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
                          newGame.players.map(p => (
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

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
              {recentItems.map(item => {
                if (item.kind === 'game') {
                  const game = item.game
                  return (
                    <div
                      key={item.key}
                      className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-base text-white">
                              {GAME_EMOJIS[game.game_type]} {game.game_type}
                            </div>
                          </div>

                          <div className="text-[0.7rem] text-slate-400 font-normal flex items-center gap-2">
                            {editingGameId === game.id ? (
                              <>
                                <input
                                  type="date"
                                  value={editGameDate}
                                  onChange={e => setEditGameDate(e.target.value)}
                                  className="p-1 bg-purple-700 rounded text-xs text-white"
                                />
                                <button
                                  onClick={() => saveGameDate(game.id)}
                                  className="text-green-400 hover:text-green-300 font-bold text-xs"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelEditingGameDate}
                                  className="text-red-400 hover:text-red-300 font-bold text-xs"
                                  title="Cancel"
                                >
                                  ✗
                                </button>
                              </>
                            ) : (
                              <>
                                <span>{new Date(game.game_date).toLocaleDateString()}</span>
                                <button
                                  onClick={() => startEditingGameDate(game)}
                                  className="text-slate-400 hover:text-slate-200 transition-colors"
                                  title="Edit date"
                                >
                                  ✏️
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteGame(game.id)}
                          className="text-white/70 hover:text-white text-sm transition-colors"
                          title="Delete"
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        {game.winners?.map(p => (
                          <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            {p}
                          </span>
                        ))}
                        {game.runners_up?.map(p => (
                          <span key={p} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            {p}
                          </span>
                        ))}
                        {game.survivors?.map(p => (
                          <span key={p} className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            {p}
                          </span>
                        ))}
                        {game.losers?.map(p => (
                          <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                }

                if (item.kind === 'firstToN') {
                  const s = item.session
                  const isExpanded = expandedKey === s.key
                  const allPlayers = uniq(s.games.flatMap(g => g.players_in_game || []))

                  return (
                    <div
                      key={item.key}
                      className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-base text-white">
                              {GAME_EMOJIS[s.gameType]} {s.gameType}
                            </div>
                            <span className="ml-auto text-[0.7rem] text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
                              Session • {s.games.length} games
                            </span>
                          </div>

                          <div className="text-[0.7rem] text-slate-400 font-normal flex items-center gap-2">
                            {editingSessionKey === s.key ? (
                              <>
                                <input
                                  type="date"
                                  value={editSessionDate}
                                  onChange={e => setEditSessionDate(e.target.value)}
                                  className="p-1 bg-purple-700 rounded text-xs text-white"
                                />
                                <button
                                  onClick={() => saveSessionDate(s.key, s.games.map(g => g.id))}
                                  className="text-green-400 hover:text-green-300 font-bold text-xs"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelEditingSessionDate}
                                  className="text-red-400 hover:text-red-300 font-bold text-xs"
                                  title="Cancel"
                                >
                                  ✗
                                </button>
                              </>
                            ) : (
                              <>
                                <span>{new Date(s.gameDate).toLocaleDateString()}</span>
                                <button
                                  onClick={() => startEditingSessionDate(s.key, s.gameDate)}
                                  className="text-slate-400 hover:text-slate-200 transition-colors"
                                  title="Edit session date"
                                >
                                  ✏️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary badges (winners = reached 3) */}
                      <div className="flex gap-1 flex-wrap mb-2">
                        {allPlayers.map(p => {
                          const w = s.playerWins[p] || 0
                          const isW = w >= 3
                          return (
                            <span
                              key={p}
                              className={`${isW ? 'bg-green-600' : 'bg-red-600'} text-white px-2 py-1 rounded text-xs font-semibold`}
                              title={`${w} wins in session`}
                            >
                              {p}
                            </span>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => toggleExpand(s.key)}
                        className="w-full mt-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-[0_4px_8px_rgba(29,78,216,0.4),inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all"
                      >
                        {isExpanded ? '▲ COLLAPSE SESSION' : '▼ EXPAND SESSION'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 bg-slate-900/50 p-2 rounded-lg">
                          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {s.games.map(g => (
                              <div key={g.id} className="bg-slate-800/50 px-2 py-2 rounded-lg flex items-center justify-between">
                                <div className="text-xs font-bold text-white/90">
                                  {new Date(g.game_date).toLocaleDateString()}
                                </div>
                                <button
                                  onClick={() => deleteGame(g.id)}
                                  className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                  title="Delete this game"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                // Rung session card
                const s = item.session
                const isExpanded = expandedKey === s.key

                // Build per-round progressive scores (team keys)
                const scoreLines = (() => {
                  const scores: Record<string, number> = {}
                  return s.rounds.map(r => {
                    const t1 = toTeamKey(r.team1)
                    const t2 = toTeamKey(r.team2)
                    if (scores[t1] == null) scores[t1] = 0
                    if (scores[t2] == null) scores[t2] = 0
                    if (r.winning_team === 1) scores[t1]++
                    if (r.winning_team === 2) scores[t2]++
                    return { r, t1, t2, s1: scores[t1], s2: scores[t2] }
                  })
                })()

                const allPlayers = uniq(s.teams.flatMap(t => t.split(' & ')))

                // Player best-achievement buckets
                const playerBestWins: Record<string, number> = {}
                allPlayers.forEach(p => (playerBestWins[p] = 0))
                s.teams.forEach(teamKey => {
                  const wins = s.teamWins[teamKey] || 0
                  teamKey.split(' & ').forEach(p => {
                    playerBestWins[p] = Math.max(playerBestWins[p] || 0, wins)
                  })
                })

                const winners = allPlayers.filter(p => (playerBestWins[p] || 0) >= 5)
                const nonWinners = allPlayers.filter(p => !winners.includes(p))
                let runners: string[] = []
                let survivors: string[] = []
                let losers: string[] = []

                if (nonWinners.length) {
                  const scores = nonWinners.map(p => playerBestWins[p] || 0)
                  const max = Math.max(...scores)
                  const min = Math.min(...scores)
                  // IMPORTANT RULE: if everyone left ties, they are ALL losers (no runner-up)
                  if (max === min) {
                    losers = nonWinners
                  } else {
                    runners = nonWinners.filter(p => (playerBestWins[p] || 0) === max)
                    survivors = nonWinners.filter(p => !runners.includes(p) && (playerBestWins[p] || 0) > min)
                    losers = nonWinners.filter(p => (playerBestWins[p] || 0) === min)
                  }
                }

return (
                  <div
                    key={item.key}
                    className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-base text-white">{GAME_EMOJIS.Rung} Rung</div>
                          <span className="ml-auto text-[0.7rem] text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
                            Session • {s.rounds.length} rounds
                          </span>
                        </div>

                        <div className="text-[0.7rem] text-slate-400 font-normal flex items-center gap-2">
                          {editingSessionKey === s.key ? (
                            <>
                              <input
                                type="date"
                                value={editSessionDate}
                                onChange={e => setEditSessionDate(e.target.value)}
                                className="p-1 bg-purple-700 rounded text-xs text-white"
                              />
                              <button
                                onClick={() => saveSessionDate(s.key, s.rounds.map(r => r.id))}
                                className="text-green-400 hover:text-green-300 font-bold text-xs"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditingSessionDate}
                                className="text-red-400 hover:text-red-300 font-bold text-xs"
                                title="Cancel"
                              >
                                ✗
                              </button>
                            </>
                          ) : (
                            <>
                              <span>{new Date(s.gameDate).toLocaleDateString()}</span>
                              <button
                                onClick={() => startEditingSessionDate(s.key, s.gameDate)}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                                title="Edit session date"
                              >
                                ✏️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Session outcome badges */}
                    <div className="flex gap-1 flex-wrap mb-2">
                      {winners.map(p => (
                        <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                          {p}
                        </span>
                      ))}
                      {runners.map(p => (
                        <span key={p} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                          {p}
                        </span>
                      ))}
                      {survivors.map(p => (
                        <span key={p} className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold">
                          {p}
                        </span>
                      ))}
                      {losers.map(p => (
                        <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                          {p}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleExpand(s.key)}
                      className="w-full mt-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-[0_4px_8px_rgba(29,78,216,0.4),inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all"
                    >
                      {isExpanded ? '▲ COLLAPSE ROUNDS' : '▼ EXPAND ROUNDS'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 bg-slate-900/50 p-2 rounded-lg">
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                          {scoreLines.map(({ r, t1, t2, s1, s2 }) => {
                            const leftWin = r.winning_team === 1
                            const rightWin = r.winning_team === 2
                            return (
                              <div
                                key={r.id}
                                className="bg-slate-800/50 px-2 py-2 rounded-lg flex items-center gap-2"
                              >
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 flex-1">
                                  <div className={`text-right text-[0.78rem] font-bold ${leftWin ? 'text-green-400' : 'text-red-400'}`}>
                                    <span>{t1}</span>
                                    <span className="text-amber-400 ml-2">({s1})</span>
                                  </div>
                                  <span className="text-amber-400 text-[0.72rem] font-black px-2">vs</span>
                                  <div className={`text-left text-[0.78rem] font-bold ${rightWin ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className="text-amber-400 mr-2">({s2})</span>
                                    <span>{t2}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => deleteGame(r.id)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                  title="Delete this round"
                                >
                                  🗑️
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        <div className="text-center text-amber-400 text-xs font-bold mt-2 pt-2 border-t border-slate-700">
                          Total Rounds: {s.rounds.length}
                        </div>
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

