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
}

export default function ScoringPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [eliminationHistory, setEliminationHistory] = useState<string[]>([])
  const [results, setResults] = useState<{
    winners: string[]
    runnersUp: string[]
    survivors: string[]
    losers: string[]
  }>({
    winners: [],
    runnersUp: [],
    survivors: [],
    losers: []
  })
  const [newSession, setNewSession] = useState<Session>({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: []
  })

  // Rung-specific state
  const [rungTeam1, setRungTeam1] = useState<string[]>([])
  const [rungTeam2, setRungTeam2] = useState<string[]>([])
  const [rungRounds, setRungRounds] = useState<Array<{team1: string[], team2: string[], winner: number}>>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)

  useEffect(() => {
    setLoading(false)
  }, [])

  const togglePlayer = (player: string) => {
    if (newSession.players.includes(player)) {
      setNewSession({
        ...newSession,
        players: newSession.players.filter(p => p !== player)
      })
    } else {
      setNewSession({
        ...newSession,
        players: [...newSession.players, player]
      })
    }
  }

  const selectAllPlayers = () => {
    setNewSession({ ...newSession, players: [...PLAYERS] })
  }

  const clearPlayers = () => {
    setNewSession({ ...newSession, players: [] })
  }

  // Rung team management
  const toggleRungTeam1 = (player: string) => {
    if (rungTeam1.includes(player)) {
      setRungTeam1(rungTeam1.filter(p => p !== player))
    } else if (rungTeam1.length < 2) {
      setRungTeam1([...rungTeam1, player])
    }
  }

  const toggleRungTeam2 = (player: string) => {
    if (rungTeam2.includes(player)) {
      setRungTeam2(rungTeam2.filter(p => p !== player))
    } else if (rungTeam2.length < 2) {
      setRungTeam2([...rungTeam2, player])
    }
  }

  const recordRungRound = (winningTeam: number) => {
    const newRound = {
      team1: [...rungTeam1],
      team2: [...rungTeam2],
      winner: winningTeam
    }
    setRungRounds([...rungRounds, newRound])
    setCurrentRound(currentRound + 1)
    
    if (winningTeam === 1) {
      setTeam1Score(team1Score + 1)
    } else {
      setTeam2Score(team2Score + 1)
    }
  }

  const saveRungSession = async () => {
    if (rungRounds.length === 0) {
      alert('No rounds to save!')
      return
    }

    // Save each individual round
    for (const round of rungRounds) {
      await (supabase.from('games').insert as any)({
        game_type: 'Rung',
        game_date: newSession.date,
        players_in_game: [...round.team1, ...round.team2],
        team1: round.team1,
        team2: round.team2,
        winning_team: round.winner,
        winners: null,
        losers: null
      })
    }

    // Calculate session summary based on each player's BEST team performance
    const teamWins: Record<string, number> = {}
    const allTeams = new Set<string>()
    
    rungRounds.forEach(round => {
      const team1Key = round.team1.slice().sort().join('&')
      const team2Key = round.team2.slice().sort().join('&')
      
      allTeams.add(team1Key)
      allTeams.add(team2Key)
      
      if (!teamWins[team1Key]) teamWins[team1Key] = 0
      if (!teamWins[team2Key]) teamWins[team2Key] = 0
      
      if (round.winner === 1) teamWins[team1Key]++
      else if (round.winner === 2) teamWins[team2Key]++
    })

    // For each player, find their best team
    const allPlayers = new Set<string>()
    allTeams.forEach(teamKey => {
      teamKey.split('&').forEach(p => allPlayers.add(p))
    })

    const playerBestTeam: Record<string, { team: string, wins: number }> = {}
    
    allPlayers.forEach(player => {
      let bestWins = -1
      let bestTeam = ''
      
      allTeams.forEach(teamKey => {
        if (teamKey.split('&').includes(player)) {
          const wins = teamWins[teamKey] || 0
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

    // Categorize players
    const playerScores = sortedPlayers.map(p => playerBestTeam[p]?.wins || 0)
    
    // Winners: reached 5
    const winners = sortedPlayers.filter(p => (playerBestTeam[p]?.wins || 0) >= 5)
    
    // Non-winners
    const nonWinners = sortedPlayers.filter(p => !winners.includes(p))
    const nonWinnerScores = nonWinners.map(p => playerBestTeam[p]?.wins || 0)
    const maxNonWinnerScore = nonWinnerScores.length > 0 ? Math.max(...nonWinnerScores) : 0
    const minNonWinnerScore = nonWinnerScores.length > 0 ? Math.min(...nonWinnerScores) : 0
    
    let runnersUp: string[] = []
    let survivors: string[] = []
    let losers: string[] = []
    
    if (nonWinners.length > 0) {
      // Runners-up: highest score among non-winners
      runnersUp = nonWinners.filter(p => (playerBestTeam[p]?.wins || 0) === maxNonWinnerScore)
      
      // If all non-winners have same score, they're all losers
      if (maxNonWinnerScore === minNonWinnerScore) {
        losers = runnersUp
        runnersUp = []
      } else {
        // Losers: lowest score
        losers = nonWinners.filter(p => (playerBestTeam[p]?.wins || 0) === minNonWinnerScore)
        
        // Survivors: everyone else in between
        survivors = nonWinners.filter(p => 
          !runnersUp.includes(p) && 
          !losers.includes(p)
        )
      }
    }

    // Save session summary
    await (supabase.from('games').insert as any)({
      game_type: 'Rung',
      game_date: newSession.date,
      players_in_game: Array.from(allPlayers),
      winners: winners.length > 0 ? winners : null,
      runners_up: runnersUp.length > 0 ? runnersUp : null,
      survivors: survivors.length > 0 ? survivors : null,
      losers: losers.length > 0 ? losers : null,
      team1: null,
      team2: null,
      winning_team: null
    })

    // Reset
    setRungRounds([])
    setRungTeam1([])
    setRungTeam2([])
    setTeam1Score(0)
    setTeam2Score(0)
    setCurrentRound(0)
    alert('Rung session saved!')
  }

  const startNewRound = () => {
    if (newSession.players.length === 0) {
      alert('Please select at least one player!')
      return
    }

    const initialScores: Record<string, number> = {}
    newSession.players.forEach(player => {
      initialScores[player] = 0
    })
    setScores(initialScores)
    setGameStarted(true)
  }

  const updateScore = (player: string, delta: number) => {
    setScores(prev => {
      const newScore = Math.max(0, (prev[player] || 0) + delta)
      return { ...prev, [player]: newScore }
    })
  }

  const calculateResults = (finalScores: Record<string, number>) => {
    const sortedPlayers = Object.entries(finalScores)
      .sort(([, a], [, b]) => b - a)

    const maxScore = sortedPlayers[0][1]
    const winners = sortedPlayers.filter(([, score]) => score === maxScore).map(([player]) => player)

    const remaining = sortedPlayers.filter(([, score]) => score < maxScore)
    
    if (remaining.length === 0) {
      setResults({ winners, runnersUp: [], survivors: [], losers: [] })
      setGameComplete(true)
      return
    }

    const minScore = remaining[remaining.length - 1][1]
    const secondHighest = remaining[0][1]
    
    if (secondHighest === minScore) {
      const losers = remaining.map(([player]) => player)
      setResults({ winners, runnersUp: [], survivors: [], losers })
      setGameComplete(true)
      return
    }

    const runnersUp = remaining.filter(([, score]) => score === secondHighest).map(([player]) => player)
    const losers = remaining.filter(([, score]) => score === minScore).map(([player]) => player)
    const survivors = remaining.filter(([player]) => !runnersUp.includes(player) && !losers.includes(player)).map(([player]) => player)

    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }

  const calculateShitheadResults = (finalScores: Record<string, number>) => {
    const sortedPlayers = Object.entries(finalScores)
      .sort(([, a], [, b]) => a - b)

    const minScore = sortedPlayers[0][1]
    const winners = sortedPlayers.filter(([, score]) => score === minScore).map(([player]) => player)

    const remaining = sortedPlayers.filter(([, score]) => score > minScore)
    const secondLowest = remaining.length > 0 ? remaining[0][1] : Infinity
    const runnersUp = remaining.filter(([, score]) => score === secondLowest).map(([player]) => player)

    const maxScore = sortedPlayers[sortedPlayers.length - 1][1]
    const losers = sortedPlayers.filter(([, score]) => score === maxScore && score > minScore).map(([player]) => player)
    
    const restRemaining = remaining.filter(([, score]) => score > secondLowest && score < maxScore)
    const survivors = restRemaining.map(([player]) => player)

    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }

  const saveGame = async () => {
    try {
      if (newSession.game === 'Blackjack') {
        const allPlayers = [...eliminationHistory, results.winners[0]]
        
        const { error } = await supabase
          .from('games')
          .insert({
            game_type: 'Blackjack',
            game_date: newSession.date,
            players_in_game: allPlayers,
            winners: results.winners,
            runners_up: results.runnersUp,
            survivors: results.survivors,
            losers: results.losers
          } as any)
        
        if (error) {
          alert(`Error saving game: ${error.message}`)
          return
        }
      } else {
        const { error } = await supabase
          .from('games')
          .insert({
            game_type: newSession.game,
            game_date: newSession.date,
            players_in_game: newSession.players,
            winners: results.winners,
            runners_up: results.runnersUp,
            survivors: results.survivors,
            losers: results.losers
          } as any)
        
        if (error) {
          alert(`Error saving game: ${error.message}`)
          return
        }
      }
      
      setGameStarted(false)
      setGameComplete(false)
      setScores({})
      setEliminationHistory([])
      setNewSession({
        game: 'Monopoly',
        date: new Date().toISOString().split('T')[0],
        players: []
      })
      
      alert('Game saved successfully!')
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
        
        <h1 className="text-center select-none text-[1.3rem] sm:text-[1.6rem] font-semibold tracking-[0.14em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] mb-4">
          <span className="inline-block mr-1.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
          <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            POINTS ROYALE
          </span>
          <span className="inline-block ml-1.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
        </h1>

        {!gameStarted ? (
          <div className="rounded-xl p-4 space-y-4 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-xl sm:text-2xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              New Round
            </h2>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-center mb-1">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                  className="h-9 w-full font-bold text-sm rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 text-center shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all px-2 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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

            {newSession.game === 'Rung' ? (
              <>
                {/* Rung Team Selection */}
                <div className="space-y-3">
                  <div className="bg-purple-900/30 p-3 rounded-lg">
                    <h3 className="text-sm font-bold text-center mb-2">Team 1 ({rungTeam1.length}/2)</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {PLAYERS.map(p => (
                        <Button
                          key={p}
                          onClick={() => toggleRungTeam1(p)}
                          variant="frosted"
                          color="purple"
                          selected={rungTeam1.includes(p)}
                          disabled={rungTeam2.includes(p)}
                          className="h-9 text-sm font-semibold"
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-900/30 p-3 rounded-lg">
                    <h3 className="text-sm font-bold text-center mb-2">Team 2 ({rungTeam2.length}/2)</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {PLAYERS.map(p => (
                        <Button
                          key={p}
                          onClick={() => toggleRungTeam2(p)}
                          variant="frosted"
                          color="purple"
                          selected={rungTeam2.includes(p)}
                          disabled={rungTeam1.includes(p)}
                          className="h-9 text-sm font-semibold"
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {rungTeam1.length === 2 && rungTeam2.length === 2 && (
                  <>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                      <h3 className="text-center font-bold mb-3">
                        Round {currentRound + 1} - Score: {team1Score} - {team2Score}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => recordRungRound(1)}
                          variant="pop"
                          color="purple"
                          className="py-3 text-sm font-bold"
                        >
                          {rungTeam1.join(' + ')} Won
                        </Button>
                        <Button
                          onClick={() => recordRungRound(2)}
                          variant="pop"
                          color="purple"
                          className="py-3 text-sm font-bold"
                        >
                          {rungTeam2.join(' + ')} Won
                        </Button>
                      </div>
                    </div>

                    {rungRounds.length > 0 && (
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <h4 className="text-sm font-bold mb-2">Rounds History ({rungRounds.length})</h4>
                        <div className="space-y-1 text-xs">
                          {rungRounds.map((round, idx) => (
                            <div key={idx} className="text-slate-300">
                              Round {idx + 1}: {round.winner === 1 ? round.team1.join(' + ') : round.team2.join(' + ')} won
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={saveRungSession}
                      disabled={rungRounds.length === 0}
                      variant="pop"
                      color="blue"
                      className="w-full py-3 text-base font-bold"
                    >
                      💾 Save Rung Session
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {newSession.players.length === 0 ? (
                    <Button onClick={selectAllPlayers} variant="pop" color="blue" className="flex-1 h-9 text-sm">
                      ♠ Deal All
                    </Button>
                  ) : (
                    <Button onClick={clearPlayers} variant="pop" color="red" className="flex-1 h-9 text-sm">
                      ✖ Clear
                    </Button>
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

                <Button
                  onClick={startNewRound}
                  disabled={newSession.players.length === 0}
                  variant="frosted"
                  color="purple"
                  className={`w-full py-2.5 rounded-xl font-bold text-base ${
                    newSession.players.length > 0
                      ? 'ring-2 ring-amber-400 shadow-[inset_0_0_10px_rgba(255,170,0,0.85),0_0_18px_rgba(255,170,0,0.9),0_0_32px_rgba(255,170,0,0.55)]'
                      : ''
                  }`}
                >
                  👊 Let the Madness Begin
                </Button>
              </>
            )}
          </div>
        ) : !gameComplete ? (
          newSession.game === 'Blackjack' ? (
            <div className="rounded-xl p-4 space-y-3 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
              <h2 className="text-center text-lg font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {GAME_EMOJIS['Blackjack']} BLACKJACK - {newSession.players.length} Players Left
              </h2>

              <div className="space-y-2">
                <h3 className="text-center text-sm font-bold text-slate-300">Select Player to Eliminate</h3>
                {newSession.players.map(player => (
                  <Button
                    key={player}
                    onClick={() => {
                      const newHistory = [...eliminationHistory, player]
                      setEliminationHistory(newHistory)
                      
                      const remaining = newSession.players.filter(p => p !== player)
                      setNewSession(s => ({ ...s, players: remaining }))
                      
                      if (remaining.length === 1) {
                        const winner = remaining[0]
                        const runnerUp = player
                        const loser = newHistory[0]
                        const survivors = newHistory.slice(1, -1)
                        
                        setResults({ 
                          winners: [winner],
                          runnersUp: [runnerUp],
                          survivors: survivors.length > 0 ? survivors : [],
                          losers: [loser]
                        })
                        setGameComplete(true)
                      }
                    }}
                    variant="frosted"
                    color="red"
                    className="w-full h-12 text-base font-semibold"
                  >
                    ❌ {player}
                  </Button>
                ))}
              </div>

              {eliminationHistory.length > 0 && (
                <div className="bg-slate-900/50 p-3 rounded-xl">
                  <h3 className="text-center text-xs font-bold text-slate-400 mb-2">Eliminated (in order)</h3>
                  <div className="text-center text-sm text-red-400">
                    {eliminationHistory.join(' → ')}
                  </div>
                </div>
              )}

              {eliminationHistory.length > 0 && (
                <Button
                  onClick={() => {
                    const lastEliminated = eliminationHistory[eliminationHistory.length - 1]
                    setEliminationHistory(prev => prev.slice(0, -1))
                    setNewSession(s => ({ ...s, players: [...s.players, lastEliminated] }))
                  }}
                  variant="frosted"
                  color="purple"
                  className="w-full py-2 rounded-xl font-bold text-sm"
                >
                  ↩️ Undo Last Elimination
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-4 space-y-3 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
              <h2 className="text-center text-lg font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {GAME_EMOJIS[newSession.game]} {newSession.game}
              </h2>

              <div className="space-y-2">
                {newSession.players.map(player => (
                  <div key={player} className="flex items-center justify-between bg-purple-900/50 p-3 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]">
                    <Button
                      onClick={() => updateScore(player, -1)}
                      variant="frosted"
                      color="red"
                      className="w-10 h-10 text-xl font-bold"
                    >
                      −
                    </Button>
                    
                    <div className="flex-1 text-center">
                      <div className="text-base font-bold">{player}</div>
                      <div className="text-2xl font-extrabold text-amber-400">{scores[player]}</div>
                    </div>
                    
                    <Button
                      onClick={() => updateScore(player, 1)}
                      variant="frosted"
                      color="blue"
                      className="w-10 h-10 text-xl font-bold"
                    >
                      +
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  if (newSession.game === 'Shithead') {
                    calculateShitheadResults(scores)
                  } else {
                    calculateResults(scores)
                  }
                }}
                variant="pop"
                color="blue"
                className="w-full py-2.5 rounded-xl font-bold text-base"
              >
                🏁 End Round
              </Button>
            </div>
          )
        ) : (
          <div className="rounded-xl p-4 space-y-3 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-xl sm:text-2xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {newSession.game === 'Shithead' ? '💩 SHITHEAD! 💩' : 
               newSession.game === 'Blackjack' ? '🃏 BLACKJACK CHAMPION! 🃏' :
               'Game Complete! 🎉'}
            </h2>

            <div className="space-y-2">
              {results.winners.length > 0 && (
                <div className="bg-green-900/50 p-3 rounded-xl">
                  <div className="text-sm font-bold text-green-400 mb-1">
                    {newSession.game === 'Shithead' ? '🏆 Champions' : '🏆 Winners'}
                  </div>
                  <div className="text-base font-bold">
                    {results.winners.join(' & ')}
                  </div>
                </div>
              )}
              
              {results.runnersUp.length > 0 && (
                <div className="bg-blue-900/50 p-3 rounded-xl">
                  <div className="text-sm font-bold text-blue-400 mb-1">🥈 Runners Up</div>
                  <div className="text-base font-bold">
                    {results.runnersUp.join(' & ')}
                  </div>
                </div>
              )}
              
              {results.survivors.length > 0 && (
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-sm font-bold text-slate-400 mb-1">🤟 Survivors</div>
                  <div className="text-base font-bold">{results.survivors.join(', ')}</div>
                </div>
              )}
              
              {results.losers.length > 0 && (
                <div className="bg-red-900/50 p-3 rounded-xl">
                  <div className="text-sm font-bold text-red-400 mb-1">
                    {newSession.game === 'Shithead' ? '💩 THE SHITHEAD(S)' : 
                     newSession.game === 'Blackjack' ? '🃏 ELIMINATED' : 
                     '💀 Losers'}
                  </div>
                  <div className="text-base font-bold">{results.losers.join(', ')}</div>
                </div>
              )}
            </div>

            <Button
              onClick={saveGame}
              variant="pop"
              className="w-full py-2.5 rounded-xl font-bold text-base bg-gradient-to-br from-emerald-600 to-emerald-900"
            >
              💾 Save Game & Start New Round
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
