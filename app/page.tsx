'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

// Session utilities
import { buildRungSessions, type RungSession, formatRoundLine } from '@/lib/rungSessions'
import { buildMonopolyTaiTiSessions, type MonopolyTaiTiSession } from '@/lib/monopolyTaiTiSessions'
import { processBlackjackGames, processShitheadGames } from '@/lib/individualGames'

// Helper functions
import {
  PLAYERS,
  calculatePlayerStats,
  detectPerfectGame,
  detectShitheadStreak,
  getLatestWinnerType,
  filterGamesByPlayers,
  filterGamesByType,
  type PlayerStats
} from '@/lib/leaderboardHelpers'

// Components
import LeaderboardBanners from '@/Components/LeaderboardBanners'
import LeaderboardFilters from '@/Components/LeaderboardFilters'
import HallOfFameShame from '@/Components/HallOfFameShame'

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

export default function LeaderboardModular() {
  const supabase = createClient()

  // Core state
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'individual' | 'rung' | 'recent'>('individual')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [currentQuote, setCurrentQuote] = useState(0)

  // Session states
  const [rungSessions, setRungSessions] = useState<RungSession[]>([])
  const [monopolySessions, setMonopolySessions] = useState<MonopolyTaiTiSession[]>([])
  const [taitiSessions, setTaitiSessions] = useState<MonopolyTaiTiSession[]>([])
  const [blackjackGames, setBlackjackGames] = useState<Game[]>([])
  const [shitheadGames, setShitheadGames] = useState<Game[]>([])

  // Achievement states
  const [latestWinner, setLatestWinner] = useState<{ game: Game; type: 'dominated' | 'shithead' | 'normal' } | null>(null)
  const [shitheadStreak, setShitheadStreak] = useState<{ player: string; streak: number } | null>(null)

  // Filter states
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedGameType, setSelectedGameType] = useState<string>('All Games')
  const [showFloatingFilter, setShowFloatingFilter] = useState(false)
  
  // Hall of Fame/Shame state
  const [hallView, setHallView] = useState<'none' | 'fame' | 'shame'>('none')

  /* ---------------------------------------------
     ROTATING QUOTES
  --------------------------------------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % QUOTES.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  /* ---------------------------------------------
     FETCH & BUILD SESSIONS
  --------------------------------------------- */

  useEffect(() => {
    fetchGames()
    const channel = supabase
      .channel('games-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchGames)
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

      // Build sessions using utility functions
      setRungSessions(buildRungSessions(gamesData))
      setMonopolySessions(buildMonopolyTaiTiSessions(gamesData, 'Monopoly'))
      setTaitiSessions(buildMonopolyTaiTiSessions(gamesData, 'Tai Ti'))
      setBlackjackGames(processBlackjackGames(gamesData))
      setShitheadGames(processShitheadGames(gamesData))

      // Detect achievements
      const latestWinnerData = getLatestWinnerType(gamesData)
      setLatestWinner(latestWinnerData)

      const streakData = detectShitheadStreak(gamesData)
      setShitheadStreak(streakData)
    }
    setLoading(false)
  }

  /* ---------------------------------------------
     COMBINE ALL COMPLETED SESSIONS
  --------------------------------------------- */

  const getAllCompletedSessions = () => {
    const completedGames: Array<Game & { sessionKey?: string }> = []

    // Add completed Rung sessions
    rungSessions
      .filter(s => s.isComplete)
      .forEach(session => {
        const lastRound = session.rounds[session.rounds.length - 1]
        const allPlayers = Array.from(new Set(session.rounds.flatMap(r => [...(r.team1 || []), ...(r.team2 || [])])))
        
        completedGames.push({
          ...lastRound,
          id: session.key,
          sessionKey: session.key,
          game_type: 'Rung',
          players_in_game: allPlayers,
          winners: session.tiers.winners,
          runners_up: session.tiers.runners,
          survivors: session.tiers.survivors,
          losers: session.tiers.losers,
          game_date: session.gameDate,
          created_at: session.endAtIso || lastRound.created_at
        })
      })

    // Add completed Monopoly sessions
    monopolySessions
      .filter(s => s.isComplete)
      .forEach(session => {
        const lastRound = session.rounds[session.rounds.length - 1]
        
        completedGames.push({
          ...lastRound,
          id: session.key,
          sessionKey: session.key,
          game_type: 'Monopoly',
          winners: session.tiers.winners,
          runners_up: session.tiers.runners,
          survivors: session.tiers.survivors,
          losers: session.tiers.losers,
          game_date: session.gameDate,
          created_at: session.endAtIso || lastRound.created_at
        })
      })

    // Add completed Tai Ti sessions
    taitiSessions
      .filter(s => s.isComplete)
      .forEach(session => {
        const lastRound = session.rounds[session.rounds.length - 1]
        
        completedGames.push({
          ...lastRound,
          id: session.key,
          sessionKey: session.key,
          game_type: 'Tai Ti',
          winners: session.tiers.winners,
          runners_up: session.tiers.runners,
          survivors: session.tiers.survivors,
          losers: session.tiers.losers,
          game_date: session.gameDate,
          created_at: session.endAtIso || lastRound.created_at
        })
      })

    // Add Blackjack games
    blackjackGames.forEach(game => completedGames.push(game))

    // Add Shithead games
    shitheadGames.forEach(game => completedGames.push(game))

    return completedGames
  }

  /* ---------------------------------------------
     FILTER HANDLERS
  --------------------------------------------- */

  const togglePlayerFilter = (player: string) => {
    if (selectedPlayers.includes(player)) {
      setSelectedPlayers(selectedPlayers.filter(p => p !== player))
    } else {
      setSelectedPlayers([...selectedPlayers, player])
    }
  }

  const selectAllPlayers = () => {
    setSelectedPlayers([...PLAYERS])
  }

  const clearPlayers = () => {
    setSelectedPlayers([])
  }

  const selectGameType = (gameType: string) => {
    setSelectedGameType(gameType)
  }

  /* ---------------------------------------------
     CALCULATE STATS WITH FILTERS
  --------------------------------------------- */

  const getFilteredCompletedGames = () => {
    let filtered = getAllCompletedSessions()

    if (selectedPlayers.length > 0) {
      filtered = filterGamesByPlayers(filtered, selectedPlayers)
    }

    if (selectedGameType !== 'All Games') {
      filtered = filterGamesByType(filtered, selectedGameType)
    }

    return filtered
  }

  const soloStats = calculatePlayerStats(
    getFilteredCompletedGames(),
    selectedPlayers
  )

  /* ---------------------------------------------
     RUNG TEAM STATS
  --------------------------------------------- */

  const getRungTeamStats = () => {
    const teams: Record<string, any> = {}
    
    let sessionsToCount = rungSessions.filter(s => s.isComplete)
    
    // Apply player filter to Rung sessions
    if (selectedPlayers.length > 0) {
      sessionsToCount = sessionsToCount.filter(session => {
        const allPlayers = Array.from(new Set(session.rounds.flatMap(r => [...(r.team1 || []), ...(r.team2 || [])])))
        return allPlayers.length === selectedPlayers.length &&
               selectedPlayers.every(p => allPlayers.includes(p))
      })
    }

    sessionsToCount.forEach(session => {
      const teamKeys = Object.keys(session.teamScores)
      
      teamKeys.forEach(teamKey => {
        const teamName = teamKey.replace(/&/g, ' & ')
        
        if (!teams[teamName]) {
          teams[teamName] = { team: teamName, games: 0, wins: 0 }
        }
        
        teams[teamName].games++
        
        if (session.teamScores[teamKey] >= 5) {
          teams[teamName].wins++
        }
      })
    })

    return Object.values(teams)
      .map((t: any) => ({
        ...t,
        winRate: t.games > 0 ? ((t.wins / t.games) * 100).toFixed(0) : '0'
      }))
      .sort(
        (a: any, b: any) =>
          parseFloat(b.winRate) - parseFloat(a.winRate) || b.wins - a.wins
      )
  }

  /* ---------------------------------------------
     RECENT GAMES
  --------------------------------------------- */

  const getRecentGames = () => {
    return getFilteredCompletedGames()
      .sort(
        (a, b) =>
          new Date(b.created_at || b.game_date).getTime() -
          new Date(a.created_at || a.game_date).getTime()
      )
      .slice(0, 20)
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </div>
    )
  }

  const rungTeams = getRungTeamStats()
  const recentGames = getRecentGames()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-2 sm:p-4 font-mono overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto mt-4 px-2">
        
        {/* ACHIEVEMENT BANNERS */}
        <LeaderboardBanners
          latestWinner={latestWinner}
          shitheadStreak={shitheadStreak}
        />

        {/* HEADER */}
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

        {/* HALL OF FAME/SHAME BUTTONS */}
        <div className="mb-6 mt-2 flex justify-center">
          <div className="flex gap-2 max-w-full px-2 justify-center">
            <Button
              onClick={() => setHallView('fame')}
              variant="pop"
              className="bg-gradient-to-br from-amber-600 to-yellow-700 text-sm"
            >
              🏆 Hall of Fame
            </Button>
            <Button
              onClick={() => setHallView('shame')}
              variant="pop"
              className="bg-gradient-to-br from-red-700 to-orange-800 text-sm"
            >
              💀 Hall of Shame
            </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('individual')}
            selected={activeTab === 'individual'}
          >
            Solo Kings
          </Button>
          <Button
            onClick={() => setActiveTab('rung')}
            selected={activeTab === 'rung'}
          >
            Rung Duo
          </Button>
          <Button
            onClick={() => setActiveTab('recent')}
            selected={activeTab === 'recent'}
          >
            Recent Games
          </Button>
        </div>

        {/* SOLO KINGS TAB */}
        {activeTab === 'individual' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left">Rank</th>
                  <th className="p-2 text-left">Player</th>
                  <th className="p-2 text-center">Games</th>
                  <th className="p-2 text-center">W</th>
                  <th className="p-2 text-center">R</th>
                  <th className="p-2 text-center">S</th>
                  <th className="p-2 text-center">L</th>
                  <th className="p-2 text-center">Win %</th>
                  <th className="p-2 text-center">Best Streak</th>
                  <th className="p-2 text-center">Recent</th>
                </tr>
              </thead>
              <tbody>
                {soloStats.map((p, i) => (
                  <tr key={p.player} className="border-b border-slate-800">
                    <td className="p-2 text-center">{i + 1}</td>
                    <td className="p-2 font-bold">{p.player}</td>
                    <td className="p-2 text-center">{p.gamesPlayed}</td>
                    <td className="p-2 text-center text-green-400">{p.wins}</td>
                    <td className="p-2 text-center text-blue-400">{p.runnerUps}</td>
                    <td className="p-2 text-center text-slate-400">{p.survivals}</td>
                    <td className="p-2 text-center text-red-400">{p.losses}</td>
                    <td className="p-2 text-center text-yellow-400">{p.winRate}%</td>
                    <td className="p-2 text-center text-purple-400">{p.bestStreak}</td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {p.recent.map((r: string, idx: number) => (
                          <span
                            key={idx}
                            className={`w-5 h-5 text-xs flex items-center justify-center rounded ${
                              r === 'W'
                                ? 'bg-green-600'
                                : r === 'R'
                                ? 'bg-blue-600'
                                : r === 'S'
                                ? 'bg-slate-600'
                                : 'bg-red-600'
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RUNG DUO TAB */}
        {activeTab === 'rung' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left">Rank</th>
                  <th className="p-2 text-left">Team</th>
                  <th className="p-2 text-center">Sessions</th>
                  <th className="p-2 text-center">Wins</th>
                  <th className="p-2 text-center">Win %</th>
                </tr>
              </thead>
              <tbody>
                {rungTeams.map((t: any, i: number) => (
                  <tr key={t.team} className="border-b border-slate-800">
                    <td className="p-2 text-center">{i + 1}</td>
                    <td className="p-2 font-bold">{t.team}</td>
                    <td className="p-2 text-center">{t.games}</td>
                    <td className="p-2 text-center text-green-400">{t.wins}</td>
                    <td className="p-2 text-center text-yellow-400">{t.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RECENT GAMES TAB */}
        {activeTab === 'recent' && (
          <div className="space-y-4">
            {recentGames.map(game => {
              const isSession = game.sessionKey !== undefined
              const isRung = game.game_type === 'Rung'
              const sessionData = isRung
                ? rungSessions.find(s => s.key === game.sessionKey)
                : game.game_type === 'Monopoly'
                ? monopolySessions.find(s => s.key === game.sessionKey)
                : game.game_type === 'Tai Ti'
                ? taitiSessions.find(s => s.key === game.sessionKey)
                : null

              return (
                <div
                  key={game.id}
                  className="bg-slate-900/60 p-4 rounded-lg border border-slate-700"
                >
                  {/* HEADER */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold">
                      {GAME_EMOJIS[game.game_type]} {game.game_type}
                      {isSession && sessionData && (
                        <span className="text-xs text-slate-400 ml-2">
                          ({sessionData.roundCount} round{sessionData.roundCount !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(game.game_date).toLocaleDateString()}
                    </div>
                  </div>

                  {/* PLAYER BADGES */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {game.winners?.map(p => (
                      <span
                        key={p}
                        className="bg-green-600 px-2 py-1 rounded text-xs font-semibold"
                      >
                        {p}
                      </span>
                    ))}
                    {game.runners_up?.map(p => (
                      <span
                        key={p}
                        className="bg-blue-600 px-2 py-1 rounded text-xs font-semibold"
                      >
                        {p}
                      </span>
                    ))}
                    {game.survivors?.map(p => (
                      <span
                        key={p}
                        className="bg-slate-600 px-2 py-1 rounded text-xs font-semibold"
                      >
                        {p}
                      </span>
                    ))}
                    {game.losers?.map(p => (
                      <span
                        key={p}
                        className="bg-red-600 px-2 py-1 rounded text-xs font-semibold"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* EXPANDABLE ROUNDS (for sessions) */}
                  {isSession && sessionData && sessionData.roundCount > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setExpandedSession(
                            expandedSession === game.sessionKey ? null : game.sessionKey!
                          )
                        }
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        {expandedSession === game.sessionKey
                          ? '▼ Hide Rounds'
                          : '▶ Show Rounds'}
                      </button>

                      {expandedSession === game.sessionKey && (
                        <div className="mt-3 space-y-1 bg-slate-800/50 p-3 rounded">
                          {isRung && sessionData && 'rounds' in sessionData ? (
                            // Rung rounds with progressive scores
                            (() => {
                              const rungSession = sessionData as RungSession
                              const runningScores: Record<string, number> = {}
                              
                              return rungSession.rounds.map((round, idx) => {
                                const t1Key = round.team1?.slice().sort().join('&') || ''
                                const t2Key = round.team2?.slice().sort().join('&') || ''
                                
                                if (!runningScores[t1Key]) runningScores[t1Key] = 0
                                if (!runningScores[t2Key]) runningScores[t2Key] = 0
                                
                                if (round.winning_team === 1) runningScores[t1Key]++
                                if (round.winning_team === 2) runningScores[t2Key]++
                                
                                const { left, right, leftLosing, rightLosing } = formatRoundLine(round, runningScores)
                                
                                return (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs"
                                  >
                                    <span className={leftLosing ? 'text-red-400 text-right' : 'text-green-400 font-bold text-right'}>
                                      {left}
                                    </span>
                                    <span className="text-amber-400">vs</span>
                                    <span className={rightLosing ? 'text-red-400 text-left' : 'text-green-400 font-bold text-left'}>
                                      {right}
                                    </span>
                                  </div>
                                )
                              })
                            })()
                          ) : (
                            // Monopoly/Tai Ti rounds with win counts
                            (() => {
                              const session = sessionData as MonopolyTaiTiSession
                              const runningWins: Record<string, number> = {}
                              
                              session.rounds[0].players_in_game?.forEach(p => {
                                runningWins[p] = 0
                              })
                              
                              return session.rounds.map((round, idx) => {
                                round.winners?.forEach(p => {
                                  runningWins[p] = (runningWins[p] || 0) + 1
                                })
                                
                                const sortedPlayers = Object.entries(runningWins)
                                  .sort((a, b) => b[1] - a[1])
                                
                                return (
                                  <div key={idx} className="text-xs">
                                    <span className="text-slate-400">Round {idx + 1}:</span>{' '}
                                    {sortedPlayers.map(([player, wins], i) => (
                                      <span key={player}>
                                        <span className={wins === sortedPlayers[0][1] ? 'text-green-400 font-bold' : 'text-slate-300'}>
                                          {player} ({wins})
                                        </span>
                                        {i < sortedPlayers.length - 1 && <span className="text-slate-500"> • </span>}
                                      </span>
                                    ))}
                                  </div>
                                )
                              })
                            })()
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* FILTERS COMPONENT */}
        <LeaderboardFilters
          selectedPlayers={selectedPlayers}
          selectedGameType={selectedGameType}
          showFloatingFilter={showFloatingFilter}
          onTogglePlayer={togglePlayerFilter}
          onSelectAllPlayers={selectAllPlayers}
          onClearPlayers={clearPlayers}
          onSelectGameType={selectGameType}
          onToggleFloatingFilter={() => setShowFloatingFilter(!showFloatingFilter)}
        />

        {/* HALL OF FAME/SHAME MODAL */}
        <HallOfFameShame
          hallView={hallView}
          stats={soloStats}
          onClose={() => setHallView('none')}
        />

      </div>
    </div>
  )
}
