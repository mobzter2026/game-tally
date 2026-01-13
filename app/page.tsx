'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const MIN_GAMES_FOR_RANKING = 0

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

const INDIVIDUAL_GAMES = ['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead']

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'individual' | 'rung-teams' | 'rung-players'>('individual')
  const [perfectGame, setPerfectGame] = useState<Game | null>(null)
  const [shitheadLosingStreak, setShitheadLosingStreak] = useState<{player: string, streak: number} | null>(null)
  const [latestWinner, setLatestWinner] = useState<{game: Game, type: 'dominated' | 'shithead' | 'normal'} | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [showFloatingFilter, setShowFloatingFilter] = useState(false)
  const [selectedGameType, setSelectedGameType] = useState<string>('All Games')
  const [hallView, setHallView] = useState<'none' | 'fame' | 'shame'>('none')
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
      const isPerfect = !hasRunnerUps && latestIndividualGame.losers && latestIndividualGame.losers.length >= 2

      if (isPerfect) {
        setPerfectGame(latestIndividualGame)
        setLatestWinner({ game: latestIndividualGame, type: 'dominated' })
      } else {
        setPerfectGame(null)
        if (latestIndividualGame.game_type === 'Shithead' && latestIndividualGame.losers && latestIndividualGame.losers.length > 0) {
          setLatestWinner({ game: latestIndividualGame, type: 'shithead' })
        } else {
          setLatestWinner({ game: latestIndividualGame, type: 'normal' })
        }
      }
    } else {
      setPerfectGame(null)
      setLatestWinner(null)
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-2 sm:p-4 font-mono overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto mt-4 px-2">
        {latestWinner && latestWinner.type === 'dominated' && (
          <div className="mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 px-4 py-2 rounded-lg shadow-lg animate-pulse">
            <p className="text-sm font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis animate-pulse">
              🌟 Flawless victory in {latestWinner.game.game_type} by {latestWinner.game.winners?.[0]} 🌟
            </p>
          </div>
        )}

        {latestWinner && latestWinner.type === 'shithead' && (
          <div className="mb-4 bg-gradient-to-r from-slate-100 via-white to-slate-100 px-4 py-2 rounded-lg shadow-lg border-2 border-amber-600 animate-pulse">
            <p className="text-sm font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis text-black">
              💩 Breaking news: {latestWinner.game.losers?.[latestWinner.game.losers.length - 1]} is the Shithead 💩
            </p>
          </div>
        )}

        {latestWinner && latestWinner.type === 'normal' && (
          <div className="mb-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 px-4 py-2 rounded-lg shadow-lg animate-pulse">
            <p className="text-sm font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis">
              🎖️ {latestWinner.game.winners?.[0]} won {latestWinner.game.game_type}. It wasn't pretty! 🎖️
            </p>
          </div>
        )}

        {shitheadLosingStreak && shitheadLosingStreak.streak >= 3 && (
          <div className="mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis">
              {shitheadLosingStreak.player} is on a {shitheadLosingStreak.streak} game Shithead LOSING streak! 💩💩
            </p>
          </div>
        )}

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
  <p className="text-slate-300 text-xs sm:text-sm md:text-base italic transition-opacity duration-500 whitespace-nowrap overflow-hidden text-ellipsis px-2">"{QUOTES[currentQuote]}"</p>
</div>

        <div className="mb-6 flex justify-center">
  <div className="grid grid-cols-3 gap-3 max-w-md w-full px-4">
    <Button
      onClick={() => setActiveTab('individual')}
      variant="frosted"
      color="purple"
      selected={activeTab === 'individual'}
      className="px-2 py-2 text-xs sm:text-sm"
    >
      Solo Games
    </Button>
    <Button
      onClick={() => setActiveTab('rung-teams')}
      variant="frosted"
      color="purple"
      selected={activeTab === 'rung-teams'}
      className="px-2 py-2 text-xs sm:text-sm"
    >
      Rung - Duo
    </Button>
    <Button
      onClick={() => setActiveTab('rung-players')}
      variant="frosted"
      color="purple"
      selected={activeTab === 'rung-players'}
      className="px-2 py-2 text-xs sm:text-sm"
    >
      Rung - Solo
    </Button>
  </div>
</div>

        {activeTab === 'individual' && (
          <>
            {hallView !== 'none' ? (
              <>
                <div className="mb-4 flex justify-end">
                  <Button
                    onClick={() => setHallView('none')}
                    variant="pop"
                    color="blue"
                    className="px-4 py-2"
                  >
                    ◀ Back to Overall Leaderboard
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {INDIVIDUAL_GAMES.map(gameType => {
                    const gameStats = getPlayerStatsForGame(gameType)
                    const displayStats = hallView === 'fame'
                      ? gameStats.slice(0, 3)
           : gameStats.slice(-3).reverse()

                    return (
                      <div key={gameType} className="rounded-xl shadow-2xl overflow-hidden bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
                        <div className={`p-4 border-b border-slate-700 ${hallView === 'fame' ? 'bg-green-900' : 'bg-gray-800'}`}>
                          <h3 className="text-xl font-bold whitespace-nowrap">{GAME_EMOJIS[gameType]} {gameType}</h3>
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
                                  <div key={player.player} className="flex items-center justify-between bg-purple-900/50 p-3 rounded shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]">
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
              <div className="rounded-xl shadow-2xl overflow-hidden mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
                <div className="p-4 border-b border-slate-700">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold mb-1 whitespace-nowrap">The Ultimate Backstab Board 🔪</h2>
                    <p className="text-slate-400 text-sm mb-3 italic">Friendship Optional, Betrayal Mandatory</p>
                    <div className="flex gap-2 mb-3 justify-center flex-wrap">
                      <Button
  onClick={() => setHallView('fame')}
  variant="pop"
  className="px-4 py-2 text-sm font-bold bg-gradient-to-br from-emerald-600 to-emerald-900"
>
  ⭐ Hall of Fame
</Button>
                      <Button
  onClick={() => setHallView('shame')}
  variant="pop"
  className="px-4 py-2 text-sm font-bold bg-gradient-to-br from-rose-600 to-rose-900"
>
  🤡 Hall of Shame
</Button>
                    </div>

                    <p className="text-slate-400 text-xs sm:text-sm mb-2">
                      🃏 Blackjack ⚜ 🎲 Monopoly ⚜ 🀄 Tai Ti ⚜ 💩 Shithead
                    </p>
                    <p className="text-slate-400 text-xs mb-3">
                      Wins: 100% 🏆 ⬩ 2nd: 40% 🏃 ⬩ Survival: 10% 🤟🏼
                    </p>
                    <select
  value={selectedGameType}
  onChange={(e) => setSelectedGameType(e.target.value)}
  className="px-3 py-2 rounded-lg text-sm bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]"
>
                      <option value="All Games">🎰 All Games</option>
                      {INDIVIDUAL_GAMES.map(game => (
                        <option key={game} value={game}>{GAME_EMOJIS[game]} {game}</option>
                      ))}
                    </select>
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
        <th className="text-center p-2 md:p-4 text-sm md:text-base">💩</th>
        <th className="text-center p-2 md:p-4 text-sm md:text-base">Win Rate</th>
        <th className="text-center p-2 md:p-4 text-sm md:text-base">Best 🔥</th>
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
          <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : (idx >= playerStats.length - 3 ? 'bg-purple-900/15' : '')} shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] hover:bg-purple-800/20 transition-all`}>
  <td className="p-2 md:p-4 text-center text-xl md:text-2xl">{getMedal(playerStats, idx, (p) => p.winRate)}</td>
  <td className="p-2 md:p-4 font-bold text-lg md:text-xl">
    {player.player}
    {worstShitheadPlayer === player.player && <span className="inline-block animate-bounce ml-1">💩</span>}
  </td>
  <td className="text-center p-2 md:p-4 text-sm md:text-base">{player.gamesPlayed}</td>
  <td className="text-center p-4 text-green-400 font-bold">{player.wins}</td>
  <td className="text-center p-4 text-blue-400 font-bold">{player.runnerUps}</td>
  <td className="text-center p-4 text-slate-400 font-bold">{player.survivals}</td>
  <td className="text-center p-4 text-red-400 font-bold">{player.losses}</td>
  <td className="text-center p-4 text-orange-400 font-bold">{player.shitheadLosses}</td>
  <td className="text-center p-4 text-yellow-400 font-bold text-xl">{player.winRate}%</td>
  <td className="text-center p-2 md:p-4 text-sm md:text-base">
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
  <div className="rounded-xl p-6 mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
     <h2 className="text-xl font-bold mb-1 whitespace-nowrap">
  📜 <span className="bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">Recent Games</span>
</h2
      <div className="text-sm">
        <span className="inline-block bg-green-600 text-white px-2 py-0.5 rounded mr-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">Winner</span>
        <span className="inline-block bg-blue-600 text-white px-2 py-0.5 rounded mr-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">2nd</span>
        <span className="inline-block bg-slate-600 text-white px-2 py-0.5 rounded mr-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">Survivors</span>
        <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]">Loser</span>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recentGames.length === 0 ? (
        <div className="col-span-2 text-center p-8 text-slate-400">
          No games found with selected filter
        </div>
      ) : (
        recentGames.map(game => (
          <div key={game.id} className="rounded-xl p-3 shadow-[0_0.05px_2px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] bg-gradient-to-b from-purple-950/60 to-purple-900/95"> <div className="text-slate-300 text-base font-bold mb-2">
              {GAME_EMOJIS[game.game_type]} {game.game_type} • {new Date(game.game_date).toLocaleDateString()} {game.created_at && `• ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
            </div>
            <div className="flex gap-1 flex-wrap">
              {sortPlayersInGame(game).map(player => (
                <span key={player} className={`${getPlayerBadgeColor(game, player)} text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all`}>
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
  <div className="rounded-xl shadow-2xl overflow-hidden mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 
                  shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
    <div className="p-6 border-b border-slate-700">
      <h2 className="text-2xl font-bold">Rung - Duo: The Reckoning</h2>
      <p className="text-slate-400 text-sm mt-1">Duo or Die Trying!</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-900">
            <th className="text-center p-4 w-20">Rank</th>
            <th className="text-left p-4 w-48">Team</th>
            <th className="text-center p-2 md:p-4 text-sm md:text-base">Games</th>
            <th className="text-center p-2 md:p-4 text-sm md:text-base">Wins</th>
            <th className="text-center p-2 md:p-4 text-sm md:text-base">Losses</th>
            <th className="text-center p-2 md:p-4 text-sm md:text-base">Win Rate</th>
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
              <tr key={team.team} className={`border-b border-slate-700/50 ${
                idx < 3
                  ? 'bg-yellow-900/10'
                  : (idx >= rungTeamStats.length - 3 ? 'bg-purple-900/15' : '')
              }`}>
                <td className="p-2 md:p-4 text-center text-xl md:text-2xl">
                  {getMedal(rungTeamStats, idx, (t) => t.winRate)}
                </td>
                <td className="p-2 md:p-4 font-bold text-lg md:text-xl">{team.team}</td>
                <td className="text-center p-2 md:p-4 text-sm md:text-base">{team.gamesPlayed}</td>
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
)}
		  
        {activeTab === 'rung-players' && (
          <div className="rounded-xl shadow-2xl overflow-hidden mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl md:text-2xl font-bold whitespace-nowrap">Rung - Solo: Revenge of the Stats</h2>
              <p className="text-slate-400 text-sm mt-1">Your Score? A Tragedy in Digits!</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900">
                    <th className="text-center p-4 w-20">Rank</th>
                    <th className="text-left p-4">Player</th>
                    <th className="text-center p-2 md:p-4 text-sm md:text-base">Games</th>
                    <th className="text-center p-2 md:p-4 text-sm md:text-base">Wins</th>
                    <th className="text-center p-2 md:p-4 text-sm md:text-base">Losses</th>
                    <th className="text-center p-2 md:p-4 text-sm md:text-base">Win Rate</th>
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
                      <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : (idx >= playerStats.length - 3 ? 'bg-purple-900/15' : '')}`}>
                        <td className="p-2 md:p-4 text-center text-xl md:text-2xl">{getMedal(rungPlayerStats, idx, (p) => p.winRate)}</td>
                        <td className="p-2 md:p-4 font-bold text-lg md:text-xl">
                          {player.player}
                          {worstShitheadPlayer === player.player && ' 💩'}
                        </td>
                        <td className="text-center p-2 md:p-4 text-sm md:text-base">{player.gamesPlayed}</td>
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

        <button
          onClick={() => setShowFloatingFilter(!showFloatingFilter)}
          className="fixed bottom-42 right-8 w-12 h-12 bg-gradient-to-br from-violet-900 to-fuchsia-950 rounded-full flex items-center justify-center hover:scale-110 transition-all z-50 border-2 border-fuchsia-500"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
          </svg>
          {selectedPlayers.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedPlayers.length}
            </div>
          )}
        </button>

		  {showFloatingFilter && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFloatingFilter(false)} />
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-purple-900/95 to-slate-900/95 rounded-t-3xl shadow-2xl z-50 p-6 max-h-[50vh] border-t-2 border-fuchsia-500" style={{animation: "slideUp 0.3s ease-out"}}>
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

        <div className="text-center mt-8">
          <a href="/admin/login" className="text-slate-400 hover:text-slate-200 text-sm">Admin Login</a>
        </div>
      </div>
    </div>
  )
}
