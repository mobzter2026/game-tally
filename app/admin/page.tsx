'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎴'
}

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const [newGame, setNewGame] = useState({
    type: 'Blackjack',
    date: new Date().toISOString().split('T')[0],
    players: [] as string[],
    winners: [] as string[],
    runnersUp: [] as string[],
    losers: [] as string[],
    team1: [] as string[],
    team2: [] as string[],
    winningTeam: 1
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!adminData) {
      await supabase.auth.signOut()
      router.push('/admin/login')
      return
    }

    setUser(user)
    fetchGames()
    setLoading(false)
  }

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

  // Fixed TypeScript-safe toggle function
  const toggleArrayItem = (
    key: 'players' | 'winners' | 'runnersUp' | 'losers' | 'team1' | 'team2',
    player: string,
    max?: number
  ) => {
    const arr = newGame[key]
    if (!Array.isArray(arr)) return // safety check

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
        players_in_game: [],
        team1: newGame.team1,
        team2: newGame.team2,
        winning_team: newGame.winningTeam,
        created_by: user?.email,
        created_at: new Date().toISOString()
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
        losers: newGame.losers.length > 0 ? newGame.losers : null,
        created_by: user?.email,
        created_at: new Date().toISOString()
      }

      const { error } = await (supabase.from('games').insert as any)(gameData)
      if (error) {
        console.error('Error adding game:', error)
        alert('Error adding game. Check console for details.')
        return
      }
    }

    setNewGame({
      type: 'Blackjack',
      date: new Date().toISOString().split('T')[0],
      players: [],
      winners: [],
      runnersUp: [],
      losers: [],
      team1: [],
      team2: [],
      winningTeam: 1
    })

    fetchGames()
  }

  const deleteGame = async (id: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      await supabase.from('games').delete().eq('id', id)
      fetchGames()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto mt-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-slate-400 mb-4">Manage game results</p>
          <div className="flex gap-2 justify-center">
            <a href="/admin/scoring" className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded">🎯 Live Scoring</a>
            <a href="/" className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded">View Leaderboard</a>
            <button onClick={handleSignOut} className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded">Sign Out</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Game Form */}
          <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
            <h2 className="text-2xl font-bold mb-4">Add New Game</h2>
            <p className="text-sm text-slate-400 mb-4">💡 Tip: For round-based games, use Live Scoring for better tracking</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm">Game Type</label>
                  <select
                    value={newGame.type}
                    onChange={(e) => setNewGame({ ...newGame, type: e.target.value })}
                    className="w-full p-3 bg-violet-900/80 rounded-lg"
                  >
                    {Object.entries(GAME_EMOJIS).map(([gameType, emoji]) => (
                      <option key={gameType} value={gameType}>
                        {emoji} {gameType}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Date</label>
                  <input
                    type="date"
                    value={newGame.date}
                    onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                    className="w-full p-3 bg-violet-900/80 rounded-lg"
                  />
                </div>
              </div>

              {/* Rung Teams */}
              {newGame.type === 'Rung' ? (
                <>
                  {['team1', 'team2'].map((teamKey, idx) => (
                    <div key={teamKey} className="flex justify-between items-center flex-1">
                      <label className="block mb-2 text-sm">Team {idx + 1} (Max 2 players)</label>
                      <div className="flex gap-2 flex-wrap">
                        {PLAYERS.map(p => (
                          <button
                            key={p}
                            onClick={() => toggleArrayItem(teamKey as 'team1' | 'team2', p, 2)}
                            className={`px-2 py-1 text-sm rounded ${
                              newGame[teamKey as 'team1' | 'team2'].includes(p)
                                ? teamKey === 'team1' ? 'bg-blue-600' : 'bg-purple-600'
                                : 'bg-violet-900/80'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center flex-1">
                    <label className="block mb-2 text-sm">Winning Team</label>
                    <div className="flex gap-4">
                      {[1,2].map(n => (
                        <button
                          key={n}
                          onClick={() => setNewGame({ ...newGame, winningTeam: n })}
                          className={`flex-1 py-2 rounded ${newGame.winningTeam === n ? 'bg-green-600' : 'bg-violet-900/80'}`}
                        >
                          Team {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Players */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold">Players in Game</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={selectAllPlayers} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">Select All</button>
                        {newGame.players.length > 0 && <button type="button" onClick={clearPlayers} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">Clear</button>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleArrayItem('players', p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.players.includes(p) ? 'bg-purple-600' : 'bg-violet-900/80'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Winners / Runners-up / Losers */}
                  {['winners', 'runnersUp', 'losers'].map((roleKey, idx) => (
                    <div key={roleKey} className="mb-4">
                      <label className="block mb-2 text-sm font-semibold">{roleKey === 'winners' ? 'Winners' : roleKey === 'runnersUp' ? 'Runners-up' : 'Losers'}</label>
                      <div className="flex gap-2 flex-wrap">
                        {newGame.players.map(p => (
                          <button
                            key={p}
                            onClick={() => toggleArrayItem(roleKey as 'winners' | 'runnersUp' | 'losers', p)}
                            className={`px-2 py-1 text-sm rounded ${
                              roleKey === 'winners' && newGame.winners.includes(p) ? 'bg-green-600' :
                              roleKey === 'runnersUp' && newGame.runnersUp.includes(p) ? 'bg-blue-600' :
                              roleKey === 'losers' && newGame.losers.includes(p) ? 'bg-red-600' : 'bg-violet-900/80'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <button onClick={addGame} className="w-full bg-fuchsia-700 hover:bg-fuchsia-800 py-3 rounded font-bold">
                Add Game
              </button>
            </div>
          </div>

          {/* Recent Games */}
          <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Games</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {games.slice(0, 20).map(game => (
                <div key={game.id} className="bg-violet-900/80 rounded p-3 border border-fuchsia-500/40">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex justify-between items-center flex-1">
                      <div className="font-bold">{GAME_EMOJIS[game.game_type]} {game.game_type}</div>
                      <div className="text-sm text-slate-400">
                        {new Date(game.game_date).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => deleteGame(game.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </div>

                  {/* Display game players */}
                  {game.game_type === 'Rung' ? (
                    <div className="flex gap-1 flex-wrap items-center">
                      {game.winning_team === 1 ? game.team1?.map(p => <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>) : game.team2?.map(p => <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>)}
                      <span className="text-slate-400 px-2">vs</span>
                      {game.winning_team === 1 ? game.team2?.map(p => <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>) : game.team1?.map(p => <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>)}
                    </div>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      {game.winners?.map(p => <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>)}
                      {game.runners_up?.map(p => <span key={p} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>)}
                      {game.losers?.map(p => <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">{p}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
