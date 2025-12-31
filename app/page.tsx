'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
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
        winRate: stats[p].gamesPlayed > 0 ? ((stats[p].wins / stats[p].gamesPlayed) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins)
  }

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `${idx + 1}.`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  const playerStats = getPlayerStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3">🏆 Live Leaderboard</h1>
          <p className="text-slate-300 text-lg">Individual Games Rankings</p>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold">Current Rankings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="text-left p-4">Rank</th>
                  <th className="text-left p-4">Player</th>
                  <th className="text-center p-4">Games</th>
                  <th className="text-center p-4">Wins</th>
                  <th className="text-center p-4">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((player, idx) => (
                  <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : ''}`}>
                    <td className="p-4 text-3xl">{getMedal(idx)}</td>
                    <td className="p-4 font-bold text-xl">{player.player}</td>
                    <td className="text-center p-4">{player.gamesPlayed}</td>
                    <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                    <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
