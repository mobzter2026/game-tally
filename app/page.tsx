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

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎴'
}

const INDIVIDUAL_GAMES = ['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead']

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'individual' | 'rung-teams' | 'rung-players'>('individual')
  const [perfectGame, setPerfectGame] = useState<Game | null>(null)
  const [shitheadLosingStreak, setShitheadLosingStreak] = useState<{ player: string; streak: number } | null>(null)
  const [latestWinner, setLatestWinner] = useState<{ game: Game; type: 'dominated' | 'shithead' | 'normal' } | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [showFloatingFilter, setShowFloatingFilter] = useState(false)
  const [selectedGameType, setSelectedGameType] = useState<string>('All Games')
  const [hallView, setHallView] = useState<'none' | 'fame' | 'shame'>('none')
  const [currentQuote, setCurrentQuote] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % QUOTES.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchGames()

    const channel = supabase
      .channel('games-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchGames)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      const gamesData = data as Game[]
      setGames(gamesData)
      checkPerfectGameAndStreak(gamesData)
    }
    setLoading(false)
  }

  const checkPerfectGameAndStreak = (gamesData: Game[]) => {
    const latestIndividualGame = gamesData.filter(g => g.game_type !== 'Rung')[0]

    if (latestIndividualGame && latestIndividualGame.winners?.length === 1) {
      const isPerfect =
        (!latestIndividualGame.runners_up || latestIndividualGame.runners_up.length === 0) &&
        latestIndividualGame.losers &&
        latestIndividualGame.losers.length >= 2

      if (isPerfect) {
        setPerfectGame(latestIndividualGame)
        setLatestWinner({ game: latestIndividualGame, type: 'dominated' })
      } else {
        setPerfectGame(null)
        setLatestWinner({
          game: latestIndividualGame,
          type: latestIndividualGame.game_type === 'Shithead' ? 'shithead' : 'normal'
        })
      }
    } else {
      setPerfectGame(null)
      setLatestWinner(null)
    }

    const shitheadGames = gamesData.filter(g => g.game_type === 'Shithead').slice().reverse()

    let found = false
    PLAYERS.forEach(player => {
      if (found) return
      let streak = 0
      for (const game of shitheadGames) {
        if (game.losers?.includes(player)) streak++
        else if (game.players_in_game?.includes(player)) break
      }
      if (streak >= 3) {
        setShitheadLosingStreak({ player, streak })
        found = true
      }
    })
    if (!found) setShitheadLosingStreak(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl font-mono">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-2 sm:p-4 font-mono overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto mt-4 px-2">

        <div className="text-center mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 break-words">
            Ultimate Card Championship Leaderboard 🏆
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base italic transition-opacity duration-500 whitespace-nowrap overflow-hidden text-ellipsis px-2">
            "{QUOTES[currentQuote]}"
          </p>
        </div>

        {/* YOUR EXISTING TABS, LEADERBOARDS, HALL OF FAME/SHAME,
            GAME LISTS, STATS TABLES CONTINUE UNCHANGED BELOW */}
      </div>
    </div>
  )
}