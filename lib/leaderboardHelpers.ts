// lib/leaderboardHelpers.ts
import type { Game } from '@/lib/types'

export const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

export interface PlayerStats {
  player: string
  gamesPlayed: number
  wins: number
  runnerUps: number
  survivals: number
  losses: number
  weightedWins: number
  winRate: string
  recent: string[]
  bestStreak: number
  shitheadLosses: number
}

/**
 * Calculate overall player statistics from all completed games/sessions
 */
export function calculatePlayerStats(
  completedGames: Game[],
  selectedPlayers: string[] = []
): PlayerStats[] {
  const activePlayers = selectedPlayers.length > 0 ? selectedPlayers : PLAYERS
  const stats: Record<string, any> = {}

  activePlayers.forEach(p => {
    stats[p] = {
      player: p,
      gamesPlayed: 0,
      wins: 0,
      runnerUps: 0,
      survivals: 0,
      losses: 0,
      weightedWins: 0,
      recent: [] as string[],
      bestStreak: 0,
      shitheadLosses: 0
    }
  })

  completedGames.forEach(game => {
    const players = game.players_in_game || []

    players.forEach(p => {
      if (stats[p]) stats[p].gamesPlayed++
    })

    game.winners?.forEach(p => {
      if (stats[p]) {
        stats[p].wins++
        stats[p].weightedWins += 1
        stats[p].recent.push('W')
      }
    })

    game.runners_up?.forEach(p => {
      if (stats[p]) {
        stats[p].runnerUps++
        stats[p].weightedWins += 0.4
        stats[p].recent.push('R')
      }
    })

    game.survivors?.forEach(p => {
      if (stats[p]) {
        stats[p].survivals++
        stats[p].weightedWins += 0.1
        stats[p].recent.push('S')
      }
    })

    game.losers?.forEach(p => {
      if (stats[p]) {
        stats[p].losses++
        stats[p].recent.push('L')
        
        if (game.game_type === 'Shithead') {
          stats[p].shitheadLosses++
        }
      }
    })
  })

  // Calculate best winning streak for each player
  activePlayers.forEach(player => {
    let currentStreak = 0
    let bestStreak = 0

    const reversedGames = completedGames.slice().reverse()
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

  return Object.values(stats)
    .filter((p: any) => p.gamesPlayed >= 0)
    .map((p: any) => ({
      ...p,
      winRate:
        p.gamesPlayed > 0
          ? ((p.weightedWins / p.gamesPlayed) * 100).toFixed(0)
          : '0',
      recent: p.recent.slice(-10)
    }))
    .sort(
      (a: any, b: any) =>
        parseFloat(b.winRate) - parseFloat(a.winRate) ||
        b.weightedWins - a.weightedWins
    )
}

/**
 * Calculate per-game-type statistics
 */
export function calculatePerGameStats(
  completedGames: Game[],
  gameType: string,
  selectedPlayers: string[] = []
): PlayerStats[] {
  const filteredGames = completedGames.filter(g => g.game_type === gameType)
  return calculatePlayerStats(filteredGames, selectedPlayers)
}

/**
 * Detect perfect games (1 winner, no runners-up, 2+ losers)
 */
export function detectPerfectGame(games: Game[]): Game | null {
  const latestIndividualGame = games.filter(g => g.game_type !== 'Rung')[0]

  if (
    latestIndividualGame &&
    latestIndividualGame.winners &&
    latestIndividualGame.winners.length === 1
  ) {
    const hasRunnerUps =
      latestIndividualGame.runners_up && latestIndividualGame.runners_up.length > 0
    const isPerfect =
      !hasRunnerUps &&
      latestIndividualGame.losers &&
      latestIndividualGame.losers.length >= 2

    if (isPerfect) {
      return latestIndividualGame
    }
  }

  return null
}

/**
 * Detect shithead losing streaks (3+ consecutive losses)
 */
export function detectShitheadStreak(games: Game[]): {
  player: string
  streak: number
} | null {
  const shitheadGames = games.filter(g => g.game_type === 'Shithead')
  const playerStreaks: Record<string, number> = {}

  for (const game of shitheadGames) {
    if (!game.losers || game.losers.length === 0) continue

    const shithead = game.losers[game.losers.length - 1]
    if (!playerStreaks[shithead]) {
      playerStreaks[shithead] = 1
      for (let i = shitheadGames.indexOf(game) + 1; i < shitheadGames.length; i++) {
        const nextGame = shitheadGames[i]
        if (
          nextGame.losers &&
          nextGame.losers[nextGame.losers.length - 1] === shithead
        ) {
          playerStreaks[shithead]++
        } else {
          break
        }
      }
    }
  }

  const maxStreak = Math.max(...Object.values(playerStreaks), 0)
  if (maxStreak >= 3) {
    const player = Object.keys(playerStreaks).find(
      p => playerStreaks[p] === maxStreak
    )
    if (player) {
      return { player, streak: maxStreak }
    }
  }

  return null
}

/**
 * Determine latest winner type for banner display
 */
export function getLatestWinnerType(
  games: Game[]
): { game: Game; type: 'dominated' | 'shithead' | 'normal' } | null {
  const latestIndividualGame = games.filter(g => g.game_type !== 'Rung')[0]

  if (
    latestIndividualGame &&
    latestIndividualGame.winners &&
    latestIndividualGame.winners.length === 1
  ) {
    const hasRunnerUps =
      latestIndividualGame.runners_up && latestIndividualGame.runners_up.length > 0
    const isPerfect =
      !hasRunnerUps &&
      latestIndividualGame.losers &&
      latestIndividualGame.losers.length >= 2

    if (isPerfect) {
      return { game: latestIndividualGame, type: 'dominated' }
    } else if (latestIndividualGame.game_type === 'Shithead') {
      return { game: latestIndividualGame, type: 'shithead' }
    } else {
      return { game: latestIndividualGame, type: 'normal' }
    }
  }

  return null
}

/**
 * Filter games by selected players (exact match on player count and names)
 */
export function filterGamesByPlayers(
  games: Game[],
  selectedPlayers: string[]
): Game[] {
  if (selectedPlayers.length === 0) return games

  return games.filter(game => {
    if (game.game_type === 'Rung') {
      const allPlayers = [...(game.team1 || []), ...(game.team2 || [])]
      return (
        allPlayers.length === selectedPlayers.length &&
        selectedPlayers.every(p => allPlayers.includes(p))
      )
    } else {
      const gamePlayers = game.players_in_game || []
      return (
        gamePlayers.length === selectedPlayers.length &&
        selectedPlayers.every(p => gamePlayers.includes(p))
      )
    }
  })
}

/**
 * Filter games by game type
 */
export function filterGamesByType(games: Game[], gameType: string): Game[] {
  if (gameType === 'All Games') return games
  return games.filter(g => g.game_type === gameType)
}

/**
 * Get Hall of Fame (top 3 players by win rate with minimum games)
 */
export function getHallOfFame(
  stats: PlayerStats[],
  minGames: number = 5
): PlayerStats[] {
  return stats.filter(p => p.gamesPlayed >= minGames).slice(0, 3)
}

/**
 * Get Hall of Shame (bottom 3 players by win rate with minimum games)
 */
export function getHallOfShame(
  stats: PlayerStats[],
  minGames: number = 5
): PlayerStats[] {
  return stats
    .filter(p => p.gamesPlayed >= minGames)
    .slice()
    .reverse()
    .slice(0, 3)
}
