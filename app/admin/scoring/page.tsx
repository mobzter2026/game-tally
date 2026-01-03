'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { GameSession, GameSessionInsert, Round, RoundInsert } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Shithead']

const GAME_EMOJIS: Record<string, string> = {
  'Monopoly': '🎲',
  'Tai Ti': '🀄',
  'Shithead': '💩'
}

export default function ScoringPage() {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [activeSession, setActiveSession] = useState<GameSession | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [viewingSession, setViewingSession] = useState<GameSession | null>(null)
  const [viewingScores, setViewingScores] = useState<Record<string, number> | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [newSession, setNewSession] = useState({
    game: 'Monopoly',
    date: new Date().toISOString().split('T')[0],
    players: [] as string[],
    threshold: 3
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (activeSession) {
      fetchRounds(activeSession.id)
    }
  }, [activeSession])

  useEffect(() => {
    const newScores: Record<string, number> = {}
    activeSession?.players.forEach(p => newScores[p] = 0)
    rounds.forEach(round => {
      if (newScores[round.winner] !== undefined) {
        newScores[round.winner]++
      }
    })
    setScores(newScores)
  }, [rounds, activeSession])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!adminData) {
      await supabase.auth.signOut()
      router.push('/admin/login')
      return
    }

    setUser(user)
    fetchSessions()
    setLoading(false)
  }

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setSessions(data as GameSession[])
  }

  const fetchRounds = async (sessionId: string) => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })

    if (data) setRounds(data as Round[])
  }

  const fetchSessionSummary = async (session: GameSession) => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('session_id', session.id)
      .order('round_number', { ascending: true })

    if (data) {
      const sessionScores: Record<string, number> = {}
      session.players.forEach(p => sessionScores[p] = 0)
      const roundsData = data as Round[]
      roundsData.forEach(round => {
        if (sessionScores[round.winner] !== undefined) {
          sessionScores[round.winner]++
        }
      })
      return sessionScores
    }
    return null
  }

  const createSession = async () => {
    if (newSession.players.length < 2) {
      alert('Select at least 2 players')
      return
    }

    const sessionData: GameSessionInsert = {
      game_type: newSession.game,
      game_date: newSession.date,
      players: newSession.players,
      win_threshold: newSession.threshold,
      status: 'in_progress',
      created_by: user?.email ?? null
    }

    const { data, error } = await (supabase.from('game_sessions').insert as any)(sessionData)
      .select()
      .single()

    if (data && !error) {
      setActiveSession(data as GameSession)
      setNewSession({
        game: 'Monopoly',
        date: new Date().toISOString().split('T')[0],
        players: [],
        threshold: 3
      })
      fetchSessions()
    }
  }

  const removePlayer = async (player: string) => {
    if (!activeSession || rounds.length > 0) {
      alert('Cannot remove players after rounds have been played')
      return
    }

    if (!confirm(`Remove ${player} from this session?`)) return

    const updatedPlayers = activeSession.players.filter(p => p !== player)
    
    if (updatedPlayers.length < 2) {
      alert('Must have at least 2 players')
      return
    }

    await (supabase.from('game_sessions').update as any)({ players: updatedPlayers })
      .eq('id', activeSession.id)

    setActiveSession({ ...activeSession, players: updatedPlayers })
    fetchSessions()
  }

  const addRound = async (winner: string) => {
    if (!activeSession) return

    const roundNumber = rounds.length + 1

    const roundData: RoundInsert = {
      session_id: activeSession.id,
      round_number: roundNumber,
      winner: winner
    }

    await (supabase.from('rounds').insert as any)(roundData)
    await fetchRounds(activeSession.id)
  }

  useEffect(() => {
    if (!activeSession || rounds.length === 0) return

    const maxScore = Math.max(...Object.values(scores))
    
    if (maxScore >= activeSession.win_threshold) {
      setTimeout(() => finalizeSession(), 100)
    }
  }, [scores])

  const undoLastRound = async () => {
    if (!activeSession || rounds.length === 0) return

    const lastRound = rounds[rounds.length - 1]
    await supabase
      .from('rounds')
      .delete()
      .eq('id', lastRound.id)

    fetchRounds(activeSession.id)
  }

  const cancelSession = async () => {
    if (!activeSession) return
    
    if (!confirm('Cancel this session? All round data will be deleted.')) return

    await supabase.from('rounds').delete().eq('session_id', activeSession.id)
    await supabase.from('game_sessions').delete().eq('id', activeSession.id)

    const alertDiv = document.createElement('div')
    alertDiv.innerHTML = '<strong>Computer says:</strong><br>Session cancelled'
    alertDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e293b;color:white;padding:20px 40px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.5);z-index:9999;font-family:monospace;font-size:18px;text-align:center'
    document.body.appendChild(alertDiv)
    setTimeout(() => document.body.removeChild(alertDiv), 2000)

    setActiveSession(null)
    setRounds([])
    setScores({})
    fetchSessions()
  }

  const finalizeSession = async () => {
    if (!activeSession) return

    const sortedPlayers = Object.entries(scores)
      .filter(([player, _]) => activeSession.players.includes(player))
      .sort((a, b) => {
        if (activeSession.game_type === 'Shithead') {
          return a[1] - b[1]
        }
        return b[1] - a[1]
      })

    const uniqueScores = [...new Set(sortedPlayers.map(([_, score]) => score))].sort((a, b) => {
      if (activeSession.game_type === 'Shithead') {
        return a - b
      }
      return b - a
    })

    const bestScore = uniqueScores[0]
    const topPlayers = sortedPlayers.filter(([_, score]) => score === bestScore)
    const winners = [topPlayers[0][0]]

    let runnersUp: string[] = []
    if (uniqueScores.length > 1) {
      const secondScore = uniqueScores[1]
      runnersUp = sortedPlayers.filter(([_, score]) => score === secondScore).map(([player, _]) => player)
    }

    let losers: string[] = []
    if (uniqueScores.length > 2) {
      const worstScore = uniqueScores[uniqueScores.length - 1]
      losers = sortedPlayers.filter(([_, score]) => score === worstScore).map(([player, _]) => player)
    } else if (uniqueScores.length === 2 && winners.length === 1) {
      losers = sortedPlayers.filter(([player, _]) => !winners.includes(player)).map(([player, _]) => player)
      runnersUp = []
    }

    await (supabase.from('games').insert as any)({
      game_type: activeSession.game_type,
      game_date: activeSession.game_date,
      players_in_game: activeSession.players,
      winners: winners.length > 0 ? winners : null,
      runners_up: runnersUp.length > 0 ? runnersUp : null,
      losers: losers.length > 0 ? losers : null,
      session_id: activeSession.id,
      created_by: user?.email,
      created_at: new Date().toISOString()
    })

    await (supabase.from('game_sessions').update as any)({ status: 'completed' })
      .eq('id', activeSession.id)

    const alertDiv = document.createElement('div')
    if (activeSession.game_type === 'Shithead' && losers.length > 0) {
      const realShithead = losers[losers.length - 1]
      alertDiv.innerHTML = `<strong>Computer says:</strong><br>${winners[0]} is the winner but ${realShithead} is the real Shithead! 💩`
    } else {
      alertDiv.innerHTML = `<strong>Computer says:</strong><br>Game Over! 🏆<br>Winner: ${winners[0]} (${bestScore} points)`
    }
    alertDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e293b;color:white;padding:30px 50px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.5);z-index:9999;font-family:monospace;font-size:20px;text-align:center;line-height:1.6'
    document.body.appendChild(alertDiv)
    setTimeout(() => document.body.removeChild(alertDiv), 3000)

    setActiveSession(null)
    setRounds([])
    setScores({})
    fetchSessions()
  }

  const togglePlayer = (player: string) => {
    if (newSession.players.includes(player)) {
      setNewSession({ ...newSession, players: newSession.players.filter(p => p !== player) })
    } else {
      setNewSession({ ...newSession, players: [...newSession.players, player] })
    }
  }

  const selectAllPlayers = () => {
    setNewSession({ ...newSession, players: PLAYERS })
  }

  const clearPlayers = () => {
    setNewSession({ ...newSession, players: [] })
  }

  const getSortedScores = () => {
    if (!activeSession) return []
    
    return Object.entries(scores)
      .filter(([player, _]) => activeSession.players.includes(player))
      .sort((a, b) => {
        if (activeSession.game_type === 'Shithead') {
          return a[1] - b[1]
        }
        return b[1] - a[1]
      })
  }

  const showSessionSummary = async (session: GameSession) => {
    const scores = await fetchSessionSummary(session)
    if (scores) {
      setViewingSession(session)
      setViewingScores(scores)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session? This will remove the session and all its rounds.')) return

    // Delete all rounds for this session
    await supabase.from('rounds').delete().eq('session_id', sessionId)
    
    // Delete the session itself
    await supabase.from('game_sessions').delete().eq('id', sessionId)
    
    // Refresh the sessions list
    fetchSessions()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto mt-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">🎯 Live Scoring</h1>
          <p className="text-slate-400 mb-4">Track rounds in real-time</p>
          <div className="flex gap-2 justify-center">
            <a href="/admin" className="px-3 py-1.5 text-sm bg-green-700 hover:bg-green-800 rounded">← Back to Admin</a>
          </div>
        </div>

        {viewingSession && viewingScores && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => {setViewingSession(null); setViewingScores(null)}}>
            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-4">{GAME_EMOJIS[viewingSession.game_type]} {viewingSession.game_type} Session Stats</h3>
              <div className="space-y-2 mb-4">
                {Object.entries(viewingScores).sort((a, b) => {
                  if (viewingSession.game_type === 'Shithead') {
                    return a[1] - b[1]
                  }
                  return b[1] - a[1]
                }).map(([player, score]) => (
                  <div key={player} className="flex justify-between bg-violet-900/80 p-3 rounded border border-fuchsia-500/40">
                    <span className="font-bold">{player}</span>
                    <span className="text-yellow-400 font-bold text-xl">{score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => {setViewingSession(null); setViewingScores(null)}} className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded">
                Close
              </button>
            </div>
          </div>
        )}

        {!activeSession ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
              <h2 className="text-2xl font-bold mb-4">Start New Scoring Session</h2>
              
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

                <div>
                  <label className="block mb-2 text-sm">Select Players</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={selectAllPlayers}
                      className="px-3 py-1 bg-green-700 hover:bg-green-800 rounded text-xs"
                    >
                      Select All
                    </button>
                    {newSession.players.length > 0 && (
                      <button
                        type="button"
                        onClick={clearPlayers}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                      >
                        Clear Selected
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
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

                <button
                  onClick={createSession}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold"
                >
                  ✍️ Record Scores Now
                </button>
              </div>
            </div>

            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
              <h2 className="text-2xl font-bold mb-4">Recent Sessions</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {sessions.map(session => (
                  <div key={session.id} className="bg-violet-900/80 rounded-lg p-3 border border-fuchsia-500/40">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold">{GAME_EMOJIS[session.game_type]} {session.game_type}</div>
                        <div className="text-sm text-slate-400">{new Date(session.game_date).toLocaleDateString()}</div>
                        <div className="text-sm mb-2">Players: {session.players.join(', ')}</div>
                        {session.status === 'in_progress' && (
                          <button
                            onClick={() => setActiveSession(session)}
                            className="bg-green-700 hover:bg-green-800 px-3 py-1 rounded text-sm w-full"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                      <div className="ml-2 flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded text-sm text-center ${session.status === 'completed' ? 'bg-red-800' : 'bg-yellow-600'}`}>
                          {session.status === 'completed' ? 'Game Over' : session.status}
                        </span>
                        <button
                          onClick={() => showSessionSummary(session)}
                          className="bg-orange-700 hover:bg-orange-800 px-3 py-1 rounded text-sm whitespace-nowrap"
                        >
                          View Stats
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {GAME_EMOJIS[activeSession.game_type]} {activeSession.game_type}
                </h2>
                <button
                  onClick={() => setActiveSession(null)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  Exit
                </button>
              </div>

              <div className="mb-4 p-4 bg-slate-700 rounded">
                <div className="text-sm text-slate-400">Round: {rounds.length + 1}</div>
              </div>

              <h3 className="text-xl font-bold mb-3">Current Scores</h3>
              <div className="space-y-2 mb-6">
                {getSortedScores().map(([player, score]) => (
                  <div key={player} className="flex justify-between items-center bg-slate-700 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{player}</span>
                      {rounds.length === 0 && (
                        <button
                          onClick={() => removePlayer(player)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-yellow-400">{score}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-bold mb-3">
                {activeSession.game_type === 'Shithead' ? 'Who lost this round?' : 'Who won this round?'}
              </h3>
              <div className="space-y-2 mb-4">
                {activeSession.players.map(player => (
                  <button
                    key={player}
                    onClick={() => addRound(player)}
                    className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
                  >
                    ✓ {player}
                  </button>
                ))}
              </div>

              {rounds.length > 0 && (
                <button
                  onClick={undoLastRound}
                  className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded mb-2"
                >
                  ↶ Undo Last Round
                </button>
              )}

              <button
                onClick={finalizeSession}
                className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded mb-2"
              >
                🏁 Finish Game Early
              </button>

              <button
                onClick={cancelSession}
                className="w-full bg-red-600 hover:bg-red-700 py-2 rounded"
              >
                ❌ Cancel Session
              </button>
            </div>

            <div className="bg-violet-950/30 rounded-xl border-2 border-white/50 p-6">
              <h2 className="text-2xl font-bold mb-4">Round History</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {rounds.map((round) => (
                  <div key={round.id} className="bg-slate-700 rounded p-3 flex justify-between items-center">
                    <span className="text-slate-400">Round {round.round_number}</span>
                    <span className="font-bold text-green-400">{round.winner}</span>
                  </div>
                ))}
                {rounds.length === 0 && (
                  <div className="text-center text-slate-400 py-8">No rounds played yet</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
