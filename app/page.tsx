'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const QUOTES = [
  "Friendship ends where the game begins.",
  "It's not about winning, it's about making others lose.",
  "Every card tells a story of betrayal.",
  "Where loyalty dies and legends are born.",
  "Every loss is just character building… and humiliation.",
  "If at first you don't succeed… shuffle and try again.",
  "Victory is earned. Humiliation is free.",
  "Some are born winners. Others are just funny losers.",
  "The table is a battlefield. Your ego is the weapon.",
  "You can't control luck… but you can ruin everyone else's day.",
  "Pain is temporary. Bragging rights are forever.",
  "Hope your therapy sessions are ready.",
  "One table. Many casualties.",
  "Lose today. Regret tomorrow. Cry later.",
  "Your dignity called… it's filing a complaint.",
  "Lose today. Learn tomorrow. Dominate next time.",
  "Winners rise. Everyone else takes notes… or cry.",
  "Step up or step aside."
]

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎭'
}

interface PlayerStats {
  player: string
  gamesPlayed: number
  wins: number
  runnersUp: number
  survivals: number
  losses: number
  winRate: string
}

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [showFloatingFilter, setShowFloatingFilter] = useState(false)
  const [currentQuote, setCurrentQuote] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % QUOTES.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

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
      // Filter out incomplete games (games without winners/losers data)
      const completeGames = (data as Game[]).filter(game => {
        // Keep games that have at least winners OR losers
        return (game.winners && game.winners.length > 0) || 
               (game.losers && game.losers.length > 0)
      })
      setGames(completeGames)
    }
    setLoading(false)
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
        const gamePlayers = game.players_in_game || []
        return gamePlayers.length === selectedPlayers.length &&
               selectedPlayers.every(p => gamePlayers.includes(p))
      })
    }

    return filtered
  }

  const filteredGames = getFilteredGames()

  const getPlayerStats = (): PlayerStats[] => {
    const stats: Record<string, any> = {}
    const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS

    activePlayers.forEach(p => {
      stats[p] = { 
        gamesPlayed: 0, 
        wins: 0, 
        runnersUp: 0, 
        survivals: 0, 
        losses: 0
      }
    })

    filteredGames.forEach(game => {
      if (game.players_in_game) {
        game.players_in_game.forEach(p => {
          if (stats[p]) stats[p].gamesPlayed++
        })
      }

      if (game.winners) game.winners.forEach(w => {
        if (stats[w]) stats[w].wins++
      })

      if (game.runners_up) game.runners_up.forEach(r => {
        if (stats[r]) stats[r].runnersUp++
      })

      if (game.survivors) game.survivors.forEach(s => {
        if (stats[s]) stats[s].survivals++
      })

      if (game.losers) game.losers.forEach(l => {
        if (stats[l]) stats[l].losses++
      })
    })

    return activePlayers
      .map(p => ({
        player: p,
        ...stats[p],
        winRate: stats[p].gamesPlayed > 0 
          ? ((stats[p].wins / stats[p].gamesPlayed) * 100).toFixed(0) 
          : '0'
      }))
      .filter(p => p.gamesPlayed > 0)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
  }

  const playerStats = getPlayerStats()
  const recentGames = filteredGames.slice(0, 20)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-2 sm:p-4 font-mono overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto mt-4 px-2">
        <div className="text-center mb-8">
          <h1 className="w-full max-w-full text-center select-none text-[1.15rem] sm:text-[1.5rem] font-semibold tracking-[0.12em] sm:tracking-[0.16em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] mb-3 leading-tight">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              ULTIMATE CARD CHAMPIONSHIP
            </span>
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              LEADERBOARD 🏆
            </span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base italic transition-opacity duration-500 whitespace-nowrap overflow-hidden text-ellipsis px-2">
            "{QUOTES[currentQuote]}"
          </p>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl shadow-2xl overflow-hidden mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
          <div className="p-4 border-b border-slate-700">
            <div className="text-center">
              <h2 className="text-lg sm:text-2xl font-bold mb-1 whitespace-nowrap" style={{fontVariant: 'small-caps'}}>
                <span className="bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase">
                  The Ultimate Backstab Board
                </span> 🔪
              </h2>
              <p className="text-slate-400 text-sm mb-3 italic">Friendship Optional, Betrayal Mandatory</p>
            </div>
          </div>

          <div className="overflow-x-auto backdrop-blur-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]">
                  <th className="text-center p-4 w-20">Rank</th>
                  <th className="text-left p-4">Player</th>
                  <th className="text-center p-2 md:p-4 text-sm md:text-base">Games</th>
                  <th className="text-center p-2 md:p-4 text-sm md:text-base">Wins</th>
                  <th className="text-center p-2 md:p-4 text-sm md:text-base">2nd</th>
                  <th className="text-center p-2 md:p-4 text-sm md:text-base">Survived</th>
                  <th className="text-center p-2 md:p-4 text-sm md:text-base">Losses</th>
                  <th className="text-center p-2 md:p-4 text-sm md:text-base">Win%</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-400">
                      No games played yet.
                    </td>
                  </tr>
                ) : (
                  playerStats.map((player, idx) => (
                    <tr key={player.player} className="border-b border-slate-700/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] hover:bg-purple-800/20 transition-all">
                      <td className="p-2 md:p-4 text-center text-xl md:text-2xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </td>
                      <td className="p-2 md:p-4 font-bold text-lg md:text-xl">{player.player}</td>
                      <td className="text-center p-2 md:p-4 text-sm md:text-base">{player.gamesPlayed}</td>
                      <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
                      <td className="text-center p-4 text-blue-400 font-bold">{player.runnersUp}</td>
                      <td className="text-center p-4 text-slate-400 font-bold">{player.survivals}</td>
                      <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
                      <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Games */}
        <div className="rounded-xl p-6 mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
          <div className="flex flex-col items-center mb-4 gap-2">
            <h2 className="text-xl font-bold mb-1 whitespace-nowrap">
              📜 <span className="bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">RECENT GAMES</span>
            </h2>
            <div className="text-sm">
              <span className="inline-block bg-green-600 text-white px-2 py-0.5 rounded mr-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">Winner</span>
              <span className="inline-block bg-blue-600 text-white px-2 py-0.5 rounded mr-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">2nd</span>
              <span className="inline-block bg-slate-600 text-white px-2 py-0.5 rounded mr-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">Survivors</span>
              <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">Loser</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto justify-items-center">
            {recentGames.length === 0 ? (
              <div className="col-span-2 text-center p-8 text-slate-400">
                No games found
              </div>
            ) : (
              recentGames.map(game => (
                <div 
                  key={game.id} 
                  className="rounded-xl p-6 shadow-[0_0.05px_2px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] bg-gradient-to-b from-purple-950/60 to-purple-900/95 w-full min-h-[120px]"
                >
                  <div className="mb-3">
                    <div className="font-bold text-base text-slate-300 mb-1">
                      {GAME_EMOJIS[game.game_type]} {game.game_type} • {new Date(game.game_date).toLocaleDateString()}
                      {game.created_at && ` • ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {game.winners?.map(p => (
                      <span key={p} className="bg-green-600 text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all">
                        {p}
                      </span>
                    ))}
                    {game.runners_up?.map(p => (
                      <span key={p} className="bg-blue-600 text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all">
                        {p}
                      </span>
                    ))}
                    {game.survivors?.map(p => (
                      <span key={p} className="bg-slate-600 text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all">
                        {p}
                      </span>
                    ))}
                    {game.losers?.map(p => (
                      <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Filter Button */}
        <button
          onClick={() => setShowFloatingFilter(!showFloatingFilter)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-br from-purple-700/90 to-indigo-900/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.4),inset_0_2px_6px_rgba(255,255,255,0.25)] hover:scale-110 transition-all z-50 border border-purple-500/30"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
          </svg>
          {selectedPlayers.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-purple-900">
              {selectedPlayers.length}
            </div>
          )}
        </button>

        {/* Floating Filter Panel */}
        {showFloatingFilter && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFloatingFilter(false)} />
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-slate-900/95 to-black/95 backdrop-blur-md rounded-t-3xl shadow-2xl z-50 p-6 max-h-[50vh] border-t-2 border-purple-700/50" style={{animation: "slideUp 0.3s ease-out"}}>
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
              </div>
              <h3 className="text-lg font-bold text-white mb-4">Filter Players</h3>
              <div className="flex gap-2 mb-3">
                <Button onClick={selectAllPlayers} variant="pop" color="blue" className="px-3 py-1.5 text-sm">Select All</Button>
                {selectedPlayers.length > 0 && (
                  <Button onClick={clearFilter} variant="pop" color="red" className="px-3 py-1.5 text-sm">Clear</Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLAYERS.map(player => (
                  <Button
                    key={player}
                    onClick={() => togglePlayerFilter(player)}
                    variant="frosted"
                    color="purple"
                    selected={selectedPlayers.includes(player)}
                    className="px-4 py-2 text-sm"
                  >
                    {player}
                  </Button>
                ))}
              </div>
            </div>
            <style jsx>{`
              @keyframes slideUp { 
                from { transform: translateY(100%); } 
                to { transform: translateY(0); } 
              }
            `}</style>          
          </>
        )}

        <div className="text-center mt-8 space-x-4">
          <a href="/admin/login" className="text-slate-400 hover:text-slate-200 text-sm">Admin Login</a>
        </div>
      </div>
    </div>
  )
}
