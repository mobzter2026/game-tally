'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'
import { buildRungSessions, formatRoundLine, type RungSession } from '@/lib/rungSessions'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎭',
}

const teamKey = (team: string[]) => team.slice().sort().join('&')

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null)
  const [editingSessionKey, setEditingSessionKey] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')

  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editGameDate, setEditGameDate] = useState('')

  const [newGame, setNewGame] = useState({
    type: '',
    date: new Date().toISOString().split('T')[0],
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
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.push('/admin/login')
        return
      }

      const { data: adminData } = await supabase.from('admin_users').select('*').eq('id', auth.user.id).single()
      if (!adminData) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      setUser(auth.user)
      await fetchGames()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setGames(data as Game[])
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
      setNewGame({ ...newGame, [key]: arr.filter(p => p !== player) })
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
    if (!confirm('Are you sure you want to delete this game?')) return
    await supabase.from('games').delete().eq('id', id)
    await fetchGames()
  }

  const sessions = useMemo(() => buildRungSessions(games), [games])

  const recentItems = useMemo(() => {
    // Mix: sessions as items + non-rung games, then sort by date desc (and created_at where available)
    const nonRung = games.filter(g => g.game_type !== 'Rung')

    const asItems: Array<
      | { kind: 'session'; key: string; sortTime: number; session: RungSession }
      | { kind: 'game'; key: string; sortTime: number; game: Game }
    > = []

    sessions.forEach(s => {
      const sortTime = new Date(s.endAtIso || `${s.gameDate}T23:59:59Z`).getTime()
      asItems.push({ kind: 'session', key: s.key, sortTime, session: s })
    })

    nonRung.forEach(g => {
      const sortTime = new Date(g.created_at || `${g.game_date}T23:59:59Z`).getTime()
      asItems.push({ kind: 'game', key: g.id, sortTime, game: g })
    })

    return asItems.sort((a, b) => b.sortTime - a.sortTime).slice(0, 40)
  }, [games, sessions])

  const startEditingSession = (sessionKey: string, gameDate: string) => {
    setEditingSessionKey(sessionKey)
    setEditDate(gameDate)
  }

  const cancelEditingSession = () => {
    setEditingSessionKey(null)
    setEditDate('')
  }

    const saveSessionDate = async (s: RungSession) => {
      try {
        if (!editDate) return

        const ids = s.rounds
          .map(r => r.id)
          .filter((id): id is string => typeof id === 'string' && !id.startsWith('ongoing-'))

        if (ids.length === 0) {
          setEditingSessionKey(null)
          setEditDate('')
          return
        }

        // Bulk update: faster + avoids partial updates
        const { error } = await (supabase
          .from('games')
          .update as any)({ game_date: editDate })
          .in('id', ids)

        if (error) {
          console.error('Error updating session date:', error)
          alert(`Failed to update date: ${error.message}`)
          return
        }

        setEditingSessionKey(null)
        setEditDate('')
        await fetchGames()
      } catch (e: any) {
        console.error('Unexpected error updating session date:', e)
        alert(`Failed to update date: ${e?.message || e}`)
      }
    }

  const startEditingGame = (game: Game) => {
    setEditingGameId(game.id)
    setEditGameDate(game.game_date)
  }

  const cancelEditingGame = () => {
    setEditingGameId(null)
    setEditGameDate('')
  }

  const saveGameDate = async (gameId: string) => {
    try {
      if (!editGameDate) return
      const { error } = await (supabase.from('games').update as any)({ game_date: editGameDate }).eq('id', gameId)
      if (error) throw error
      setEditingGameId(null)
      setEditGameDate('')
      await fetchGames()
    } catch (e) {
      console.error(e)
      alert('Failed to update game date')
    }
  }

  const badgeClassForPlayer = (s: RungSession, p: string) => {
    if (s.tiers.winners.includes(p)) return 'bg-green-600'
    if (s.tiers.runners.includes(p)) return 'bg-blue-600'
    if (s.tiers.survivors.includes(p)) return 'bg-slate-600'
    if (s.tiers.losers.includes(p)) return 'bg-red-600'
    return 'bg-slate-600'
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
          {/* ADD GAME */}
          <div className="rounded-xl p-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Add New Game
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-xs font-bold">Game Type</label>
                  <select
                    value={newGame.type}
                    onChange={e => setNewGame({ ...newGame, type: e.target.value })}
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
                    className="w-full p-2.5 bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 rounded-lg text-sm shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] font-bold text-center [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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
                          newGame.players.map(p => {
                            const selected =
                              (roleKey === 'winners' && newGame.winners.includes(p)) ||
                              (roleKey === 'runnersUp' && newGame.runnersUp.includes(p)) ||
                              (roleKey === 'survivors' && newGame.survivors.includes(p)) ||
                              (roleKey === 'losers' && newGame.losers.includes(p))

                            return (
                              <Button
                                key={p}
                                onClick={() => toggleArrayItem(roleKey as any, p)}
                                variant="frosted"
                                color={
                                  roleKey === 'losers' && selected
                                    ? 'red'
                                    : roleKey !== 'losers' && selected
                                      ? 'blue'
                                      : 'purple'
                                }
                                selected={selected}
                                className="px-3 py-1.5 text-xs"
                              >
                                {p}
                              </Button>
                            )
                          })
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

          {/* RECENT */}
          <div className="rounded-xl p-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Recent Games
            </h2>

            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-2">
              {recentItems.map(item => {
                if (item.kind === 'session') {
                  const s = item.session
                  const isExpanded = expandedSessionKey === s.key

                  // Build display list of players sorted by best wins desc
                  const players = Object.keys(s.playerBest).sort((a, b) => (s.playerBest[b]?.wins ?? 0) - (s.playerBest[a]?.wins ?? 0))

                  return (
                    <div
                      key={item.key}
                      className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                    >
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-base text-white">{GAME_EMOJIS.Rung} Rung</div>
                            <span className="text-[0.7rem] text-slate-400 font-normal">
                              {new Date(s.gameDate).toLocaleDateString()}
                            </span>
                            {!s.isComplete && (
                              <span className="ml-1 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 text-black px-2 py-0.5 rounded text-[0.65rem] font-black tracking-wider shadow-[0_4px_10px_rgba(251,191,36,0.6)] animate-pulse">
                                ONGOING
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 bg-slate-900/40 px-2 py-1 rounded-lg">
                            {s.roundCount} rounds
                          </span>

                          {editingSessionKey === s.key ? (
                            <>
                              <input
                                type="date"
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                className="p-1 bg-purple-700 rounded text-xs text-white"
                              />
                              <button
                                onClick={() => saveSessionDate(s)}
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
                            <button
                              onClick={() => startEditingSession(s.key, s.gameDate)}
                              className="text-slate-300 hover:text-white text-xs"
                              title="Edit date"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </div>

                      {/* player badges */}
                      <div className="flex gap-1 flex-wrap mb-2">
                        {players.map(p => (
                          <span
                            key={p}
                            className={`${badgeClassForPlayer(s, p)} text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => setExpandedSessionKey(isExpanded ? null : s.key)}
                        className="w-full mt-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-[0_4px_8px_rgba(29,78,216,0.4),inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all"
                      >
                        {isExpanded ? '▲ COLLAPSE ROUNDS' : '▼ EXPAND ROUNDS'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 bg-slate-900/50 p-2 rounded-lg">
                          <h4 className="text-xs font-bold text-slate-300 mb-2 text-center">All Rounds</h4>

                          <div className="space-y-2">
                            {s.rounds.map((round, idx) => {
                              // progressive score up to this round (like your original)
                              const prog: Record<string, number> = {}
                              s.rounds.slice(0, idx + 1).forEach(r => {
                                const t1 = teamKey(r.team1 || [])
                                const t2 = teamKey(r.team2 || [])
                                if (!(t1 in prog)) prog[t1] = 0
                                if (!(t2 in prog)) prog[t2] = 0
                                if (r.winning_team === 1) prog[t1] += 1
                                else if (r.winning_team === 2) prog[t2] += 1
                              })

                              const t1Key = teamKey(round.team1 || [])
                              const t2Key = teamKey(round.team2 || [])
                              const t1Score = prog[t1Key] ?? 0
                              const t2Score = prog[t2Key] ?? 0

                              const leftWin = round.winning_team === 1
                              const rightWin = round.winning_team === 2

                              return (
                                <div
                                  key={round.id}
                                  className="bg-slate-800/50 p-1.5 rounded-lg flex items-center justify-between overflow-x-auto"
                                >
                                  <div className="grid grid-cols-[max-content_auto_max-content] gap-2 items-center text-xs font-bold flex-1 whitespace-nowrap">
                                    <div className={`text-right ${leftWin ? 'text-green-400' : 'text-red-400'}`}>
                                      <span>{round.team1!.join(' & ')}</span>
                                      <span className="text-amber-400 ml-2">({t1Score})</span>
                                    </div>
                                    <span className="text-amber-400 text-center px-2">vs</span>
                                    <div className={`text-left ${rightWin ? 'text-green-400' : 'text-red-400'}`}>
                                      <span className="text-amber-400 mr-2">({t2Score})</span>
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
                              Total Rounds: {s.roundCount}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                // non-rung
                const game = item.game
                const isEditing = editingGameId === game.id

                return (
                  <div
                    key={item.key}
                    className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]"
                  >
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-base text-white">
                            {GAME_EMOJIS[game.game_type]} {game.game_type}
                          </div>
                          <span className="text-[0.7rem] text-slate-400 font-normal">
                            {new Date(game.game_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
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
                              onClick={cancelEditingGame}
                              className="text-red-400 hover:text-red-300 font-bold text-xs"
                              title="Cancel"
                            >
                              ✗
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditingGame(game)}
                            className="text-slate-300 hover:text-white text-xs"
                            title="Edit date"
                          >
                            ✏️
                          </button>
                        )}

                        <button onClick={() => deleteGame(game.id)} className="text-slate-200 hover:text-white text-xs" title="Delete">
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {game.winners?.map(p => (
                        <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                      {game.runners_up?.map(p => (
                        <span key={p} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                      {game.survivors?.map(p => (
                        <span key={p} className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                          {p}
                        </span>
                      ))}
                      {game.losers?.map(p => (
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
