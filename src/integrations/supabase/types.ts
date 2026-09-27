export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cameras: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lat: number
          lng: number
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat: number
          lng: number
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number
          lng?: number
          name?: string | null
        }
        Relationships: []
      }
      parking_lots: {
        Row: {
          address: string | null
          address_source: string | null
          address_updated_at: string | null
          api_available: number | null
          api_occupied: number | null
          api_provider: string | null
          api_status: string | null
          available: number
          capacity: number
          created_at: string
          data_mode: string
          external_id: string | null
          has_live_api: boolean
          has_location_api: boolean
          id: string
          is_mock: boolean
          is_real_location: boolean
          last_api_seen_at: string | null
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          name: string
          ottawa_lot_id: string | null
          search_text: string | null
          source: string
          status: string | null
          updated_at: string
          virtual_available: number | null
          virtual_occupied: number | null
          virtual_status: string | null
        }
        Insert: {
          address?: string | null
          address_source?: string | null
          address_updated_at?: string | null
          api_available?: number | null
          api_occupied?: number | null
          api_provider?: string | null
          api_status?: string | null
          available?: number
          capacity?: number
          created_at?: string
          data_mode?: string
          external_id?: string | null
          has_live_api?: boolean
          has_location_api?: boolean
          id?: string
          is_mock?: boolean
          is_real_location?: boolean
          last_api_seen_at?: string | null
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          ottawa_lot_id?: string | null
          search_text?: string | null
          source?: string
          status?: string | null
          updated_at?: string
          virtual_available?: number | null
          virtual_occupied?: number | null
          virtual_status?: string | null
        }
        Update: {
          address?: string | null
          address_source?: string | null
          address_updated_at?: string | null
          api_available?: number | null
          api_occupied?: number | null
          api_provider?: string | null
          api_status?: string | null
          available?: number
          capacity?: number
          created_at?: string
          data_mode?: string
          external_id?: string | null
          has_live_api?: boolean
          has_location_api?: boolean
          id?: string
          is_mock?: boolean
          is_real_location?: boolean
          last_api_seen_at?: string | null
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          ottawa_lot_id?: string | null
          search_text?: string | null
          source?: string
          status?: string | null
          updated_at?: string
          virtual_available?: number | null
          virtual_occupied?: number | null
          virtual_status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      real_parking_ids: {
        Row: {
          map_id: string
        }
        Insert: {
          map_id: string
        }
        Update: {
          map_id?: string
        }
        Relationships: []
      }
      traffic_events: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          lat: number
          lng: number
          severity: number | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          lat: number
          lng: number
          severity?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          severity?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      parking_app_view: {
        Row: {
          map_available: number | null
          map_capacity: number | null
          map_data_mode: string | null
          map_id: string | null
          map_lat: number | null
          map_lng: number | null
          map_name: string | null
          map_status: string | null
          map_updated_at: string | null
        }
        Relationships: []
      }
      parking_lots_clean: {
        Row: {
          api_available: number | null
          api_occupied: number | null
          api_status: string | null
          capacity: number | null
          created_at: string | null
          id: string | null
          lat: number | null
          lng: number | null
          name: string | null
          ottawa_lot_id: string | null
          virtual_occupied: number | null
        }
        Insert: {
          api_available?: number | null
          api_occupied?: never
          api_status?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          ottawa_lot_id?: string | null
          virtual_occupied?: never
        }
        Update: {
          api_available?: number | null
          api_occupied?: never
          api_status?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          ottawa_lot_id?: string | null
          virtual_occupied?: never
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "driver" | "parking_owner" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["driver", "parking_owner", "admin"],
    },
  },
} as const
