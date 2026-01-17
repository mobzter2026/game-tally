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
  const [rungRounds, setRungRounds] = useState<Array<{
    team1: string[]
    team2: string[]
    winner: 1 | 2
  }>>([])
  const [results, setResults] = useState<{
    winners: string[]
    runnersUp: string[]
    survivors: string[]
    losers: string[]
    winningTeam?: number
  }>({
    winners: [],
    runnersUp: [],
    survivors: [],
    losers: []
  })
  const [newSession, setNewSession] = useState<Session>({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [],
    threshold: 3,
    team1: [],
    team2: []
  })

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

  const toggleThreshold = (num: number) => {
    setNewSession({ ...newSession, threshold: num })
  }

  const toggleTeamPlayer = (player: string, team: 'team1' | 'team2') => {
    const otherTeam = team === 'team1' ? 'team2' : 'team1'
    
    if (newSession[team].includes(player)) {
      setNewSession({
        ...newSession,
        [team]: newSession[team].filter(p => p !== player)
      })
    } else if (newSession[team].length < 2) {
      setNewSession({
        ...newSession,
        [team]: [...newSession[team], player],
        [otherTeam]: newSession[otherTeam].filter(p => p !== player)
      })
    }
  }

  const startNewRound = () => {
    if (newSession.game === 'Rung') {
      setTeamSelectionMode(true)
      setTeamScores({ team1: 0, team2: 0 })
      setRungRounds([])
      return
    }

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
    const secondHighest = remaining.length > 0 ? remaining[0][1] : -1
    const runnersUp = remaining.filter(([, score]) => score === secondHighest).map(([player]) => player)

    const restRemaining = remaining.filter(([, score]) => score < secondHighest && score > 0)
    const minScore = sortedPlayers[sortedPlayers.length - 1][1]
    const losers = sortedPlayers.filter(([, score]) => score === minScore && score < maxScore).map(([player]) => player)

    const survivors = restRemaining.filter(([player]) => !losers.includes(player)).map(([player]) => player)

    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }

  const calculateShitheadResults = (finalScores: Record<string, number>) => {
    const sortedPlayers = Object.entries(finalScores)
      .sort(([, a], [, b]) => a - b)

    const minScore = sortedPlayers[0][1]
    const losers = sortedPlayers.filter(([, score]) => score === minScore).map(([player]) => player)

    const remaining = sortedPlayers.filter(([, score]) => score > minScore)
    const secondLowest = remaining.length > 0 ? remaining[0][1] : Infinity
    const runnersUp = remaining.filter(([, score]) => score === secondLowest).map(([player]) => player)

    const restRemaining = remaining.filter(([, score]) => score > secondLowest)
    const maxScore = sortedPlayers[sortedPlayers.length - 1][1]
    const winners = sortedPlayers.filter(([, score]) => score === maxScore && score > minScore).map(([player]) => player)

    const survivors = restRemaining.filter(([player]) => !winners.includes(player)).map(([player]) => player)

    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }

  const saveGame = async () => {
    try {
      if (newSession.game === 'Rung') {
        // Save each round as a separate game entry
        for (const round of rungRounds) {
          const allPlayers = [...round.team1, ...round.team2]
          const { error } = await supabase
            .from('games')
            .insert({
              game_type: 'Rung',
              game_date: newSession.date,
              players_in_game: allPlayers,
              team1: round.team1,
              team2: round.team2,
              winning_team: round.winner
            } as any)
          
          if (error) {
            alert(`Error saving round: ${error.message}`)
            return
          }
        }
        
        // Save the final overall result for the leaderboard
        const allPlayersInGame = [...new Set(rungRounds.flatMap(r => [...r.team1, ...r.team2]))]
        const { error: finalError } = await supabase
          .from('games')
          .insert({
            game_type: 'Rung',
            game_date: newSession.date,
            players_in_game: allPlayersInGame,
            winners: results.winners,
            runners_up: results.runnersUp,
            survivors: results.survivors,
            losers: results.losers
          } as any)
        
        if (finalError) {
          alert(`Error saving final results: ${finalError.message}`)
          return
        }
        
        // Reset everything
        setGameStarted(false)
        setGameComplete(false)
        setTeamSelectionMode(false)
        setTeamScores({ team1: 0, team2: 0 })
        setRungRounds([])
        setEliminationHistory([])
        setNewSession({
          game: 'Monopoly',
          date: new Date().toISOString().split('T')[0],
          players: [],
          threshold: 3,
          team1: [],
          team2: []
        })
        
        alert('Rung game saved! All rounds recorded.')
        return
      } else if (newSession.game === 'Blackjack') {
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
      setTeamSelectionMode(false)
      setScores({})
      setTeamScores({ team1: 0, team2: 0 })
      setEliminationHistory([])
      setNewSession({
        game: 'Monopoly',
        date: new Date().toISOString().split('T')[0],
        players: [],
        threshold: 3,
        team1: [],
        team2: []
      })
      
      alert('Game saved successfully!')
    } catch (error) {
      alert(`Failed to save game: ${error}`)
    }
  }

  const getTeamKey = (players: string[]) => players.slice().sort().join('')

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

        {!gameStarted && !teamSelectionMode ? (
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

            {newSession.game !== 'Rung' && (
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
          <div className="rounded-xl p-4 space-y-4 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {GAME_EMOJIS['Rung']} Rung - Race to 5
            </h2>

            <div className="bg-slate-900/40 p-3 rounded-lg text-center space-y-1">
              <div className="text-xs font-bold text-slate-400">Current Score</div>
              <div className="flex justify-center gap-4 text-2xl font-extrabold">
                <span className="text-blue-400">{teamScores.team1}</span>
                <span className="text-slate-500">-</span>
                <span className="text-red-400">{teamScores.team2}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <h3 className="text-center font-bold text-sm text-blue-400">
                  Team 1 {newSession.team1.length > 0 && `(${newSession.team1.length}/2)`}
                </h3>
                {PLAYERS.map(p => (
                  <Button
                    key={p}
                    onClick={() => toggleTeamPlayer(p, 'team1')}
                    variant="frosted"
                    color="purple"
                    selected={newSession.team1.includes(p)}
                    disabled={!newSession.team1.includes(p) && newSession.team1.length >= 2}
                    className="w-full h-8 text-xs font-semibold"
                  >
                    {p}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-center font-bold text-sm text-red-400">
                  Team 2 {newSession.team2.length > 0 && `(${newSession.team2.length}/2)`}
                </h3>
                {PLAYERS.map(p => (
                  <Button
                    key={p}
                    onClick={() => toggleTeamPlayer(p, 'team2')}
                    variant="frosted"
                    color="purple"
                    selected={newSession.team2.includes(p)}
                    disabled={!newSession.team2.includes(p) && newSession.team2.length >= 2}
                    className="w-full h-8 text-xs font-semibold"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {newSession.team1.length === 2 && newSession.team2.length === 2 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => {
                    const newScore = teamScores.team1 + 1
                    
                    setTeamScores(prev => ({ ...prev, team1: newScore }))
                    
                    setRungRounds(prev => [...prev, {
                      team1: newSession.team1,
                      team2: newSession.team2,
                      winner: 1
                    }])
                    
                    if (newScore >= 5) {
                      const allPlayersInGame = [...new Set(rungRounds.flatMap(r => [...r.team1, ...r.team2]).concat(newSession.team1, newSession.team2))]
                      const loserPlayers: string[] = allPlayersInGame.filter(p => !newSession.team1.includes(p))
                      
                      setResults({
                        winners: newSession.team1,
                        runnersUp: [],
                        survivors: [],
                        losers: loserPlayers,
                        winningTeam: 1
                      })
                      setGameComplete(true)
                      setTeamSelectionMode(false)
                    } else {
                      setNewSession(s => ({ ...s, team2: [] }))
                    }
                  }}
                  variant="frosted"
                  color="blue"
                  className="h-14 text-base font-bold ring-2 ring-blue-400/50"
                >
                  Team 1 Wins
                </Button>

                <Button
                  onClick={() => {
                    const newScore = teamScores.team2 + 1
                    
                    setTeamScores(prev => ({ ...prev, team2: newScore }))
                    
                    setRungRounds(prev => [...prev, {
                      team1: newSession.team1,
                      team2: newSession.team2,
                      winner: 2
                    }])
                    
                    if (newScore >= 5) {
                      const allPlayersInGame = [...new Set(rungRounds.flatMap(r => [...r.team1, ...r.team2]).concat(newSession.team1, newSession.team2))]
                      const loserPlayers: string[] = allPlayersInGame.filter(p => !newSession.team2.includes(p))
                      
                      setResults({
                        winners: newSession.team2,
                        runnersUp: [],
                        survivors: [],
                        losers: loserPlayers,
                        winningTeam: 2
                      })
                      setGameComplete(true)
                      setTeamSelectionMode(false)
                    } else {
                      setNewSession(s => ({ ...s, team1: [] }))
                    }
                  }}
                  variant="frosted"
                  color="red"
                  className="h-14 text-base font-bold ring-2 ring-red-400/50"
                >
                  Team 2 Wins
                </Button>
              </div>
            )}

            {rungRounds.length > 0 && (
              <div className="bg-slate-900/50 p-3 rounded-xl">
                <h3 className="text-center text-xs font-bold text-slate-400 mb-2">Round History</h3>
                <div className="space-y-1 text-xs">
                  {rungRounds.map((round, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className={round.winner === 1 ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                        {round.team1.join(' & ')}
                      </span>
                      <span className="text-amber-400">vs</span>
                      <span className={round.winner === 2 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {round.team2.join(' & ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
                {GAME_EMOJIS[newSession.game]} {newSession.game} - {
                  newSession.game === 'Shithead' ? '1st to 3 LOSES 💩' : 
                  `Race to ${newSession.threshold}`
                }
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
               newSession.game === 'Rung' ? '🎭 RUNG CHAMPIONS! 🎭' :
               'Game Complete! 🎉'}
            </h2>

            <div className="space-y-2">
              {results.winners.length > 0 && (
                <div className="bg-green-900/50 p-3 rounded-xl">
                  <div className="text-sm font-bold text-green-400 mb-1">
                    {newSession.game === 'Shithead' ? '🏆 Champions' : '🏆 Winners'}
                  </div>
                  <div className="text-base font-bold">
                    {Array.isArray(results.winners) ? results.winners.join(' & ') : results.winners}
                  </div>
                </div>
              )}
              
              {results.runnersUp.length > 0 && (
                <div className="bg-blue-900/50 p-3 rounded-xl">
                  <div className="text-sm font-bold text-blue-400 mb-1">🥈 Runners Up</div>
                  <div className="text-base font-bold">
                    {Array.isArray(results.runnersUp) ? results.runnersUp.join(' & ') : results.runnersUp}
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
