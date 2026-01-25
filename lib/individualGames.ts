// lib/individualGames.ts
import type { Game } from '@/lib/types'

export type PlayerTier = {
  winners: string[]
  runners: string[]
  survivors: string[]
  losers: string[]
}

export function processBlackjackGames(allGames: Game[]): Game[] {
  return allGames
    .filter(g => g.game_type === 'Blackjack')
    .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
}

export function processShitheadGames(allGames: Game[]): Game[] {
  const shitheadGames = allGames.filter(g => g.game_type === 'Shithead')

  return shitheadGames.map(game => {
    const seen = new Set<string>()

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

export function validateShitheadTiers(game: Game): boolean {
  const allCategorized = [
    ...(game.winners || []),
    ...(game.runners_up || []),
    ...(game.survivors || []),
    ...(game.losers || []),
  ]

  const seen = new Set<string>()
  for (const player of allCategorized) {
    if (seen.has(player)) return false
    seen.add(player)
  }

  return true
}