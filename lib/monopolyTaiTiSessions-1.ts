// lib/monopolyTaiTiSessions.ts
import type { Game } from '@/lib/types'

export type PlayerTier = {
  winners: string[]
  runners: string[]
  survivors: string[]
  losers: string[]
}

export type MonopolyTaiTiSession = {
  key: string
  gameType: 'Monopoly' | 'Tai Ti'
  gameDate: string
  rounds: Game[]
  playerWins: Record<string, number>
  threshold: number
  tiers: PlayerTier
  isComplete: boolean
  endAtIso: string | null
  roundCount: number
}

export function computePlayerTiers(
  playerWins: Record<string, number>,
  threshold: number
): PlayerTier {
  const players = Object.keys(playerWins)
  if (players.length === 0) return { winners: [], runners: [], survivors: [], losers: [] }

  const sorted = players
    .map(p => ({ player: p, wins: playerWins[p] || 0 }))
    .sort((a, b) => b.wins - a.wins)

  const maxWins = sorted[0].wins
  const minWins = sorted[sorted.length - 1].wins

  const winners = sorted.filter(p => p.wins === maxWins).map(p => p.player)
  const losers = sorted.filter(p => p.wins === minWins && p.wins < maxWins).map(p => p.player)

  const remaining = sorted.filter(
    p => !winners.includes(p.player) && !losers.includes(p.player)
  )

  let runners: string[] = []
  let survivors: string[] = []

  if (remaining.length > 0) {
    const maxRemainingWins = Math.max(...remaining.map(p => p.wins))
    runners = remaining.filter(p => p.wins === maxRemainingWins).map(p => p.player)
    survivors = remaining.filter(p => !runners.includes(p.player)).map(p => p.player)
  }

  return { winners, runners, survivors, losers }
}

function isMonopolyOrTaiTiRound(g: Game, gameType: 'Monopoly' | 'Tai Ti') {
  return (
    g.game_type === gameType &&
    Array.isArray(g.players_in_game) &&
    g.players_in_game.length > 0 &&
    Array.isArray(g.winners) &&
    g.winners.length > 0
  )
}

/**
 * Build Monopoly/Tai Ti sessions by scanning rounds in chronological order per day.
 * A session ends when ANY player reaches the threshold (default 3, or 5 if configured).
 * Sessions are grouped by: same date + same players.
 */
export function buildMonopolyTaiTiSessions(
  allGames: Game[],
  gameType: 'Monopoly' | 'Tai Ti'
): MonopolyTaiTiSession[] {
  const rounds = allGames
    .filter(g => isMonopolyOrTaiTiRound(g, gameType))
    .slice()
    .sort((a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime())

  const sessions: MonopolyTaiTiSession[] = []
  const used = new Set<string>()

  for (const game of rounds) {
    if (used.has(game.id)) continue

    const session: Game[] = [game]
    used.add(game.id)

    const playerWins: Record<string, number> = {}
    const allPlayers = game.players_in_game || []
    
    // Initialize player win counts
    allPlayers.forEach(p => (playerWins[p] = 0))
    
    // Count wins from first game
    game.winners?.forEach(p => {
      playerWins[p] = (playerWins[p] || 0) + 1
    })

    // Read threshold from the first game (defaults to 3 if not set)
    const threshold = game.threshold || 3

    // Look for subsequent rounds on same day with same players
    for (const nextGame of rounds) {
      if (used.has(nextGame.id)) continue
      if (nextGame.game_date !== game.game_date) continue

      const samePlayers =
        JSON.stringify((nextGame.players_in_game || []).slice().sort()) ===
        JSON.stringify(allPlayers.slice().sort())

      if (!samePlayers) continue

      // Add to session
      session.push(nextGame)
      used.add(nextGame.id)

      // Update win counts
      nextGame.winners?.forEach(p => {
        playerWins[p] = (playerWins[p] || 0) + 1
      })

      // Check if someone hit threshold
      const maxWins = Math.max(...Object.values(playerWins))
      if (maxWins >= threshold) break
    }

    // Sort rounds chronologically
    session.sort(
      (a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime()
    )

    const maxWins = Math.max(...Object.values(playerWins))
    const isComplete = maxWins >= threshold
    const tiers = computePlayerTiers(playerWins, threshold)
    const endAtIso = session[session.length - 1]?.created_at ?? null
    const startAtIso = session[0]?.created_at ?? `${game.game_date}T00:00:00.000Z`

    sessions.push({
      key: `${gameType}-${game.game_date}__${startAtIso}`,
      gameType,
      gameDate: game.game_date,
      rounds: session,
      playerWins,
      threshold,
      tiers,
      isComplete,
      endAtIso,
      roundCount: session.length,
    })
  }

  // Newest first for display
  return sessions.sort(
    (a, b) =>
      new Date(b.endAtIso ?? `${b.gameDate}T00:00:00Z`).getTime() -
      new Date(a.endAtIso ?? `${a.gameDate}T00:00:00Z`).getTime()
  )
}
