'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Game } from '@/lib/types'
import { buildMonopolyTaiTiSessions, MonopolyTaiTiSession } from '@/lib/monopolyTaiTiSessions'

const ROTATING_QUOTES = [
  "Where Legends Rise and Egos Die",
  "Your Win Rate? More Like a Crime Rate",
  "Buckle Up, Buttercup—Reality Hits Hard",
  "Winners Circle or Crying Corner?",
  "May the Odds Be… Actually, Never Mind",
  "The Hall of Fame Is Full—Try the Shame Section"
]

const AGGRESSIVE_QUOTES = [
  "Confidence is great. Delusion? Even better.",
  "Don't worry, participation trophies count… somewhere.",
  "Some players rise. Others… well, you're here.",
  "Your dignity called… it's filing a complaint.",
  "Hope your therapy sessions are ready.",
  "Crushing dreams since Day One.",
  "You either win or become a cautionary tale.",
  "Fame is earned. Shame? You've got that covered.",
  "Still convinced you're good? Adorable.",
  "At this point, even chance pities you.",
  "Winning is hard. Losing? You've mastered it.",
  "Better luck next… who are we kidding?",
  "Every match you lose adds to the legend… of failure.",
  "Some are born great. Others just show up and hope.",
  "The leaderboard remembers everything. Sleep tight.",
  "You miss 100% of the shots you take… somehow.",
  "Victory loves preparation. You brought vibes.",
  "Stats don't lie, but we wish they did for your sake."
]

type DisplayGame = {
  id: string
  game_type: string
  game_date: string
  created_at: string
  winners: string[]
  runners_up: string[]
  survivors: string[]
  losers: string[]
  isSession?: boolean
  roundCount?: number
}

export default function Home() {
  const [recentGames, setRecentGames] = useState<DisplayGame[]>([])
  const [subtitle, setSubtitle] = useState(ROTATING_QUOTES[0])

  useEffect(() => {
    let quoteIndex = 0
    const interval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % (ROTATING_QUOTES.length + AGGRESSIVE_QUOTES.length)
      if (quoteIndex < ROTATING_QUOTES.length) {
        setSubtitle(ROTATING_QUOTES[quoteIndex])
      } else {
        setSubtitle(AGGRESSIVE_QUOTES[quoteIndex - ROTATING_QUOTES.length])
      }
    }, quoteIndex < ROTATING_QUOTES.length ? 5000 : 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchData()
    const sub = supabase
      .channel('games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchData)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [])

  async function fetchData() {
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })

    if (!gamesData) return

    const allGames = gamesData as Game[]
    const displayGames: DisplayGame[] = []

    // Process Monopoly sessions
    const monopolySessions = buildMonopolyTaiTiSessions(allGames, 'Monopoly')
    monopolySessions
      .filter(session => session.isComplete)
      .forEach(session => {
        const lastRound = session.rounds[session.rounds.length - 1]
        displayGames.push({
          id: session.key,
          game_type: 'Monopoly',
          game_date: session.gameDate,
          created_at: session.endAtIso || lastRound.created_at || '',
          winners: session.tiers.winners,
          runners_up: session.tiers.runners,
          survivors: session.tiers.survivors,
          losers: session.tiers.losers,
          isSession: true,
          roundCount: session.roundCount
        })
      })

    // Process Tai Ti sessions
    const taitiSessions = buildMonopolyTaiTiSessions(allGames, 'Tai Ti')
    taitiSessions
      .filter(session => session.isComplete)
      .forEach(session => {
        const lastRound = session.rounds[session.rounds.length - 1]
        displayGames.push({
          id: session.key,
          game_type: 'Tai Ti',
          game_date: session.gameDate,
          created_at: session.endAtIso || lastRound.created_at || '',
          winners: session.tiers.winners,
          runners_up: session.tiers.runners,
          survivors: session.tiers.survivors,
          losers: session.tiers.losers,
          isSession: true,
          roundCount: session.roundCount
        })
      })

    // Add other game types (Blackjack, Shithead, Rung) - they're single games, not sessions
    const otherGames = allGames.filter(
      g => g.game_type !== 'Monopoly' && g.game_type !== 'Tai Ti'
    )
    
    otherGames.forEach(game => {
      displayGames.push({
        id: game.id,
        game_type: game.game_type,
        game_date: game.game_date,
        created_at: game.created_at || '',
        winners: game.winners || [],
        runners_up: game.runners_up || [],
        survivors: game.survivors || [],
        losers: game.losers || []
      })
    })

    // Sort by created_at timestamp
    displayGames.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setRecentGames(displayGames.slice(0, 10))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="backdrop-blur-xl bg-black/30 border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-2xl">
            POINTS ROYALE
          </h1>
          <p className="text-center text-purple-300 mt-2 text-sm md:text-base italic">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Recent Showdowns */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-purple-900/40 rounded-2xl border border-purple-500/30 p-6 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
            Recent Showdowns
          </h2>
          
          {recentGames.length === 0 ? (
            <p className="text-center text-purple-300 py-8">No games recorded yet</p>
          ) : (
            <div className="grid gap-4">
              {recentGames.map((game) => (
                <div 
                  key={game.id} 
                  className="backdrop-blur-sm bg-gradient-to-r from-purple-800/30 to-fuchsia-800/30 rounded-xl border border-purple-500/20 p-4 hover:border-purple-400/40 transition-all shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {game.game_type === 'Blackjack' ? '🃏' :
                         game.game_type === 'Monopoly' ? '🎩' :
                         game.game_type === 'Tai Ti' ? '🎴' :
                         game.game_type === 'Shithead' ? '💩' :
                         game.game_type === 'Rung' ? '🤝' : '🎮'}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {game.game_type}
                          {game.isSession && (
                            <span className="ml-2 text-xs bg-purple-500/30 px-2 py-1 rounded">
                              {game.roundCount} rounds
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-purple-300">
                          {new Date(game.created_at).toLocaleDateString()} at{' '}
                          {new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
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
