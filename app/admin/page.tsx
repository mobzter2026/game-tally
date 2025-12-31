'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game, GameInsert } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const GAMES = ['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead', 'Rung']

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [newGame, setNewGame] = useState({
    game: 'Blackjack',
    date: new Date().toISOString().split('T')[0],
    playersInGame: [] as string[],
    winners: [] as string[],
    runnersUp: [] as string[],
    losers: [] as string[],
    team1: [] as string[],
    team2: [] as string[],
    winningTeam: 1
  })
  const router = useRouter()
  const supabase = createClient()

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

    if (data) setGames(data)
  }

  const addGame = async () => {
    if (newGame.game === 'Rung') {
      if (newGame.team1.length !== 2 || newGame.team2.length !== 2) {
        alert('Rung requires 2 players per team')
        return
      }
      
      const gameData: GameInsert = {
        game_type: newGame.game,
        game_date: newGame.date,
        players_in_game: [...newGame.team1, ...newGame.team2],
        team1: newGame.team1,
        team2: newGame.team2,
        winning_team: newGame.winningTeam,
        created_by: user?.email ?? null
      }
      
      await (supabase.from('games').insert as any)(gameData)
    } else {
      if (newGame.playersInGame.length === 0 || newGame.winners.length === 0 || newGame.losers.length === 0) {
        alert('Please select players, winners and losers')
        return
      }
      
      const gameData: GameInsert = {
        game_type: newGame.game,
        game_date: newGame.date,
        players_in_game: newGame.playersInGame,
        winners: newGame.winners.length > 0 ? newGame.winners : null,
        runners_up: newGame.runnersUp.length > 0 ? newGame.runnersUp : null,
        losers: newGame.losers.length > 0 ? newGame.losers : null,
        created_by: user?.email ?? null
      }
      
      await (supabase.from('games').insert as any)(gameData)
    }

    setNewGame({
      game: 'Blackjack',
      date: new Date().toISOString().split('T')[0],
      playersInGame: [],
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
    if (confirm('Delete this game?')) {
      await supabase.from('games').delete().eq('id', id)
      fetchGames()
    }
  }

  const toggleTeamPlayer = (team: 'team1' | 'team2', player: string) => {
    const currentTeam = newGame[team]
    const otherTeam = team === 'team1' ? 'team2' : 'team1'
    
    if (currentTeam.includes(player)) {
      setNewGame({ ...newGame, [team]: currentTeam.filter(p => p !== player) })
    } else if (!newGame[otherTeam].includes(player) && currentTeam.length < 2) {
      setNewGame({ ...newGame, [team]: [...currentTeam, player] })
    }
  }

  const togglePlayerInGame = (player: string) => {
    const current = newGame.playersInGame
    if (current.includes(player)) {
      setNewGame({
        ...newGame,
        playersInGame: current.filter(p => p !== player),
        winners: newGame.winners.filter(p => p !== player),
        runnersUp: newGame.runnersUp.filter(p => p !== player),
        losers: newGame.losers.filter(p => p !== player)
      })
    } else {
      setNewGame({ ...newGame, playersInGame: [...current, player] })
    }
  }

  const togglePlayer = (category: 'winners' | 'runnersUp' | 'losers', player: string) => {
    const current = newGame[category]
    if (current.includes(player)) {
      setNewGame({ ...newGame, [category]: current.filter(p => p !== player) })
    } else {
      setNewGame({ ...newGame, [category]: [...current, player] })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <a href="/" target="_blank" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">👁️ View Public</a>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">🚪 Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Add New Game</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">Game Type</label>
                <select
                  value={newGame.game}
                  onChange={(e) => setNewGame({ 
                    ...newGame, 
                    game: e.target.value,
                    playersInGame: [],
                    winners: [],
                    runnersUp: [],
                    losers: [],
                    team1: [],
                    team2: []
                  })}
                  className="w-full p-3 bg-slate-700 rounded-lg"
                >
                  {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Date</label>
                <input
                  type="date"
                  value={newGame.date}
                  onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                  className="w-full p-3 bg-slate-700 rounded-lg"
                />
              </div>

              {newGame.game === 'Rung' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm">Team 1</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleTeamPlayer('team1', p)}
                          disabled={!newGame.team1.includes(p) && (newGame.team2.includes(p) || newGame.team1.length >= 2)}
                          className={`px-4 py-2 rounded ${newGame.team1.includes(p) ? 'bg-blue-600' : 'bg-slate-700'} disabled:opacity-50`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Team 2</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleTeamPlayer('team2', p)}
                          disabled={!newGame.team2.includes(p) && (newGame.team1.includes(p) || newGame.team2.length >= 2)}
                          className={`px-4 py-2 rounded ${newGame.team2.includes(p) ? 'bg-green-600' : 'bg-slate-700'} disabled:opacity-50`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Winning Team</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setNewGame({ ...newGame, winningTeam: 1 })}
                        className={`px-6 py-3 rounded ${newGame.winningTeam === 1 ? 'bg-blue-600' : 'bg-slate-700'}`}
                      >
                        Team 1 ({newGame.team1.join('+') || 'Empty'})
                      </button>
                      <button
                        onClick={() => setNewGame({ ...newGame, winningTeam: 2 })}
                        className={`px-6 py-3 rounded ${newGame.winningTeam === 2 ? 'bg-green-600' : 'bg-slate-700'}`}
                      >
                        Team 2 ({newGame.team2.join('+') || 'Empty'})
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded p-3">
                    <label className="block mb-2 text-sm text-yellow-400">Players in Game</label>
                    <div className="flex gap-2 flex-wrap">
                      {PLAYERS.map(p => (
                        <button
                          key={p}
                          onClick={() => togglePlayerInGame(p)}
                          className={`px-4 py-2 rounded ${newGame.playersInGame.includes(p) ? 'bg-purple-600' : 'bg-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newGame.playersInGame.length > 0 && (
                    <>
                      <div>
                        <label className="block mb-2 text-sm">Winners</label>
                        <div className="flex gap-2 flex-wrap mb-2">
                          {newGame.winners.map(w => (
                            <span key={w} className="bg-green-600 px-3 py-1 rounded flex items-center gap-2">
                              {w} <span className="cursor-pointer" onClick={() => togglePlayer('winners', w)}>❌</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {newGame.playersInGame.filter(p => !newGame.winners.includes(p) && !newGame.runnersUp.includes(p) && !newGame.losers.includes(p)).map(p => (
                            <button key={p} onClick={() => togglePlayer('winners', p)} className="px-4 py-2 rounded bg-slate-700">
                              ➕ {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm">Runner-Up (Optional)</label>
                        <div className="flex gap-2 flex-wrap mb-2">
                          {newGame.runnersUp.map(r => (
                            <span key={r} className="bg-blue-600 px-3 py-1 rounded flex items-center gap-2">
                              {r} <span className="cursor-pointer" onClick={() => togglePlayer('runnersUp', r)}>❌</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {newGame.playersInGame.filter(p => !newGame.winners.includes(p) && !newGame.runnersUp.includes(p) && !newGame.losers.includes(p)).map(p => (
                            <button key={p} onClick={() => togglePlayer('runnersUp', p)} className="px-4 py-2 rounded bg-slate-700">
                              ➕ {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm">Losers</label>
                        <div className="flex gap-2 flex-wrap mb-2">
                          {newGame.losers.map(l => (
                            <span key={l} className="bg-red-600 px-3 py-1 rounded flex items-center gap-2">
                              {l} <span className="cursor-pointer" onClick={() => togglePlayer('losers', l)}>❌</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {newGame.playersInGame.filter(p => !newGame.winners.includes(p) && !newGame.runnersUp.includes(p) && !newGame.losers.includes(p)).map(p => (
                            <button key={p} onClick={() => togglePlayer('losers', p)} className="px-4 py-2 rounded bg-slate-700">
                              ➕ {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={addGame}
                className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold"
              >
                Add Game Result
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Games ({games.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {games.map(game => (
                <div key={game.id} className="bg-slate-700 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold">{game.game_type}</div>
                      <div className="text-sm text-slate-400">{new Date(game.game_date).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => deleteGame(game.id)} className="text-red-400 hover:text-red-300">❌</button>
                  </div>
                  {game.game_type === 'Rung' ? (
                    <div className="text-sm">
                      <div className="text-green-400">Winners: {(game.winning_team === 1 ? game.team1 : game.team2)?.join(' + ')}</div>
                      <div className="text-red-400">Losers: {(game.winning_team === 1 ? game.team2 : game.team1)?.join(' + ')}</div>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      {game.winners && <div className="text-green-400">Winners: {game.winners.join(', ')}</div>}
                      {game.runners_up && game.runners_up.length > 0 && <div className="text-blue-400">Runner-Up: {game.runners_up.join(', ')}</div>}
                      {game.losers && <div className="text-red-400">Losers: {game.losers.join(', ')}</div>}
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
