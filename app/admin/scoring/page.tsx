'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Blackjack', 'Shithead', 'Rung']

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩',
  'Rung': '🎴'
}

export default function LiveScoringPage() {
  const [activeSession, setActiveSession] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const [newSession, setNewSession] = useState({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [] as string[],
    threshold: 5
  })

  const [blackjackMode, setBlackjackMode] = useState(false)
  const [blackjackRound, setBlackjackRound] = useState(1)
  const [blackjackPlayers, setBlackjackPlayers] = useState<string[]>([])
  const [knockedOut, setKnockedOut] = useState<string[]>([])

  const [rungTeam1, setRungTeam1] = useState<string[]>([])
  const [rungTeam2, setRungTeam2] = useState<string[]>([])
  const [rungTeamScores, setRungTeamScores] = useState<{[key: string]: number}>({})

  const [confirmDialog, setConfirmDialog] = useState<{show: boolean, winner: string, scores: Record<string,number>}>({show: false, winner: '', scores: {}})
  const [scoreHistory, setScoreHistory] = useState<{player: string, amount: number}[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const createSession = () => {
    if (newSession.players.length < 2) {
      alert('Select at least 2 players')
      return
    }

    setActiveSession({
      game_type: newSession.game,
      game_date: newSession.date,
      players: newSession.players,
      win_threshold: newSession.game === 'Rung' ? 5 : (newSession.game === 'Blackjack' ? 1 : newSession.threshold)
    })

    const initialScores: Record<string, number> = {}
    newSession.players.forEach(p => initialScores[p] = 0)
    setScores(initialScores)
    setScoreHistory([])
    
    setRungTeam1([])
    setRungTeam2([])
    setRungTeamScores({})
    
    setNewSession({
      game: 'Monopoly',
      date: new Date().toISOString().split('T')[0],
      players: [],
      threshold: 5
    })
  }

  const adjustScore = (player: string, amount: number) => {
    if (!activeSession) return

    const newScores = { ...scores }
    newScores[player] = Math.max(0, (newScores[player] || 0) + amount)
    setScores(newScores)
    setScoreHistory([...scoreHistory, {player, amount}])
    
    const threshold = activeSession.win_threshold || 3
    
    if (activeSession.game_type === 'Shithead') {
      const maxScore = Math.max(...Object.values(newScores))
      if (maxScore >= threshold) {
        const minScore = Math.min(...Object.values(newScores))
        const winners = Object.entries(newScores).filter(([,score]) => score === minScore).map(([p]) => p)
        setConfirmDialog({show: true, winner: winners.join(', '), scores: newScores})
      }
    } else {
      const maxScore = Math.max(...Object.values(newScores))
      if (maxScore >= threshold) {
        const winner = Object.entries(newScores).find(([, score]) => score === maxScore)?.[0] || ''
        setConfirmDialog({show: true, winner, scores: newScores})
      }
    }
  }

  const recordRungWin = (teamNum: number) => {
    const teamKey = `Team ${teamNum}`
    const newTeamScores = { ...rungTeamScores }
    newTeamScores[teamKey] = (newTeamScores[teamKey] || 0) + 1
    setRungTeamScores(newTeamScores)

    const threshold = activeSession.win_threshold || 5
    if (newTeamScores[teamKey] >= threshold) {
      finishRungGame(teamNum, newTeamScores)
    }
  }

  const finishRungGame = async (winningTeam: number, teamScores: {[key: string]: number}) => {
    const team1Players = rungTeam1
    const team2Players = rungTeam2
    
    const gameData = {
      game_type: 'Rung',
      game_date: activeSession.game_date,
      players_in_game: activeSession.players,
      team1: team1Players,
      team2: team2Players,
      winning_team: winningTeam,
      winners: winningTeam === 1 ? team1Players : team2Players,
      runners_up: winningTeam === 1 ? team2Players : team1Players,
      losers: []
    }

    const { error } = await supabase.from('games').insert(gameData as any)

    if (error) {
      alert('Error saving game: ' + error.message)
      return
    }

    alert(`🎴 Rung Complete!\n\nTeam ${winningTeam} wins!\nScore: ${teamScores['Team 1'] || 0} - ${teamScores['Team 2'] || 0}`)

    setActiveSession(null)
    setRungTeam1([])
    setRungTeam2([])
    setRungTeamScores({})
  }

  const undoLastScore = () => {
    if (scoreHistory.length === 0) return
    
    const last = scoreHistory[scoreHistory.length - 1]
    const newScores = { ...scores }
    newScores[last.player] = Math.max(0, (newScores[last.player] || 0) - last.amount)
    setScores(newScores)
    setScoreHistory(scoreHistory.slice(0, -1))
  }

  const confirmEndSession = async () => {
    await endSession(confirmDialog.scores)
    setConfirmDialog({show: false, winner: '', scores: {}})
  }

  const endSession = async (finalScores: Record<string, number>) => {
    if (!activeSession) return

    const sortedPlayers = Object.entries(finalScores)
      .sort(([, a], [, b]) => {
        if (activeSession.game_type === 'Shithead') {
          return a - b
        }
        return b - a
      })
      .map(([player]) => player)

    const scoreGroups: {score: number, players: string[]}[] = []
    const uniqueScores = [...new Set(Object.values(finalScores))].sort((a, b) => 
      activeSession.game_type === 'Shithead' ? a - b : b - a
    )

    uniqueScores.forEach(score => {
      const playersWithScore = sortedPlayers.filter(p => finalScores[p] === score)
      scoreGroups.push({score, players: playersWithScore})
    })

    const winners = scoreGroups[0]?.players || []
    const runnersUp = scoreGroups[1]?.players || []
    const losers = scoreGroups.length > 2 ? scoreGroups[scoreGroups.length - 1].players : []

    const gameData = {
      game_type: activeSession.game_type,
      game_date: activeSession.game_date,
      players_in_game: activeSession.players,
      winners: winners,
      runners_up: runnersUp,
      losers: losers
    }

    const { error } = await supabase.from('games').insert(gameData as any)

    if (error) {
      alert('Error saving game: ' + error.message)
      return
    }

    alert(`🏆 ${winners.join(', ')} win${winners.length > 1 ? '' : 's'}!\n\nFinal Scores:\n${sortedPlayers.map(p => `${p}: ${finalScores[p]}`).join('\n')}`)

    setActiveSession(null)
    setScores({})
    setScoreHistory([])
  }

  const cancelSession = () => {
    if (!window.confirm('Cancel this session? All progress will be lost.')) return

    setActiveSession(null)
    setScores({})
    setScoreHistory([])
    setRungTeam1([])
    setRungTeam2([])
    setRungTeamScores({})
  }

  const selectAllPlayers = () => {
    setNewSession({ ...newSession, players: [...PLAYERS] })
  }

  const clearPlayers = () => {
    setNewSession({ ...newSession, players: [] })
  }

  const togglePlayer = (player: string) => {
    if (newSession.players.includes(player)) {
      setNewSession({ ...newSession, players: newSession.players.filter(p => p !== player) })
    } else {
      setNewSession({ ...newSession, players: [...newSession.players, player] })
    }
  }

  const handleBlackjackKnockout = (player: string) => {
    const newKnockedOut = [...knockedOut, player]
    const remaining = blackjackPlayers.filter(p => p !== player)
    setKnockedOut(newKnockedOut)
    setBlackjackPlayers(remaining)
    
    if (remaining.length === 1) {
      const winner = remaining[0]
      const runnerUp = newKnockedOut[newKnockedOut.length - 1]
      const loser = newKnockedOut[0]
      const survivors = newKnockedOut.slice(1, -1)
      
      finishBlackjackTournament(winner, runnerUp, loser, survivors)
    } else {
      setBlackjackRound(blackjackRound + 1)
    }
  }

  const finishBlackjackTournament = async (winner: string, runnerUp: string, loser: string, survivors: string[]) => {
    const gameData = {
      game_type: 'Blackjack',
      game_date: newSession.date,
      players_in_game: newSession.players,
      winners: [winner],
      runners_up: [runnerUp],
      losers: [loser]
    }

    const { error } = await supabase.from('games').insert(gameData as any)

    if (error) {
      alert('Error recording tournament: ' + error.message)
      return
    }

    alert(`🃏 Blackjack Tournament Complete!\n\n🏆 Winner: ${winner}\n🥈 Runner-up: ${runnerUp}\n💩 Loser: ${loser}${survivors.length > 0 ? `\n\nSurvivors: ${survivors.join(', ')}` : ''}`)
    
    setBlackjackMode(false)
    setBlackjackRound(1)
    setBlackjackPlayers([])
    setKnockedOut([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">⚔️ Points Royale ⚔️</h1>
        <div className="flex justify-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg border-2 border-white/30 hover:border-white/50 transition-all font-bold text-sm"
          >
            ← Back to Leaderboard
          </button>
        </div>

        {activeSession ? (
          <div className="space-y-6">
            {activeSession.game_type === 'Rung' ? (
              <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">🎴 Rung</h2>
                    <p className="text-slate-400">First to {activeSession.win_threshold} wins</p>
                    <div className="text-yellow-400 font-bold text-xl mt-2">
                      Team 1: {rungTeamScores['Team 1'] || 0} - {rungTeamScores['Team 2'] || 0} :Team 2
                    </div>
                  </div>
                  <button
                    onClick={cancelSession}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-bold">Select Team 1 (2 players)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {activeSession.players.map((player: string) => (
                        <button
                          key={player}
                          onClick={() => {
                            if (rungTeam1.includes(player)) {
                              setRungTeam1(rungTeam1.filter(p => p !== player))
                            } else if (rungTeam1.length < 2 && !rungTeam2.includes(player)) {
                              setRungTeam1([...rungTeam1, player])
                            }
                          }}
                          className={`px-4 py-2 rounded ${rungTeam1.includes(player) ? 'bg-blue-600' : 'bg-violet-900/80'}`}
                          disabled={rungTeam2.includes(player)}
                        >
                          {player}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-bold">Select Team 2 (2 players)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {activeSession.players.map((player: string) => (
                        <button
                          key={player}
                          onClick={() => {
                            if (rungTeam2.includes(player)) {
                              setRungTeam2(rungTeam2.filter(p => p !== player))
                            } else if (rungTeam2.length < 2 && !rungTeam1.includes(player)) {
                              setRungTeam2([...rungTeam2, player])
                            }
                          }}
                          className={`px-4 py-2 rounded ${rungTeam2.includes(player) ? 'bg-purple-600' : 'bg-violet-900/80'}`}
                          disabled={rungTeam1.includes(player)}
                        >
                          {player}
                        </button>
                      ))}
                    </div>
                  </div>

                  {rungTeam1.length === 2 && rungTeam2.length === 2 && (
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <button
                        onClick={() => recordRungWin(1)}
                        className="bg-blue-600 hover:bg-blue-700 py-4 rounded font-bold text-lg"
                      >
                        Team 1 Wins<br/><span className="text-sm">({rungTeam1.join(' + ')})</span>
                      </button>
                      <button
                        onClick={() => recordRungWin(2)}
                        className="bg-purple-600 hover:bg-purple-700 py-4 rounded font-bold text-lg"
                      >
                        Team 2 Wins<br/><span className="text-sm">({rungTeam2.join(' + ')})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{GAME_EMOJIS[activeSession.game_type]} {activeSession.game_type}</h2>
                    <p className="text-slate-400">First to {activeSession.win_threshold} {activeSession.game_type === 'Shithead' ? '(lowest wins)' : 'wins'}</p>
                  </div>
                  <div className="flex gap-2">
                    {scoreHistory.length > 0 && (
                      <button
                        onClick={undoLastScore}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
                      >
                        ↶ Undo
                      </button>
                    )}
                    <button
                      onClick={cancelSession}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {activeSession.players.map((player: string) => (
                    <div key={player} className="bg-violet-900/80 p-4 rounded border border-fuchsia-500/40">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">{player}</span>
                        <span className="text-yellow-400 font-bold text-2xl">{scores[player] || 0}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => adjustScore(player, -1)}
                          className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded font-bold"
                        >
                          −
                        </button>
                        <button
                          onClick={() => adjustScore(player, 1)}
                          className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
            <h2 className="text-2xl font-bold mb-6">Let the Madness Begin 🎯</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-[4]">
                  <label className="block mb-2 text-sm font-bold">Date</label>
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                    className="w-full p-3 bg-violet-900/80 rounded-lg border-2 border-white/20"
                  />
                </div>
                <div className="flex-[6]">
                  <label className="block mb-2 text-sm font-bold">Game</label>
                  <select
                    value={newSession.game}
                    onChange={(e) => setNewSession({ ...newSession, game: e.target.value })}
                    className="w-full p-3 bg-violet-900/80 rounded-lg border-2 border-white/20"
                  >
                    {SCORE_GAMES.map(g => <option key={g} value={g}>{GAME_EMOJIS[g]} {g}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold">Select Players</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllPlayers}
                        className="px-3 py-1 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded border border-white/30 text-xs"
                      >
                        Select All
                      </button>
                      {newSession.players.length > 0 && (
                        <button
                          type="button"
                          onClick={clearPlayers}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded border border-white/30 text-xs"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {PLAYERS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePlayer(p)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all font-semibold ${
                          newSession.players.includes(p) 
                            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 border-white/50' 
                            : 'bg-violet-900/80 border-white/20 hover:border-white/40'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {newSession.game !== 'Blackjack' && newSession.game !== 'Rung' && (
                  <div className="w-[200px]">
                    <label className="block mb-2 text-sm font-bold">Win Threshold</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSession.threshold}
                      onChange={(e) => setNewSession({ ...newSession, threshold: parseInt(e.target.value) })}
                      className="w-full p-3 bg-violet-900/80 rounded-lg border-2 border-white/20"
                    />
                  </div>
                )}
                {newSession.game === 'Rung' && (
                  <div className="w-[200px]">
                    <label className="block mb-2 text-sm font-bold">Win Threshold</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={5}
                      onChange={(e) => setNewSession({ ...newSession, threshold: parseInt(e.target.value) })}
                      className="w-full p-3 bg-violet-900/80 rounded-lg border-2 border-white/20"
                    />
                  </div>
                )}
              </div>

              {newSession.game === 'Blackjack' && newSession.players.length > 0 && !blackjackMode && (
                <button
                  type="button"
                  onClick={() => {
                    setBlackjackMode(true)
                    setBlackjackPlayers([...newSession.players])
                    setBlackjackRound(1)
                    setKnockedOut([])
                  }}
                  className="w-full bg-gradient-to-br from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 py-3 rounded-lg border-2 border-white/30 font-bold"
                >
                  🃏 Start Blackjack Tournament
                </button>
              )}

              {blackjackMode && (
                <div className="bg-black/40 rounded-xl border-2 border-amber-500/60 p-4">
                  <h3 className="font-bold text-lg mb-3">Blackjack Tournament - Round {blackjackRound}</h3>
                  <p className="text-sm text-slate-400 mb-3">
                    {blackjackPlayers.length === 2 ? 'Finals! Click for 2nd place:' : 'Click to knockout:'}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {blackjackPlayers.map(player => (
                      <button
                        key={player}
                        onClick={() => handleBlackjackKnockout(player)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg border-2 border-white/30 font-semibold"
                      >
                        {player}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {knockedOut.length > 0 && (
                      <button
                        onClick={() => {
                          const lastKnockedOut = knockedOut[knockedOut.length - 1]
                          setBlackjackPlayers([...blackjackPlayers, lastKnockedOut])
                          setKnockedOut(knockedOut.slice(0, -1))
                          setBlackjackRound(Math.max(1, blackjackRound - 1))
                        }}
                        className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg border-2 border-white/30 text-sm"
                      >
                        ↶ Undo
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setBlackjackMode(false)
                        setBlackjackRound(1)
                        setBlackjackPlayers([])
                        setKnockedOut([])
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg border-2 border-white/30 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {newSession.game !== 'Blackjack' && (
                <button
                  onClick={createSession}
                  className="w-full bg-gradient-to-br from-fuchsia-700 to-purple-700 hover:from-fuchsia-600 hover:to-purple-600 py-3 rounded-lg border-2 border-white/30 font-bold"
                >
                  👊 Game On!
                </button>
              )}
            </div>
          </div>
        )}

        {confirmDialog.show && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-violet-950/95 rounded-xl border-2 border-yellow-500 p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">🏆 Game Complete!</h3>
              <div className="mb-4">
                <p className="text-lg mb-2">Winner: <span className="text-yellow-400 font-bold">{confirmDialog.winner}</span></p>
                <div className="text-sm text-slate-300">
                  Final Scores:
                  {Object.entries(confirmDialog.scores)
                    .sort(([,a],[,b]) => activeSession?.game_type === 'Shithead' ? a - b : b - a)
                    .map(([player, score]) => (
                      <div key={player} className="flex justify-between py-1">
                        <span>{player}</span>
                        <span className="font-bold">{score}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDialog({show: false, winner: '', scores: {}})}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndSession}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
