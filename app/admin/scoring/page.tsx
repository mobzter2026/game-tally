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
const [eliminationHistory, setEliminationHistory] = useState<string[]>([])

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

const toggleTeamPlayer = (player: string, team: 'team1' | 'team2') => {
  setNewSession(s => {
    const currentTeam = s[team]
    const otherTeam = team === 'team1' ? s.team2 : s.team1
    
    // Remove from other team if present
    const newOtherTeam = otherTeam.filter(p => p !== player)
    
    // Toggle in current team (max 2 players per team)
    const newCurrentTeam = currentTeam.includes(player)
      ? currentTeam.filter(p => p !== player)
      : currentTeam.length < 2 ? [...currentTeam, player] : currentTeam
    
    return {
      ...s,
      [team]: newCurrentTeam,
      [team === 'team1' ? 'team2' : 'team1']: newOtherTeam
    }
  })
}

  const selectAllPlayers = () =>
    setNewSession(s => ({ ...s, players: [...PLAYERS] }))

  const clearPlayers = () =>
    setNewSession(s => ({ ...s, players: [] }))

  const toggleThreshold = (num: number) =>
    setNewSession(s => ({ ...s, threshold: num }))

  const startNewRound = () => {
  if (newSession.game === 'Rung') {
    setTeamSelectionMode(true)
    return
  }
  
  if (newSession.players.length === 0) return
  
  // Initialize scores for all players
  const initialScores: Record<string, number> = {}
  newSession.players.forEach(player => {
    initialScores[player] = 0
  })
  setScores(initialScores)
  setGameStarted(true)
}

const [rungRounds, setRungRounds] = useState<Array<{
  team1: string[]
  team2: string[]
  winner: 1 | 2
}>>([])

const startRungGame = () => {
  if (newSession.team1.length !== 2 || newSession.team2.length !== 2) {
    alert('Please select 2 players for each team!')
    return
  }
  
  const team1Key = getTeamKey(newSession.team1)
  const team2Key = getTeamKey(newSession.team2)
  
  // Initialize scores if teams haven't played yet
  setRungTeamScores(prev => ({
    ...prev,
    [team1Key]: prev[team1Key] || 0,
    [team2Key]: prev[team2Key] || 0
  }))
  
  setTeamSelectionMode(false)
  setGameStarted(true)
}

const [rungTeamScores, setRungTeamScores] = useState<Record<string, number>>({})

const getTeamKey = (players: string[]) => players.slice().sort().join('')
  
  setNewSession(s => ({ ...s, threshold: 5 })) // Set threshold to 5
  setTeamScores({ team1: 0, team2: 0 })
  setRungRounds([]) // Reset rounds
  setTeamSelectionMode(false)
  setGameStarted(true)
}

  const updateScore = (player: string, delta: number) => {
  setScores(prev => {
    const newScores = { ...prev }
    newScores[player] = Math.max(0, newScores[player] + delta)
    
    // Check if anyone reached threshold
    const maxScore = Math.max(...Object.values(newScores))
    const minScore = Math.min(...Object.values(newScores))
    
    if (newSession.game === 'Shithead') {
      // Shithead: first to reach threshold LOSES
      if (maxScore >= newSession.threshold) {
        calculateShitheadResults(newScores)
      }
    } else if (newSession.game === 'Blackjack') {
      // Blackjack: knockout mode - eliminate lowest scorer
      if (maxScore >= newSession.threshold) {
        calculateResults(newScores)
      }
    } else {
      // Normal games: first to reach threshold WINS
      if (maxScore >= newSession.threshold) {
        calculateResults(newScores)
      }
    }
    
    return newScores
  })
}

const updateTeamScore = (team: 'team1' | 'team2', delta: number) => {
  setTeamScores(prev => {
    const newScores = { ...prev }
    newScores[team] = Math.max(0, newScores[team] + delta)
    
    // Check if any team reached threshold
    const maxScore = Math.max(newScores.team1, newScores.team2)
    if (maxScore >= newSession.threshold) {
      calculateRungResults(newScores)
    }
    
    return newScores
  })
}

  const calculateResults = (finalScores: Record<string, number>) => {
  // BLACKJACK: Knockout mode - one loser per round
  if (newSession.game === 'Blackjack') {
    const sortedPlayers = Object.entries(finalScores)
      .sort(([, a], [, b]) => a - b) // Sort ascending (lowest first)
    
    const minScore = sortedPlayers[0][1]
    const eliminated = sortedPlayers.filter(([, score]) => score === minScore).map(([player]) => player)
    
    // Remove eliminated players from the game
    const remainingPlayers = newSession.players.filter(p => !eliminated.includes(p))
    
    if (remainingPlayers.length === 1) {
      // Game over - we have a winner!
      setResults({ 
        winners: remainingPlayers, 
        runnersUp: [], 
        survivors: [], 
        losers: eliminated 
      })
      setGameComplete(true)
    } else {
      // Continue with remaining players
      alert(`${eliminated.join(', ')} eliminated! ${remainingPlayers.length} players remaining.`)
      setNewSession(s => ({ ...s, players: remainingPlayers }))
      
      // Reset scores for remaining players
      const newScores: Record<string, number> = {}
      remainingPlayers.forEach(p => { newScores[p] = 0 })
      setScores(newScores)
    }
    return
  }
  
  // NORMAL GAMES: Regular scoring
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

const calculateShitheadResults = (finalScores: Record<string, number>) => {
  const sortedPlayers = Object.entries(finalScores)
    .sort(([, a], [, b]) => a - b) // Sort ASCENDING (lowest first)
  
  const minScore = sortedPlayers[0][1]
  const winners = sortedPlayers.filter(([, score]) => score === minScore).map(([player]) => player)
  
  const remaining = sortedPlayers.filter(([, score]) => score > minScore)
  const secondScore = remaining[0]?.[1] || 0
  const runnersUp = remaining.filter(([, score]) => score === secondScore).map(([player]) => player)
  
  const rest = remaining.filter(([, score]) => score > secondScore)
  const maxScore = rest[rest.length - 1]?.[1] || 0
  const losers = rest.filter(([, score]) => score === maxScore).map(([player]) => player) // The SHITHEAD(S)
  
  const survivors = rest.filter(([, score]) => score < maxScore).map(([player]) => player)
  
  setResults({ winners, runnersUp, survivors, losers })
  setGameComplete(true)
}

const calculateRungResults = (finalScores: { team1: number; team2: number }) => {
  const winningTeam = finalScores.team1 >= newSession.threshold ? 1 : 2
  const winners = winningTeam === 1 ? newSession.team1 : newSession.team2
  const losers = winningTeam === 1 ? newSession.team2 : newSession.team1
  
  setResults({ winners, runnersUp: [], survivors: [], losers, winningTeam })
  setGameComplete(true)
}

const saveGame = async () => {
  try {
    if (newSession.game === 'Rung') {
  // Save each round as a separate game entry
  for (const round of rungRounds) {
    const { error } = await supabase
      .from('games')
      .insert({
        game_type: 'Rung',
        game_date: newSession.date,
        team1: round.team1,
        team2: round.team2,
        winning_team: round.winner
      } as any)
    
    if (error) {
      alert(`Error saving round: ${error.message}`)
      return
    }
  }
  
  // Reset everything
  setGameStarted(false)
  setGameComplete(false)
  setTeamSelectionMode(false)
  setTeamScores({ team1: 0, team2: 0 })
  setRungRounds([])
  setRungTeamScores({}) // Add this line
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
      // BLACKJACK: Save with all players in correct positions
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
      // Save other individual games
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
    
    // Reset and go back to setup
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
      
      {/* TITLE */}
      <h1 className="text-center select-none text-[1.3rem] sm:text-[1.6rem] font-semibold tracking-[0.14em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] mb-4">
        <span className="inline-block mr-1.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
        <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          POINTS ROYALE
        </span>
        <span className="inline-block ml-1.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">♠</span>
      </h1>

      {!gameStarted && !teamSelectionMode ? (
        /* SETUP FORM */
        <div className="rounded-xl p-4 space-y-4 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
          <h2 className="text-center text-xl sm:text-2xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            New Round
          </h2>

          {/* DATE + GAME */}
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
              {/* DEAL / CLEAR + WIN THRESHOLD */}
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

              {/* PLAYER SELECTION */}
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

          {/* MADNESS BUTTON */}
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
        /* RUNG TEAM SELECTION */
        <div className="rounded-xl p-4 space-y-4 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
          <h2 className="text-center text-xl font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            {gameStarted 
              ? `Select New ${newSession.team1.length === 0 ? 'Team 1' : 'Team 2'}` 
              : 'Select Teams'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Team 1 */}
            <div className="space-y-2">
              <h3 className="text-center font-bold text-sm text-blue-400">Team 1</h3>
              {PLAYERS.map(p => (
                <Button
                  key={p}
                  onClick={() => toggleTeamPlayer(p, 'team1')}
                  variant="frosted"
                  color="purple"
                  selected={newSession.team1.includes(p)}
                  className="w-full h-8 text-xs font-semibold"
                >
                  {p}
                </Button>
              ))}
            </div>

            {/* Team 2 */}
            <div className="space-y-2">
              <h3 className="text-center font-bold text-sm text-red-400">Team 2</h3>
              {PLAYERS.map(p => (
                <Button
                  key={p}
                  onClick={() => toggleTeamPlayer(p, 'team2')}
                  variant="frosted"
                  color="purple"
                  selected={newSession.team2.includes(p)}
                  className="w-full h-8 text-xs font-semibold"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {/* Threshold Selection */}
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
        newSession.game === 'Rung' ? (
          /* RUNG ROUND-BY-ROUND SCORING */
          <div className="rounded-xl p-4 space-y-3 bg-gradient-to-b from-purple-900/50 to-slate-900/60 shadow-[0_12px_25px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.08)]">
            <h2 className="text-center text-lg font-extrabold uppercase tracking-wider select-none bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {GAME_EMOJIS['Rung']} Rung - First to 5 Wins
            </h2>

            {/* Current Matchup Score */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-900/50 p-3 rounded-xl text-center">
                <div className="text-xs font-bold text-blue-400">Team 1</div>
                <div className="text-xs">{newSession.team1.join('')}</div>
                <div className="text-4xl font-extrabold text-amber-400">
                  {rungTeamScores[getTeamKey(newSession.team1)] || 0}
                </div>
              </div>
              <div className="bg-red-900/50 p-3 rounded-xl text-center">
                <div className="text-xs font-bold text-red-400">Team 2</div>
                <div className="text-xs">{newSession.team2.join('')}</div>
                <div className="text-4xl font-extrabold text-amber-400">
                  {rungTeamScores[getTeamKey(newSession.team2)] || 0}
                </div>
              </div>
            </div>

            {/* Round Winner Buttons */}
            <div className="space-y-2">
              <h3 className="text-center text-sm font-bold text-slate-300">Who Won This Round?</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    const team1Key = getTeamKey(newSession.team1)
                    const newScore = (rungTeamScores[team1Key] || 0) + 1
                    
                    setRungTeamScores(prev => ({
                      ...prev,
                      [team1Key]: newScore
                    }))
                    
                    setRungRounds(prev => [...prev, {
                      team1: newSession.team1,
                      team2: newSession.team2,
                      winner: 1
                    }])
                    
                    if (newScore >= 5) {
                      const allTeams = Object.entries(rungTeamScores).map(([key, score]) => ({
                        team: key,
                        score: key === team1Key ? newScore : score
                      })).sort((a, b) => b.score - a.score)
                      
                      const winner = newSession.team1
                      const runnerUp = allTeams.length >= 2 && allTeams[1].score > 0 
                        ? allTeams[1].team.match(/.{1,3}/g) || [] 
                        : []
                      const survivors = allTeams.slice(2).filter(t => t.score > 0).map(t => t.team)
                      const losers = allTeams.filter(t => t.score === 0).map(t => t.team)
                      
                      setResults({
                        winners: winner,
                        runnersUp: runnerUp,
                        survivors: survivors,
                        losers: losers,
                        winningTeam: 1
                      })
                      setGameComplete(true)
                    } else {
                      setTeamSelectionMode(true)
                      setGameStarted(false)
                      setNewSession(s => ({ ...s, team2: [] }))
                    }
                  }}
                  variant="frosted"
                  color="blue"
                  className="h-16 text-base font-bold"
                >
                  Team 1 Wins
                </Button>
                
                <Button
                  onClick={() => {
                    const team2Key = getTeamKey(newSession.team2)
                    const newScore = (rungTeamScores[team2Key] || 0) + 1
                    
                    setRungTeamScores(prev => ({
                      ...prev,
                      [team2Key]: newScore
                    }))
                    
                    setRungRounds(prev => [...prev, {
                      team1: newSession.team1,
                      team2: newSession.team2,
                      winner: 2
                    }])
                    
                    if (newScore >= 5) {
                      const allTeams = Object.entries(rungTeamScores).map(([key, score]) => ({
                        team: key,
                        score: key === team2Key ? newScore : score
                      })).sort((a, b) => b.score - a.score)
                      
                      const winner = newSession.team2
                      const runnerUp = allTeams.length >= 2 && allTeams[1].score > 0 
                        ? allTeams[1].team.match(/.{1,3}/g) || [] 
                        : []
                      const survivors = allTeams.slice(2).filter(t => t.score > 0).map(t => t.team)
                      const losers = allTeams.filter(t => t.score === 0).map(t => t.team)
                      
                      setResults({
                        winners: winner,
                        runnersUp: runnerUp,
                        survivors: survivors,
                        losers: losers,
                        winningTeam: 2
                      })
                      setGameComplete(true)
                    } else {
                      setTeamSelectionMode(true)
                      setGameStarted(false)
                      setNewSession(s => ({ ...s, team1: [] }))
                    }
                  }}
                  variant="frosted"
                  color="red"
                  className="h-16 text-base font-bold"
                >
                  Team 2 Wins
                </Button>
              </div>
            </div>

            {/* Round History */}
            {rungRounds.length > 0 && (
              <div className="bg-slate-900/50 p-3 rounded-xl">
                <h3 className="text-center text-xs font-bold text-slate-400 mb-2">Round History</h3>
                <div className="space-y-1 text-xs">
                  {rungRounds.map((round, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className={round.winner === 1 ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                        {round.team1.join('')}
                      </span>
                      <span className="text-amber-400">vs</span>
                      <span className={round.winner === 2 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {round.team2.join('')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Teams Leaderboard */}
            {Object.keys(rungTeamScores).length > 2 && (
              <div className="bg-slate-900/50 p-3 rounded-xl">
                <h3 className="text-center text-xs font-bold text-slate-400 mb-2">All Teams</h3>
                <div className="space-y-1 text-xs">
                  {Object.entries(rungTeamScores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([team, score]) => (
                      <div key={team} className="flex justify-between items-center">
                        <span>{team}</span>
                        <span className="text-amber-400 font-bold">{score}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : newSession.game === 'Blackjack' ? (
          /* BLACKJACK KNOCKOUT */
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
          /* OTHER GAMES */
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
        /* RESULTS */
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
                <div className="text-base font-bold">{results.winners.join(', ')}</div>
              </div>
            )}
            
            {results.runnersUp.length > 0 && (
              <div className="bg-blue-900/50 p-3 rounded-xl">
                <div className="text-sm font-bold text-blue-400 mb-1">🥈 Runners Up</div>
                <div className="text-base font-bold">{results.runnersUp.join(', ')}</div>
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