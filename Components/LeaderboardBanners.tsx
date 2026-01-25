// Components/LeaderboardBanners.tsx
import type { Game } from '@/lib/types'

interface LeaderboardBannersProps {
  latestWinner: { game: Game; type: 'dominated' | 'shithead' | 'normal' } | null
  shitheadStreak: { player: string; streak: number } | null
}

export default function LeaderboardBanners({
  latestWinner,
  shitheadStreak
}: LeaderboardBannersProps) {
  return (
    <>
      {/* FLAWLESS VICTORY BANNER */}
      {latestWinner && latestWinner.type === 'dominated' && (
        <div className="mb-4 bg-gradient-to-r from-purple-950 via-fuchsia-700 to-purple-950 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(217,70,239,0.3),inset_0_2px_6px_rgba(255,255,255,0.25)] border-2 border-fuchsia-500/40">
          <p className="text-xs sm:text-sm font-extrabold text-center truncate tracking-wide">
            ✨ FLAWLESS VICTORY IN {latestWinner.game.game_type.toUpperCase()} BY{' '}
            {latestWinner.game.winners?.[0].toUpperCase()} ✨
          </p>
        </div>
      )}

      {/* SHITHEAD ANNOUNCEMENT BANNER */}
      {latestWinner && latestWinner.type === 'shithead' && (
        <div className="mb-4 bg-gradient-to-r from-orange-600 via-white to-orange-600 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(251,146,60,0.3),inset_0_2px_6px_rgba(255,255,255,0.4)] border-2 border-orange-500">
          <p className="text-xs sm:text-sm font-extrabold text-center truncate text-black tracking-wide">
            💩 BREAKING NEWS:{' '}
            {latestWinner.game.losers?.[
              latestWinner.game.losers.length - 1
            ].toUpperCase()}{' '}
            IS THE SHITHEAD 💩
          </p>
        </div>
      )}

      {/* NORMAL VICTORY BANNER */}
      {latestWinner && latestWinner.type === 'normal' && (
        <div className="mb-4 bg-gradient-to-r from-blue-900 via-cyan-700 to-blue-900 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(34,211,238,0.3),inset_0_2px_6px_rgba(255,255,255,0.25)] border-2 border-cyan-500/40">
          <p className="text-xs sm:text-sm font-extrabold text-center truncate tracking-wide">
            🎖️ {latestWinner.game.winners?.[0].toUpperCase()} WON{' '}
            {latestWinner.game.game_type.toUpperCase()}. IT WASN'T PRETTY! 🎖️
          </p>
        </div>
      )}

      {/* SHITHEAD LOSING STREAK BANNER */}
      {shitheadStreak && shitheadStreak.streak >= 3 && (
        <div className="mb-4 bg-gradient-to-r from-red-800 via-orange-700 to-red-800 px-6 py-2 rounded-2xl shadow-[0_2px_8px_rgba(239,68,68,0.3),inset_0_2px_6px_rgba(255,255,255,0.25)] border-2 border-orange-600">
          <p className="text-xs sm:text-sm font-extrabold text-center truncate tracking-wide">
            🔥 {shitheadStreak.player.toUpperCase()} IS ON A {shitheadStreak.streak}{' '}
            GAME SHITHEAD LOSING STREAK! 💩💩
          </p>
        </div>
      )}
    </>
  )
}