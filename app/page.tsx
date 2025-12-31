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
      stats[p] = { gamesPlayed: 0, wins: 0, runnerUps: 0, losses: 0 }
    })

    const individualGames = games.filter(g => g.game_type !== 'Rung')
    individualGames.forEach(game => {
      // Count games played for all players in the game
      if (game.players_in_game) {
        game.players_in_game.forEach(p => { 
          if (stats[p]) stats[p].gamesPlayed++ 
        })
      }
      
      // Then count their specific results
      if (game.winners) game.winners.forEach(w => { if (stats[w]) stats[w].wins++ })
      if (game.runners_up) game.runners_up.forEach(r => { if (stats[r]) stats[r].runnerUps++ })
      if (game.losers) game.losers.forEach(l => { if (stats[l]) stats[l].losses++ })
    })

    return PLAYERS
      .map(p => ({
        player: p,
        ...stats[p],
        winRate: stats[p].gamesPlayed > 0 ? ((stats[p].wins / stats[p].gamesPlayed) * 100).toFixed(0) : '0'
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
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

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `#${idx + 1}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  const playerStats = getPlayerStats()
  const rungTeamStats = getRungTeamStats()
  const rungPlayerStats = getRungPlayerStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-5xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3">Ultimate Card Championship Leaderboard 🏆</h1>
          <p className="text-slate-300 text-lg italic">"May the odds be ever in your favour"</p>
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
              <p className="text-slate-400 text-sm mt-1">Blackjack, Monopoly, Tai Ti, Shithead</p>
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
                  {playerStats.map((player, idx) => (
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

        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Games ({games.length})</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {games.slice(0, 10).map(game => (
              <div key={game.id} className="bg-slate-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">{game.game_type}</div>
                  <div className="text-sm text-slate-400">{new Date(game.game_date).toLocaleDateString()}</div>
                </div>
                {game.game_type === 'Rung' ? (
                  <div className="text-sm">
                    <span className="text-green-400">Winners: </span>
                    {(game.winning_team === 1 ? game.team1 : game.team2)?.join(' + ')}
                  </div>
                ) : (
                  <div className="text-sm">
                    {game.winners && <div><span className="text-green-400">Winners: </span>{game.winners.join(', ')}</div>}
                  </div>
                )}
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
