// Components/LeaderboardFilters.tsx
import Button from '@/Components/Button'
import { PLAYERS } from '@/lib/leaderboardHelpers'

const GAME_TYPES = ['All Games', 'Blackjack', 'Monopoly', 'Tai Ti', 'Shithead', 'Rung']

interface LeaderboardFiltersProps {
  selectedPlayers: string[]
  selectedGameType: string
  showFloatingFilter: boolean
  onTogglePlayer: (player: string) => void
  onSelectAllPlayers: () => void
  onClearPlayers: () => void
  onSelectGameType: (gameType: string) => void
  onToggleFloatingFilter: () => void
}

export default function LeaderboardFilters({
  selectedPlayers,
  selectedGameType,
  showFloatingFilter,
  onTogglePlayer,
  onSelectAllPlayers,
  onClearPlayers,
  onSelectGameType,
  onToggleFloatingFilter
}: LeaderboardFiltersProps) {
  return (
    <>
      {/* FLOATING FILTER BUTTON */}
      <button
        onClick={onToggleFloatingFilter}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2"
      >
        🔍 Filters
        {(selectedPlayers.length > 0 || selectedGameType !== 'All Games') && (
          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {selectedPlayers.length > 0 ? selectedPlayers.length : '1'}
          </span>
        )}
      </button>

      {/* FLOATING FILTER PANEL */}
      {showFloatingFilter && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Filters</h3>
              <button
                onClick={onToggleFloatingFilter}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* PLAYER FILTER */}
            <div className="mb-6">
              <h4 className="font-bold mb-2">Filter by Players</h4>
              <div className="flex gap-2 mb-2">
                <Button
                  onClick={onSelectAllPlayers}
                  variant="frosted"
                  color="blue"
                  className="text-xs px-2 py-1"
                >
                  Select All
                </Button>
                <Button
                  onClick={onClearPlayers}
                  variant="frosted"
                  color="red"
                  className="text-xs px-2 py-1"
                >
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PLAYERS.map(player => (
                  <Button
                    key={player}
                    onClick={() => onTogglePlayer(player)}
                    selected={selectedPlayers.includes(player)}
                    variant="frosted"
                    className="text-sm"
                  >
                    {player}
                  </Button>
                ))}
              </div>
            </div>

            {/* GAME TYPE FILTER */}
            <div>
              <h4 className="font-bold mb-2">Filter by Game Type</h4>
              <div className="grid grid-cols-2 gap-2">
                {GAME_TYPES.map(gameType => (
                  <Button
                    key={gameType}
                    onClick={() => onSelectGameType(gameType)}
                    selected={selectedGameType === gameType}
                    variant="frosted"
                    className="text-sm"
                  >
                    {gameType}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}