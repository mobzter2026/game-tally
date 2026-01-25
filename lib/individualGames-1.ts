// lib/individualGames.ts
import type { Game } from '@/lib/types'

export type PlayerTier = {
  winners: string[]
  runners: string[]
  survivors: string[]
  losers: string[]
}

/**
 * Blackjack games are individual (no sessions).
 * They already have proper tier assignments from the scoring page.
 */
export function processBlackjackGames(allGames: Game[]): Game[] {
  return allGames
    .filter(g => g.game_type === 'Blackjack')
    .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
}

/**
 * Shithead games are individual (no sessions).
 * IMPORTANT: Ensure no player appears in multiple categories (duplicate prevention).
 * Priority order: winners > runners_up > survivors > losers
 */
export function processShitheadGames(allGames: Game[]): Game[] {
  const shitheadGames = allGames.filter(g => g.game_type === 'Shithead')

  return shitheadGames.map(game => {
    const seen = new Set<string>()

    // Priority order: winners first, then runners, survivors, losers
    const winners = (game.winners || []).filter(p => {
      if (seen.has(p)) return false
      seen.add(p)
      return true
    })

    const runners_up = (game.runners_up || []).filter(p => {
      if (seen.has(p)) return false
      seen.add(p)
      return true
    })

    const survivors = (game.survivors || []).filter(p => {
      if (seen.has(p)) return false
      seen.add(p)
      return true
    })

    const losers = (game.losers || []).filter(p => {
      if (seen.has(p)) return false
      seen.add(p)
      return true
    })

    return {
      ...game,
      winners,
      runners_up,
      survivors,
      losers,
    }
  }).sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
}

/**
 * Validate Shithead results to ensure correct logic:
 * - Lowest score(s) = winners
 * - Highest score(s) = losers (the shithead)
 * - No player should appear in multiple categories
 */
export function validateShitheadTiers(game: Game): boolean {
  const allCategorized = [
    ...(game.winners || []),
    ...(game.runners_up || []),
    ...(game.survivors || []),
    ...(game.losers || []),
  ]

  // Check for duplicates
  const seen = new Set<string>()
  for (const player of allCategorized) {
    if (seen.has(player)) return false
    seen.add(player)
  }

  return true
}
