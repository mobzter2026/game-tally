'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const MIN_GAMES_FOR_RANKING = 0

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎴'
}

const INDIVIDUAL_GAMES = ['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead']

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'individual' | 'rung-teams' | 'rung-players'>('individual')
  const [perfectGame, setPerfectGame] = useState<Game | null>(null)
  const [shitheadLosingStreak, setShitheadLosingStreak] = useState<{player: string, streak: number} | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const [selectedGameType, setSelectedGameType] = useState<string>('All Games')
  const [hallView, setHallView] = useState<'none' | 'fame' | 'shame'>('none')
  const supabase = createClient()

  useEffect(() => {
    fetchGames()

    const channel = supabase
      .channel('games-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchGames()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      const gamesData = data as Game[]
      setGames(gamesData)
      checkPerfectGameAndStreak(gamesData)
    }
    setLoading(false)
  }

  const checkPerfectGameAndStreak = (gamesData: Game[]) => {
    const latestIndividualGame = gamesData.filter(g => g.game_type !== 'Rung')[0]
    if (latestIndividualGame && latestIndividualGame.winners && latestIndividualGame.winners.length === 1) {
      const hasRunnerUps = latestIndividualGame.runners_up && latestIndividualGame.runners_up.length > 0
      if (!hasRunnerUps && latestIndividualGame.losers && latestIndividualGame.losers.length >= 2) {
        setPerfectGame(latestIndividualGame)
      } else {
        setPerfectGame(null)
      }
    }

    const shitheadGames = gamesData.filter(g => g.game_type === 'Shithead')
    const reversedShitheadGames = shitheadGames.slice().reverse()
    let foundStreak = false
    PLAYERS.forEach(player => {
      if (foundStreak) return
      let streak = 0
      for (const game of reversedShitheadGames) {
        if (game.losers?.includes(player)) {
          streak++
        } else if (game.players_in_game?.includes(player)) {
          break
        }
      }
      
      if (streak >= 3) {
        setShitheadLosingStreak({ player, streak })
        foundStreak = true
      }
    })
    if (!foundStreak) setShitheadLosingStreak(null)
  }

  const togglePlayerFilter = (player: string) => {
    if (selectedPlayers.includes(player)) {
      setSelectedPlayers(selectedPlayers.filter(p => p !== player))
    } else {
      setSelectedPlayers([...selectedPlayers, player])
    }
  }

  const selectAllPlayers = () => {
    setSelectedPlayers(PLAYERS)
  }

  const clearFilter = () => {
    setSelectedPlayers([])
  }

  const getFilteredGames = () => {
    let filtered = games

    if (selectedPlayers.length > 0) {
      filtered = filtered.filter(game => {
        if (game.game_type === 'Rung') {
          const allPlayers = [...(game.team1 || []), ...(game.team2 || [])]
          return allPlayers.length === selectedPlayers.length && 
                 selectedPlayers.every(p => allPlayers.includes(p))
        } else {
          const gamePlayers = game.players_in_game || []
          return gamePlayers.length === selectedPlayers.length && 
                 selectedPlayers.every(p => gamePlayers.includes(p))
        }
      })
    }

    if (selectedGameType !== 'All Games') {
      filtered = filtered.filter(g => g.game_type === selectedGameType)
    }

    return filtered
  }

  const filteredGames = getFilteredGames()

  const getPlayerStatsForGame = (gameType?: string) => {
    const stats: any = {}
    const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS
    
    activePlayers.forEach(p => {
      stats[p] = { gamesPlayed: 0, wins: 0, runnerUps: 0, survivals: 0, losses: 0, weightedWins: 0, bestStreak: 0, shitheadLosses: 0 }
    })

    let individualGames = filteredGames.filter(g => g.game_type !== 'Rung')
    if (gameType) {
      individualGames = individualGames.filter(g => g.game_type === gameType)
    }

    individualGames.forEach(game => {
      if (game.players_in_game) {
        game.players_in_game.forEach(p => { 
          if (stats[p]) stats[p].gamesPlayed++ 
        })
      }
      
      if (game.winners) game.winners.forEach(w => { 
        if (stats[w]) {
          stats[w].wins++
          stats[w].weightedWins += 1
        }
      })
      if (game.runners_up) game.runners_up.forEach(r => { 
        if (stats[r]) {
          stats[r].runnerUps++
          stats[r].weightedWins += 0.4
        }
      })
      
      // Calculate survivals (players who didn't win, get 2nd, or lose)
      if (game.players_in_game) {
        const winners = game.winners || []
        const runnersUp = game.runners_up || []
        const losers = game.losers || []
        
        game.players_in_game.forEach(p => {
          if (stats[p] && !winners.includes(p) && !runnersUp.includes(p) && !losers.includes(p)) {
            stats[p].survivals++
            stats[p].weightedWins += 0.1
          }
        })
      }
      
      if (game.losers) game.losers.forEach(l => { 
        if (stats[l]) stats[l].losses++ 
      })

      if (game.game_type === 'Shithead' && game.losers) {
        game.losers.forEach(l => {
          if (stats[l]) stats[l].shitheadLosses++
        })
      }
    })

    activePlayers.forEach(player => {
      let currentStreak = 0
      let bestStreak = 0
      
      const reversedGames = individualGames.slice().reverse()
      reversedGames.forEach(game => {
        if (game.winners?.includes(player)) {
          currentStreak++
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak
          }
        } else if (game.players_in_game?.includes(player)) {
          currentStreak = 0
        }
      })
      
      stats[player].bestStreak = bestStreak
    })

    return activePlayers
      .map(p => ({
        player: p,
        ...stats[p],
        winRate: stats[p].gamesPlayed > 0 ? ((stats[p].weightedWins / stats[p].gamesPlayed) * 100).toFixed(0) : '0'
      }))
      .filter(p => p.gamesPlayed >= MIN_GAMES_FOR_RANKING)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.weightedWins - a.weightedWins)
  }

  const getPlayerStats = () => getPlayerStatsForGame()

  const getWorstShitheadPlayer = () => {
    const allStats = getPlayerStats()
    if (allStats.length === 0) return null
    
    const maxShitheadLosses = Math.max(...allStats.map(p => p.shitheadLosses))
    if (maxShitheadLosses === 0) return null
    
    const worstPlayer = allStats.find(p => p.shitheadLosses === maxShitheadLosses)
    return worstPlayer?.player || null
  }

  const getRungTeamStats = () => {
    const teamStats: any = {}
    
    const rungGames = filteredGames.filter(g => g.game_type === 'Rung')
    rungGames.forEach(game => {
      if (game.team1 && game.team2) {
        const team1Key = game.team1.slice().sort().join(' + ')
        const team2Key = game.team2.slice().sort().join(' + ')
        
        if (!teamStats[team1Key]) teamStats[team1Key] = { gamesPlayed: 0, wins: 0, losses: 0 }
        if (!teamStats[team2Key]) teamStats[team2Key] = { gamesPlayed: 0, wins: 0, losses: 0 }
        
        teamStats[team1Key].gamesPlayed++
        teamStats[team2Key].gamesPlayed++
        
        if (game.winning_team === 1) {
          teamStats[team1Key].wins++
          teamStats[team2Key].losses++
        } else {
          teamStats[team2Key].wins++
          teamStats[team1Key].losses++
        }
      }
    })

    return Object.entries(teamStats)
      .map(([team, stats]: [string, any]) => ({
        team,
        ...stats,
        winRate: stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(0) : '0'
      }))
      .filter(t => t.gamesPlayed >= MIN_GAMES_FOR_RANKING)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
  }

  const getRungPlayerStats = () => {
    const stats: any = {}
    const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS
    
    activePlayers.forEach(p => {
      stats[p] = { gamesPlayed: 0, wins: 0, losses: 0 }
    })

    const rungGames = filteredGames.filter(g => g.game_type === 'Rung')
    rungGames.forEach(game => {
      if (game.team1 && game.team2) {
        const winningTeam = game.winning_team === 1 ? game.team1 : game.team2
        const losingTeam = game.winning_team === 1 ? game.team2 : game.team1
        
        winningTeam.forEach(p => {
          if (stats[p]) {
            stats[p].gamesPlayed++
            stats[p].wins++
          }
        })
        
        losingTeam.forEach(p => {
          if (stats[p]) {
            stats[p].gamesPlayed++
            stats[p].losses++
          }
        })
      }
    })

    return activePlayers
      .map(p => ({
        player: p,
        ...stats[p],
        winRate: stats[p].gamesPlayed > 0 ? ((stats[p].wins / stats[p].gamesPlayed) * 100).toFixed(0) : '0'
      }))
      .filter(p => p.gamesPlayed >= MIN_GAMES_FOR_RANKING)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
  }

  const getMedal = (sortedList: any[], currentIndex: number, getWinRate: (item: any) => string) => {
    const currentWinRate = getWinRate(sortedList[currentIndex])
    
    let position = 1
    for (let i = 0; i < currentIndex; i++) {
      if (getWinRate(sortedList[i]) !== currentWinRate) {
        position = i + 2
      }
    }
    
    if (currentIndex > 0 && getWinRate(sortedList[currentIndex - 1]) === currentWinRate) {
      position = getMedalPosition(sortedList, currentIndex - 1, getWinRate)
    }
    
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    
    const thirdPlaceWinRate = sortedList.find((_, idx) => getMedalPosition(sortedList, idx, getWinRate) === 3)
    if (thirdPlaceWinRate && getWinRate(sortedList[currentIndex]) === getWinRate(thirdPlaceWinRate)) {
      return '🥉'
    }
    
    return `${currentIndex + 1}`
  }

  const getMedalPosition = (sortedList: any[], currentIndex: number, getWinRate: (item: any) => string): number => {
    const currentWinRate = getWinRate(sortedList[currentIndex])
    let position = 1
    for (let i = 0; i < currentIndex; i++) {
      if (getWinRate(sortedList[i]) !== currentWinRate) {
        position = i + 2
      }
    }
    if (currentIndex > 0 && getWinRate(sortedList[currentIndex - 1]) === currentWinRate) {
      return getMedalPosition(sortedList, currentIndex - 1, getWinRate)
    }
    return position
  }

  const getPlayerBadgeColor = (game: Game, player: string) => {
    if (game.winners?.includes(player)) return 'bg-green-600'
    if (game.runners_up?.includes(player)) return 'bg-blue-600'
    if (game.losers?.includes(player)) return 'bg-red-600'
    return 'bg-slate-600'
  }

  const sortPlayersInGame = (game: Game) => {
    if (!game.players_in_game) return []
    
    return game.players_in_game.slice().sort((a, b) => {
      const aIsWinner = game.winners?.includes(a)
      const bIsWinner = game.winners?.includes(b)
      const aIsRunner = game.runners_up?.includes(a)
      const bIsRunner = game.runners_up?.includes(b)
      const aIsSurvived = !aIsWinner && !aIsRunner && !game.losers?.includes(a)
      const bIsSurvived = !bIsWinner && !bIsRunner && !game.losers?.includes(b)
      const aIsLoser = game.losers?.includes(a)
      const bIsLoser = game.losers?.includes(b)
      
      if (aIsWinner && !bIsWinner) return -1
      if (!aIsWinner && bIsWinner) return 1
      if (aIsRunner && !bIsRunner) return -1
      if (!aIsRunner && bIsRunner) return 1
      if (aIsSurvived && !bIsSurvived) return -1
      if (!aIsSurvived && bIsSurvived) return 1
      if (aIsLoser && !bIsLoser) return 1
      if (!aIsLoser && bIsLoser) return -1
      
      return 0
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading...</div>
      </div>
    )
  }

  const playerStats = getPlayerStats()
  const rungTeamStats = getRungTeamStats()
  const rungPlayerStats = getRungPlayerStats()
  const recentGames = activeTab === 'individual' 
    ? filteredGames.filter(g => g.game_type !== 'Rung').slice(0, 20)
    : filteredGames.filter(g => g.game_type === 'Rung').slice(0, 20)
  
  const worstShitheadPlayer = getWorstShitheadPlayer()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 font-mono">
      <div className="max-w-5xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 whitespace-nowrap">🏆 Ultimate Card Championship Leaderboard 🏆</h1>
          <p className="text-slate-300 text-lg italic">"May the odds be ever in your favour"</p>
          
          {perfectGame && (
            <div className="mt-4 inline-block bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-2 rounded-full">
              <span className="text-xl font-bold">
                ⚡ {perfectGame.winners?.[0]} dominated {perfectGame.game_type} on {new Date(perfectGame.game_date).toLocaleDateString()} - Perfect sweep! ⚡
              </span>
            </div>
          )}

          {shitheadLosingStreak && shitheadLosingStreak.streak >= 3 && (
            <div className="mt-4 inline-block bg-gradient-to-r from-amber-800 to-orange-900 px-6 py-2 rounded-full">
              <span className="text-xl font-bold">
                💩 {shitheadLosingStreak.player} is on a {shitheadLosingStreak.streak} game Shithead LOSING streak! 💩
              </span>
            </div>
          )}
        </div>

        {/* Sleeker Side by Side Layout */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Filter Section - Compact */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Filter by Players</h3>
              <div className="flex gap-2">
            {showFilter && (
              <div className="grid grid-cols-6 gap-2">
                {PLAYERS.map(player => (
                  <button
                    key={player}
                    onClick={() => togglePlayerFilter(player)}
                    className={`px-4 py-2 rounded transition ${
                      selectedPlayers.includes(player)
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div>{player}</div>
                    {selectedPlayers.includes(player) && <div className="text-xs mt-1">✓</div>}
                  </button>
                ))}
              </div>
            )}
                {selectedPlayers.length > 0 && (
                  <button
                    onClick={clearFilter}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    Clear ({selectedPlayers.length})
                  </button>
                )}
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                >
                  {showFilter ? 'Hide Filter' : 'Show Filter'}
                </button>
              </div>
            </div>
            
           {showFilter && (
              <div className="grid grid-cols-6 gap-2">
                {PLAYERS.map(player => (
                  <button
                    key={player}
                    onClick={() => togglePlayerFilter(player)}
                    className={`px-4 py-2 rounded transition ${
                      selectedPlayers.includes(player)
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="text-sm">{player}</div>
                    {selectedPlayers.includes(player) && <div className="text-xs mt-1">✓</div>}
                  </button>
                ))}
              </div>
            )}
                    className={`px-4 py-2 rounded transition ${
                      selectedPlayers.includes(player)
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {selectedPlayers.includes(player) && '✓ '}
                    {player}
                  </button>
                ))}
              </div>
            )}
            
            {selectedPlayers.length > 0 && !showFilter && (
              <div className="text-sm text-slate-400">
                {selectedPlayers.join(', ')} • {filteredGames.length} games
              </div>
            )}
          </div>

          {/* Tab Buttons - Compact Grid */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('rung-teams')}
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
                  activeTab === 'rung-teams'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Rung - Teams
              </button>
              <button
                onClick={() => setActiveTab('rung-players')}
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
                  activeTab === 'rung-players'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Rung - Individual
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm col-span-2 ${
                  activeTab === 'individual'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Individual Games
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'individual' && (
          <>
            {hallView !== 'none' ? (
              <>
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => setHallView('none')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    ← Back to Overall Leaderboard
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {INDIVIDUAL_GAMES.map(gameType => {
                    const gameStats = getPlayerStatsForGame(gameType)
                    const displayStats = hallView === 'fame' 
                      ? gameStats.slice(0, 3) 
                      : gameStats.slice(-3).reverse()
                    
                    return (
                      <div key={gameType} className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
                        <div className={`p-4 border-b border-slate-700 ${hallView === 'fame' ? 'bg-[#0A6B5A]' : 'bg-[#8B2E1F]'}`}>
                          <h3 className="text-xl font-bold">{GAME_EMOJIS[gameType]} {gameType}</h3>
                          <p className="text-slate-200 text-xs mt-1">
                            {hallView === 'fame' ? 'Top 3 Players' : 'Bottom 3 Players'}
                          </p>
                        </div>
                        <div className="p-4">
                          {displayStats.length === 0 ? (
                            <div className="text-center text-slate-400 py-4">No games played</div>
                          ) : (
                            <div className="space-y-2">
                              {displayStats.map((player, idx) => {
                                const actualIdx = hallView === 'fame' ? idx : gameStats.length - 3 + idx
                                return (
                                  <div key={player.player} className="flex items-center justify-between bg-slate-700 p-3 rounded">
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">
                                        {hallView === 'fame' ? getMedal(gameStats, actualIdx, (p) => p.winRate) : `${gameStats.length - idx}`}
                                      </span>
                                      <span className="font-bold">
                                        {player.player}
                                        {worstShitheadPlayer === player.player && gameType === 'Shithead' && ' 💩'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-yellow-400 font-bold text-lg">{player.winRate}%</div>
                                      <div className="text-xs text-slate-400">{player.gamesPlayed} games</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8">
                <div className="p-6 border-b border-slate-700">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div>
                      <h2 className="text-2xl font-bold mb-3">The Friendship Ruiner League</h2>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setHallView('fame')}
                          className="px-4 py-2 bg-[#0E8C73] hover:bg-[#0B7563] rounded text-sm font-bold"
                        >
                          ⭐ Hall of Fame
                        </button>
                        <button
                          onClick={() => setHallView('shame')}
                          className="px-4 py-2 bg-[#C0392B] hover:bg-[#A93226] rounded text-sm font-bold"
                        >
                          🤡 Hall of Shame
                        </button>
                      </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="text-right">
                      <p className="text-slate-400 text-sm mb-1">🃏 Blackjack • 🎲 Monopoly • 🀄 Tai Ti • 💩 Shithead</p>
                      <p className="text-slate-400 text-xs mb-3">Wins: 100% • 2nd: 40% • Survival: 10%</p>
                      <select
                        value={selectedGameType}
                        onChange={(e) => setSelectedGameType(e.target.value)}
                        className="px-3 py-2 bg-slate-700 rounded text-sm"
                      >
                        <option value="All Games">🌍 All Games</option>
                        {INDIVIDUAL_GAMES.map(game => (
                          <option key={game} value={game}>{GAME_EMOJIS[game]} {game}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="text-center p-4 w-20">Rank</th>
                        <th className="text-left p-4">Player</th>
                        <th className="text-center p-4">Games</th>
                        <th className="text-center p-4">Wins</th>
                        <th className="text-center p-4">2nd</th>
                        <th className="text-center p-4">Survived</th>
                        <th className="text-center p-4">Losses</th>
                        <th className="text-center p-4">💩</th>
                        <th className="text-center p-4">Win Rate</th>
                        <th className="text-center p-4">🔥 Best</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerStats.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center p-8 text-slate-400">
                            No games played yet.
                          </td>
                        </tr>
                      ) : (
                        playerStats.map((player, idx) => (
                          <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                            <td className="p-4 text-center text-2xl">{getMedal(playerStats, idx, (p) => p.winRate)}</td>
                            <td className="p-4 font-bold text-xl">
                              {player.player}
                              {worstShitheadPlayer === player.player && ' 💩'}
                            </td>
                            <td className="text-center p-4">{player.gamesPlayed}</td>
                            <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                            <td className="text-center p-4 text-blue-400 font-bold">{player.runnerUps}</td>
                            <td className="text-center p-4 text-slate-400 font-bold">{player.survivals}</td>
                            <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
                            <td className="text-center p-4 text-orange-400 font-bold">{player.shitheadLosses}</td>
                            <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                            <td className="text-center p-4">
                              {player.bestStreak > 0 ? (
                                <span className="text-orange-400 font-bold">{player.bestStreak}W</span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {hallView === 'none' && (
              <div className="bg-slate-800 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-2xl font-bold">📜 Recent Games</h2>
                  <div className="text-sm">
                    <span className="inline-block bg-green-600 text-white px-2 py-0.5 rounded mr-2">Winner</span>
                    <span className="inline-block bg-blue-600 text-white px-2 py-0.5 rounded mr-2">2nd</span>
                    <span className="inline-block bg-slate-600 text-white px-2 py-0.5 rounded mr-2">Survived</span>
                    <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded">Loser</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentGames.length === 0 ? (
                    <div className="col-span-2 text-center p-8 text-slate-400">
                      No games found with selected filter
                    </div>
                  ) : (
                    recentGames.map(game => (
                      <div key={game.id} className="bg-slate-700/50 rounded p-3">
                        <div className="text-slate-300 text-base font-bold mb-2">
                          {GAME_EMOJIS[game.game_type]} {game.game_type} • {new Date(game.game_date).toLocaleDateString()} {game.created_at && `• ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {sortPlayersInGame(game).map(player => (
                            <span key={player} className={`${getPlayerBadgeColor(game, player)} text-white px-3 py-1 rounded text-sm font-semibold`}>
                              {player}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'rung-teams' && (
          <>
            <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-2xl font-bold">Best Rung Team Combinations</h2>
                <p className="text-slate-400 text-sm mt-1">Which duos dominate together?</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900">
                      <th className="text-center p-4 w-20">Rank</th>
                      <th className="text-left p-4">Team</th>
                      <th className="text-center p-4">Games</th>
                      <th className="text-center p-4">Wins</th>
                      <th className="text-center p-4">Losses</th>
                      <th className="text-center p-4">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rungTeamStats.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-400">
                          No teams have played yet.
                        </td>
                      </tr>
                    ) : (
                      rungTeamStats.map((team, idx) => (
                        <tr key={team.team} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                          <td className="p-4 text-center text-2xl">{getMedal(rungTeamStats, idx, (t) => t.winRate)}</td>
                          <td className="p-4 font-bold text-xl">{team.team}</td>
                          <td className="text-center p-4">{team.gamesPlayed}</td>
                          <td className="text-center p-4 text-green-400 font-bold">{team.wins}</td>
                          <td className="text-center p-4 text-red-400 font-bold">{team.losses}</td>
                          <td className="text-center p-4 text-yellow-400 font-bold text-xl">{team.winRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 mb-8">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold">📜 Recent Games</h2>
                <div className="text-sm">
                  <span className="inline-block bg-green-600 text-white px-2 py-0.5 rounded mr-2">Winner</span>
                  <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded">Loser</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentGames.length === 0 ? (
                  <div className="col-span-2 text-center p-8 text-slate-400">
                    No games found with selected filter
                  </div>
                ) : (
                  recentGames.map(game => (
                    <div key={game.id} className="bg-slate-700/50 rounded p-3">
                      <div className="text-slate-300 text-base font-bold mb-2">
                        {GAME_EMOJIS[game.game_type]} {game.game_type} • {new Date(game.game_date).toLocaleDateString()} {game.created_at && `• ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {game.team1?.map(player => (
                          <span key={player} className={`${game.winning_team === 1 ? 'bg-green-600' : 'bg-red-600'} text-white px-3 py-1 rounded text-sm font-semibold`}>
                            {player}
                          </span>
                        ))}
                        <span className="text-slate-400 px-2">vs</span>
                        {game.team2?.map(player => (
                          <span key={player} className={`${game.winning_team === 2 ? 'bg-green-600' : 'bg-red-600'} text-white px-3 py-1 rounded text-sm font-semibold`}>
                            {player}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'rung-players' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold">Rung Individual Rankings</h2>
              <p className="text-slate-400 text-sm mt-1">Performance regardless of teammate</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900">
                    <th className="text-center p-4 w-20">Rank</th>
                    <th className="text-left p-4">Player</th>
                    <th className="text-center p-4">Games</th>
                    <th className="text-center p-4">Wins</th>
                    <th className="text-center p-4">Losses</th>
                    <th className="text-center p-4">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rungPlayerStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-400">
                        No Rung games played yet.
                      </td>
                    </tr>
                  ) : (
                    rungPlayerStats.map((player, idx) => (
                      <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                        <td className="p-4 text-center text-2xl">{getMedal(rungPlayerStats, idx, (p) => p.winRate)}</td>
                        <td className="p-4 font-bold text-xl">
                          {player.player}
                          {worstShitheadPlayer === player.player && ' 💩'}
                        </td>
                        <td className="text-center p-4">{player.gamesPlayed}</td>
                        <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                        <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
                        <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <a href="/admin/login" className="text-slate-400 hover:text-slate-200 text-sm">Admin Login</a>
        </div>
      </div>
    </div>
  )
}
