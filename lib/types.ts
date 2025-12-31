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
