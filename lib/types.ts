export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          name: string
          score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          score?: number
          created_at?: string
          updated_at?: string
        }
      }
      score_history: {
        Row: {
          id: string
          player_id: string
          points_changed: number
          reason: string | null
          admin_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          points_changed: number
          reason?: string | null
          admin_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          points_changed?: number
          reason?: string | null
          admin_email?: string | null
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
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Player = Database['public']['Tables']['players']['Row']
export type ScoreHistory = Database['public']['Tables']['score_history']['Row']