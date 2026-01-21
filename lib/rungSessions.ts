// lib/rungSessions.ts
import type { Game } from '@/lib/types'

export type PlayerTier = {
  winners: string[]
  runners: string[]
  survivors: string[]
  losers: string[]
}

export type RungSession = {
  key: string
  gameDate: string
  rounds: Game[]              // chronological (oldest -> newest)
  teamScores: Record<string, number> // teamKey -> wins within this session
  playerBest: Record<string, { teamKey: string; wins: number }>
  tiers: PlayerTier
  isComplete: boolean
  endAtIso: string | null
  roundCount: number
}

export function teamKey(team: string[]) {
  return team.slice().sort().join('&')
}

export function computePlayerTiersFromBest(
  playerBest: Record<string, { teamKey: string; wins: number }>
): PlayerTier {
  const players = Object.keys(playerBest)
  if (players.length === 0) return { winners: [], runners: [], survivors: [], losers: [] }

  const scores = players.map(p => playerBest[p]?.wins ?? 0)
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)

  const winners = players.filter(p => (playerBest[p]?.wins ?? 0) === maxScore && maxScore >= 5)
  const nonWinners = players.filter(p => !winners.includes(p))

  // If no non-winners, nothing else to classify
  if (nonWinners.length === 0) return { winners, runners: [], survivors: [], losers: [] }

  const nonWinnerScores = nonWinners.map(p => playerBest[p]?.wins ?? 0)
  const maxNonWinner = Math.max(...nonWinnerScores)
  const minNonWinner = Math.min(...nonWinnerScores)

  // Rule: if winners exist and the remainder are tied -> no runners, all losers
  if (winners.length > 0 && maxNonWinner === minNonWinner) {
    return { winners, runners: [], survivors: [], losers: nonWinners }
  }

  // Also if everyone tied (no winners because maxScore < 5), treat all as losers (no runners/survivors)
  if (winners.length === 0 && maxScore === minScore) {
    return { winners: [], runners: [], survivors: [], losers: players }
  }

  const runners = nonWinners.filter(p => (playerBest[p]?.wins ?? 0) === maxNonWinner)
  const losers = nonWinners.filter(p => (playerBest[p]?.wins ?? 0) === minNonWinner)
  const survivors = nonWinners.filter(
    p => !runners.includes(p) && !losers.includes(p) && (playerBest[p]?.wins ?? 0) > minNonWinner
  )

  return { winners, runners, survivors, losers }
}

function isRungRound(g: Game) {
  return g.game_type === 'Rung' && Array.isArray(g.team1) && Array.isArray(g.team2) && g.team1.length > 0 && g.team2.length > 0
}

/**
 * Build Rung sessions by scanning rounds in chronological order per day.
 * A session ends when ANY team reaches 5 wins (first-to-5), then counters reset.
 * Sessions are keyed by date + session start created_at, so editing dates won't collide.
 */
export function buildRungSessions(allGames: Game[]): RungSession[] {
  const rungRounds = allGames
    .filter(isRungRound)
    .filter(g => g.winning_team !== null && g.winning_team !== undefined)
    .slice()
    .sort((a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime())

  // Group by date first (because your sessions are per-day)
  const roundsByDate: Record<string, Game[]> = {}
  for (const r of rungRounds) {
    const d = r.game_date
    if (!d) continue
    if (!roundsByDate[d]) roundsByDate[d] = []
    roundsByDate[d].push(r)
  }

  const sessions: RungSession[] = []

  for (const date of Object.keys(roundsByDate).sort()) {
    const rounds = roundsByDate[date].slice().sort((a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime())

    let sessionStartIdx = 0
    let teamWins: Record<string, number> = {}
    let sessionIndex = 1

    const flushSession = (endIdx: number) => {
      const sessionRounds = rounds.slice(sessionStartIdx, endIdx + 1)
      if (sessionRounds.length === 0) return

      const scores: Record<string, number> = {}
      for (const rr of sessionRounds) {
        const t1 = teamKey(rr.team1!)
        const t2 = teamKey(rr.team2!)
        if (!scores[t1]) scores[t1] = 0
        if (!scores[t2]) scores[t2] = 0

        if (rr.winning_team === 1) scores[t1]++
        else if (rr.winning_team === 2) scores[t2]++
      }

      // Build player best-team table
      const playerBest: Record<string, { teamKey: string; wins: number }> = {}
      const allTeams = Object.keys(scores)

      const allPlayers = new Set<string>()
      for (const tk of allTeams) tk.split('&').forEach(p => allPlayers.add(p))

      for (const p of allPlayers) {
        let bestWins = -1
        let bestTeam = ''
        for (const tk of allTeams) {
          if (tk.split('&').includes(p)) {
            const w = scores[tk] ?? 0
            if (w > bestWins) {
              bestWins = w
              bestTeam = tk
            }
          }
        }
        playerBest[p] = { teamKey: bestTeam, wins: Math.max(0, bestWins) }
      }

      const tiers = computePlayerTiersFromBest(playerBest)
      const isComplete = Object.values(scores).some(w => w >= 5)
      const endAtIso = sessionRounds[sessionRounds.length - 1]?.created_at ?? null

      const startAtIso = sessionRounds[0]?.created_at ?? `${date}T00:00:00.000Z`
      sessions.push({
        key: `${date}__${startAtIso}__${sessionIndex}`,
        gameDate: date,
        rounds: sessionRounds,
        teamScores: scores,
        playerBest,
        tiers,
        isComplete,
        endAtIso,
        roundCount: sessionRounds.length,
      })
    }

    for (let i = 0; i < rounds.length; i++) {
      const rr = rounds[i]
      const t1 = teamKey(rr.team1!)
      const t2 = teamKey(rr.team2!)

      if (!teamWins[t1]) teamWins[t1] = 0
      if (!teamWins[t2]) teamWins[t2] = 0

      if (rr.winning_team === 1) teamWins[t1]++
      else if (rr.winning_team === 2) teamWins[t2]++

      const sessionComplete = Object.values(teamWins).some(w => w >= 5)

      if (sessionComplete) {
        flushSession(i)
        // reset for next session
        sessionStartIdx = i + 1
        teamWins = {}
        sessionIndex++
      }
    }

    // leftover (ongoing) session
    if (sessionStartIdx < rounds.length) {
      flushSession(rounds.length - 1)
    }
  }

  // newest first for display
  return sessions.sort((a, b) => new Date(b.endAtIso ?? `${b.gameDate}T00:00:00Z`).getTime() - new Date(a.endAtIso ?? `${a.gameDate}T00:00:00Z`).getTime())
}

/** For a given round, return a display string: "A & B (5)   vs   (2) C & D" and which side is losing */
export function formatRoundLine(
  round: Game,
  runningScores: Record<string, number>
): { left: string; right: string; leftLosing: boolean; rightLosing: boolean } {
  const leftTeam = (round.team1 ?? []).join(' & ')
  const rightTeam = (round.team2 ?? []).join(' & ')
  const t1 = teamKey(round.team1 ?? [])
  const t2 = teamKey(round.team2 ?? [])
  const s1 = runningScores[t1] ?? 0
  const s2 = runningScores[t2] ?? 0
  const leftLosing = s1 < s2
  const rightLosing = s2 < s1
  return {
    left: `${leftTeam} (${s1})`,
    right: `(${s2}) ${rightTeam}`,
    leftLosing,
    rightLosing,
  }
}
