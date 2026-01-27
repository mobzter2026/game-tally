'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Shithead', 'Blackjack']
const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩'
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
