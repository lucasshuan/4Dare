export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      character_names: {
        Row: {
          alias_norms: string[];
          aliases: string[];
          character_id: string;
          lang: string;
          name: string;
          norm: string;
          popularity: number | null;
        };
        Insert: {
          alias_norms?: string[];
          aliases?: string[];
          character_id: string;
          lang: string;
          name: string;
          norm: string;
          popularity?: number | null;
        };
        Update: {
          alias_norms?: string[];
          aliases?: string[];
          character_id?: string;
          lang?: string;
          name?: string;
          norm?: string;
          popularity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "character_names_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      characters: {
        Row: {
          category: Database["public"]["Enums"]["character_category"] | null;
          created_at: string;
          created_by: string | null;
          custom_origin: string | null;
          id: string;
          image_url: string | null;
          kind: string | null;
          origin_id: string | null;
        };
        Insert: {
          category?: Database["public"]["Enums"]["character_category"] | null;
          created_at?: string;
          created_by?: string | null;
          custom_origin?: string | null;
          id: string;
          image_url?: string | null;
          kind?: string | null;
          origin_id?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["character_category"] | null;
          created_at?: string;
          created_by?: string | null;
          custom_origin?: string | null;
          id?: string;
          image_url?: string | null;
          kind?: string | null;
          origin_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "characters_origin_id_fkey";
            columns: ["origin_id"];
            isOneToOne: false;
            referencedRelation: "origins";
            referencedColumns: ["id"];
          },
        ];
      };
      match_players: {
        Row: {
          auto_picked: boolean;
          character_id: string | null;
          character_name: string | null;
          character_origin: string | null;
          discovered_at: number | null;
          finished_at: string;
          guesses: number;
          lang: string;
          match_id: string;
          picked_by: string | null;
          place: number | null;
          questions: number;
          result: string;
          time_ms: number | null;
          user_id: string;
          was_guest: boolean;
        };
        Insert: {
          auto_picked?: boolean;
          character_id?: string | null;
          character_name?: string | null;
          character_origin?: string | null;
          discovered_at?: number | null;
          finished_at: string;
          guesses?: number;
          lang: string;
          match_id: string;
          picked_by?: string | null;
          place?: number | null;
          questions?: number;
          result: string;
          time_ms?: number | null;
          user_id: string;
          was_guest: boolean;
        };
        Update: {
          auto_picked?: boolean;
          character_id?: string | null;
          character_name?: string | null;
          character_origin?: string | null;
          discovered_at?: number | null;
          finished_at?: string;
          guesses?: number;
          lang?: string;
          match_id?: string;
          picked_by?: string | null;
          place?: number | null;
          questions?: number;
          result?: string;
          time_ms?: number | null;
          user_id?: string;
          was_guest?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          finished_at: string;
          id: string;
          room_code: string;
          round: number;
          started_at: string;
          theme: Json | null;
          theme_id: string | null;
        };
        Insert: {
          finished_at: string;
          id: string;
          room_code: string;
          round: number;
          started_at: string;
          theme?: Json | null;
          theme_id?: string | null;
        };
        Update: {
          finished_at?: string;
          id?: string;
          room_code?: string;
          round?: number;
          started_at?: string;
          theme?: Json | null;
          theme_id?: string | null;
        };
        Relationships: [];
      };
      origin_labels: {
        Row: {
          label: string;
          lang: string;
          origin_id: string;
        };
        Insert: {
          label: string;
          lang: string;
          origin_id: string;
        };
        Update: {
          label?: string;
          lang?: string;
          origin_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "origin_labels_origin_id_fkey";
            columns: ["origin_id"];
            isOneToOne: false;
            referencedRelation: "origins";
            referencedColumns: ["id"];
          },
        ];
      };
      origins: {
        Row: {
          id: string;
        };
        Insert: {
          id: string;
        };
        Update: {
          id?: string;
        };
        Relationships: [];
      };
      pick_feedback: {
        Row: {
          character_id: string;
          created_at: string;
          liked: boolean;
          theme_id: string;
          user_id: string;
        };
        Insert: {
          character_id: string;
          created_at?: string;
          liked: boolean;
          theme_id: string;
          user_id: string;
        };
        Update: {
          character_id?: string;
          created_at?: string;
          liked?: boolean;
          theme_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar: Json;
          guest_number: number;
          id: string;
          name: string | null;
          provider: string | null;
          provider_avatar_url: string | null;
          updated_at: string;
        };
        Insert: {
          avatar: Json;
          guest_number: number;
          id: string;
          name?: string | null;
          provider?: string | null;
          provider_avatar_url?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar?: Json;
          guest_number?: number;
          id?: string;
          name?: string | null;
          provider?: string | null;
          provider_avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_messages: {
        Row: {
          author: Json | null;
          author_id: string | null;
          body: string | null;
          created_at: string;
          id: number;
          room_code: string;
          show_at: string;
          system: Json | null;
        };
        Insert: {
          author?: Json | null;
          author_id?: string | null;
          body?: string | null;
          created_at?: string;
          id?: never;
          room_code: string;
          show_at?: string;
          system?: Json | null;
        };
        Update: {
          author?: Json | null;
          author_id?: string | null;
          body?: string | null;
          created_at?: string;
          id?: never;
          room_code?: string;
          show_at?: string;
          system?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_messages_room_code_fkey";
            columns: ["room_code"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["code"];
          },
        ];
      };
      rooms: {
        Row: {
          code: string;
          phase: string;
          state: Json;
          updated_at: string;
          version: number;
          visibility: string;
        };
        Insert: {
          code: string;
          phase: string;
          state: Json;
          updated_at?: string;
          version?: number;
          visibility: string;
        };
        Update: {
          code?: string;
          phase?: string;
          state?: Json;
          updated_at?: string;
          version?: number;
          visibility?: string;
        };
        Relationships: [];
      };
      theme_starters: {
        Row: {
          character_id: string;
          position: number;
          theme_id: string;
        };
        Insert: {
          character_id: string;
          position: number;
          theme_id: string;
        };
        Update: {
          character_id?: string;
          position?: number;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theme_starters_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_starters_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      themes: {
        Row: {
          active: boolean;
          created_at: string;
          en: string;
          example: number | null;
          id: string;
          ja: string;
          pt: string;
          source: string;
          theme_set: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          en: string;
          example?: number | null;
          id: string;
          ja: string;
          pt: string;
          source: string;
          theme_set?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          en?: string;
          example?: number | null;
          id?: string;
          ja?: string;
          pt?: string;
          source?: string;
          theme_set?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      character_entries: {
        Row: {
          alias_norms: string[] | null;
          aliases: string[] | null;
          character_id: string | null;
          created_at: string | null;
          image_url: string | null;
          lang: string | null;
          name: string | null;
          norm: string | null;
          origin: string | null;
          popularity: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "character_names_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_room_message: {
        Args: {
          p_author: string;
          p_author_json: Json;
          p_body: string;
          p_room: string;
          p_show_at: string;
          p_system: Json;
        };
        Returns: {
          author: Json | null;
          author_id: string | null;
          body: string | null;
          created_at: string;
          id: number;
          room_code: string;
          show_at: string;
          system: Json | null;
        };
        SetofOptions: {
          from: "*";
          to: "room_messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_old_rooms: { Args: never; Returns: number };
      popular_picks: {
        Args: { p_limit: number; p_theme: string };
        Returns: {
          id: string;
          picks: number;
        }[];
      };
      reassign_matches: {
        Args: { from_id: string; to_id: string };
        Returns: undefined;
      };
      reassign_room_messages: {
        Args: { p_from: string; p_to: string };
        Returns: undefined;
      };
      record_match: { Args: { m: Json }; Returns: undefined };
      search_characters: {
        Args: { p_lang: string; p_limit: number; q: string };
        Returns: {
          alias_norms: string[] | null;
          aliases: string[] | null;
          character_id: string | null;
          created_at: string | null;
          image_url: string | null;
          lang: string | null;
          name: string | null;
          norm: string | null;
          origin: string | null;
          popularity: number | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "character_entries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      theme_pick_scores: {
        Args: { p_limit: number; p_theme: string };
        Returns: {
          dislikes: number;
          id: string;
          likes: number;
          picks: number;
        }[];
      };
    };
    Enums: {
      character_category:
        | "anime"
        | "games"
        | "comics"
        | "cartoons"
        | "film_tv"
        | "literature"
        | "mythology"
        | "religion"
        | "folklore"
        | "sports"
        | "music"
        | "entertainment"
        | "internet"
        | "politics"
        | "royalty"
        | "history"
        | "science"
        | "art"
        | "business"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      character_category: [
        "anime",
        "games",
        "comics",
        "cartoons",
        "film_tv",
        "literature",
        "mythology",
        "religion",
        "folklore",
        "sports",
        "music",
        "entertainment",
        "internet",
        "politics",
        "royalty",
        "history",
        "science",
        "art",
        "business",
        "other",
      ],
    },
  },
} as const;
