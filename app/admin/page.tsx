// FIXED ADMIN PAGE (date-only) — JSX-safe
'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Game } from '@/lib/types'
import Button from '@/Components/Button'

const PLAYERS = ['Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf']

const GAME_EMOJIS: Record<string, string> = {
  Blackjack: '🃏',
  Monopoly: '🎲',
  'Tai Ti': '🀄',
  Shithead: '💩',
  Rung: '🎭'
}

// ---------- helpers ----------
const teamKey = (t: string[]) => t.slice().sort().join('&')

type RungRound = Game & { team1: string[]; team2: string[]; winning_team: 1 | 2 }

type RungSession = {
  key: string
  game_date: string
  rounds: RungRound[]
  allPlayers: string[]
  tiers: {
    winners: string[]
    runners: string[]
    survivors: string[]
    losers: string[]
  }
}

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null)
  const [editingSessionKey, setEditingSessionKey] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/admin/login')
      else fetchGames()
    })
  }, [])

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false })
    setGames((data as Game[]) || [])
    setLoading(false)
  }

  // -------- rung sessions --------
  const rungSessions = useMemo(() => {
    const rounds = games.filter(
      g => g.game_type === 'Rung' && g.team1 && g.team2 && g.winning_team
    ) as RungRound[]

    const byDate: Record<string, RungRound[]> = {}
    rounds.forEach(r => {
      byDate[r.game_date] ||= []
      byDate[r.game_date].push(r)
    })

    const sessions: RungSession[] = []

    Object.entries(byDate).forEach(([date, rs]) => {
      rs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      let current: RungRound[] = []
      let idx = 0

      const push = () => {
        if (!current.length) return

        const wins: Record<string, number> = {}
        const players = new Set<string>()

        current.forEach(r => {
          const t1 = teamKey(r.team1)
          const t2 = teamKey(r.team2)
          wins[t1] ||= 0
          wins[t2] ||= 0
          if (r.winning_team === 1) wins[t1]++
          if (r.winning_team === 2) wins[t2]++
        })

        Object.entries(wins).forEach(([t, s]) =>
          t.split('&').forEach(p => players.add(p))
        )

        const best: Record<string, number> = {}
        Object.entries(wins).forEach(([t, s]) =>
          t.split('&').forEach(p => {
            best[p] = Math.max(best[p] ?? 0, s)
          })
        )

        const allPlayers = Array.from(players)
        const winners = allPlayers.filter(p => best[p] >= 5)
        const rest = allPlayers.filter(p => !winners.includes(p))

        let runners: string[] = []
        let survivors: string[] = []
        let losers: string[] = []

        if (rest.length) {
          const same = rest.every(p => best[p] === best[rest[0]])
          if (winners.length && same) losers = rest
          else {
            const scores = rest.map(p => best[p])
            const max = Math.max(...scores)
            const min = Math.min(...scores)
            runners = rest.filter(p => best[p] === max)
            losers = rest.filter(p => best[p] === min)
            survivors = rest.filter(p => !runners.includes(p) && !losers.includes(p))
          }
        }

        sessions.push({
          key: `${date}-${idx++}`,
          game_date: date,
          rounds: current,
          allPlayers,
          tiers: { winners, runners, survivors, losers }
        })

        current = []
      }

      rs.forEach(r => {
        current.push(r)
        const temp: Record<string, number> = {}
        current.forEach(rr => {
          const k = teamKey(rr.winning_team === 1 ? rr.team1 : rr.team2)
          temp[k] = (temp[k] || 0) + 1
        })
        if (Object.values(temp).some(v => v >= 5)) push()
      })
      push()
    })

    return sessions.reverse()
  }, [games])

  const saveSessionDate = async (s: RungSession) => {
    await Promise.all(
      s.rounds.map(r =>
        supabase.from('games').update({ game_date: editDate }).eq('id', r.id)
      )
    )
    setEditingSessionKey(null)
    setEditDate('')
    fetchGames()
  }

  if (loading) return <div className="text-white p-10">Loading…</div>

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      {rungSessions.map(s => {
        const isExpanded = expandedSessionKey === s.key
        const isEditing = editingSessionKey === s.key

        return (
          <div key={s.key} className="mb-4 bg-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">🎭 Rung</div>
                {!isEditing ? (
                  <div className="text-xs text-slate-400">{s.game_date}</div>
                ) : (
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="text-black text-xs rounded px-1"
                  />
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => saveSessionDate(s)}>✓</button>
                    <button onClick={() => setEditingSessionKey(null)}>✗</button>
                  </>
                ) : (
                  <button onClick={() => {
                    setEditingSessionKey(s.key)
                    setEditDate(s.game_date)
                  }}>✏️</button>
                )}
                <button onClick={() => setExpandedSessionKey(isExpanded ? null : s.key)}>
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>
            </div>

            <div className="flex gap-1 flex-wrap mt-2">
              {s.allPlayers.map(p => {
                const t = s.tiers
                const cls =
                  t.winners.includes(p) ? 'bg-green-600'
                  : t.runners.includes(p) ? 'bg-blue-600'
                  : t.survivors.includes(p) ? 'bg-slate-600'
                  : 'bg-red-600'
                return (
                  <span key={p} className={`${cls} px-2 py-0.5 rounded text-xs`}>
                    {p}
                  </span>
                )
              })}
            </div>

            {isExpanded && (
              <div className="mt-3 space-y-1">
                {s.rounds.map(r => (
                  <div key={r.id} className="text-xs flex justify-between bg-slate-700 rounded px-2 py-1">
                    <span>{r.team1.join(' & ')}</span>
                    <span>vs</span>
                    <span>{r.team2.join(' & ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
