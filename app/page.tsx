'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const MIN_GAMES_FOR_RANKING = 0

const QUOTES = [
  "Friendship ends where the game begins.",
  "It's not about winning, it's about making others lose.",
  "Every card tells a story of betrayal.",
  "Where loyalty dies and legends are born.",
  "Every loss is just character building… and humiliation.",
  "If at first you don't succeed… shuffle and try again.",
  "Victory is earned. Humiliation is free.",
  "Some are born winners. Others are just funny losers.",
  "The table is a battlefield. Your ego is the weapon.",
  "You can't control luck… but you can ruin everyone else's day.",
  "Pain is temporary. Bragging rights are forever.",
  "Hope your therapy sessions are ready.",
  "One table. Many casualties.",
  "Lose today. Regret tomorrow. Cry later.",
  "Your dignity called… it's filing a complaint.",
  "Lose today. Learn tomorrow. Dominate next time.",
  "Winners rise. Everyone else takes notes… or cry.",
  "Step up or step aside."
]

export default function PublicView() {
  const [currentQuote, setCurrentQuote] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % QUOTES.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-950 to-fuchsia-950 text-white p-4 font-mono overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto mt-4 px-2">

        {/* TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            <span className="opacity-80">⚔️</span>{' '}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 
                             bg-clip-text text-transparent 
                             drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)] 
                             dark:from-yellow-300 dark:via-amber-300 dark:to-yellow-400">
              Ultimate Card Championship
            </span>{' '}
            <span className="opacity-80">🏆</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base italic transition-opacity duration-500 whitespace-nowrap overflow-hidden text-ellipsis px-2">
            "{QUOTES[currentQuote]}"
          </p>
        </div>

        {/* TABS */}
        <div className="mb-6 flex justify-center">
          <div className="bg-gradient-to-br from-purple-950/50 to-fuchsia-950/50 rounded-xl border-2 border-purple-400/50 p-4 max-w-md w-full shadow-lg">
            <div className="grid grid-cols-3 gap-2">
              <button
                className="px-2 py-2 rounded-lg font-semibold transition text-xs sm:text-sm bg-purple-600 text-white hover:brightness-110 shadow-[0_0_15px_rgba(168,85,247,0.7)]"
              >
                Solo Games
              </button>
              <button
                className="px-2 py-2 rounded-lg font-semibold transition text-xs sm:text-sm bg-violet-900/80 text-slate-300 hover:bg-violet-800 hover:brightness-110 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              >
                Rung - Duo
              </button>
              <button
                className="px-2 py-2 rounded-lg font-semibold transition text-xs sm:text-sm bg-violet-900/80 text-slate-300 hover:bg-violet-800 hover:brightness-110 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              >
                Rung - Solo
              </button>
            </div>
          </div>
        </div>

        {/* EXAMPLE LEADERBOARD BOX */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLAYERS.map(player => (
            <div key={player} className="bg-gradient-to-br from-purple-900 via-fuchsia-950 to-purple-900 
                                         rounded-xl border-2 border-purple-500/40 
                                         shadow-[0_0_20px_rgba(168,85,247,0.5)] p-4 flex flex-col items-center">
              <div className="text-lg font-bold text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
                {player}
              </div>
              <div className="mt-2 text-sm text-slate-300 text-center">
                Wins: 0 | Losses: 0 | Streak: 0
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}