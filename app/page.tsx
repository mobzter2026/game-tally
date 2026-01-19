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
  const [activeTab, setActiveTab] = useState<'individual' | 'rung' | 'recent'>('individual')
  const [perfectGame, setPerfectGame] = useState<Game | null>(null)
  const [shitheadLosingStreak, setShitheadLosingStreak] = useState<{player: string, streak: number} | null>(null)
  const [latestWinner, setLatestWinner] = useState<{game: Game, type: 'dominated' | 'shithead' | 'normal'} | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [showFloatingFilter, setShowFloatingFilter] = useState(false)
  const [selectedGameType, setSelectedGameType] = useState<string>('All Games')
  const [hallView, setHallView] = useState<'none' | 'fame' | 'shame'>('none')
  const [currentQuote, setCurrentQuote] = useState(0)
  const [expandedGame, setExpandedGame] = useState<string | null>(null)
  const [rungRounds, setRungRounds] = useState<Record<string, any[]>>({})
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

      if (game.survivors && game.survivors.length > 0) {
        game.survivors.forEach(s => {
          if (stats[s]) {
            stats[s].survivals++
            stats[s].weightedWins += 0.1
          }
        })
      } else {
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

  // Get overall player stats INCLUDING Rung games
  const getOverallPlayerStats = () => {
    const stats: any = {}
    const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS

    activePlayers.forEach(p => {
      stats[p] = { 
        gamesPlayed: 0, 
        wins: 0, 
        runnerUps: 0, 
        survivals: 0, 
        losses: 0, 
        weightedWins: 0, 
        bestStreak: 0, 
        shitheadLosses: 0,
        recentResults: [] as string[]
      }
    })

    // Get all games (including Rung leaderboard entries)
    let allGames = filteredGames
    if (selectedGameType !== 'All Games') {
      allGames = allGames.filter(g => g.game_type === selectedGameType)
    }

    allGames.forEach(game => {
      // For Rung, only count final leaderboard entries (those with winners array)
      if (game.game_type === 'Rung' && (!game.winners || game.winners.length === 0)) {
        return // Skip individual round entries
      }

      if (game.players_in_game) {
        game.players_in_game.forEach(p => {
          if (stats[p]) stats[p].gamesPlayed++
        })
      }

      if (game.winners) game.winners.forEach(w => {
        if (stats[w]) {
          stats[w].wins++
          stats[w].weightedWins += 1
          stats[w].recentResults.push('W')
        }
      })

      if (game.runners_up) game.runners_up.forEach(r => {
        if (stats[r]) {
          stats[r].runnerUps++
          stats[r].weightedWins += 0.4
          stats[r].recentResults.push('R')
        }
      })

      if (game.survivors && game.survivors.length > 0) {
        game.survivors.forEach(s => {
          if (stats[s]) {
            stats[s].survivals++
            stats[s].weightedWins += 0.1
            stats[s].recentResults.push('S')
          }
        })
      } else {
        if (game.players_in_game) {
          const winners = game.winners || []
          const runnersUp = game.runners_up || []
          const losers = game.losers || []

          game.players_in_game.forEach(p => {
            if (stats[p] && !winners.includes(p) && !runnersUp.includes(p) && !losers.includes(p)) {
              stats[p].survivals++
              stats[p].weightedWins += 0.1
              stats[p].recentResults.push('S')
            }
          })
        }
      }

      if (game.losers) game.losers.forEach(l => {
        if (stats[l]) {
          stats[l].losses++
          stats[l].recentResults.push('L')
        }
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

      const reversedGames = allGames.slice().reverse()
      reversedGames.forEach(game => {
        // Skip Rung rounds that aren't final results
        if (game.game_type === 'Rung' && (!game.winners || game.winners.length === 0)) {
          return
        }

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
      // Keep only last 10 results
      stats[player].recentResults = stats[player].recentResults.slice(0, 10).reverse()
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
    const allStats = getOverallPlayerStats()
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
        } else if (game.winning_team === 2) {
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
    if (game.survivors?.includes(player)) return 'bg-slate-600'
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
      const aIsSurvivor = game.survivors?.includes(a)
      const bIsSurvivor = game.survivors?.includes(b)
      const aIsLoser = game.losers?.includes(a)
      const bIsLoser = game.losers?.includes(b)

      if (aIsWinner && !bIsWinner) return -1
      if (!aIsWinner && bIsWinner) return 1
      if (aIsRunner && !bIsRunner) return -1
      if (!aIsRunner && bIsRunner) return 1
      if (aIsSurvivor && !bIsSurvivor) return -1
      if (!aIsSurvivor && bIsSurvivor) return 1
      if (aIsLoser && !bIsLoser) return 1
      if (!aIsLoser && bIsLoser) return -1

      return 0
    })
  }

  // Helper to render recent results
  const renderRecentResults = (results: string[]) => {
    if (!results || results.length === 0) return <span className="text-slate-500">-</span>
    
    return (
      <div className="flex gap-0.5 justify-center">
        {results.map((result, idx) => (
          <span 
            key={idx} 
            className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${
              result === 'W' ? 'bg-green-600' :
              result === 'R' ? 'bg-blue-600' :
              result === 'S' ? 'bg-slate-600' :
              'bg-red-600'
            }`}
          >
            {result}
          </span>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading...</div>
      </div>
    )
  }

  const overallPlayerStats = getOverallPlayerStats()
  const playerStats = getPlayerStats()
  const rungTeamStats = getRungTeamStats()
  
  // Group Rung games by session (detect when 5 wins reached)
  const getGroupedRecentGames = () => {
    const allGames = activeTab === 'rung'
      ? filteredGames.filter(g => g.game_type === 'Rung')
      : filteredGames

    // For non-Rung games or non-recent tab, return as is
    if (activeTab !== 'recent') {
      return allGames.slice(0, 20)
    }

    // Group Rung games into sessions
    const grouped: Game[] = []
    const rungGames = allGames.filter(g => g.game_type === 'Rung' && g.team1 && g.team2)
    
    // Group by date first
    const gamesByDate: Record<string, Game[]> = {}
    rungGames.forEach(game => {
      if (!gamesByDate[game.game_date]) {
        gamesByDate[game.game_date] = []
      }
      gamesByDate[game.game_date].push(game)
    })

    // For each date, detect sessions (session ends when team hits 5 wins)
    Object.keys(gamesByDate).sort().reverse().forEach(date => {
      const gamesOnDate = gamesByDate[date].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      let sessionStart = 0
      const teamWins: Record<string, number> = {}

      gamesOnDate.forEach((game, idx) => {
        const team1Key = game.team1!.slice().sort().join('&')
        const team2Key = game.team2!.slice().sort().join('&')

        if (!teamWins[team1Key]) teamWins[team1Key] = 0
        if (!teamWins[team2Key]) teamWins[team2Key] = 0

        // Increment win for winning team
        if (game.winning_team === 1) teamWins[team1Key]++
        else if (game.winning_team === 2) teamWins[team2Key]++

        // Check if any team reached 5 wins (session complete)
        const sessionComplete = Object.values(teamWins).some(wins => wins >= 5)

        // If session complete OR last game, add this session
        if (sessionComplete || idx === gamesOnDate.length - 1) {
          // Add the first game of this session as the representative
          grouped.push(gamesOnDate[sessionStart])
          
          // If session complete and not the last game, start new session
          if (sessionComplete && idx < gamesOnDate.length - 1) {
            sessionStart = idx + 1
            // Reset team wins for new session
            Object.keys(teamWins).forEach(key => teamWins[key] = 0)
          }
        }
      })
    })

    // Add non-Rung games
    allGames.forEach(game => {
      if (game.game_type !== 'Rung') {
        grouped.push(game)
      }
    })

    // Sort by date descending
    return grouped.sort((a, b) => {
      const dateCompare = new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      if (dateCompare !== 0) return dateCompare
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }).slice(0, 20)
  }

  const recentGames = getGroupedRecentGames()

  const worstShitheadPlayer = getWorstShitheadPlayer()

  const fetchRungRounds = async (gameDate: string, team1: string[], team2: string[], gameId: string) => {
    // Fetch ALL Rung games from this date
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'Rung')
      .eq('game_date', gameDate)
      .not('winning_team', 'is', null)
      .order('created_at', { ascending: true })

    if (data) {
      const allRounds = data as Game[]
      
      // Find which session the clicked game belongs to
      const sessions: Game[][] = []
      let currentSession: Game[] = []
      const teamWins: Record<string, number> = {}
      let targetSessionIndex = -1

      allRounds.forEach((round, idx) => {
        const team1Key = round.team1!.slice().sort().join('&')
        const team2Key = round.team2!.slice().sort().join('&')

        if (!teamWins[team1Key]) teamWins[team1Key] = 0
        if (!teamWins[team2Key]) teamWins[team2Key] = 0

        currentSession.push(round)

        // Check if this is the game we're looking for
        if (round.id === gameId) {
          targetSessionIndex = sessions.length
        }

        if (round.winning_team === 1) teamWins[team1Key]++
        else if (round.winning_team === 2) teamWins[team2Key]++

        // Check if session complete (someone hit 5 wins)
        const sessionComplete = Object.values(teamWins).some(wins => wins >= 5)

        if (sessionComplete || idx === allRounds.length - 1) {
          sessions.push([...currentSession])
          // If we haven't found the target yet, it might be in this session
          if (targetSessionIndex === -1 && currentSession.some(g => g.id === gameId)) {
            targetSessionIndex = sessions.length - 1
          }
          currentSession = []
          Object.keys(teamWins).forEach(key => teamWins[key] = 0)
        }
      })

      // Return the session that contains our game, or the last session if not found
      return sessions[targetSessionIndex] || sessions[sessions.length - 1] || []
    }
    return []
  }

  const toggleExpandGame = async (gameId: string, gameDate: string, team1: string[], team2: string[]) => {
    if (expandedGame === gameId) {
      setExpandedGame(null)
    } else {
      setExpandedGame(gameId)
      // Fetch rounds if not already cached
      if (!rungRounds[gameId]) {
        const rounds = await fetchRungRounds(gameDate, team1, team2, gameId)
        setRungRounds(prev => ({ ...prev, [gameId]: rounds }))
      }
    }
  }

  const calculateRungWinners = (gameDate: string, team1: string[], team2: string[]) => {
    // Get all rounds for this matchup
    const allRounds = games.filter(g => 
      g.game_type === 'Rung' && 
      g.game_date === gameDate &&
      g.winning_team !== null &&
      g.team1 && g.team2
    ).filter(round => {
      const roundTeam1 = round.team1?.slice().sort().join(',')
      const roundTeam2 = round.team2?.slice().sort().join(',')
      const currentTeam1 = team1.slice().sort().join(',')
      const currentTeam2 = team2.slice().sort().join(',')
      
      return (roundTeam1 === currentTeam1 && roundTeam2 === currentTeam2) ||
             (roundTeam1 === currentTeam2 && roundTeam2 === currentTeam1)
    })

    // Count wins
    let team1Wins = 0
    let team2Wins = 0

    allRounds.forEach(round => {
      const roundTeam1 = round.team1?.slice().sort().join(',')
      const currentTeam1 = team1.slice().sort().join(',')
      const isTeam1First = roundTeam1 === currentTeam1

      if (isTeam1First) {
        if (round.winning_team === 1) team1Wins++
        else if (round.winning_team === 2) team2Wins++
      } else {
        if (round.winning_team === 1) team2Wins++
        else if (round.winning_team === 2) team1Wins++
      }
    })

    return { team1Wins, team2Wins, totalRounds: allRounds.length }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-2 sm:p-4 font-mono overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto mt-4 px-2">
        {latestWinner && latestWinner.type === 'dominated' && (
          <div className="mb-4 bg-gradient-to-r from-purple-950 via-fuchsia-700 to-purple-950 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(217,70,239,0.3),inset_0_2px_6px_rgba(255,255,255,0.25)] border-2 border-fuchsia-500/40">
            <p className="text-xs sm:text-sm font-extrabold text-center truncate tracking-wide">
              ✨ FLAWLESS VICTORY IN {latestWinner.game.game_type.toUpperCase()} BY {latestWinner.game.winners?.[0].toUpperCase()} ✨
            </p>
          </div>
        )}

        {latestWinner && latestWinner.type === 'shithead' && (
          <div className="mb-4 bg-gradient-to-r from-orange-600 via-white to-orange-600 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(251,146,60,0.3),inset_0_2px_6px_rgba(255,255,255,0.4)] border-2 border-orange-500">
            <p className="text-xs sm:text-sm font-extrabold text-center truncate text-black tracking-wide">
              💩 BREAKING NEWS: {latestWinner.game.losers?.[latestWinner.game.losers.length - 1].toUpperCase()} IS THE SHITHEAD 💩
            </p>
          </div>
        )}

        {latestWinner && latestWinner.type === 'normal' && (
          <div className="mb-4 bg-gradient-to-r from-blue-900 via-cyan-700 to-blue-900 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(34,211,238,0.3),inset_0_2px_6px_rgba(255,255,255,0.25)] border-2 border-cyan-500/40">
            <p className="text-xs sm:text-sm font-extrabold text-center truncate tracking-wide">
              🎖️ {latestWinner.game.winners?.[0].toUpperCase()} WON {latestWinner.game.game_type.toUpperCase()}. IT WASN'T PRETTY! 🎖️
            </p>
          </div>
        )}

        {shitheadLosingStreak && shitheadLosingStreak.streak >= 3 && (
          <div className="mb-4 bg-gradient-to-r from-red-800 via-orange-700 to-red-800 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(239,68,68,0.3),inset_0_2px_6px_rgba(255,255,255,0.25)] border-2 border-orange-600">
            <p className="text-xs sm:text-sm font-extrabold text-center truncate tracking-wide">
              🔥 {shitheadLosingStreak.player.toUpperCase()} IS ON A {shitheadLosingStreak.streak} GAME SHITHEAD LOSING STREAK! 💩💩
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

<div className="mb-6 mt-2 flex justify-center">
  <div className="flex gap-2 max-w-full px-2 justify-center">
    <Button
      onClick={() => setActiveTab('individual')}
      variant="frosted"
      color="purple"
      selected={activeTab === 'individual'}
      className="
        flex-1
        min-w-[80px] sm:min-w-[90px]
        px-2
        py-1.5
        text-xs sm:text-sm
        whitespace-nowrap
        text-left
        text-white
        font-bold
      "
    >
      Solo Kings
    </Button>

    <Button
      onClick={() => setActiveTab('rung')}
      variant="frosted"
      color="purple"
      selected={activeTab === 'rung'}
      className="
        flex-1
        min-w-[100px] sm:min-w-[110px]
        px-2
        py-1.5
        text-xs sm:text-sm
        whitespace-nowrap
        text-left
        text-white
        font-bold
      "
    >
      Rung - Duo
    </Button>

    <Button
      onClick={() => setActiveTab('recent')}
      variant="frosted"
      color="purple"
      selected={activeTab === 'recent'}
      className="
        flex-1
        min-w-[110px] sm:min-w-[130px]
        px-2
        py-1.5
        text-xs sm:text-sm
        whitespace-nowrap
        text-left
        text-white
        font-bold
      "
    >
      Recent Games
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
                    <h2 className="text-lg sm:text-2xl font-bold mb-1 whitespace-nowrap" style={{fontVariant: 'small-caps'}}>
                      <span className="bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase">
                        The Ultimate Backstab Board
                      </span> 🔪
                    </h2>
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
                      🃏 Blackjack  ⬩  🎲 Monopoly  ⬩  🀄 Tai Ti  ⬩  💩 Shithead  ⬩  🎭 Rung
                    </p>
                    <p className="text-slate-400 text-xs mb-3">
                      🏆 Wins: 100%  ⬩  🏃 2nd: 40%  ⬩  🤟🏼 Survival: 10%
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
                      <option value="Rung">🎭 Rung</option>
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
                        <th className="text-center p-2 md:p-4 text-sm md:text-base">Recent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallPlayerStats.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center p-8 text-slate-400">
                            No games played yet.
                          </td>
                        </tr>
                      ) : (
                        overallPlayerStats.map((player, idx) => (
                          <tr key={player.player} className={`border-b border-slate-700/50 ${idx < 3 ? 'bg-yellow-900/10' : (idx >= overallPlayerStats.length - 3 ? 'bg-purple-900/15' : '')} shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] hover:bg-purple-800/20 transition-all`}>
                            <td className="p-2 md:p-4 text-center text-xl md:text-2xl">{getMedal(overallPlayerStats, idx, (p) => p.winRate)}</td>
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
                            <td className="text-center p-2 md:p-4">
                              {renderRecentResults(player.recentResults)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'rung' && (
          <>
            {/* RUNG DUO LEADERBOARD */}
            <div className="rounded-xl shadow-2xl overflow-hidden mb-8 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl md:text-2xl font-bold whitespace-nowrap">🎭 Rung - Duo: The Reckoning</h2>
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
          </>
        )}

        {activeTab === 'recent' && (
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
                  No games found with selected filter
                </div>
              ) : (
                recentGames.map(game => {
                  // Check if this is an ongoing Rung game
                  let isOngoingRung = false
                  if (game.game_type === 'Rung' && game.team1 && game.team2 && (!game.winners || game.winners.length === 0)) {
                    // Check if any team has reached 5 wins
                    const sessionRounds = games.filter(g => 
                      g.game_type === 'Rung' && 
                      g.game_date === game.game_date &&
                      g.winning_team !== null &&
                      g.team1 && g.team2
                    )

                    const teamWins: Record<string, number> = {}
                    sessionRounds.forEach(round => {
                      const team1Key = round.team1!.slice().sort().join('&')
                      const team2Key = round.team2!.slice().sort().join('&')
                      if (!teamWins[team1Key]) teamWins[team1Key] = 0
                      if (!teamWins[team2Key]) teamWins[team2Key] = 0
                      if (round.winning_team === 1) teamWins[team1Key]++
                      else if (round.winning_team === 2) teamWins[team2Key]++
                    })

                    // Only ongoing if no team has reached 5 wins
                    isOngoingRung = !Object.values(teamWins).some(wins => wins >= 5)
                  }
                  
                  const gameRounds = rungRounds[game.id] || []
                  
                  return (
                    <div key={game.id} className={`rounded-xl p-6 shadow-[0_0.05px_2px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)] bg-gradient-to-b from-purple-950/60 to-purple-900/95 w-full ${isOngoingRung ? 'min-h-[160px]' : 'min-h-[120px]'}`}>
                      <div className="mb-3">
                        <div className="font-bold text-base text-slate-300 mb-1">
                          {GAME_EMOJIS[game.game_type]} {game.game_type} • {new Date(game.game_date).toLocaleDateString()}
                          {game.created_at && ` • ${new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </div>
                        {isOngoingRung && (
                          <div className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300 text-sm font-black tracking-wider drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]">
                            ONGOING
                          </div>
                        )}
                      </div>

                      {game.game_type === 'Rung' && game.team1 && game.team2 ? (
                        <>
                          {/* Show first-to-5 session standings with ALL teams in THIS session */}
                          {(() => {
                            // Get all rounds for this DATE
                            const allRoundsOnDate = games.filter(g => 
                              g.game_type === 'Rung' && 
                              g.game_date === game.game_date &&
                              g.winning_team !== null &&
                              g.team1 && g.team2
                            ).sort((a, b) => 
                              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                            )

                            // Find which session this game belongs to
                            let sessionRounds: Game[] = []
                            let currentSessionStart = 0
                            let foundGameSession = false
                            const teamWins: Record<string, number> = {}

                            for (let i = 0; i < allRoundsOnDate.length; i++) {
                              const round = allRoundsOnDate[i]
                              const team1Key = round.team1!.slice().sort().join('&')
                              const team2Key = round.team2!.slice().sort().join('&')

                              if (!teamWins[team1Key]) teamWins[team1Key] = 0
                              if (!teamWins[team2Key]) teamWins[team2Key] = 0

                              if (round.winning_team === 1) teamWins[team1Key]++
                              else if (round.winning_team === 2) teamWins[team2Key]++

                              // Mark if we found our target game in this session
                              if (round.id === game.id) {
                                foundGameSession = true
                              }

                              // Check if session complete (someone hit 5 wins)
                              const sessionComplete = Object.values(teamWins).some(wins => wins >= 5)
                              
                              // If session complete OR last game
                              if (sessionComplete || i === allRoundsOnDate.length - 1) {
                                if (foundGameSession) {
                                  // This is the session containing our game
                                  sessionRounds = allRoundsOnDate.slice(currentSessionStart, i + 1)
                                  break
                                }
                                // Session ended, reset for next session
                                currentSessionStart = i + 1
                                foundGameSession = false
                                Object.keys(teamWins).forEach(key => teamWins[key] = 0)
                              }
                            }

                            // If no session found (ongoing), use all rounds from last session start
                            if (sessionRounds.length === 0) {
                              sessionRounds = allRoundsOnDate.slice(currentSessionStart)
                            }

                            // Calculate standings for THIS session - track team pairings
                            const sessionTeamWins: Record<string, number> = {}
                            const playerBestTeam: Record<string, { team: string, wins: number }> = {}
                            const allTeams = new Set<string>()

                            sessionRounds.forEach(round => {
                              const team1Key = round.team1!.slice().sort().join('&')
                              const team2Key = round.team2!.slice().sort().join('&')
                              
                              allTeams.add(team1Key)
                              allTeams.add(team2Key)
                              
                              if (!sessionTeamWins[team1Key]) sessionTeamWins[team1Key] = 0
                              if (!sessionTeamWins[team2Key]) sessionTeamWins[team2Key] = 0
                              
                              if (round.winning_team === 1) sessionTeamWins[team1Key]++
                              else if (round.winning_team === 2) sessionTeamWins[team2Key]++
                            })

                            // For each player, find their best-performing team
                            const allPlayers = new Set<string>()
                            allTeams.forEach(teamKey => {
                              teamKey.split('&').forEach(p => allPlayers.add(p))
                            })

                            allPlayers.forEach(player => {
                              let bestWins = -1
                              let bestTeam = ''
                              
                              allTeams.forEach(teamKey => {
                                if (teamKey.split('&').includes(player)) {
                                  const wins = sessionTeamWins[teamKey] || 0
                                  if (wins > bestWins) {
                                    bestWins = wins
                                    bestTeam = teamKey
                                  }
                                }
                              })
                              
                              if (bestTeam) {
                                playerBestTeam[player] = { team: bestTeam, wins: bestWins }
                              }
                            })

                            // Sort players by their best team's performance
                            const sortedPlayers = Array.from(allPlayers).sort((a, b) => 
                              (playerBestTeam[b]?.wins || 0) - (playerBestTeam[a]?.wins || 0)
                            )

                            // Categorize players based on their best team performance
                            const maxWins = Math.max(...sortedPlayers.map(p => playerBestTeam[p]?.wins || 0))
                            const minWins = Math.min(...sortedPlayers.map(p => playerBestTeam[p]?.wins || 0))
                            
                            console.log('Player best teams:', playerBestTeam)
                            console.log('Max wins:', maxWins, 'Min wins:', minWins)
                            
                            const sessionComplete = maxWins >= 5
                            const winners = sessionComplete
                              ? sortedPlayers.filter(p => (playerBestTeam[p]?.wins || 0) >= 5)
                              : sortedPlayers.filter(p => (playerBestTeam[p]?.wins || 0) === maxWins)
                            
                            console.log('Winners:', winners)
                            
                            let runners: string[] = []
                            if (sessionComplete && winners.length > 0) {
                              const nonWinners = sortedPlayers.filter(p => !winners.includes(p))
                              if (nonWinners.length > 0) {
                                const secondMax = Math.max(...nonWinners.map(p => playerBestTeam[p]?.wins || 0))
                                runners = nonWinners.filter(p => (playerBestTeam[p]?.wins || 0) === secondMax)
                              }
                            }
                            
                            console.log('Runners:', runners)
                            
                            const survivors = sortedPlayers.filter(p => 
                              !winners.includes(p) && 
                              !runners.includes(p) && 
                              (playerBestTeam[p]?.wins || 0) > minWins
                            )
                            
                            console.log('Survivors:', survivors)
                            
                            const losers = sortedPlayers.filter(p => 
                              (playerBestTeam[p]?.wins || 0) === minWins && 
                              !winners.includes(p) &&
                              !runners.includes(p)
                            )
                            
                            console.log('Losers:', losers)

                            const renderPlayerBadges = (players: string[], colorClass: string) => {
                              return players.map(p => (
                                <span key={p} className={`${colorClass} text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all`}>
                                  {p}
                                </span>
                              ))
                            }
                            
                            return (
                              <div className="flex gap-1 flex-wrap mb-3">
                                {renderPlayerBadges(winners, 'bg-green-600')}
                                {renderPlayerBadges(runners, 'bg-blue-600')}
                                {renderPlayerBadges(survivors, 'bg-slate-600')}
                                {renderPlayerBadges(losers, 'bg-red-600')}
                              </div>
                            )
                          })()}

                          {/* Premium Expand Button - Darker */}
                          <button
                            onClick={() => toggleExpandGame(game.id, game.game_date, game.team1!, game.team2!)}
                            className="w-full mt-3 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold tracking-wide shadow-[0_4px_12px_rgba(29,78,216,0.5),inset_0_2px_4px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            {expandedGame === game.id ? '▲ COLLAPSE ROUNDS' : '▼ EXPAND ROUNDS'}
                          </button>

                          {/* Expandable round history - Chronological order */}
                          {expandedGame === game.id && (
                            <div className="mt-3 bg-slate-900/50 p-4 rounded-lg">
                              <h4 className="text-sm font-bold text-slate-300 mb-3 text-center">All Matches (Chronological)</h4>
                              {gameRounds.length === 0 ? (
                                <div className="text-xs text-slate-500 text-center">Loading rounds...</div>
                              ) : (
                                <div className="space-y-2">
                                  {(() => {
                                    const teamScores: Record<string, number> = {}

                                    // Go through rounds chronologically
                                    return gameRounds.map((round) => {
                                      const team1Key = round.team1!.slice().sort().join('&')
                                      const team2Key = round.team2!.slice().sort().join('&')
                                      
                                      if (!teamScores[team1Key]) teamScores[team1Key] = 0
                                      if (!teamScores[team2Key]) teamScores[team2Key] = 0
                                      
                                      // Add win to the winning team
                                      if (round.winning_team === 1) teamScores[team1Key]++
                                      else if (round.winning_team === 2) teamScores[team2Key]++

                                      return (
                                        <div key={round.id} className="bg-slate-800/50 p-3 rounded-lg">
                                          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-sm font-bold">
                                            <div className={`text-right ${round.winning_team === 1 ? 'text-green-400' : 'text-red-400'}`}>
                                              <span>{round.team1!.join(' & ')}</span>
                                              <span className="text-amber-400 ml-2">({teamScores[team1Key]})</span>
                                            </div>
                                            <span className="text-amber-400 text-center px-2">vs</span>
                                            <div className={`text-left ${round.winning_team === 2 ? 'text-green-400' : 'text-red-400'}`}>
                                              <span className="text-amber-400 mr-2">({teamScores[team2Key]})</span>
                                              <span>{round.team2!.join(' & ')}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })
                                  })()}
                                  <div className="text-center text-amber-400 text-sm font-bold mt-3 pt-3 border-t border-slate-700">
                                    Total Matches: {gameRounds.length}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : game.game_type === 'Rung' && !isOngoingRung ? (
                        /* Completed Rung game - show final results */
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
                          {game.losers?.map(p => (
                            <span key={p} className="bg-red-600 text-white px-2 py-1 rounded text-xs md:text-sm font-semibold shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        /* Regular games */
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
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

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
          <span className="text-slate-600">|</span>
          <a href="/user/login" className="text-slate-400 hover:text-slate-200 text-sm">User Login</a>
        </div>
      </div>
    </div>
  )
}