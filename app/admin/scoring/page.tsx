'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Blackjack', 'Shithead']

const GAME_EMOJIS: Record<string, string> = {
  'Blackjack': '🃏',
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩'
}

export default function LiveScoringPage() {
  const [activeSession, setActiveSession] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [recentGames, setRecentGames] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  const [newSession, setNewSession] = useState({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [] as string[],
    threshold: 3
  })

  const [blackjackMode, setBlackjackMode] = useState(false)
  const [blackjackRound, setBlackjackRound] = useState(1)
  const [blackjackPlayers, setBlackjackPlayers] = useState<string[]>([])
  const [knockedOut, setKnockedOut] = useState<string[]>([])

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
    fetchRecentGames()
    setLoading(false)
  }

  const fetchRecentGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setRecentGames(data)
    }
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
      win_threshold: newSession.game === 'Blackjack' ? 1 : newSession.threshold
    })

    const initialScores: Record<string, number> = {}
    newSession.players.forEach(p => initialScores[p] = 0)
    setScores(initialScores)
    setScoreHistory([])
    
    setNewSession({
      game: 'Monopoly',
      date: new Date().toISOString().split('T')[0],
      players: [],
      threshold: 3
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

    // Group by same scores
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
    const losers = scoreGroups.slice(2).flatMap(g => g.players)

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
    fetchRecentGames()
  }

  const cancelSession = () => {
    if (!window.confirm('Cancel this session? All progress will be lost.')) return

    setActiveSession(null)
    setScores({})
    setScoreHistory([])
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
    fetchRecentGames()
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">🎮 Live Scoring</h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            ← Back to Admin
          </button>
        </div>

        {activeSession ? (
          <div className="space-y-6">
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
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
              <h2 className="text-2xl font-bold mb-6">📝 Create New Session</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">Game Type</label>
                  <select
                    value={newSession.game}
                    onChange={(e) => setNewSession({ ...newSession, game: e.target.value })}
                    className="w-full p-3 bg-violet-900/80 rounded-lg"
                  >
                    {SCORE_GAMES.map(g => <option key={g} value={g}>{GAME_EMOJIS[g]} {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Date</label>
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                    className="w-full p-3 bg-violet-900/80 rounded-lg"
                  />
                </div>
                {newSession.game !== 'Blackjack' && (
                  <div>
                    <label className="block mb-2 text-sm">Win Threshold</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSession.threshold}
                      onChange={(e) => setNewSession({ ...newSession, threshold: parseInt(e.target.value) })}
                      className="w-full p-3 bg-violet-900/80 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <label className="block mb-2 text-sm">Select Players</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={selectAllPlayers}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      Select All
                    </button>
                    {newSession.players.length > 0 && (
                      <button
                        type="button"
                        onClick={clearPlayers}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {PLAYERS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePlayer(p)}
                        className={`px-4 py-2 rounded ${newSession.players.includes(p) ? 'bg-purple-600' : 'bg-violet-900/80'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
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
                    className="w-full bg-amber-600 hover:bg-amber-700 py-3 rounded font-bold"
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
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
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
                          className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
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
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {newSession.game !== 'Blackjack' && (
                  <button
                    onClick={createSession}
                    className="w-full bg-fuchsia-700 hover:bg-fuchsia-800 py-3 rounded font-bold"
                  >
                    ✍️ Start Scoring
                  </button>
                )}
              </div>
            </div>

            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
              <h2 className="text-2xl font-bold mb-6">📊 Recent Games</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentGames.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">No games yet</div>
                ) : (
                  recentGames.map(game => (
                    <div key={game.id} className="bg-violet-900/80 rounded-lg p-3 border border-fuchsia-500/40">
                      <div className="font-bold">{GAME_EMOJIS[game.game_type]} {game.game_type}</div>
                      <div className="text-sm text-slate-400">{new Date(game.game_date).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-300 mt-1">
                        Winner: {game.winners?.join(', ') || 'N/A'}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
