'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game, GameInsert } from '@/lib/types'

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

  const togglePlayer = (player: string) => {
    if (newGame.players.includes(player)) {
      setNewGame({ ...newGame, players: newGame.players.filter(p => p !== player) })
    } else {
      setNewGame({ ...newGame, players: [...newGame.players, player] })
    }
  }

  const toggleWinner = (player: string) => {
    if (newGame.winners.includes(player)) {
      setNewGame({ ...newGame, winners: newGame.winners.filter(p => p !== player) })
    } else {
      setNewGame({ ...newGame, winners: [...newGame.winners, player] })
    }
  }

  const toggleRunnerUp = (player: string) => {
    if (newGame.runnersUp.includes(player)) {
      setNewGame({ ...newGame, runnersUp: newGame.runnersUp.filter(p => p !== player) })
    } else {
      setNewGame({ ...newGame, runnersUp: [...newGame.runnersUp, player] })
    }
  }

  const toggleLoser = (player: string) => {
    if (newGame.losers.includes(player)) {
      setNewGame({ ...newGame, losers: newGame.losers.filter(p => p !== player) })
    } else {
      setNewGame({ ...newGame, losers: [...newGame.losers, player] })
    }
  }

  const toggleTeam1 = (player: string) => {
    if (newGame.team1.includes(player)) {
      setNewGame({ ...newGame, team1: newGame.team1.filter(p => p !== player) })
    } else {
      if (newGame.team1.length >= 2) {
        alert('Team 1 can only have 2 players maximum')
        return
      }
      setNewGame({ ...newGame, team1: [...newGame.team1, player] })
    }
  }

  const toggleTeam2 = (player: string) => {
    if (newGame.team2.includes(player)) {
      setNewGame({ ...newGame, team2: newGame.team2.filter(p => p !== player) })
    } else {
      if (newGame.team2.length >= 2) {
        alert('Team 2 can only have 2 players maximum')
        return
      }
      setNewGame({ ...newGame, team2: [...newGame.team2, player] })
    }
  }

  const selectAllPlayers = () => {
    setNewGame({ ...newGame, players: PLAYERS })
  }

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
        players_in_game: [], // Empty array for Rung games
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
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">Manage game results</p>
          </div>
          <div className="flex gap-2 justify-center">
            <a href="/admin/scoring" className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded">🎯 Live Scoring</a>
            <a href="/" className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded">View Leaderboard</a>
            <button onClick={handleSignOut} className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded">Sign Out</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Game Form */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Add New Game</h2>
            <p className="text-sm text-slate-400 mb-4">💡 Tip: For round-based games (Monopoly, Tai Ti, Shithead), use Live Scoring for better tracking</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-1">
                <label className="block mb-2 text-sm">Game Type</label>
                <select
                  value={newGame.type}
                  onChange={(e) => setNewGame({ ...newGame, type: e.target.value })}
                  className="w-full p-3 bg-slate-700 rounded-lg"
                >
                  <option value="Blackjack">🃏 Blackjack</option>
                  <option value="Monopoly">🎲 Monopoly</option>
                  <option value="Tai Ti">🀄 Tai Ti</option>
                  <option value="Shithead">💩 Shithead</option>
                  <option value="Rung">🎴 Rung</option>
                </select>
              </div>

              <div className="flex items-center gap-3 flex-1">
                <label className="block mb-2 text-sm">Date</label>
                <input
                  type="date"
                  value={newGame.date}
                  onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                  className="w-full p-3 bg-slate-700 rounded-lg"
                />
              </div>

              {newGame.type === 'Rung' ? (
                <>
                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Team 1 (Max 2 players)</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleTeam1(p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.team1.includes(p) ? 'bg-blue-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Team 2 (Max 2 players)</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleTeam2(p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.team2.includes(p) ? 'bg-purple-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Winning Team</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setNewGame({ ...newGame, winningTeam: 1 })}
                        className={`flex-1 py-2 rounded ${newGame.winningTeam === 1 ? 'bg-green-600' : 'bg-slate-700'}`}
                      >
                        Team 1
                      </button>
                      <button
                        onClick={() => setNewGame({ ...newGame, winningTeam: 2 })}
                        className={`flex-1 py-2 rounded ${newGame.winningTeam === 2 ? 'bg-green-600' : 'bg-slate-700'}`}
                      >
                        Team 2
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Players in Game</label>
                    <button
                      type="button"
                      onClick={selectAllPlayers}
                      className="mb-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      Select All
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => togglePlayer(p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.players.includes(p) ? 'bg-purple-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Winners</label>
                    <div className="flex gap-2 flex-wrap">
                      {newGame.players.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleWinner(p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.winners.includes(p) ? 'bg-green-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Runners-up</label>
                    <div className="flex gap-2 flex-wrap">
                      {newGame.players.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleRunnerUp(p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.runnersUp.includes(p) ? 'bg-blue-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <label className="block mb-2 text-sm">Losers</label>
                    <div className="flex gap-2 flex-wrap">
                      {newGame.players.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleLoser(p)}
                          className={`px-2 py-1 text-sm rounded ${newGame.losers.includes(p) ? 'bg-red-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={addGame}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
              >
                Add Game
              </button>
            </div>
          </div>

          {/* Recent Games */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Games</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {games.slice(0, 20).map(game => (
                <div key={game.id} className="bg-slate-700 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="font-bold">{GAME_EMOJIS[game.game_type]} {game.game_type}</div>
                      <div className="text-sm text-slate-400">
                        {new Date(game.game_date).toLocaleDateString()}
                        {game.created_at && ` • ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                  {game.game_type === 'Rung' ? (
                    <div className="flex gap-1 flex-wrap">
                      {game.team1?.map(player => (
                        <span key={player} className={`${game.winning_team === 1 ? 'bg-green-600' : 'bg-red-600'} text-white px-2 py-1 rounded text-xs font-semibold`}>{player}</span>
                      ))}
                      <span className="text-slate-400 px-2 self-center">vs</span>
                      
                      {game.team2?.map(player => (
                        <span key={player} className={`${game.winning_team === 2 ? 'bg-green-600' : 'bg-red-600'} text-white px-2 py-1 rounded text-xs font-semibold`}>{player}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      
                      {game.winners && game.winners.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                        {game.winners?.map(player => (
                          <span key={player} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">{player}</span>
                        ))}
                      </div>
                      )}
                      {game.runners_up && game.runners_up.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                        {game.runners_up?.map(player => (
                          <span key={player} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">{player}</span>
                        ))}
                      </div>
                      )}
                      {game.losers && game.losers.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                        {game.losers?.map(player => (
                          <span key={player} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">{player}</span>
                        ))}
                      </div>
                      )}
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
