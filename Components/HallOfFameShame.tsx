// Components/HallOfFameShame.tsx
import { PlayerStats } from '@/lib/leaderboardHelpers'

interface HallOfFameShameProps {
  hallView: 'none' | 'fame' | 'shame'
  stats: PlayerStats[]
  onClose: () => void
}

export default function HallOfFameShame({
  hallView,
  stats,
  onClose
}: HallOfFameShameProps) {
  if (hallView === 'none') return null

  const minGames = 5
  const displayStats = stats.filter(p => p.gamesPlayed >= minGames)

  const topThree = displayStats.slice(0, 3)
  const bottomThree = displayStats.slice().reverse().slice(0, 3)

  const data = hallView === 'fame' ? topThree : bottomThree

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border-2 border-amber-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {hallView === 'fame' ? (
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                🏆 HALL OF FAME 🏆
              </span>
            ) : (
              <span className="bg-gradient-to-r from-red-300 via-orange-200 to-red-400 bg-clip-text text-transparent">
                💀 HALL OF SHAME 💀
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl"
          >
            ×
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-6">
          Minimum {minGames} games played to qualify
        </p>

        <div className="space-y-4">
          {data.map((player, index) => (
            <div
              key={player.player}
              className={`p-4 rounded-lg ${
                hallView === 'fame'
                  ? index === 0
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600'
                    : index === 1
                    ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                    : 'bg-gradient-to-r from-orange-700 to-orange-800'
                  : index === 0
                  ? 'bg-gradient-to-r from-red-900 to-red-800'
                  : index === 1
                  ? 'bg-gradient-to-r from-orange-800 to-orange-700'
                  : 'bg-gradient-to-r from-slate-700 to-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {hallView === 'fame'
                      ? index === 0
                        ? '🥇'
                        : index === 1
                        ? '🥈'
                        : '🥉'
                      : index === 0
                      ? '💩'
                      : index === 1
                      ? '🤡'
                      : '😢'}
                  </span>
                  <span className="text-xl font-bold">{player.player}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">{player.winRate}%</div>
                  <div className="text-xs text-slate-200">Win Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-slate-200 text-xs">Games</div>
                  <div className="font-bold">{player.gamesPlayed}</div>
                </div>
                <div>
                  <div className="text-slate-200 text-xs">Wins</div>
                  <div className="font-bold text-green-300">{player.wins}</div>
                </div>
                <div>
                  <div className="text-slate-200 text-xs">Losses</div>
                  <div className="font-bold text-red-300">{player.losses}</div>
                </div>
                <div>
                  <div className="text-slate-200 text-xs">Best Streak</div>
                  <div className="font-bold text-yellow-300">{player.bestStreak}</div>
                </div>
              </div>

              {player.shitheadLosses > 0 && (
                <div className="mt-2 text-xs text-orange-300">
                  💩 {player.shitheadLosses} Shithead Loss{player.shitheadLosses !== 1 ? 'es' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
