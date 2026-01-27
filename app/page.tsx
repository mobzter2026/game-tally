'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Game } from '@/lib/types'

const ROTATING_QUOTES = [
  "Where Legends Rise and Egos Die",
  "Your Win Rate? More Like a Crime Rate",
  "Buckle Up, Buttercup—Reality Hits Hard",
  "Winners Circle or Crying Corner?",
  "May the Odds Be… Actually, Never Mind",
  "The Hall of Fame Is Full—Try the Shame Section"
]

interface PlayerStats {
  name: string
  totalGames: number
  wins: number
  runnersUp: number
  survivors: number
  losses: number
  winRate: number
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [stats, setStats] = useState<PlayerStats[]>([])
  const [subtitle, setSubtitle] = useState(ROTATING_QUOTES[0])

  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % ROTATING_QUOTES.length
      setSubtitle(ROTATING_QUOTES[idx])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchData)
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [])

  async function fetchData() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data) return

    const allGames = data as Game[]
    setGames(allGames.slice(0, 10))

    // Calculate player stats
    const playerMap = new Map<string, PlayerStats>()

    allGames.forEach(game => {
      const allPlayers = game.players_in_game || []
      
      allPlayers.forEach(player => {
        if (!playerMap.has(player)) {
          playerMap.set(player, {
            name: player,
            totalGames: 0,
            wins: 0,
            runnersUp: 0,
            survivors: 0,
            losses: 0,
            winRate: 0
          })
        }

        const stats = playerMap.get(player)!
        stats.totalGames++

        if (game.winners?.includes(player)) stats.wins++
        else if (game.runners_up?.includes(player)) stats.runnersUp++
        else if (game.survivors?.includes(player)) stats.survivors++
        else if (game.losers?.includes(player)) stats.losses++
      })
    })

    const playerStats = Array.from(playerMap.values()).map(p => ({
      ...p,
      winRate: p.totalGames > 0 ? (p.wins / p.totalGames) * 100 : 0
    }))

    playerStats.sort((a, b) => b.winRate - a.winRate)
    setStats(playerStats)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="backdrop-blur-xl bg-black/30 border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-2xl">
            POINTS ROYALE
          </h1>
          <p className="text-center text-purple-300 mt-2 text-sm md:text-base italic">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Leaderboard */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 rounded-2xl border border-purple-500/30 p-6 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
            Leaderboard
          </h2>

          {stats.length === 0 ? (
            <p className="text-center text-purple-300 py-8">No games yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-300 text-sm border-b border-purple-500/30">
                    <th className="text-left p-3">Rank</th>
                    <th className="text-left p-3">Player</th>
                    <th className="text-center p-3">W</th>
                    <th className="text-center p-3">R</th>
                    <th className="text-center p-3">S</th>
                    <th className="text-center p-3">L</th>
                    <th className="text-center p-3">Win%</th>
                    <th className="text-center p-3">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((player, idx) => (
                    <tr key={player.name} className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors">
                      <td className="p-3 text-purple-200 font-semibold">#{idx + 1}</td>
                      <td className="p-3 text-white font-medium">{player.name}</td>
                      <td className="p-3 text-center text-green-400">{player.wins}</td>
                      <td className="p-3 text-center text-blue-400">{player.runnersUp}</td>
                      <td className="p-3 text-center text-gray-400">{player.survivors}</td>
                      <td className="p-3 text-center text-red-400">{player.losses}</td>
                      <td className="p-3 text-center text-purple-300">{player.winRate.toFixed(1)}%</td>
                      <td className="p-3 text-center text-purple-200">{player.totalGames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Games */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-purple-900/40 rounded-2xl border border-purple-500/30 p-6 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
            Recent Showdowns
          </h2>

          {games.length === 0 ? (
            <p className="text-center text-purple-300 py-8">No games yet</p>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <div 
                  key={game.id} 
                  className="backdrop-blur-sm bg-gradient-to-r from-purple-800/30 to-fuchsia-800/30 rounded-xl border border-purple-500/20 p-4 hover:border-purple-400/40 transition-all shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">
                      {game.game_type === 'Blackjack' ? '🃏' :
                       game.game_type === 'Monopoly' ? '🎩' :
                       game.game_type === 'Tai Ti' ? '🎴' :
                       game.game_type === 'Shithead' ? '💩' :
                       game.game_type === 'Rung' ? '🤝' : '🎮'}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{game.game_type}</h3>
                      <p className="text-sm text-purple-300">
                        {new Date(game.created_at).toLocaleDateString()} at{' '}
                        {new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {game.winners && game.winners.length > 0 && (
                      <div>
                        <p className="text-xs text-green-400 font-semibold mb-1">Winners</p>
                        <div className="flex flex-wrap gap-1">
                          {game.winners.map(w => (
                            <span key={w} className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-sm text-green-300">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {game.runners_up && game.runners_up.length > 0 && (
                      <div>
                        <p className="text-xs text-blue-400 font-semibold mb-1">Runners-up</p>
                        <div className="flex flex-wrap gap-1">
                          {game.runners_up.map(r => (
                            <span key={r} className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-sm text-blue-300">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {game.survivors && game.survivors.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-1">Survivors</p>
                        <div className="flex flex-wrap gap-1">
                          {game.survivors.map(s => (
                            <span key={s} className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 rounded text-sm text-gray-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {game.losers && game.losers.length > 0 && (
                      <div>
                        <p className="text-xs text-red-400 font-semibold mb-1">Losers</p>
                        <div className="flex flex-wrap gap-1">
                          {game.losers.map(l => (
                            <span key={l} className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-300">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
