'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']
const MIN_GAMES_FOR_RANKING = 0

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎭'
}

const INDIVIDUAL_GAMES = ['Blackjack', 'Monopoly', 'Tai Ti', 'Shithead']

export default function PublicView() {
  const supabase = createClient()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] =
    useState<'individual' | 'rung' | 'recent'>('individual')

  /* ---------------------------------------------
     FETCH
  --------------------------------------------- */

  useEffect(() => {
    fetchGames()
    const channel = supabase
      .channel('games-live')
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

    if (data) setGames(data as Game[])
    setLoading(false)
  }

  /* ---------------------------------------------
     HELPERS
  --------------------------------------------- */

  const isFinalRungSession = (g: Game) =>
    g.game_type === 'Rung' && g.winners && g.winners.length > 0

  const individualGames = games.filter(
    g => g.game_type !== 'Rung'
  )

  const finalRungGames = games.filter(isFinalRungSession)

  /* ---------------------------------------------
     SOLO KING STATS (INDIVIDUAL)
  --------------------------------------------- */

  const getOverallPlayerStats = () => {
    const stats: Record<string, any> = {}

    PLAYERS.forEach(p => {
      stats[p] = {
        player: p,
        gamesPlayed: 0,
        wins: 0,
        runnerUps: 0,
        survivals: 0,
        losses: 0,
        weightedWins: 0,
        recent: [] as string[]
      }
    })

    const countableGames = [...individualGames, ...finalRungGames]

    countableGames.forEach(game => {
      const players =
        game.game_type === 'Rung'
          ? game.players_in_game || []
          : game.players_in_game || []

      players.forEach(p => {
        if (stats[p]) stats[p].gamesPlayed++
      })

      game.winners?.forEach(p => {
        stats[p].wins++
        stats[p].weightedWins += 1
        stats[p].recent.push('W')
      })

      game.runners_up?.forEach(p => {
        stats[p].runnerUps++
        stats[p].weightedWins += 0.4
        stats[p].recent.push('R')
      })

      game.survivors?.forEach(p => {
        stats[p].survivals++
        stats[p].weightedWins += 0.1
        stats[p].recent.push('S')
      })

      game.losers?.forEach(p => {
        stats[p].losses++
        stats[p].recent.push('L')
      })
    })

    return Object.values(stats)
      .filter(p => p.gamesPlayed >= MIN_GAMES_FOR_RANKING)
      .map(p => ({
        ...p,
        winRate:
          p.gamesPlayed > 0
            ? ((p.weightedWins / p.gamesPlayed) * 100).toFixed(0)
            : '0',
        recent: p.recent.slice(-10)
      }))
      .sort(
        (a, b) =>
          parseFloat(b.winRate) - parseFloat(a.winRate) ||
          b.weightedWins - a.weightedWins
      )
  }

  /* ---------------------------------------------
     RUNG DUO TEAM STATS
  --------------------------------------------- */

  const getRungTeamStats = () => {
    const teams: Record<string, any> = {}

    finalRungGames.forEach(game => {
      if (!game.team1 || !game.team2) return

      const t1 = game.team1.slice().sort().join(' & ')
      const t2 = game.team2.slice().sort().join(' & ')

      if (!teams[t1]) teams[t1] = { team: t1, games: 0, wins: 0 }
      if (!teams[t2]) teams[t2] = { team: t2, games: 0, wins: 0 }

      teams[t1].games++
      teams[t2].games++

      if (game.winning_team === 1) teams[t1].wins++
      if (game.winning_team === 2) teams[t2].wins++
    })

    return Object.values(teams)
      .map((t: any) => ({
        ...t,
        winRate:
          t.games > 0 ? ((t.wins / t.games) * 100).toFixed(0) : '0'
      }))
      .sort(
        (a: any, b: any) =>
          parseFloat(b.winRate) - parseFloat(a.winRate) ||
          b.wins - a.wins
      )
  }

  /* ---------------------------------------------
     RECENT GAMES (SESSIONS)
  --------------------------------------------- */

  const recentGames = [...finalRungGames, ...individualGames]
    .sort(
      (a, b) =>
        new Date(b.game_date).getTime() -
          new Date(a.game_date).getTime() ||
        new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
    )
    .slice(0, 20)

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </div>
    )
  }

  const soloStats = getOverallPlayerStats()
  const rungTeams = getRungTeamStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white p-4 font-mono">
      <div className="max-w-7xl mx-auto">

        {/* TABS */}
        <div className="flex justify-center gap-2 mb-6">
          <Button onClick={() => setActiveTab('individual')} selected={activeTab === 'individual'}>
            Solo Kings
          </Button>
          <Button onClick={() => setActiveTab('rung')} selected={activeTab === 'rung'}>
            Rung – Duo
          </Button>
          <Button onClick={() => setActiveTab('recent')} selected={activeTab === 'recent'}>
            Recent Games
          </Button>
        </div>

        {/* SOLO KINGS */}
        {activeTab === 'individual' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th>Rank</th>
                <th>Player</th>
                <th>Games</th>
                <th>W</th>
                <th>R</th>
                <th>S</th>
                <th>L</th>
                <th>Win %</th>
                <th>Recent</th>
              </tr>
            </thead>
            <tbody>
              {soloStats.map((p, i) => (
                <tr key={p.player} className="border-b border-slate-800">
                  <td className="text-center">{i + 1}</td>
                  <td className="font-bold">{p.player}</td>
                  <td className="text-center">{p.gamesPlayed}</td>
                  <td className="text-green-400">{p.wins}</td>
                  <td className="text-blue-400">{p.runnerUps}</td>
                  <td className="text-slate-400">{p.survivals}</td>
                  <td className="text-red-400">{p.losses}</td>
                  <td className="text-yellow-400">{p.winRate}%</td>
                  <td className="flex gap-1 justify-center">
                    {p.recent.map((r: string, idx: number) => (
                      <span
                        key={idx}
                        className={`w-5 h-5 text-xs flex items-center justify-center rounded ${
                          r === 'W'
                            ? 'bg-green-600'
                            : r === 'R'
                            ? 'bg-blue-600'
                            : r === 'S'
                            ? 'bg-slate-600'
                            : 'bg-red-600'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* RUNG DUO */}
        {activeTab === 'rung' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th>Rank</th>
                <th>Team</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Win %</th>
              </tr>
            </thead>
            <tbody>
              {rungTeams.map((t: any, i: number) => (
                <tr key={t.team} className="border-b border-slate-800">
                  <td className="text-center">{i + 1}</td>
                  <td className="font-bold">{t.team}</td>
                  <td className="text-center">{t.games}</td>
                  <td className="text-green-400">{t.wins}</td>
                  <td className="text-yellow-400">{t.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* RECENT */}
        {activeTab === 'recent' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentGames.map(game => (
              <div key={game.id} className="bg-slate-900/60 p-4 rounded">
                <div className="font-bold mb-1">
                  {GAME_EMOJIS[game.game_type]} {game.game_type} •{' '}
                  {new Date(game.game_date).toLocaleDateString()}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {game.winners?.map(p => (
                    <span key={p} className="bg-green-600 px-2 py-1 rounded text-xs">{p}</span>
                  ))}
                  {game.runners_up?.map(p => (
                    <span key={p} className="bg-blue-600 px-2 py-1 rounded text-xs">{p}</span>
                  ))}
                  {game.survivors?.map(p => (
                    <span key={p} className="bg-slate-600 px-2 py-1 rounded text-xs">{p}</span>
                  ))}
                  {game.losers?.map(p => (
                    <span key={p} className="bg-red-600 px-2 py-1 rounded text-xs">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}