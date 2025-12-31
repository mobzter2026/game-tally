'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎴'
}

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'individual' | 'rung-teams' | 'rung-players'>('individual')
  const [perfectGame, setPerfectGame] = useState<Game | null>(null)
  const [shitheadLosingStreak, setShitheadLosingStreak] = useState<{player: string, streak: number} | null>(null)
  const [lastShitheadLoser, setLastShitheadLoser] = useState<string | null>(null)
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
      
      // Check for perfect game
      const latestIndividualGame = gamesData.filter(g => g.game_type !== 'Rung')[0]
      if (latestIndividualGame && latestIndividualGame.winners && latestIndividualGame.winners.length === 1) {
        const hasRunnerUps = latestIndividualGame.runners_up && latestIndividualGame.runners_up.length > 0
        if (!hasRunnerUps && latestIndividualGame.losers && latestIndividualGame.losers.length >= 2) {
          setPerfectGame(latestIndividualGame)
        } else {
          setPerfectGame(null)
        }
      }

      // Check for last Shithead loser
      const shitheadGames = gamesData.filter(g => g.game_type === 'Shithead')
      if (shitheadGames.length > 0 && shitheadGames[0].losers && shitheadGames[0].losers.length > 0) {
        setLastShitheadLoser(shitheadGames[0].losers[0])
      }

      // Check for Shithead losing streak (3+ losses in a row)
      const reversedShitheadGames = shitheadGames.slice().reverse()
      PLAYERS.forEach(player => {
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
        }
      })
    }
    setLoading(false)
  }

  const getPlayerStats = () => {
    const stats: any = {}
    PLAYERS.forEach(p => {
      stats[p] = { gamesPlayed: 0, wins: 0, runnerUps: 0, losses: 0, weightedWins: 0, bestStreak: 0 }
    })

    const individualGames = games.filter(g => g.game_type !== 'Rung')
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
          stats[r].weightedWins += 0.25
        }
      })
      if (game.losers) game.losers.forEach(l => { 
        if (stats[l]) stats[l].losses++ 
      })
    })

    PLAYERS.forEach(player => {
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

    return PLAYERS
      .map(p => ({
        player: p,
        ...stats[p],
        winRate: stats[p].gamesPlayed > 0 ? ((stats[p].weightedWins / stats[p].gamesPlayed) * 100).toFixed(0) : '0'
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.weightedWins - a.weightedWins)
  }

  const getRungTeamStats = () => {
    const teamStats: any = {}
    
    const rungGames = games.filter(g => g.game_type === 'Rung')
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
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
  }

  const getRungPlayerStats = () => {
    const stats: any = {}
    PLAYERS.forEach(p => {
      stats[p] = { gamesPlayed: 0, wins: 0, losses: 0 }
    })

    const rungGames = games.filter(g => g.game_type === 'Rung')
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

    return PLAYERS
      .map(p => ({
        player: p,
        ...stats[p],
        winRate: stats[p].gamesPlayed > 0 ? ((stats[p].wins / stats[p].gamesPlayed) * 100).toFixed(0) : '0'
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
  }

  const getMedal = (idx: number, playerName: string) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    // Show poop emoji for last Shithead loser
    if (lastShitheadLoser === playerName) return '💩'
    return `${idx + 1}`
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
    ? games.filter(g => g.game_type !== 'Rung').slice(0, 20)
    : games.filter(g => g.game_type === 'Rung').slice(0, 20)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 font-mono">
      <div className="max-w-5xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 whitespace-nowrap">🏆 Ultimate Card Championship Leaderboard 🏆</h1>
          <p className="text-slate-300 text-lg italic">"May the odds be ever in your favour"</p>
          
          {/* Perfect Game Banner */}
          {perfectGame && (
            <div className="mt-4 inline-block bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-2 rounded-full">
              <span className="text-xl font-bold">
                ⚡ {perfectGame.winners?.[0]} dominated {perfectGame.game_type} on {new Date(perfectGame.game_date).toLocaleDateString()} - Perfect sweep! ⚡
              </span>
            </div>
          )}

          {/* Shithead Losing Streak Banner */}
          {shitheadLosingStreak && shitheadLosingStreak.streak >= 3 && (
            <div className="mt-4 inline-block bg-gradient-to-r from-brown-700 to-orange-900 px-6 py-2 rounded-full">
              <span className="text-xl font-bold">
                💩 {shitheadLosingStreak.player} is on a {shitheadLosingStreak.streak} game Shithead LOSING streak! 💩
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'individual'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Individual Games
          </button>
          <button
            onClick={() => setActiveTab('rung-teams')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'rung-teams'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Rung - Team Combos
          </button>
          <button
            onClick={() => setActiveTab('rung-players')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'rung-players'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Rung - Individual
          </button>
        </div>

        {activeTab === 'individual' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold mb-2">The Friendship Ruiner League</h2>
              <p className="text-slate-400 text-sm">🃏 Blackjack • 🎲 Monopoly • 🀄 Tai Ti • 💩 Shithead</p>
              <p className="text-slate-400 text-xs mt-1">Runner-ups earn 25%</p>
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
                    <th className="text-center p-4">Losses</th>
                    <th className="text-center p-4">Win Rate</th>
                    <th className="text-center p-4">🔥 Best</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((player, idx) => (
                    <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                      <td className="p-4 text-center text-2xl">{getMedal(idx, player.player)}</td>
                      <td className="p-4 font-bold text-xl">{player.player}</td>
                      <td className="text-center p-4">{player.gamesPlayed}</td>
                      <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                      <td className="text-center p-4 text-blue-400 font-bold">{player.runnerUps}</td>
                      <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
                      <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                      <td className="text-center p-4">
                        {player.bestStreak > 0 ? (
                          <span className="text-orange-400 font-bold">{player.bestStreak}W</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rung-teams' && (
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
                  {rungTeamStats.map((team, idx) => (
                    <tr key={team.team} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                      <td className="p-4 text-center text-2xl">{getMedal(idx, '')}</td>
                      <td className="p-4 font-bold text-xl">{team.team}</td>
                      <td className="text-center p-4">{team.gamesPlayed}</td>
                      <td className="text-center p-4 text-green-400 font-bold">{team.wins}</td>
                      <td className="text-center p-4 text-red-400 font-bold">{team.losses}</td>
                      <td className="text-center p-4 text-yellow-400 font-bold text-xl">{team.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                  {rungPlayerStats.map((player, idx) => (
                    <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                      <td className="p-4 text-center text-2xl">{getMedal(idx, '')}</td>
                      <td className="p-4 font-bold text-xl">{player.player}</td>
                      <td className="text-center p-4">{player.gamesPlayed}</td>
                      <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                      <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
                      <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
            {recentGames.map(game => (
              <div key={game.id} className="bg-slate-700/50 rounded p-3">
                <div className="text-slate-300 text-base font-bold mb-2">
                  {GAME_EMOJIS[game.game_type]} {game.game_type} • {new Date(game.game_date).toLocaleDateString()} {game.created_at && `• ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {game.game_type === 'Rung' ? (
                    <>
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
                    </>
                  ) : (
                    sortPlayersInGame(game).map(player => (
                      <span key={player} className={`${getPlayerBadgeColor(game, player)} text-white px-3 py-1 rounded text-sm font-semibold`}>
                        {player}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <a href="/admin/login" className="text-slate-400 hover:text-slate-200 text-sm">Admin Login</a>
        </div>
      </div>
    </div>
  )
}
