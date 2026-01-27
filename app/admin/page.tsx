'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Game } from '@/lib/types'

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([])

  useEffect(() => {
    fetchGames()
  }, [])

  async function fetchGames() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setGames(data as Game[])
  }

  async function deleteGame(id: string) {
    if (!confirm('Delete this game?')) return
    await supabase.from('games').delete().eq('id', id)
    fetchGames()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <a
            href="/admin/scoring"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Add Game
          </a>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 rounded-2xl border border-purple-500/30 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">All Games</h2>

          {games.length === 0 ? (
            <p className="text-center text-purple-300 py-8">No games yet</p>
          ) : (
            <div className="space-y-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-purple-800/30 rounded-xl p-4 border border-purple-500/20"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">{game.game_type}</h3>
                      <p className="text-sm text-purple-300">
                        {new Date(game.created_at).toLocaleDateString()} at{' '}
                        {new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {game.winners && game.winners.length > 0 && (
                      <div>
                        <p className="text-xs text-green-400 font-semibold mb-1">Winners</p>
                        <div className="flex flex-wrap gap-1">
                          {game.winners.map(w => (
                            <span key={w} className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-sm text-green-300">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {game.runners_up && game.runners_up.length > 0 && (
                      <div>
                        <p className="text-xs text-blue-400 font-semibold mb-1">Runners-up</p>
                        <div className="flex flex-wrap gap-1">
                          {game.runners_up.map(r => (
                            <span key={r} className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-sm text-blue-300">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {game.survivors && game.survivors.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-1">Survivors</p>
                        <div className="flex flex-wrap gap-1">
                          {game.survivors.map(s => (
                            <span key={s} className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 rounded text-sm text-gray-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {game.losers && game.losers.length > 0 && (
                      <div>
                        <p className="text-xs text-red-400 font-semibold mb-1">Losers</p>
                        <div className="flex flex-wrap gap-1">
                          {game.losers.map(l => (
                            <span key={l} className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-300">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
