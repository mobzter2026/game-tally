export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          game_type: string
          game_date: string
          players_in_game: string[]
          winners: string[] | null
          runners_up: string[] | null
          losers: string[] | null
          team1: string[] | null
          team2: string[] | null
          winning_team: number | null
          created_at: string
          created_by: string | null
          session_id: string | null
        }
        Insert: {
          id?: string
          game_type: string
          game_date: string
          players_in_game: string[]
          winners?: string[] | null
          runners_up?: string[] | null
          losers?: string[] | null
          team1?: string[] | null
          team2?: string[] | null
          winning_team?: number | null
          created_at?: string
          created_by?: string | null
          session_id?: string | null
        }
        Update: {
          id?: string
          game_type?: string
          game_date?: string
          players_in_game?: string[]
          winners?: string[] | null
          runners_up?: string[] | null
          losers?: string[] | null
          team1?: string[] | null
          team2?: string[] | null
          winning_team?: number | null
          created_at?: string
          created_by?: string | null
          session_id?: string | null
        }
      }
      game_sessions: {
        Row: {
          id: string
          game_type: string
          game_date: string
          players: string[]
          win_threshold: number
          status: 'in_progress' | 'completed'
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          game_type: string
          game_date: string
          players: string[]
          win_threshold?: number
          status?: 'in_progress' | 'completed'
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          game_type?: string
          game_date?: string
          players?: string[]
          win_threshold?: number
          status?: 'in_progress' | 'completed'
          created_at?: string
          created_by?: string | null
        }
      }
      rounds: {
        Row: {
          id: string
          session_id: string
          round_number: number
          winner: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          round_number: number
          winner: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          round_number?: number
          winner?: string
          created_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
    }
  }
}

export type Game = Database['public']['Tables']['games']['Row']
export type GameInsert = Database['public']['Tables']['games']['Insert']
export type GameSession = Database['public']['Tables']['game_sessions']['Row']
export type GameSessionInsert = Database['public']['Tables']['game_sessions']['Insert']
export type Round = Database['public']['Tables']['rounds']['Row']
export type RoundInsert = Database['public']['Tables']['rounds']['Insert']
