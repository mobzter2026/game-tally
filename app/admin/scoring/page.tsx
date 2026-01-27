'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

export default function ScoringPage() {
  const router = useRouter()
  const [gameType, setGameType] = useState<string>('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [winners, setWinners] = useState<string[]>([])
  const [runnersUp, setRunnersUp] = useState<string[]>([])
  const [survivors, setSurvivors] = useState<string[]>([])
  const [losers, setLosers] = useState<string[]>([])

  function togglePlayer(player: string) {
    setSelectedPlayers(prev =>
      prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player]
    )
  }

  function toggleWinner(player: string) {
    setWinners(prev =>
      prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player]
    )
  }

  function toggleRunner(player: string) {
    setRunnersUp(prev =>
      prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player]
    )
  }

  function toggleSurvivor(player: string) {
    setSurvivors(prev =>
      prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player]
    )
  }

  function toggleLoser(player: string) {
    setLosers(prev =>
      prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player]
    )
  }

  async function saveGame() {
    if (!gameType || selectedPlayers.length === 0) {
      alert('Select game type and players')
      return
    }

    const { error } = await supabase.from('games').insert({
      game_type: gameType,
      game_date: new Date().toISOString().split('T')[0],
      players_in_game: selectedPlayers,
      winners: winners.length > 0 ? winners : null,
      runners_up: runnersUp.length > 0 ? runnersUp : null,
      survivors: survivors.length > 0 ? survivors : null,
      losers: losers.length > 0 ? losers : null
    })

    if (error) {
      alert('Error saving game')
      console.error(error)
    } else {
      alert('Game saved!')
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
          Add Game
        </h1>

        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 rounded-2xl border border-purple-500/30 p-6 space-y-6">
          {/* Game Type */}
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Select Game</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead', 'Rung'].map(game => (
                <button
                  key={game}
                  onClick={() => setGameType(game)}
                  className={`p-3 rounded-xl font-semibold transition-all ${
                    gameType === game
                      ? 'bg-purple-600 text-white border-2 border-purple-400'
                      : 'bg-purple-800/30 text-purple-300 border border-purple-500/30 hover:bg-purple-700/30'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>
          </div>

          {/* Select Players */}
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Select Players</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLAYERS.map(player => (
                <button
                  key={player}
                  onClick={() => togglePlayer(player)}
                  className={`p-3 rounded-xl font-semibold transition-all ${
                    selectedPlayers.includes(player)
                      ? 'bg-green-600 text-white'
                      : 'bg-purple-800/30 text-purple-300 border border-purple-500/30 hover:bg-purple-700/30'
                  }`}
                >
                  {player}
                </button>
              ))}
            </div>
          </div>

          {selectedPlayers.length > 0 && (
            <>
              {/* Winners */}
              <div>
                <h2 className="text-xl font-bold text-green-400 mb-3">Winners</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPlayers.map(player => (
                    <button
                      key={player}
                      onClick={() => toggleWinner(player)}
                      className={`p-3 rounded-xl font-semibold transition-all ${
                        winners.includes(player)
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/20 text-green-300 border border-green-500/30 hover:bg-green-800/30'
                      }`}
                    >
                      {player}
                    </button>
                  ))}
                </div>
              </div>

              {/* Runners-up */}
              <div>
                <h2 className="text-xl font-bold text-blue-400 mb-3">Runners-up</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPlayers.map(player => (
                    <button
                      key={player}
                      onClick={() => toggleRunner(player)}
                      className={`p-3 rounded-xl font-semibold transition-all ${
                        runnersUp.includes(player)
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-900/20 text-blue-300 border border-blue-500/30 hover:bg-blue-800/30'
                      }`}
                    >
                      {player}
                    </button>
                  ))}
                </div>
              </div>

              {/* Survivors */}
              <div>
                <h2 className="text-xl font-bold text-gray-400 mb-3">Survivors</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPlayers.map(player => (
                    <button
                      key={player}
                      onClick={() => toggleSurvivor(player)}
                      className={`p-3 rounded-xl font-semibold transition-all ${
                        survivors.includes(player)
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-900/20 text-gray-300 border border-gray-500/30 hover:bg-gray-800/30'
                      }`}
                    >
                      {player}
                    </button>
                  ))}
                </div>
              </div>

              {/* Losers */}
              <div>
                <h2 className="text-xl font-bold text-red-400 mb-3">Losers</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPlayers.map(player => (
                    <button
                      key={player}
                      onClick={() => toggleLoser(player)}
                      className={`p-3 rounded-xl font-semibold transition-all ${
                        losers.includes(player)
                          ? 'bg-red-600 text-white'
                          : 'bg-red-900/20 text-red-300 border border-red-500/30 hover:bg-red-800/30'
                      }`}
                    >
                      {player}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex-1 py-4 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-500 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={saveGame}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Save Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
