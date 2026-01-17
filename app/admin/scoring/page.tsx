'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Shithead', 'Blackjack', 'Rung']
const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎭'
}

interface Session {
  game: string
  date: string
  players: string[]
  threshold: number
  team1: string[]
  team2: string[]
}

export default function ScoringPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [teamSelectionMode, setTeamSelectionMode] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 })
  const [eliminationHistory, setEliminationHistory] = useState<string[]>([])
  const [rungRounds, setRungRounds] = useState<Array<{ team1: string[]; team2: string[]; winner: 1 | 2 }>>([])
  const [rungTeamScores, setRungTeamScores] = useState<Record<string, number>>({})
  const [results, setResults] = useState<{
    winners: string[]
    runnersUp: string[]
    survivors: string[]
    losers: string[]
    winningTeam?: number
  }>({ winners: [], runnersUp: [], survivors: [], losers: [] })

  const [newSession, setNewSession] = useState<Session>({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [],
    threshold: 3,
    team1: [],
    team2: []
  })

  useEffect(() => setLoading(false), [])

  const getTeamKey = (players: string[]) => players.slice().sort().join('')

  // ---------------- PLAYER SELECTION ----------------
  const togglePlayer = (player: string) => {
    setNewSession(s => ({
      ...s,
      players: s.players.includes(player) ? s.players.filter(p => p !== player) : [...s.players, player]
    }))
  }

  const selectAllPlayers = () => setNewSession(s => ({ ...s, players: [...PLAYERS] }))
  const clearPlayers = () => setNewSession(s => ({ ...s, players: [] }))
  const toggleThreshold = (num: number) => setNewSession(s => ({ ...s, threshold: num }))
// ---------------- TEAM SELECTION ----------------
  const toggleTeamPlayer = (player: string, team: 'team1' | 'team2') => {
    const otherTeam = team === 'team1' ? 'team2' : 'team1'
    setNewSession(s => ({
      ...s,
      [team]: s[team].includes(player) ? s[team].filter(p => p !== player) : [...s[team], player],
      [otherTeam]: s[otherTeam].filter(p => p !== player)
    }))
  }

  const startNewRound = () => {
    if (newSession.game === 'Rung') {
      setTeamSelectionMode(true)
      return
    }
    if (newSession.players.length === 0) {
      alert('Please select at least one player!')
      return
    }
    const initialScores: Record<string, number> = {}
    newSession.players.forEach(p => (initialScores[p] = 0))
    setScores(initialScores)
    setGameStarted(true)
  }

  const startRungGame = () => {
    if (newSession.team1.length !== 2 || newSession.team2.length !== 2) {
      alert('Please select 2 players for each team!')
      return
    }
    const team1Key = getTeamKey(newSession.team1)
    const team2Key = getTeamKey(newSession.team2)
    setRungTeamScores({ [team1Key]: 0, [team2Key]: 0 })
    setTeamScores({ team1: 0, team2: 0 })
    setRungRounds([])
    setTeamSelectionMode(false)
    setNewSession(s => ({ ...s, threshold: 5 }))
    setGameStarted(true)
  }

  // ---------------- SCORE UPDATES ----------------
  const updateScore = (player: string, delta: number) => {
    setScores(prev => {
      const newScore = Math.max(0, (prev[player] || 0) + delta)
      const updated = { ...prev, [player]: newScore }

      if (newSession.game === 'Shithead' && newScore >= newSession.threshold) {
        calculateShitheadResults(updated)
      } else if (newSession.game !== 'Blackjack' && newSession.game !== 'Rung' && newScore >= newSession.threshold) {
        calculateResults(updated)
      }

      return updated
    })
  }

  const updateTeamScore = (team: 'team1' | 'team2', delta: number) => {
    setTeamScores(prev => {
      const newScore = prev[team] + delta
      const teamKey = getTeamKey(newSession[team])
      const updated = { ...rungTeamScores, [teamKey]: newScore }
      setRungTeamScores(updated)

      if (newScore >= newSession.threshold) {
        finalizeRungResults(team === 'team1' ? 1 : 2)
      }

      return { ...prev, [team]: newScore }
    })
  }

  // ---------------- RESULT CALCULATIONS ----------------
  const calculateResults = (finalScores: Record<string, number>) => {
    const sorted = Object.entries(finalScores).sort(([, a], [, b]) => b - a)
    const maxScore = sorted[0][1]
    const winners = sorted.filter(([, s]) => s === maxScore).map(([p]) => p)

    const remaining = sorted.filter(([, s]) => s < maxScore)
    const secondHighest = remaining.length ? remaining[0][1] : -1
    const runnersUp = remaining.filter(([, s]) => s === secondHighest).map(([p]) => p)

    const rest = remaining.filter(([, s]) => s < secondHighest && s > 0)
    const minScore = sorted[sorted.length - 1][1]
    const losers = sorted.filter(([, s]) => s === minScore && s < maxScore).map(([p]) => p)

    const survivors = rest.map(([p]) => p)

    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }

  const calculateShitheadResults = (finalScores: Record<string, number>) => {
    const sorted = Object.entries(finalScores).sort(([, a], [, b]) => a - b) // lowest wins
    const minScore = sorted[0][1]
    const maxScore = sorted[sorted.length - 1][1]

    const winners = sorted.filter(([, s]) => s === minScore).map(([p]) => p)
    const losers = sorted.filter(([, s]) => s === maxScore).map(([p]) => p)

    const middle = sorted.filter(([, s]) => s > minScore && s < maxScore)
    const secondLowest = middle.length ? middle[0][1] : null
    const runnersUp = middle.filter(([, s]) => s === secondLowest).map(([p]) => p)
    const survivors = middle.filter(([p, s]) => s !== secondLowest).map(([p]) => p)

    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }
const finalizeRungResults = (winningTeam: 1 | 2) => {
    const teamMap: Record<string, { players: string[]; wins: number }> = {}

    rungRounds.forEach(round => {
      const t1Key = getTeamKey(round.team1)
      const t2Key = getTeamKey(round.team2)

      if (!teamMap[t1Key]) teamMap[t1Key] = { players: round.team1, wins: 0 }
      if (!teamMap[t2Key]) teamMap[t2Key] = { players: round.team2, wins: 0 }

      teamMap[round.winner === 1 ? t1Key : t2Key].wins++
    })

    const sortedTeams = Object.values(teamMap).sort((a, b) => b.wins - a.wins)
    const topWins = sortedTeams[0].wins
    const bottomWins = sortedTeams[sortedTeams.length - 1].wins

    const winners = sortedTeams.filter(t => t.wins === topWins).flatMap(t => t.players)
    const losers = sortedTeams.filter(t => t.wins === bottomWins).flatMap(t => t.players)
    const middle = sortedTeams.filter(t => t.wins > bottomWins && t.wins < topWins)
    const secondWins = middle.length ? middle[0].wins : null
    const runnersUp = middle.filter(t => t.wins === secondWins).flatMap(t => t.players)
    const survivors = middle.filter(t => t.wins !== secondWins).flatMap(t => t.players)

    setResults({ winners, runnersUp, survivors, losers, winningTeam })
    setGameComplete(true)
  }

  // ---------------- SAVE GAME ----------------
  const saveGame = async () => {
    try {
      // ... keep your existing saveGame logic (unchanged)
    } catch (error) {
      alert(`Failed to save game: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950">
        Loading…
      </div>
    )
  }
return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-3 overflow-auto">
      <div className="max-w-2xl mx-auto">
        {/* PAGE TITLE */}
        <h1 className="text-center select-none text-[1.3rem] sm:text-[1.6rem] font-semibold tracking-[0.14em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] mb-4">
          <span className="inline-block mr-1.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
          <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            POINTS ROYALE
          </span>
          <span className="inline-block ml-1.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
        </h1>

        {/* --------- NEW ROUND / TEAM SELECTION --------- */}
        {!gameStarted && !teamSelectionMode ? (
          <div className="rounded-xl p-4 space-y-4 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-xl sm:text-2xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              New Round
            </h2>

            {/* DATE + GAME SELECTION */}
            <div className="flex gap-3 mb-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-center mb-1">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                  className="h-9 w-full font-bold text-sm rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 text-center shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all px-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e => setNewSession({ ...newSession, game: e.target.value })}
                  className="h-9 w-full text-center text-sm font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 appearance-none px-2 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>{GAME_EMOJIS[g]} {g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PLAYER SELECTION + THRESHOLD (non-Rung) */}
            {newSession.game !== 'Rung' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  {newSession.players.length === 0 ? (
                    <Button onClick={selectAllPlayers} variant="pop" color="blue" className="flex-1 h-9 text-sm">
                      ♠ Deal All
                    </Button>
                  ) : (
                    <Button onClick={clearPlayers} variant="pop" color="red" className="flex-1 h-9 text-sm">
                      ✖ Clear
                    </Button>
                  )}
                  {newSession.game !== 'Blackjack' && (
                    <div className="flex gap-2 items-center">
                      {[3, 5].map(num => (
                        <Button
                          key={num}
                          onClick={() => toggleThreshold(num)}
                          variant="frosted"
                          color="purple"
                          selected={newSession.threshold === num}
                          className="w-8 h-8 rounded-full text-xs"
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {PLAYERS.map(p => (
                    <Button
                      key={p}
                      onClick={() => togglePlayer(p)}
                      variant="frosted"
                      color="purple"
                      selected={newSession.players.includes(p)}
                      className="h-9 text-sm font-semibold"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </>
            )}

            <Button
              onClick={startNewRound}
              disabled={newSession.game !== 'Rung' && newSession.players.length === 0}
              variant="frosted"
              color="purple"
              className={`w-full py-2.5 rounded-xl font-bold text-base ${
                (newSession.game === 'Rung' || newSession.players.length > 0)
                  ? 'ring-2 ring-amber-400 shadow-[inset_0_0_10px_rgba(255,170,0,0.85),0_0_18px_rgba(255,170,0,0.9),0_0_32px_rgba(255,170,0,0.55)]'
                  : ''
              }`}
            >
        👊 Let the Madness Begin
            </Button>
          </div>
        ) : teamSelectionMode ? (
          // ---------------- TEAM SELECTION ----------------
          <div className="rounded-xl p-4 space-y-4 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {gameStarted ? `Select New ${newSession.team1.length === 0 ? 'Team 1' : 'Team 2'}` : 'Select Teams'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {[['team1', 'Team 1', 'blue'], ['team2', 'Team 2', 'red']]?.map(([teamKey, label, color]) => (
                <div key={teamKey} className="space-y-2">
                  <h3 className={`text-center font-bold text-sm text-${color}-400`}>{label}</h3>
                  {PLAYERS.map(p => (
                    <Button
                      key={p}
                      onClick={() => toggleTeamPlayer(p, teamKey as 'team1' | 'team2')}
                      variant="frosted"
                      color="purple"
                      selected={newSession[teamKey as 'team1' | 'team2'].includes(p)}
                      className="w-full h-8 text-xs font-semibold"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold">Race to 5</span>
            </div>

            <Button
              onClick={startRungGame}
              variant="pop"
              className="w-full py-2.5 rounded-xl font-bold text-base bg-gradient-to-br from-emerald-600 to-emerald-900"
            >
              Start Rung Game
            </Button>
          </div>
        ) : !gameComplete ? (
          // ---------------- GAME IN PROGRESS ----------------
          newSession.game === 'Rung' ? (
            <RungRoundUI
              session={newSession}
              rungTeamScores={rungTeamScores}
              rungRounds={rungRounds}
              updateTeamScore={updateTeamScore}
            />
          ) : newSession.game === 'Blackjack' ? (
            <BlackjackRoundUI
              session={newSession}
              eliminationHistory={eliminationHistory}
              setEliminationHistory={setEliminationHistory}
              setNewSession={setNewSession}
              setResults={setResults}
              setGameComplete={setGameComplete}
            />
          ) : (
            <OtherGameRoundUI
              session={newSession}
              scores={scores}
              updateScore={updateScore}
              calculateResults={() =>
                newSession.game === 'Shithead' ? calculateShitheadResults(scores) : calculateResults(scores)
              }
            />
          )
        ) : (
          // ---------------- GAME COMPLETE ----------------
          <ResultsUI session={newSession} results={results} saveGame={saveGame} />
        )}
      </div>
    </div>
  )
}