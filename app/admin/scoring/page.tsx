'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Blackjack', 'Shithead', 'Rung']

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎴'
}

export default function LiveScoringPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const [newSession, setNewSession] = useState({
  game: 'Monopoly',
  date: new Date().toISOString().split('T')[0],
  players: [] as string[],
  threshold: 3,
  team1: [] as string[],
  team2: [] as string[]
})

  const [gameStarted, setGameStarted] = useState(false)
const [teamSelectionMode, setTeamSelectionMode] = useState(false)
const [scores, setScores] = useState<Record<string, number>>({})
const [teamScores, setTeamScores] = useState({ team1: 0, team2: 0 })
const [gameComplete, setGameComplete] = useState(false)
  const [results, setResults] = useState<{
  winners: string[]
  runnersUp: string[]
  survivors: string[]
  losers: string[]
  winningTeam?: number
}>({ winners: [], runnersUp: [], survivors: [], losers: [] })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/admin/login')
      else setLoading(false)
    })
  }, [])

  const togglePlayer = (player: string) => {
    setNewSession(s => ({
      ...s,
      players: s.players.includes(player)
        ? s.players.filter(p => p !== player)
        : [...s.players, player]
    }))
  }

  const selectAllPlayers = () =>
    setNewSession(s => ({ ...s, players: [...PLAYERS] }))

  const clearPlayers = () =>
    setNewSession(s => ({ ...s, players: [] }))

  const toggleThreshold = (num: number) =>
    setNewSession(s => ({ ...s, threshold: num }))

  const startNewRound = () => {
    if (newSession.players.length === 0) return
    
    // Initialize scores for all players
    const initialScores: Record<string, number> = {}
    newSession.players.forEach(player => {
      initialScores[player] = 0
    })
    setScores(initialScores)
    setGameStarted(true)
  }

  const updateScore = (player: string, delta: number) => {
    setScores(prev => {
      const newScores = { ...prev }
      newScores[player] = Math.max(0, newScores[player] + delta)
      
      // Check if anyone reached threshold
      const maxScore = Math.max(...Object.values(newScores))
      if (maxScore >= newSession.threshold) {
        calculateResults(newScores)
      }
      
      return newScores
    })
  }

  const calculateResults = (finalScores: Record<string, number>) => {
    const sortedPlayers = Object.entries(finalScores)
      .sort(([, a], [, b]) => b - a)
    
    const maxScore = sortedPlayers[0][1]
    const winners = sortedPlayers.filter(([, score]) => score === maxScore).map(([player]) => player)
    
    const remaining = sortedPlayers.filter(([, score]) => score < maxScore)
    const secondScore = remaining[0]?.[1] || 0
    const runnersUp = remaining.filter(([, score]) => score === secondScore).map(([player]) => player)
    
    const rest = remaining.filter(([, score]) => score < secondScore)
    const minScore = rest[rest.length - 1]?.[1] || 0
    const losers = rest.filter(([, score]) => score === minScore).map(([player]) => player)
    
    const survivors = rest.filter(([, score]) => score > minScore).map(([player]) => player)
    
    setResults({ winners, runnersUp, survivors, losers })
    setGameComplete(true)
  }

  const saveGame = async () => {
  try {
    if (newSession.game === 'Rung') {
      // Save Rung game
      const { error } = await supabase
        .from('games')
        .insert({
          game_type: 'Rung',
          game_date: newSession.date,
          team1: newSession.team1,
          team2: newSession.team2,
          winning_team: results.winningTeam
        } as any)
      
      if (error) {
        alert(`Error saving game: ${error.message}`)
        return
      }
    } else {
      // Save individual game
      const { error } = await supabase
        .from('games')
        .insert({
          game_type: newSession.game,
          game_date: newSession.date,
          players_in_game: newSession.players,
          winners: results.winners,
          runners_up: results.runnersUp,
          losers: results.losers
        } as any)
      
      if (error) {
        alert(`Error saving game: ${error.message}`)
        return
      }
    }
    
    // Reset and go back to setup
    setGameStarted(false)
    setGameComplete(false)
    setTeamSelectionMode(false)
    setScores({})
    setTeamScores({ team1: 0, team2: 0 })
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
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950">
        Loading…
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-950 via-70% to-slate-950 text-white p-4 overflow-auto">
      <div className="max-w-3xl mx-auto flex flex-col justify-start">
        
        {/* TITLE */}
        <h1 className="w-full max-w-full text-center select-none whitespace-nowrap overflow-hidden text-[1.75rem] sm:text-[2.05rem] font-semibold tracking-[0.16em] sm:tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
          <span className="inline-block mr-2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
          <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            POINTS&nbsp;ROYALE
          </span>
          <span className="inline-block ml-2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
        </h1>
        <div className="h-6" />

        {!gameStarted ? (
          /* SETUP FORM */
          <div className="rounded-xl p-6 space-y-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-2xl sm:text-3xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              New Round
            </h2>

            {/* DATE + GAME */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Date</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                  style={{ paddingLeft: '12px' }}
                  className="h-11 w-full font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 text-center shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-center mb-1">Game</label>
                <select
                  value={newSession.game}
                  onChange={e => setNewSession({ ...newSession, game: e.target.value })}
                  className="h-11 w-full text-center font-bold rounded-lg bg-gradient-to-br from-purple-700 via-purple-900 to-blue-900 appearance-none px-4 shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)] transition-all"
                >
                  {SCORE_GAMES.map(g => (
                    <option key={g} value={g}>{GAME_EMOJIS[g]} {g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* DEAL / CLEAR + WIN THRESHOLD */}
            <div className="flex items-center gap-3">
              {newSession.players.length === 0 ? (
                <Button onClick={selectAllPlayers} variant="pop" color="blue" className="flex-1 h-11">
                  ♠ Deal All
                </Button>
              ) : (
                <Button onClick={clearPlayers} variant="pop" color="red" className="flex-1 h-11">
                  ✖ Clear Table
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
                      className="w-10 h-10 rounded-full text-sm"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* PLAYER SELECTION */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
              {PLAYERS.map(p => (
                <Button
                  key={p}
                  onClick={() => togglePlayer(p)}
                  variant="frosted"
                  color="purple"
                  selected={newSession.players.includes(p)}
                  className="h-10 text-sm font-semibold"
                >
                  {p}
                </Button>
              ))}
            </div>

            {/* MADNESS BUTTON */}
            <Button
              onClick={startNewRound}
              disabled={newSession.players.length === 0}
              variant="frosted"
              color="purple"
              className={`w-full py-3 rounded-xl font-bold text-lg ${
                newSession.players.length > 0
                  ? 'ring-2 ring-amber-400 shadow-[inset_0_0_10px_rgba(255,170,0,0.85),0_0_18px_rgba(255,170,0,0.9),0_0_32px_rgba(255,170,0,0.55)]'
                  : ''
              }`}
            >
              👊 Let the Madness Begin
            </Button>
          </div>
        ) : !gameComplete ? (
          /* LIVE SCORING */
          <div className="rounded-xl p-6 space-y-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-2xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {GAME_EMOJIS[newSession.game]} {newSession.game} - Race to {newSession.threshold}
            </h2>

            <div className="space-y-4">
              {newSession.players.map(player => (
                <div key={player} className="flex items-center justify-between bg-purple-900/50 p-4 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.2)]">
                  <Button
                    onClick={() => updateScore(player, -1)}
                    variant="frosted"
                    color="red"
                    className="w-12 h-12 text-2xl font-bold"
                  >
                    −
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <div className="text-xl font-bold">{player}</div>
                    <div className="text-3xl font-extrabold text-amber-400">{scores[player]}</div>
                  </div>
                  
                  <Button
                    onClick={() => updateScore(player, 1)}
                    variant="frosted"
                    color="blue"
                    className="w-12 h-12 text-2xl font-bold"
                  >
                    +
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* RESULTS SUMMARY */
          <div className="rounded-xl p-6 space-y-6 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-3xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Game Complete! 🎉
            </h2>

            <div className="space-y-4">
              {results.winners.length > 0 && (
                <div className="bg-green-900/50 p-4 rounded-xl">
                  <div className="text-lg font-bold text-green-400 mb-2">🏆 Winners</div>
                  <div className="text-xl font-bold">{results.winners.join(', ')}</div>
                </div>
              )}
              
              {results.runnersUp.length > 0 && (
                <div className="bg-blue-900/50 p-4 rounded-xl">
                  <div className="text-lg font-bold text-blue-400 mb-2">🥈 Runners Up</div>
                  <div className="text-xl font-bold">{results.runnersUp.join(', ')}</div>
                </div>
              )}
              
              {results.survivors.length > 0 && (
                <div className="bg-slate-800/50 p-4 rounded-xl">
                  <div className="text-lg font-bold text-slate-400 mb-2">🤟 Survivors</div>
                  <div className="text-xl font-bold">{results.survivors.join(', ')}</div>
                </div>
              )}
              
              {results.losers.length > 0 && (
                <div className="bg-red-900/50 p-4 rounded-xl">
                  <div className="text-lg font-bold text-red-400 mb-2">💀 Losers</div>
                  <div className="text-xl font-bold">{results.losers.join(', ')}</div>
                </div>
              )}
            </div>

            <Button
              onClick={saveGame}
              variant="pop"
              className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-br from-emerald-600 to-emerald-900"
            >
              💾 Save Game & Start New Round
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}