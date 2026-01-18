'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎭'
}

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

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
        survivors: newGame.survivors.length > 0 ? newGame.survivors : null,
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
      type: '',
      date: new Date().toISOString().split('T')[0],
      players: [],
      winners: [],
      runnersUp: [],
      losers: [],
      survivors: [],
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
                    <option value="" disabled>Select a game</option>
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

                  {['winners', 'runnersUp', 'survivors', 'losers'].map(roleKey => (
                    <div key={roleKey}>
                      <label className="block mb-2 text-xs font-bold">
                        {roleKey === 'winners' ? '🏆 Winners' : 
                         roleKey === 'runnersUp' ? '🥈 Runners-up' : 
                         roleKey === 'survivors' ? '🤟 Survivors' :
                         '💀 Losers'}
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
                                roleKey === 'winners' && newGame.winners.includes(p) ? 'blue' :
                                roleKey === 'runnersUp' && newGame.runnersUp.includes(p) ? 'blue' :
                                roleKey === 'survivors' && newGame.survivors.includes(p) ? 'purple' :
                                roleKey === 'losers' && newGame.losers.includes(p) ? 'red' :
                                'purple'
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
              {games.slice(0, 20).map(game => (
                <div key={game.id} className="bg-purple-900/50 rounded-xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]">
                  <div className="flex justify-between items-center mb-3">
  <div className="flex items-center gap-4 flex-1">
    <div className="font-bold text-base">{GAME_EMOJIS[game.game_type]} {game.game_type}</div>
    <div className="text-xs text-slate-400">
      {new Date(game.game_date).toLocaleDateString()} 
      {game.created_at && ` • ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
    </div>
  </div>
  <button 
    onClick={() => deleteGame(game.id)} 
    className="text-red-400 hover:text-red-300 text-sm transition-colors"
  >
    🗑️ Delete
  </button>
</div>

                  {game.game_type === 'Rung' ? (
                    <div className="flex gap-2 flex-wrap items-center text-sm">
                      <div className="flex gap-1">
                        {(game.winning_team === 1 ? game.team1 : game.team2)?.map(p => (
                          <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                            {p}
                          </span>
                        ))}
                      </div>
                      <span className="text-amber-400 font-bold">vs</span>
                      <div className="flex gap-1">
                        {(game.winning_team === 1 ? game.team2 : game.team1)?.map(p => (
                          <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
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
