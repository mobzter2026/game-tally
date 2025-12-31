'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { GameSession, GameSessionInsert, Round, RoundInsert } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const SCORE_GAMES = ['Monopoly', 'Tai Ti', 'Shithead']

export default function ScoringPage() {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [activeSession, setActiveSession] = useState<GameSession | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  // New session form
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
    // Calculate scores from rounds
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

  const addRound = async (winner: string) => {
    if (!activeSession) return

    const roundNumber = rounds.length + 1

    const roundData: RoundInsert = {
      session_id: activeSession.id,
      round_number: roundNumber,
      winner: winner
    }

    await (supabase.from('rounds').insert as any)(roundData)

    fetchRounds(activeSession.id)

    // Check if game is over
    const newScore = (scores[winner] || 0) + 1
    if (newScore >= activeSession.win_threshold) {
      await finalizeSession()
    }
  }

  const undoLastRound = async () => {
    if (!activeSession || rounds.length === 0) return

    const lastRound = rounds[rounds.length - 1]
    await supabase
      .from('rounds')
      .delete()
      .eq('id', lastRound.id)

    fetchRounds(activeSession.id)
  }

  const finalizeSession = async () => {
    if (!activeSession) return

    // Calculate final standings
    const sortedPlayers = Object.entries(scores)
      .sort((a, b) => {
        // For Shithead, invert the sorting (lowest score wins)
        if (activeSession.game_type === 'Shithead') {
          return a[1] - b[1]
        }
        return b[1] - a[1]
      })

    const winners = [sortedPlayers[0][0]]
    const runnersUp = sortedPlayers.length > 1 ? [sortedPlayers[1][0]] : []
    const losers = sortedPlayers.length > 2 ? [sortedPlayers[sortedPlayers.length - 1][0]] : []

    // Create final game record
    await (supabase.from('games').insert as any)({
      game_type: activeSession.game_type,
      game_date: activeSession.game_date,
      players_in_game: activeSession.players,
      winners: winners,
      runners_up: runnersUp,
      losers: losers,
      session_id: activeSession.id,
      created_by: user?.email
    })

    // Mark session as completed
    await supabase
      .from('game_sessions')
      .update({ status: 'completed' })
      .eq('id', activeSession.id)

    alert(`Game Over! Winner: ${winners[0]}`)
    setActiveSession(null)
    setRounds([])
    fetchSessions()
  }

  const togglePlayer = (player: string) => {
    if (newSession.players.includes(player)) {
      setNewSession({ ...newSession, players: newSession.players.filter(p => p !== player) })
    } else {
      setNewSession({ ...newSession, players: [...newSession.players, player] })
    }
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎯 Live Scoring</h1>
            <p className="text-slate-400">Track rounds in real-time</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">← Back to Admin</a>
          </div>
        </div>

        {!activeSession ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Session */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Start New Scoring Session</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">Game Type</label>
                  <select
                    value={newSession.game}
                    onChange={(e) => setNewSession({ ...newSession, game: e.target.value })}
                    className="w-full p-3 bg-slate-700 rounded-lg"
                  >
                    {SCORE_GAMES.map(g => <option key={g} value={g}>{g} {g === 'Shithead' ? '💩' : ''}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm">Date</label>
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                    className="w-full p-3 bg-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm">
                    {newSession.game === 'Shithead' ? 'First to LOSE' : 'First to WIN'} (Points)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSession.threshold}
                    onChange={(e) => setNewSession({ ...newSession, threshold: parseInt(e.target.value) })}
                    className="w-full p-3 bg-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm">Select Players</label>
                  <div className="flex gap-2 flex-wrap">
                    {PLAYERS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePlayer(p)}
                        className={`px-4 py-2 rounded ${newSession.players.includes(p) ? 'bg-purple-600' : 'bg-slate-700'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={createSession}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
                >
                  🎮 Start Scoring Session
                </button>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Recent Sessions</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {sessions.map(session => (
                  <div key={session.id} className="bg-slate-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold">{session.game_type} {session.game_type === 'Shithead' ? '💩' : ''}</div>
                        <div className="text-sm text-slate-400">{new Date(session.game_date).toLocaleDateString()}</div>
                        <div className="text-sm text-slate-400">First to {session.win_threshold}</div>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm ${session.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-sm">
                      Players: {session.players.join(', ')}
                    </div>
                    {session.status === 'in_progress' && (
                      <button
                        onClick={() => setActiveSession(session)}
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm"
                      >
                        Resume Session
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scoring Interface */}
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {activeSession.game_type} {activeSession.game_type === 'Shithead' ? '💩' : ''}
                </h2>
                <button
                  onClick={() => setActiveSession(null)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  Exit
                </button>
              </div>

              <div className="mb-4 p-4 bg-slate-700 rounded">
                <div className="text-sm text-slate-400 mb-2">
                  {activeSession.game_type === 'Shithead' ? 'First to LOSE' : 'First to WIN'}: {activeSession.win_threshold} rounds
                </div>
                <div className="text-sm text-slate-400">Round: {rounds.length + 1}</div>
              </div>

              <h3 className="text-xl font-bold mb-3">Current Scores</h3>
              <div className="space-y-2 mb-6">
                {activeSession.players.map(player => (
                  <div key={player} className="flex justify-between items-center bg-slate-700 p-3 rounded">
                    <span className="font-bold text-lg">{player}</span>
                    <span className="text-2xl font-bold text-yellow-400">{scores[player] || 0}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-bold mb-3">Who won this round?</h3>
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
                  className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded"
                >
                  ↶ Undo Last Round
                </button>
              )}

              <button
                onClick={finalizeSession}
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 py-2 rounded"
              >
                🏁 Finish Game Early
              </button>
            </div>

            {/* Round History */}
            <div className="bg-slate-800 rounded-xl p-6">
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
