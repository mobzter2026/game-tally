'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const MIN_GAMES_FOR_RANKING = 0

const QUOTES = [ "Friendship ends where the game begins.", "It's not about winning, it's about making others lose.", "Every card tells a story of betrayal.", "Where loyalty dies and legends are born.", "Every loss is just character building… and humiliation.", "If at first you don't succeed… shuffle and try again.", "Victory is earned. Humiliation is free.", "Some are born winners. Others are just funny losers.", "The table is a battlefield. Your ego is the weapon.", "You can't control luck… but you can ruin everyone else's day.", "Pain is temporary. Bragging rights are forever.", "Hope your therapy sessions are ready.", "One table. Many casualties.", "Lose today. Regret tomorrow. Cry later.", "Your dignity called… it's filing a complaint.", "Lose today. Learn tomorrow. Dominate next time.", "Winners rise. Everyone else takes notes… or cry.", "Step up or step aside." ]

const GAME_EMOJIS: Record<string, string> = { 'Blackjack': '🃏', 'Monopoly': '🎲', 'Tai Ti': '🀄', 'Shithead': '💩', 'Rung': '🎴' }

const INDIVIDUAL_GAMES = ['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead']

export default function PublicView() { const [games, setGames] = useState<Game[]>([]) const [loading, setLoading] = useState(true) const [activeTab, setActiveTab] = useState<'individual' | 'rung-teams' | 'rung-players'>('individual') const [perfectGame, setPerfectGame] = useState<Game | null>(null) const [shitheadLosingStreak, setShitheadLosingStreak] = useState<{player: string, streak: number} | null>(null) const [latestWinner, setLatestWinner] = useState<{game: Game, type: 'dominated' | 'shithead' | 'normal'} | null>(null) const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]) const [showFloatingFilter, setShowFloatingFilter] = useState(false) const [selectedGameType, setSelectedGameType] = useState<string>('All Games') const [hallView, setHallView] = useState<'none' | 'fame' | 'shame'>('none') const [currentQuote, setCurrentQuote] = useState(0) const supabase = createClient()

useEffect(() => { const interval = setInterval(() => { setCurrentQuote((prev) => (prev + 1) % QUOTES.length) }, 10000) return () => clearInterval(interval) }, [])

useEffect(() => { fetchGames()

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

const fetchGames = async () => { const { data } = await supabase .from('games') .select('*') .order('game_date', { ascending: false }) .order('created_at', { ascending: false })

if (data) {
  const gamesData = data as Game[]
  setGames(gamesData)
  checkPerfectGameAndStreak(gamesData)
}
setLoading(false)

}

const checkPerfectGameAndStreak = (gamesData: Game[]) => { const latestIndividualGame = gamesData.filter(g => g.game_type !== 'Rung')[0]

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

const togglePlayerFilter = (player: string) => { if (selectedPlayers.includes(player)) { setSelectedPlayers(selectedPlayers.filter(p => p !== player)) } else { setSelectedPlayers([...selectedPlayers, player]) } }

const selectAllPlayers = () => { setSelectedPlayers(PLAYERS) }

const clearFilter = () => { setSelectedPlayers([]) }

const getFilteredGames = () => { let filtered = games

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

const getPlayerStatsForGame = (gameType?: string) => { const stats: any = {} const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS

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

const getWorstShitheadPlayer = () => { const allStats = getPlayerStats() if (allStats.length === 0) return null

const maxShitheadLosses = Math.max(...allStats.map(p => p.shitheadLosses))
if (maxShitheadLosses === 0) return null

const worstPlayer = allStats.find(p => p.shitheadLosses === maxShitheadLosses)
return worstPlayer?.player || null

}

const getRungTeamStats = () => { const teamStats: any = {}

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

const getRungPlayerStats = () => { const stats: any = {} const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS

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

const getMedal = (sortedList: any[], currentIndex: number, getWinRate: (item: any) => string) => { const currentWinRate = getWinRate(sortedList[currentIndex])

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

const getMedalPosition = (sortedList: any[], currentIndex: number, getWinRate: (item: any) => string): number => { const currentWinRate = getWinRate(sortedList[currentIndex]) let position = 1 for (let i = 0; i < currentIndex; i++) { if (getWinRate(sortedList[i]) !== currentWinRate) { position = i + 2 } } if (currentIndex > 0 && getWinRate(sortedList[currentIndex - 1]) === currentWinRate) { return getMedalPosition(sortedList, currentIndex - 1, getWinRate) } return position }

const getPlayerBadgeColor = (game: Game, player: string) => { if (game.winners?.includes(player)) return 'bg-green-600' if (game.runners_up?.includes(player)) return 'bg-blue-600' if (game.losers?.includes(player)) return 'bg-red-600' return 'bg-slate-600' }

const sortPlayersInGame = (game: Game) => { if (!game.players_in_game) return []

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

if (loading) { return ( <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"> <div className="text-white text-2xl font-mono">Loading...</div> </div> ) }

const playerStats = getPlayerStats() const rungTeamStats = getRungTeamStats() const rungPlayerStats = getRungPlayerStats() const recentGames = activeTab === 'individual' ? filteredGames.filter(g => g.game_type !== 'Rung').slice(0, 20) : filteredGames.filter(g => g.game_type === 'Rung').slice(0, 20)

const worstShitheadPlayer = getWorstShitheadPlayer()

return ( <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-2 sm:p-4 font-mono overflow-x-hidden pb-24"> <div className="max-w-7xl mx-auto mt-4 px-2"> {latestWinner && latestWinner.type === 'dominated' && ( <div className="mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 px-4 py-2 rounded-lg shadow-lg animate-pulse"> <p className="text-sm font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis animate-pulse"> ⚡ Flawless victory in {latestWinner.game.game_type} by {latestWinner.game.winners?.[0]} ⚡ </p> </div> )}

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
          🏆 {latestWinner.game.winners?.[0]} won {latestWinner.game.game_type}. It wasn't pretty! 🏆
        </p>
      </div>
    )}

    {shitheadLosingStreak && shitheadLosingStreak.streak >= 3 && (
      <div className="mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis">
          {shitheadLosingStreak.player} is on a {shitheadLosingStreak.streak} game Shithead LOSING streak! 💩
        </p>
      </div>
    )}

    <div className="text-center mb-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 break-words">Ultimate Card Championship Leaderboard 🏆</h1>
      <p className="text-slate-300 text-xs sm:text-sm md:text-base italic transition-opacity duration-500 whitespace-nowrap overflow-hidden text-ellipsis px-2">"{QUOTES[currentQuote]}"</p>
    </div>

    <div className="mb-6 flex justify-center">
      <div className="bg-violet-950/25 rounded-xl border-2 border-white/60 p-4 max-w-md w-full">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-2 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
              activeTab === 'individual'
                ? 'bg-purple-600 text-white'
                : 'bg-violet-900/80 text-slate-300 hover:bg-violet-800'
            }`}
          >
            Solo Games
          </button>
          <button
            onClick={() => setActiveTab('rung-teams')}
            className={`px-2 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
              activeTab === 'rung-teams'
                ? 'bg-purple-600 text-white'
                : 'bg-violet-900/80 text-slate-300 hover:bg-violet-800'
            }`}
          >
            Rung - Duo
          </button>
          <button
            onClick={() => setActiveTab('rung-players')}
            className={`px-2 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
              activeTab === 'rung-players'
                ? 'bg-purple-600 text-white'
                : 'bg-violet-900/80 text-slate-300 hover:bg-violet-800'
            }`}
          >
            Rung - Solo
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
                  <div key={gameType} className="bg-violet-950/30 rounded-xl border-2 border-white/75 shadow-2xl overflow-hidden">
                    <div className={`p-4 border-b border-slate-700 ${hallView === 'fame'