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
  const [editingGame, setEditingGame] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
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
    team2: [] as string[]
  })

  // Rung state - simplified, no modes
  const [rungRounds, setRungRounds] = useState<Array<{team1: string[], team2: string[], winner: number}>>([])
  const [currentRungTeam1, setCurrentRungTeam1] = useState<string[]>([])
  const [currentRungTeam2, setCurrentRungTeam2] = useState<string[]>([])
  const [rungScore, setRungScore] = useState({ team1: 0, team2: 0 })
  const [rungSessionId, setRungSessionId] = useState<string>('')

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
      .order('created_at', { ascending: false })
    
    if (data) {
      // Process games and group Rung sessions
      const processedGames: Game[] = []
      const rungSessionMap: Record<string, Game[]> = {}
      
      for (const game of data as Game[]) {
        // Group Rung games by session
        if (game.game_type === 'Rung' && game.rung_session_id) {
          if (!rungSessionMap[game.rung_session_id]) {
            rungSessionMap[game.rung_session_id] = []
          }
          rungSessionMap[game.rung_session_id].push(game)
        } else if (game.winners?.length || game.losers?.length) {
          // Non-Rung games or Rung without session - add directly
          processedGames.push(game)
        }
      }
      
      // Process Rung sessions into single game entries with aggregated results
      for (const [sessionId, sessionGames] of Object.entries(rungSessionMap)) {
        if (sessionGames.length === 0) continue
        
        // Sort rounds by created_at to get chronological order
        sessionGames.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateA - dateB
        })
        
        // Calculate total wins per player across ALL teams they played on
        const playerWins: Record<string, number> = {}
        
        sessionGames.forEach(round => {
          round.winners?.forEach(player => {
            playerWins[player] = (playerWins[player] || 0) + 1
          })
          round.losers?.forEach(player => {
            if (!playerWins[player]) playerWins[player] = 0
          })
        })
        
        // Get unique win counts and sort them descending
        const uniqueScores = [...new Set(Object.values(playerWins))].sort((a, b) => b - a)
        
        // Categorize based on score rankings
        const finalWinners: string[] = []
        const finalRunnersUp: string[] = []
        const finalSurvivors: string[] = []
        const finalLosers: string[] = []
        
        if (uniqueScores.length === 0) {
          // No players? Skip
        } else if (uniqueScores.length === 1) {
          // Everyone has same score - all are tied (shouldn't happen in normal game)
          Object.keys(playerWins).forEach(player => finalWinners.push(player))
        } else if (uniqueScores.length === 2) {
          // Only 2 score levels: winners and losers
          const highScore = uniqueScores[0]
          const lowScore = uniqueScores[1]
          
          Object.entries(playerWins).forEach(([player, wins]) => {
            if (wins === highScore) {
              finalWinners.push(player)
            } else {
              finalLosers.push(player)
            }
          })
        } else {
          // 3+ score levels: winners, runners-up, survivors (middle), losers
          const highScore = uniqueScores[0]
          const secondScore = uniqueScores[1]
          const lowScore = uniqueScores[uniqueScores.length - 1]
          
          Object.entries(playerWins).forEach(([player, wins]) => {
            if (wins === highScore) {
              finalWinners.push(player)
            } else if (wins === secondScore) {
              finalRunnersUp.push(player)
            } else if (wins === lowScore) {
              finalLosers.push(player)
            } else {
              // Middle scores = survivors
              finalSurvivors.push(player)
            }
          })
        }
        
        // Create aggregated game entry
        const allPlayers = Object.keys(playerWins)
        processedGames.push({
          ...sessionGames[0], // Use first round's metadata
          id: sessionId, // Use session ID as game ID
          players_in_game: allPlayers,
          winners: finalWinners.length > 0 ? finalWinners : null,
          runners_up: finalRunnersUp.length > 0 ? finalRunnersUp : null,
          survivors: finalSurvivors.length > 0 ? finalSurvivors : null,
          losers: finalLosers.length > 0 ? finalLosers : null
        })
      }
      
      // Sort by created_at
      processedGames.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })
      
      setGames(processedGames)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const toggleArrayItem = (
    key: 'players' | 'winners' | 'runnersUp' | 'losers' | 'survivors' | 'team1' | 'team2',
    player: string
  ) => {
    const arr = newGame[key]
    if (arr.includes(player)) {
      setNewGame({ ...newGame, [key]: arr.filter(p => p !== player) })
    } else {
      setNewGame({ ...newGame, [key]: [...arr, player] })
    }
  }

  const toggleRungTeam1 = (player: string) => {
    if (currentRungTeam1.includes(player)) {
      setCurrentRungTeam1(currentRungTeam1.filter(p => p !== player))
    } else if (currentRungTeam1.length < 2) {
      setCurrentRungTeam1([...currentRungTeam1, player])
    }
  }

  const toggleRungTeam2 = (player: string) => {
    if (currentRungTeam2.includes(player)) {
      setCurrentRungTeam2(currentRungTeam2.filter(p => p !== player))
    } else if (currentRungTeam2.length < 2) {
      setCurrentRungTeam2([...currentRungTeam2, player])
    }
  }

  const selectAllPlayers = () => setNewGame({ ...newGame, players: PLAYERS })
  const clearPlayers = () => setNewGame({ ...newGame, players: [] })

  const recordRungRound = async (winningTeam: number) => {
    const newScore = {
      team1: rungScore.team1 + (winningTeam === 1 ? 1 : 0),
      team2: rungScore.team2 + (winningTeam === 2 ? 1 : 0)
    }

    // Generate session ID on first round (for local tracking)
    let sessionId = rungSessionId
    if (!sessionId) {
      sessionId = `rung_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setRungSessionId(sessionId)
    }

    const newRound = {
      team1: [...currentRungTeam1],
      team2: [...currentRungTeam2],
      winner: winningTeam
    }

    setRungRounds([...rungRounds, newRound])
    setRungScore(newScore)

    // Determine winners and losers based on which team won
    const winners = winningTeam === 1 ? currentRungTeam1 : currentRungTeam2
    const losers = winningTeam === 1 ? currentRungTeam2 : currentRungTeam1

    // Save ONE game record per round with winners/losers and session ID
    const { error } = await (supabase.from('games').insert as any)({
      game_type: 'Rung',
      game_date: newGame.date,
      players_in_game: [...currentRungTeam1, ...currentRungTeam2],
      winners: winners,
      losers: losers,
      runners_up: null,
      survivors: null,
      created_by: user?.email,
      rung_session_id: sessionId
    })

    if (error) {
      console.error('Error saving round:', error)
      alert(`❌ Error saving round: ${error.message}`)
      return
    }

    // Check if game is over (first to 5)
    if (newScore.team1 >= 5 || newScore.team2 >= 5) {
      const winner = newScore.team1 >= 5 ? 'Team 1' : 'Team 2'
      alert(`🏆 ${winner} wins the game! Final score: ${newScore.team1} - ${newScore.team2}`)
      
      // Reset Rung state
      setRungRounds([])
      setCurrentRungTeam1([])
      setCurrentRungTeam2([])
      setRungScore({ team1: 0, team2: 0 })
      setRungSessionId('')
      setNewGame({
        ...newGame,
        type: '',
        players: [],
        winners: [],
        runnersUp: [],
        losers: [],
        survivors: [],
        team1: [],
        team2: []
      })
      
      fetchGames()
      return
    }

    // Keep winning team, clear losing team
    if (winningTeam === 1) {
      setCurrentRungTeam2([])
    } else {
      setCurrentRungTeam1([])
    }
  }

  const addGame = async () => {
    if (newGame.players.length === 0) {
      alert('Please select at least one player')
      return
    }

    // Don't use this for Rung - Rung uses recordRungRound
    if (newGame.type === 'Rung') {
      alert('Use the Team 1/Team 2 Wins buttons for Rung games')
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
      created_by: user?.email
    }

    const { error } = await (supabase.from('games').insert as any)(gameData)
    if (error) {
      console.error('Error adding game:', error)
      alert(`❌ Error adding game:\n\n${error.message}\n\nCode: ${error.code}\n\nDetails: ${JSON.stringify(error.details)}`)
      return
    }

    alert('✅ Game added successfully!')
    setNewGame({
      type: '',
      date: new Date().toISOString().split('T')[0],
      players: [],
      winners: [],
      runnersUp: [],
      losers: [],
      survivors: [],
      team1: [],
      team2: []
    })

    fetchGames()
  }

  const deleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return
    
    const { error } = await (supabase.from('games').delete as any)().eq('id', id)
    
    if (error) {
      alert('Error deleting game')
      console.error(error)
      return
    }
    
    fetchGames()
  }

  const startEditingGame = (game: Game) => {
    setEditingGame(game.id)
    setEditDate(game.game_date)
    setEditTime(game.created_at ? new Date(game.created_at).toTimeString().slice(0, 5) : '12:00')
  }

  const saveGameDateTime = async (id: string) => {
    const dateTime = new Date(`${editDate}T${editTime}:00`)
    
    const { error } = await (supabase
      .from('games')
      .update as any)({ 
        game_date: editDate,
        created_at: dateTime.toISOString()
      })
      .eq('id', id)
    
    if (error) {
      alert('Error updating game')
      console.error(error)
      return
    }
    
    setEditingGame(null)
    fetchGames()
  }

  const cancelEditing = () => {
    setEditingGame(null)
    setEditDate('')
    setEditTime('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-950 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-950 to-purple-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            ♠️ Points Royale ♠️
          </h1>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => router.push('/')}
              variant="frosted" 
              color="blue" 
              className="px-4 py-2"
            >
              ← Back to Leaderboard
            </Button>
            <Button onClick={handleSignOut} variant="frosted" color="red" className="px-4 py-2">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add New Game */}
          <div className="rounded-xl p-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Let the Madness Begin 🔥
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-xs font-bold">📅 Date</label>
                <input
                  type="date"
                  value={newGame.date}
                  onChange={e => setNewGame({ ...newGame, date: e.target.value })}
                  className="w-full p-2 rounded bg-purple-800/50 text-white border border-purple-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-bold">🎮 Game Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead', 'Rung'].map(type => (
                    <Button
                      key={type}
                      onClick={() => setNewGame({ ...newGame, type })}
                      variant="frosted"
                      color={newGame.type === type ? 'purple' : 'blue'}
                      selected={newGame.type === type}
                      className="px-3 py-1.5 text-xs"
                    >
                      {GAME_EMOJIS[type]} {type}
                    </Button>
                  ))}
                </div>
              </div>

              {newGame.type !== 'Rung' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold">👥 Players</label>
                      <div className="flex gap-1">
                        <Button onClick={selectAllPlayers} variant="frosted" color="blue" className="px-2 py-1 text-xs">
                          All
                        </Button>
                        <Button onClick={clearPlayers} variant="frosted" color="red" className="px-2 py-1 text-xs">
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PLAYERS.map(p => (
                        <Button
                          key={p}
                          onClick={() => toggleArrayItem('players', p)}
                          variant="frosted"
                          color={newGame.players.includes(p) ? 'purple' : 'blue'}
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

                  <Button 
                    onClick={addGame} 
                    variant="pop"
                    className="w-full py-3 text-base font-bold bg-gradient-to-br from-emerald-600 to-emerald-900"
                    disabled={newGame.type === ''}
                  >
                    ➕ Add Game
                  </Button>
                </>
              )}

              {/* Rung Team Selection */}
              {newGame.type === 'Rung' && (
                <div className="space-y-4">
                  {rungRounds.length > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        <span className="text-blue-400">Team 1: {rungScore.team1}</span>
                        <span className="text-amber-300 mx-3">-</span>
                        <span className="text-red-400">{rungScore.team2} :Team 2</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Team 1 Column */}
                    <div>
                      <label className="block mb-2 text-xs font-bold text-blue-400">
                        Team 1 {currentRungTeam1.length === 2 ? '✓' : '(Select 2)'}
                      </label>
                      <div className="space-y-2">
                        {PLAYERS.map(p => (
                          <Button
                            key={p}
                            onClick={() => toggleRungTeam1(p)}
                            variant="frosted"
                            color={currentRungTeam1.includes(p) ? 'blue' : 'purple'}
                            selected={currentRungTeam1.includes(p)}
                            disabled={currentRungTeam2.includes(p) || (currentRungTeam1.length >= 2 && !currentRungTeam1.includes(p))}
                            className="w-full px-3 py-1.5 text-xs"
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Team 2 Column */}
                    <div>
                      <label className="block mb-2 text-xs font-bold text-red-400">
                        Team 2 {currentRungTeam2.length === 2 ? '✓' : '(Select 2)'}
                      </label>
                      <div className="space-y-2">
                        {PLAYERS.map(p => (
                          <Button
                            key={p}
                            onClick={() => toggleRungTeam2(p)}
                            variant="frosted"
                            color={currentRungTeam2.includes(p) ? 'red' : 'purple'}
                            selected={currentRungTeam2.includes(p)}
                            disabled={currentRungTeam1.includes(p) || (currentRungTeam2.length >= 2 && !currentRungTeam2.includes(p))}
                            className="w-full px-3 py-1.5 text-xs"
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {currentRungTeam1.length === 2 && currentRungTeam2.length === 2 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => recordRungRound(1)}
                        variant="pop"
                        color="blue"
                        className="flex-1 px-3 py-2 text-xs font-bold"
                      >
                        {currentRungTeam1.join(' + ')} Won Round
                      </Button>
                      <Button
                        onClick={() => recordRungRound(2)}
                        variant="pop"
                        color="red"
                        className="flex-1 px-3 py-2 text-xs font-bold"
                      >
                        {currentRungTeam2.join(' + ')} Won Round
                      </Button>
                    </div>
                  )}

                  {rungRounds.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-900/40 rounded">
                      <h4 className="text-xs font-bold mb-2 text-purple-300">Rounds Recorded ({rungRounds.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {rungRounds.map((round, idx) => (
                          <div key={idx} className="text-xs bg-purple-900/30 rounded p-1.5 flex justify-between">
                            <span>Round {idx + 1}:</span>
                            <div className="flex gap-2">
                              <span className={round.winner === 1 ? 'text-green-400 font-bold' : 'text-slate-400'}>
                                {round.team1.join(' + ')}
                              </span>
                              <span className="text-slate-500">vs</span>
                              <span className={round.winner === 2 ? 'text-green-400 font-bold' : 'text-slate-400'}>
                                {round.team2.join(' + ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic">Game continues until one team reaches 5 wins</p>
                </div>
              )}
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
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="font-bold text-base">{GAME_EMOJIS[game.game_type]} {game.game_type}</div>
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
                            <button
                              onClick={cancelEditing}
                              className="text-red-400 hover:text-red-300 font-bold text-xs"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <>
                            <span>
                              {new Date(game.game_date).toLocaleDateString()} 
                              {game.created_at && ` • ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
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
                    <button 
                      onClick={() => deleteGame(game.id)} 
                      className="text-white-400 hover:text-white-300 text-sm transition-colors"
                    >
                      🗑️ Delete
                    </button>
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
