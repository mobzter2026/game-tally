'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, TrendingUp, Award, Users, Calendar } from 'lucide-react';

type Player = {
  player_name: string;
  total_wins: number;
  total_games: number;
  win_rate: number;
  total_points?: number;
  weighted_score?: number;
  rank?: number;
};

type GameType = 'Blackjack' | 'Monopoly' | 'Tai Ti' | 'Shithead' | 'Rung';

type RecentGame = {
  id: string;
  player_name: string;
  game_type: GameType;
  points: number;
  created_at: string;
  session_date: string;
};

type GameTypeStats = {
  game_type: GameType;
  player_name: string;
  wins: number;
  games_played: number;
  win_rate: number;
  total_points?: number;
  weighted_score?: number;
};

const PLAYERS = ['Don', 'Riz', 'Mobz', 'T', 'Saf', 'Faizan', 'Yusuf'];

const GAME_CONFIGS: Record<GameType, { winThreshold?: number; hasPoints: boolean }> = {
  'Blackjack': { winThreshold: 5, hasPoints: false },
  'Monopoly': { winThreshold: 1, hasPoints: false },
  'Tai Ti': { winThreshold: 3, hasPoints: false },
  'Shithead': { winThreshold: 3, hasPoints: false },
  'Rung': { hasPoints: false }
};

const GAME_WEIGHTS: Record<GameType, number> = {
  'Blackjack': 1.0,
  'Monopoly': 2.5,
  'Tai Ti': 1.2,
  'Shithead': 1.2,
  'Rung': 1.5
};

export default function Home() {
  const supabase = createClient();
  const [leaderboardData, setLeaderboardData] = useState<Player[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [gameTypeStats, setGameTypeStats] = useState<Record<GameType, GameTypeStats[]>>({
    'Blackjack': [],
    'Monopoly': [],
    'Tai Ti': [],
    'Shithead': [],
    'Rung': []
  });
  const [selectedGame, setSelectedGame] = useState<GameType>('Blackjack');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [points, setPoints] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Rung-specific state
  const [showRungModal, setShowRungModal] = useState(false);
  const [rungTeam1, setRungTeam1] = useState<string[]>([]);
  const [rungTeam2, setRungTeam2] = useState<string[]>([]);
  const [rungWinningTeam, setRungWinningTeam] = useState<'team1' | 'team2' | null>(null);

  useEffect(() => {
    fetchLeaderboardData();
    fetchRecentGames();
    fetchGameTypeStats();

    const channel = supabase
      .channel('game-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => {
          fetchLeaderboardData();
          fetchRecentGames();
          fetchGameTypeStats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rung_wins' },
        () => {
          fetchLeaderboardData();
          fetchRecentGames();
          fetchGameTypeStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('player_name, game_type, points, session_date');

      if (gamesError) throw gamesError;

      const playerStats: Record<string, {
        wins: number;
        games: number;
        points: number;
        weightedScore: number;
      }> = {};

      PLAYERS.forEach(player => {
        playerStats[player] = { wins: 0, games: 0, points: 0, weightedScore: 0 };
      });

      const sessionGames: Record<string, RecentGame[]> = {};
      
      gamesData?.forEach((game: any) => {
        const sessionKey = `${game.session_date}-${game.game_type}`;
        if (!sessionGames[sessionKey]) {
          sessionGames[sessionKey] = [];
        }
        sessionGames[sessionKey].push(game);
      });

      Object.values(sessionGames).forEach(session => {
        const gameType = session[0].game_type as GameType;
        const config = GAME_CONFIGS[gameType];
        const weight = GAME_WEIGHTS[gameType];

        if (config.hasPoints) {
          session.forEach(game => {
            playerStats[game.player_name].points += game.points || 0;
            playerStats[game.player_name].games += 1;
          });
        } else {
          const playerWins: Record<string, number> = {};
          session.forEach(game => {
            playerWins[game.player_name] = (playerWins[game.player_name] || 0) + 1;
          });

          let sessionComplete = false;
          let winner: string | null = null;

          if (config.winThreshold) {
            Object.entries(playerWins).forEach(([player, wins]) => {
              if (wins >= config.winThreshold!) {
                sessionComplete = true;
                winner = player;
              }
            });
          } else {
            sessionComplete = true;
            winner = Object.entries(playerWins).reduce((a, b) => a[1] > b[1] ? a : b)[0];
          }

          if (sessionComplete && winner) {
            Object.keys(playerWins).forEach(player => {
              playerStats[player].games += 1;
              if (player === winner) {
                playerStats[player].wins += 1;
                playerStats[player].weightedScore += weight;
              }
            });
          }
        }
      });

      const leaderboard: Player[] = PLAYERS.map(player => ({
        player_name: player,
        total_wins: playerStats[player].wins,
        total_games: playerStats[player].games,
        win_rate: playerStats[player].games > 0 
          ? (playerStats[player].wins / playerStats[player].games) * 100 
          : 0,
        total_points: playerStats[player].points,
        weighted_score: playerStats[player].weightedScore
      })).sort((a, b) => {
        if (b.weighted_score !== a.weighted_score) {
          return b.weighted_score - a.weighted_score;
        }
        return b.total_wins - a.total_wins;
      });

      leaderboard.forEach((player, index) => {
        player.rank = index + 1;
      });

      setLeaderboardData(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchRecentGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentGames(data || []);
    } catch (error) {
      console.error('Error fetching recent games:', error);
    }
  };

  const fetchGameTypeStats = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('player_name, game_type, points, session_date');

      if (error) throw error;

      const statsByGame: Record<GameType, Record<string, {
        wins: number;
        games: number;
        points: number;
        weightedScore: number;
      }>> = {
        'Blackjack': {},
        'Monopoly': {},
        'Tai Ti': {},
        'Shithead': {},
        'Rung': {}
      };

      Object.keys(statsByGame).forEach(gameType => {
        PLAYERS.forEach(player => {
          statsByGame[gameType as GameType][player] = { 
            wins: 0, 
            games: 0, 
            points: 0,
            weightedScore: 0 
          };
        });
      });

      const sessionsByGame: Record<GameType, Record<string, RecentGame[]>> = {
        'Blackjack': {},
        'Monopoly': {},
        'Tai Ti': {},
        'Shithead': {},
        'Rung': {}
      };

      gamesData?.forEach((game: any) => {
        const gameType = game.game_type as GameType;
        const sessionKey = `${game.session_date}`;
        
        if (!sessionsByGame[gameType][sessionKey]) {
          sessionsByGame[gameType][sessionKey] = [];
        }
        sessionsByGame[gameType][sessionKey].push(game);
      });

      (Object.keys(sessionsByGame) as GameType[]).forEach(gameType => {
        const config = GAME_CONFIGS[gameType];
        const weight = GAME_WEIGHTS[gameType];
        const sessions = sessionsByGame[gameType];

        Object.values(sessions).forEach(session => {
          if (config.hasPoints) {
            session.forEach(game => {
              statsByGame[gameType][game.player_name].points += game.points || 0;
              statsByGame[gameType][game.player_name].games += 1;
            });
          } else {
            const playerWins: Record<string, number> = {};
            session.forEach(game => {
              playerWins[game.player_name] = (playerWins[game.player_name] || 0) + 1;
            });

            let sessionComplete = false;
            let winner: string | null = null;

            if (config.winThreshold) {
              Object.entries(playerWins).forEach(([player, wins]) => {
                if (wins >= config.winThreshold!) {
                  sessionComplete = true;
                  winner = player;
                }
              });
            } else {
              sessionComplete = true;
              winner = Object.entries(playerWins).reduce((a, b) => a[1] > b[1] ? a : b)[0];
            }

            if (sessionComplete && winner) {
              Object.keys(playerWins).forEach(player => {
                statsByGame[gameType][player].games += 1;
                if (player === winner) {
                  statsByGame[gameType][player].wins += 1;
                  statsByGame[gameType][player].weightedScore += weight;
                }
              });
            }
          }
        });
      });

      const formattedStats: Record<GameType, GameTypeStats[]> = {
        'Blackjack': [],
        'Monopoly': [],
        'Tai Ti': [],
        'Shithead': [],
        'Rung': []
      };

      (Object.keys(statsByGame) as GameType[]).forEach(gameType => {
        formattedStats[gameType] = PLAYERS.map(player => ({
          game_type: gameType,
          player_name: player,
          wins: statsByGame[gameType][player].wins,
          games_played: statsByGame[gameType][player].games,
          win_rate: statsByGame[gameType][player].games > 0
            ? (statsByGame[gameType][player].wins / statsByGame[gameType][player].games) * 100
            : 0,
          total_points: statsByGame[gameType][player].points,
          weighted_score: statsByGame[gameType][player].weightedScore
        })).sort((a, b) => {
          if (GAME_CONFIGS[gameType].hasPoints) {
            return (b.total_points || 0) - (a.total_points || 0);
          }
          if (b.weighted_score !== a.weighted_score) {
            return b.weighted_score - a.weighted_score;
          }
          return b.wins - a.wins;
        });
      });

      setGameTypeStats(formattedStats);
    } catch (error) {
      console.error('Error fetching game type stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedGame === 'Rung') {
      setShowRungModal(true);
      return;
    }

    if (!selectedPlayer || !selectedGame) {
      alert('Please select both a player and a game type');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('games')
        .insert([
          {
            player_name: selectedPlayer,
            game_type: selectedGame,
            points: GAME_CONFIGS[selectedGame].hasPoints ? points : 1,
            session_date: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      setSelectedPlayer('');
      setPoints(1);
      alert('Game recorded successfully!');
    } catch (error: any) {
      console.error('Error recording game:', error);
      alert('Failed to record game');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordRungWin = async () => {
    if (!rungWinningTeam) {
      alert('Please select a winning team');
      return;
    }

    if (rungTeam1.length !== 2 || rungTeam2.length !== 2) {
      alert('Each team must have exactly 2 players');
      return;
    }

    try {
      // Insert into rung_wins table
      const { error: rungError } = await supabase
        .from('rung_wins')
        .insert({
          winning_team: rungWinningTeam,
          team1_players: rungTeam1,
          team2_players: rungTeam2,
          session_date: new Date().toISOString()
        });

      if (rungError) throw rungError;

      // Insert into games table for each winner
      const winners = rungWinningTeam === 'team1' ? rungTeam1 : rungTeam2;
      const gamesData = winners.map(winner => ({
        player_name: winner,
        game_type: 'Rung',
        points: 1,
        session_date: new Date().toISOString()
      }));

      const { error: gamesError } = await supabase
        .from('games')
        .insert(gamesData);

      if (gamesError) throw gamesError;

      alert('Rung win recorded successfully!');
      setShowRungModal(false);
      setRungWinningTeam(null);
      setRungTeam1([]);
      setRungTeam2([]);
      fetchLeaderboardData();
      fetchRecentGames();
    } catch (error: any) {
      console.error('Error recording Rung win:', error);
      alert('Failed to record Rung win');
    }
  };

  const togglePlayerInTeam = (player: string, team: 'team1' | 'team2') => {
    if (team === 'team1') {
      if (rungTeam1.includes(player)) {
        setRungTeam1(rungTeam1.filter(p => p !== player));
      } else if (rungTeam1.length < 2 && !rungTeam2.includes(player)) {
        setRungTeam1([...rungTeam1, player]);
      }
    } else {
      if (rungTeam2.includes(player)) {
        setRungTeam2(rungTeam2.filter(p => p !== player));
      } else if (rungTeam2.length < 2 && !rungTeam1.includes(player)) {
        setRungTeam2([...rungTeam2, player]);
      }
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-400/50';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/50';
    return 'bg-gradient-to-r from-slate-600 to-slate-700 text-white';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4" />;
    if (rank === 2) return <Award className="w-4 h-4" />;
    if (rank === 3) return <Award className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Game Tally
          </h1>
          <p className="text-slate-300 text-lg">Track your gaming supremacy</p>
        </div>

        {/* Hall of Fame - Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaderboardData.slice(0, 3).map((player, index) => (
            <Card 
              key={player.player_name}
              className={`${
                index === 0 
                  ? 'md:col-start-2 md:row-start-1 transform md:scale-110 border-yellow-500/50' 
                  : index === 1 
                  ? 'md:col-start-1 md:row-start-1 border-gray-400/50'
                  : 'md:col-start-3 md:row-start-1 border-orange-500/50'
              } bg-slate-800/40 backdrop-blur-sm border-2`}
            >
              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge className={`${getRankBadgeColor(player.rank!)} px-3 py-1 text-sm font-bold`}>
                    {getRankIcon(player.rank!)}
                    <span className="ml-1">#{player.rank}</span>
                  </Badge>
                </div>
                <CardTitle className="text-2xl text-white">{player.player_name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {player.weighted_score.toFixed(1)}
                </div>
                <p className="text-sm text-slate-400">Weighted Score</p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                  <div>
                    <div className="text-lg font-semibold text-green-400">{player.total_wins}</div>
                    <div className="text-slate-400">Wins</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-blue-400">{player.win_rate.toFixed(1)}%</div>
                    <div className="text-slate-400">Win Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Record Game Form */}
        <Card className="bg-slate-800/40 backdrop-blur-sm border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Record New Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="game-type" className="text-slate-200">Game Type</Label>
                  <Select value={selectedGame} onValueChange={(value) => setSelectedGame(value as GameType)}>
                    <SelectTrigger id="game-type" className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {Object.keys(GAME_CONFIGS).map((game) => (
                        <SelectItem key={game} value={game} className="text-white hover:bg-slate-700">
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player" className="text-slate-200">Player</Label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger id="player" className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {PLAYERS.map((player) => (
                        <SelectItem key={player} value={player} className="text-white hover:bg-slate-700">
                          {player}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedGame && GAME_CONFIGS[selectedGame].hasPoints && (
                  <div className="space-y-2">
                    <Label htmlFor="points" className="text-slate-200">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      min="0"
                    />
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                {isSubmitting ? 'Recording...' : 'Record Game'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Rung Modal */}
        {showRungModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-800 border-purple-500/30 max-w-2xl w-full">
              <CardHeader>
                <CardTitle className="text-white">Record Rung Game</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-200">Team 1 ({rungTeam1.length}/2)</h3>
                    <div className="space-y-2">
                      {PLAYERS.map(player => (
                        <Button
                          key={player}
                          type="button"
                          onClick={() => togglePlayerInTeam(player, 'team1')}
                          disabled={rungTeam2.includes(player) || (rungTeam1.length >= 2 && !rungTeam1.includes(player))}
                          className={`w-full ${
                            rungTeam1.includes(player)
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          {player}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-200">Team 2 ({rungTeam2.length}/2)</h3>
                    <div className="space-y-2">
                      {PLAYERS.map(player => (
                        <Button
                          key={player}
                          type="button"
                          onClick={() => togglePlayerInTeam(player, 'team2')}
                          disabled={rungTeam1.includes(player) || (rungTeam2.length >= 2 && !rungTeam2.includes(player))}
                          className={`w-full ${
                            rungTeam2.includes(player)
                              ? 'bg-pink-600 hover:bg-pink-700'
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          {player}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {rungTeam1.length === 2 && rungTeam2.length === 2 && (
                  <div className="space-y-3">
                    <Label className="text-slate-200">Winning Team</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        onClick={() => setRungWinningTeam('team1')}
                        className={`${
                          rungWinningTeam === 'team1'
                            ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-400'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        Team 1 Wins
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setRungWinningTeam('team2')}
                        className={`${
                          rungWinningTeam === 'team2'
                            ? 'bg-pink-600 hover:bg-pink-700 ring-2 ring-pink-400'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        Team 2 Wins
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowRungModal(false);
                      setRungTeam1([]);
                      setRungTeam2([]);
                      setRungWinningTeam(null);
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRecordRungWin}
                    disabled={!rungWinningTeam}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Record Win
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leaderboard */}
        <Card className="bg-slate-800/40 backdrop-blur-sm border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Overall Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">Rank</TableHead>
                    <TableHead className="text-slate-300">Player</TableHead>
                    <TableHead className="text-slate-300">Weighted Score</TableHead>
                    <TableHead className="text-slate-300">Wins</TableHead>
                    <TableHead className="text-slate-300">Games</TableHead>
                    <TableHead className="text-slate-300">Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.map((player) => (
                    <TableRow key={player.player_name} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell>
                        <Badge className={getRankBadgeColor(player.rank!)}>
                          {getRankIcon(player.rank!)}
                          <span className="ml-1">#{player.rank}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-white">{player.player_name}</TableCell>
                      <TableCell className="text-purple-400 font-semibold">{player.weighted_score.toFixed(1)}</TableCell>
                      <TableCell className="text-green-400">{player.total_wins}</TableCell>
                      <TableCell className="text-slate-300">{player.total_games}</TableCell>
                      <TableCell className="text-blue-400">{player.win_rate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Game-Specific Stats */}
        <Card className="bg-slate-800/40 backdrop-blur-sm border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Game-Specific Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="Blackjack" className="w-full">
              <TabsList className="grid grid-cols-5 bg-slate-700/50">
                {Object.keys(GAME_CONFIGS).map((game) => (
                  <TabsTrigger 
                    key={game} 
                    value={game}
                    className="data-[state=active]:bg-purple-600"
                  >
                    {game}
                  </TabsTrigger>
                ))}
              </TabsList>
              {(Object.keys(GAME_CONFIGS) as GameType[]).map((game) => (
                <TabsContent key={game} value={game}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Player</TableHead>
                          {GAME_CONFIGS[game].hasPoints ? (
                            <TableHead className="text-slate-300">Total Points</TableHead>
                          ) : (
                            <>
                              <TableHead className="text-slate-300">Wins</TableHead>
                              <TableHead className="text-slate-300">Games</TableHead>
                              <TableHead className="text-slate-300">Win Rate</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gameTypeStats[game].map((stat, index) => (
                          <TableRow key={stat.player_name} className="border-slate-700 hover:bg-slate-700/50">
                            <TableCell className="font-medium text-white">
                              <div className="flex items-center gap-2">
                                {index < 3 && (
                                  <Badge className={getRankBadgeColor(index + 1)}>
                                    #{index + 1}
                                  </Badge>
                                )}
                                {stat.player_name}
                              </div>
                            </TableCell>
                            {GAME_CONFIGS[game].hasPoints ? (
                              <TableCell className="text-purple-400 font-semibold">{stat.total_points || 0}</TableCell>
                            ) : (
                              <>
                                <TableCell className="text-green-400">{stat.wins}</TableCell>
                                <TableCell className="text-slate-300">{stat.games_played}</TableCell>
                                <TableCell className="text-blue-400">{stat.win_rate.toFixed(1)}%</TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Games */}
        <Card className="bg-slate-800/40 backdrop-blur-sm border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Player</TableHead>
                    <TableHead className="text-slate-300">Game</TableHead>
                    <TableHead className="text-slate-300">Points</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentGames.map((game) => (
                    <TableRow key={game.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="font-medium text-white">{game.player_name}</TableCell>
                      <TableCell className="text-slate-300">{game.game_type}</TableCell>
                      <TableCell className="text-purple-400">{game.points}</TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(game.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
