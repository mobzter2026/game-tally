'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'individual' | 'rung-teams' | 'rung-players'>('individual')
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

    if (data) setGames(data)
    setLoading(false)
  }

  const getPlayerStats = () => {
    const stats: any = {}
    PLAYERS.forEach(p => {
      stats[p] = { gamesPlayed: 0, wins: 0, runnerUps: 0, losses: 0, weightedWins: 0 }
    })

    const individualGames = games.filter(g => g.game_type !== 'Rung')
    individualGames.forEach(game => {
      // Count games played for all players in the game
      if (game.players_in_game) {
        game.players_in_game.forEach(p => { 
          if (stats[p]) stats[p].gamesPlayed++ 
        })
      }
      
      // Count their specific results
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
        // Create team combo strings (sorted to treat [A,B] same as [B,A])
        const team1Key = [...game.team1].sort().join(' + ')
        const team2Key = [...game.team2].sort().join(' + ')
        
        // Initialize stats if needed
        if (!teamStats[team1Key]) teamStats[team1Key] = { gamesPlayed: 0, wins: 0, losses: 0 }
        if (!teamStats[team2Key]) teamStats[team2Key] = { gamesPlayed: 0, wins: 0, losses: 0 }
        
        // Count games
        teamStats[team1Key].gamesPlayed++
        teamStats[team2Key].gamesPlayed++
        
        // Count wins and losses
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
        
        // Count games and wins for all players
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

  const getStreaks = () => {
    const streaks: Record<string, { current: number; best: number; type: string }> = {}
    PLAYERS.forEach(p => {
      streaks[p] = { current: 0, best: 0, type: '' }
    })

    const individualGames = [...games].filter(g => g.game_type !== 'Rung').reverse()
    
    individualGames.forEach(game => {
      PLAYERS.forEach(player => {
        if (game.winners?.includes(player)) {
          if (streaks[player].type === 'win') {
            streaks[player].current++
          } else {
            streaks[player].current = 1
            streaks[player].type = 'win'
          }
          if (streaks[player].current > streaks[player].best) {
            streaks[player].best = streaks[player].current
          }
        } else if (game.players_in_game?.includes(player)) {
          if (streaks[player].type === 'win') {
            streaks[player].current = 0
            streaks[player].type = ''
          }
        }
      })
    })

    return streaks
  }

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `${idx + 1}`
  }

  const getPlayerBadgeColor = (game: Game, player: string) => {
    if (game.winners?.includes(player)) return 'bg-green-600'
    if (game.runners_up?.includes(player)) return 'bg-blue-600'
    if (game.losers?.includes(player)) return 'bg-red-600'
    return 'bg-slate-600'
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
  const streaks = getStreaks()

  // Get top streak
  const topStreakEntry = Object.entries(streaks)
    .filter(([_, s]) => s.current > 0)
    .sort((a, b) => b[1].current - a[1].current)[0]
  
  const topStreak = topStreakEntry ? { player: topStreakEntry[0], streak: topStreakEntry[1].current } : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 font-mono">
      <div className="max-w-5xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 whitespace-nowrap">🏆 Ultimate Card Championship Leaderboard 🏆</h1>
          <p className="text-slate-300 text-lg italic">"May the odds be ever in your favour"</p>
          
          {/* Hot Streak Banner */}
          {topStreak && topStreak.streak >= 2 && (
            <div className="mt-4 inline-block bg-gradient-to-r from-orange-600 to-red-600 px-6 py-2 rounded-full animate-pulse">
              <span className="text-xl font-bold">🔥 {topStreak.player} is on a {topStreak.streak} game win streak! 🔥</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
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

        {/* Individual Games Leaderboard */}
        {activeTab === 'individual' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold">Individual Games Rankings</h2>
              <p className="text-slate-400 text-sm mt-1">Blackjack, Monopoly, Tai Ti, Shithead • Runner-ups earn 25% credit</p>
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
                    <th className="text-center p-4">🔥 Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((player, idx) => (
                    <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                      <td className="p-4 text-center text-2xl">{getMedal(idx)}</td>
                      <td className="p-4 font-bold text-xl">{player.player}</td>
                      <td className="text-center p-4">{player.gamesPlayed}</td>
                      <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                      <td className="text-center p-4 text-blue-400 font-bold">{player.runnerUps}</td>
                      <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
                      <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                      <td className="text-center p-4">
                        {streaks[player.player].current > 0 ? (
                          <span className="text-orange-400 font-bold">{streaks[player.player].current}W</span>
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

        {/* Rung Team Combos Leaderboard */}
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
                      <td className="p-4 text-center text-2xl">{getMedal(idx)}</td>
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

        {/* Rung Individual Players Leaderboard */}
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
                      <td className="p-4 text-center text-2xl">{getMedal(idx)}</td>
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

        {/* Recent Games - 3 Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Winners Column */}
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold mb-3 text-green-400 flex items-center gap-2">
              🏆 Recent Winners
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {games.filter(g => g.game_type !== 'Rung').slice(0, 10).map(game => (
                <div key={game.id} className="bg-slate-700/50 rounded p-2 text-sm">
                  <div className="font-semibold text-green-300">{game.winners?.join(', ')}</div>
                  <div className="text-slate-400 text-xs mb-1">{game.game_type} • {new Date(game.game_date).toLocaleDateString()}</div>
                  <div className="flex gap-1 flex-wrap">
                    {game.players_in_game?.map(player => (
                      <span key={player} className={`${getPlayerBadgeColor(game, player)} text-white px-2 py-0.5 rounded text-xs`}>
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Runners-Up Column */}
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold mb-3 text-blue-400 flex items-center gap-2">
              🥈 Recent Runners-Up
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {games.filter(g => g.game_type !== 'Rung' && g.runners_up && g.runners_up.length > 0).slice(0, 10).map(game => (
                <div key={game.id} className="bg-slate-700/50 rounded p-2 text-sm">
                  <div className="font-semibold text-blue-300">{game.runners_up?.join(', ')}</div>
                  <div className="text-slate-400 text-xs mb-1">{game.game_type} • {new Date(game.game_date).toLocaleDateString()}</div>
                  <div className="flex gap-1 flex-wrap">
                    {game.players_in_game?.map(player => (
                      <span key={player} className={`${getPlayerBadgeColor(game, player)} text-white px-2 py-0.5 rounded text-xs`}>
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Losers Column */}
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold mb-3 text-red-400 flex items-center gap-2">
              💀 Recent Losers
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {games.filter(g => g.game_type !== 'Rung').slice(0, 10).map(game => (
                <div key={game.id} className="bg-slate-700/50 rounded p-2 text-sm">
                  <div className="font-semibold text-red-300">{game.losers?.join(', ')}</div>
                  <div className="text-slate-400 text-xs mb-1">{game.game_type} • {new Date(game.game_date).toLocaleDateString()}</div>
                  <div className="flex gap-1 flex-wrap">
                    {game.players_in_game?.map(player => (
                      <span key={player} className={`${getPlayerBadgeColor(game, player)} text-white px-2 py-0.5 rounded text-xs`}>
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <a href="/admin/login" className="text-slate-400 hover:text-slate-200 text-sm">Admin Login</a>
        </div>
      </div>
    </div>
  )
}
