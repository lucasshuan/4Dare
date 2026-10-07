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
      character_image_picks: {
        Row: {
          chosen: boolean;
          created_at: string;
          image_id: string;
          player_id: string;
        };
        Insert: {
          chosen?: boolean;
          created_at?: string;
          image_id: string;
          player_id: string;
        };
        Update: {
          chosen?: boolean;
          created_at?: string;
          image_id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_image_picks_image_id_fkey";
            columns: ["image_id"];
            isOneToOne: false;
            referencedRelation: "character_images";
            referencedColumns: ["id"];
          },
        ];
      };
      character_image_reports: {
        Row: {
          created_at: string;
          image_id: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          image_id: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          image_id?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_image_reports_image_id_fkey";
            columns: ["image_id"];
            isOneToOne: false;
            referencedRelation: "character_images";
            referencedColumns: ["id"];
          },
        ];
      };
      character_images: {
        Row: {
          author: Json | null;
          bonus: number;
          character_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          keeps: number;
          moderation: Json | null;
          picks: number;
          reports: number;
          score: number | null;
          status: string;
          url: string;
        };
        Insert: {
          author?: Json | null;
          bonus?: number;
          character_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          keeps?: number;
          moderation?: Json | null;
          picks?: number;
          reports?: number;
          score?: number | null;
          status?: string;
          url: string;
        };
        Update: {
          author?: Json | null;
          bonus?: number;
          character_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          keeps?: number;
          moderation?: Json | null;
          picks?: number;
          reports?: number;
          score?: number | null;
          status?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_images_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
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
          gostos: Database["public"]["Enums"]["gosto"][] | null;
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
          gostos?: Database["public"]["Enums"]["gosto"][] | null;
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
          gostos?: Database["public"]["Enums"]["gosto"][] | null;
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
      impostor_match_players: {
        Row: {
          guess: string | null;
          guess_hit: boolean | null;
          impostor: boolean;
          left_match: boolean;
          match_id: string;
          out_round: number | null;
          right_votes: number;
          user_id: string;
        };
        Insert: {
          guess?: string | null;
          guess_hit?: boolean | null;
          impostor: boolean;
          left_match?: boolean;
          match_id: string;
          out_round?: number | null;
          right_votes?: number;
          user_id: string;
        };
        Update: {
          guess?: string | null;
          guess_hit?: boolean | null;
          impostor?: boolean;
          left_match?: boolean;
          match_id?: string;
          out_round?: number | null;
          right_votes?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "impostor_match_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      impostor_question_stats: {
        Row: {
          asked: number;
          caught: number;
          lang: string;
          question_id: string;
          silent: number;
          stood_out: number;
        };
        Insert: {
          asked?: number;
          caught?: number;
          lang: string;
          question_id: string;
          silent?: number;
          stood_out?: number;
        };
        Update: {
          asked?: number;
          caught?: number;
          lang?: string;
          question_id?: string;
          silent?: number;
          stood_out?: number;
        };
        Relationships: [
          {
            foreignKeyName: "impostor_question_stats_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "impostor_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      impostor_questions: {
        Row: {
          audience: string;
          created_at: string;
          created_by: string | null;
          en: string;
          es: string;
          id: string;
          ja: string;
          kind: string;
          options: Json | null;
          pt: string;
          scope: string;
          spice: number;
          status: string;
          theme_id: string | null;
          theme_set: string | null;
        };
        Insert: {
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          en: string;
          es: string;
          id: string;
          ja: string;
          kind: string;
          options?: Json | null;
          pt: string;
          scope: string;
          spice?: number;
          status?: string;
          theme_id?: string | null;
          theme_set?: string | null;
        };
        Update: {
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          en?: string;
          es?: string;
          id?: string;
          ja?: string;
          kind?: string;
          options?: Json | null;
          pt?: string;
          scope?: string;
          spice?: number;
          status?: string;
          theme_id?: string | null;
          theme_set?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "impostor_questions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "impostor_questions_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "whoami_themes";
            referencedColumns: ["id"];
          },
        ];
      };
      match_players: {
        Row: {
          auto_picked: boolean | null;
          character_id: string | null;
          character_name: string | null;
          character_origin: string | null;
          discovered_at: number | null;
          finished_at: string;
          guesses: number | null;
          lang: string;
          match_id: string;
          picked_by: string | null;
          place: number | null;
          questions: number | null;
          result: string | null;
          time_ms: number | null;
          user_id: string;
          was_guest: boolean;
          xp: number;
        };
        Insert: {
          auto_picked?: boolean | null;
          character_id?: string | null;
          character_name?: string | null;
          character_origin?: string | null;
          discovered_at?: number | null;
          finished_at: string;
          guesses?: number | null;
          lang: string;
          match_id: string;
          picked_by?: string | null;
          place?: number | null;
          questions?: number | null;
          result?: string | null;
          time_ms?: number | null;
          user_id: string;
          was_guest: boolean;
          xp?: number;
        };
        Update: {
          auto_picked?: boolean | null;
          character_id?: string | null;
          character_name?: string | null;
          character_origin?: string | null;
          discovered_at?: number | null;
          finished_at?: string;
          guesses?: number | null;
          lang?: string;
          match_id?: string;
          picked_by?: string | null;
          place?: number | null;
          questions?: number | null;
          result?: string | null;
          time_ms?: number | null;
          user_id?: string;
          was_guest?: boolean;
          xp?: number;
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
          game: string;
          id: string;
          room_code: string;
          round: number;
          started_at: string;
          theme: Json | null;
          theme_id: string | null;
        };
        Insert: {
          finished_at: string;
          game?: string;
          id: string;
          room_code: string;
          round: number;
          started_at: string;
          theme?: Json | null;
          theme_id?: string | null;
        };
        Update: {
          finished_at?: string;
          game?: string;
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
          gostos: Database["public"]["Enums"]["gosto"][] | null;
          id: string;
        };
        Insert: {
          gostos?: Database["public"]["Enums"]["gosto"][] | null;
          id: string;
        };
        Update: {
          gostos?: Database["public"]["Enums"]["gosto"][] | null;
          id?: string;
        };
        Relationships: [];
      };
      profile_comment_reports: {
        Row: {
          comment_id: number;
          created_at: string;
          reporter_id: string;
        };
        Insert: {
          comment_id: number;
          created_at?: string;
          reporter_id: string;
        };
        Update: {
          comment_id?: number;
          created_at?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_comment_reports_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "profile_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_comment_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          hidden: boolean;
          id: number;
          parent_id: number | null;
          profile_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          hidden?: boolean;
          id?: never;
          parent_id?: number | null;
          profile_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          hidden?: boolean;
          id?: never;
          parent_id?: number | null;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profile_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_comments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          about: Json;
          accent: string | null;
          avatar: Json;
          banner: Json | null;
          created_at: string;
          guest_number: number;
          handle: string | null;
          handle_changed_at: string | null;
          id: string;
          name: string | null;
          privacy: Json;
          provider: string | null;
          provider_avatar_url: string | null;
          quote: string | null;
          settings: Json;
          showcase: Json;
          updated_at: string;
        };
        Insert: {
          about?: Json;
          accent?: string | null;
          avatar: Json;
          banner?: Json | null;
          created_at?: string;
          guest_number: number;
          handle?: string | null;
          handle_changed_at?: string | null;
          id: string;
          name?: string | null;
          privacy?: Json;
          provider?: string | null;
          provider_avatar_url?: string | null;
          quote?: string | null;
          settings?: Json;
          showcase?: Json;
          updated_at?: string;
        };
        Update: {
          about?: Json;
          accent?: string | null;
          avatar?: Json;
          banner?: Json | null;
          created_at?: string;
          guest_number?: number;
          handle?: string | null;
          handle_changed_at?: string | null;
          id?: string;
          name?: string | null;
          privacy?: Json;
          provider?: string | null;
          provider_avatar_url?: string | null;
          quote?: string | null;
          settings?: Json;
          showcase?: Json;
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
      user_badges: {
        Row: {
          badge: string;
          earned_at: string;
          game: string | null;
          user_id: string;
        };
        Insert: {
          badge: string;
          earned_at?: string;
          game?: string | null;
          user_id: string;
        };
        Update: {
          badge?: string;
          earned_at?: string;
          game?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      whoami_fit_votes: {
        Row: {
          character_id: string;
          fits: boolean;
          lang: string;
          theme_id: string;
          voted_at: string;
          voter_id: string;
        };
        Insert: {
          character_id: string;
          fits: boolean;
          lang: string;
          theme_id: string;
          voted_at?: string;
          voter_id: string;
        };
        Update: {
          character_id?: string;
          fits?: boolean;
          lang?: string;
          theme_id?: string;
          voted_at?: string;
          voter_id?: string;
        };
        Relationships: [];
      };
      whoami_match_players: {
        Row: {
          auto_picked: boolean;
          character_id: string | null;
          character_name: string | null;
          character_origin: string | null;
          discovered_at: number | null;
          guesses: number;
          match_id: string;
          picked_by: string | null;
          questions: number;
          result: string;
          user_id: string;
        };
        Insert: {
          auto_picked?: boolean;
          character_id?: string | null;
          character_name?: string | null;
          character_origin?: string | null;
          discovered_at?: number | null;
          guesses?: number;
          match_id: string;
          picked_by?: string | null;
          questions?: number;
          result: string;
          user_id: string;
        };
        Update: {
          auto_picked?: boolean;
          character_id?: string | null;
          character_name?: string | null;
          character_origin?: string | null;
          discovered_at?: number | null;
          guesses?: number;
          match_id?: string;
          picked_by?: string | null;
          questions?: number;
          result?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whoami_match_players_match_id_user_id_fkey";
            columns: ["match_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "match_players";
            referencedColumns: ["match_id", "user_id"];
          },
        ];
      };
      whoami_pick_feedback: {
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
      whoami_theme_pickers: {
        Row: {
          character_id: string;
          lang: string;
          picked_at: string;
          picker_id: string;
          suggested: boolean;
          theme_id: string;
        };
        Insert: {
          character_id: string;
          lang: string;
          picked_at?: string;
          picker_id: string;
          suggested?: boolean;
          theme_id: string;
        };
        Update: {
          character_id?: string;
          lang?: string;
          picked_at?: string;
          picker_id?: string;
          suggested?: boolean;
          theme_id?: string;
        };
        Relationships: [];
      };
      whoami_theme_starters: {
        Row: {
          character_id: string;
          lang: string;
          position: number;
          theme_id: string;
        };
        Insert: {
          character_id: string;
          lang?: string;
          position: number;
          theme_id: string;
        };
        Update: {
          character_id?: string;
          lang?: string;
          position?: number;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whoami_theme_starters_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whoami_theme_starters_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whoami_theme_starters_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "whoami_themes";
            referencedColumns: ["id"];
          },
        ];
      };
      whoami_themes: {
        Row: {
          active: boolean;
          created_at: string;
          en: string;
          es: string;
          example: number | null;
          games: string[];
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
          es: string;
          example?: number | null;
          games?: string[];
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
          es?: string;
          example?: number | null;
          games?: string[];
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
          other_names: string[] | null;
          popularity: number | null;
          shadowed: boolean | null;
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
      pick_feedback: {
        Row: {
          character_id: string | null;
          created_at: string | null;
          liked: boolean | null;
          theme_id: string | null;
          user_id: string | null;
        };
        Insert: {
          character_id?: string | null;
          created_at?: string | null;
          liked?: boolean | null;
          theme_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          character_id?: string | null;
          created_at?: string | null;
          liked?: boolean | null;
          theme_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      theme_starters: {
        Row: {
          character_id: string | null;
          position: number | null;
          theme_id: string | null;
        };
        Insert: {
          character_id?: string | null;
          position?: number | null;
          theme_id?: string | null;
        };
        Update: {
          character_id?: string | null;
          position?: number | null;
          theme_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whoami_theme_starters_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whoami_theme_starters_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whoami_theme_starters_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "whoami_themes";
            referencedColumns: ["id"];
          },
        ];
      };
      theme_starter_gostos: {
        Row: {
          gostos: string[] | null;
          theme_id: string | null;
        };
        Relationships: [];
      };
      themes: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          en: string | null;
          example: number | null;
          id: string | null;
          ja: string | null;
          pt: string | null;
          source: string | null;
          theme_set: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          en?: string | null;
          example?: number | null;
          id?: string | null;
          ja?: string | null;
          pt?: string | null;
          source?: string | null;
          theme_set?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          en?: string | null;
          example?: number | null;
          id?: string | null;
          ja?: string | null;
          pt?: string | null;
          source?: string | null;
          theme_set?: string | null;
        };
        Relationships: [];
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
      character_gostos: {
        Args: { c: Database["public"]["Tables"]["characters"]["Row"] };
        Returns: Database["public"]["Enums"]["gosto"][];
      };
      gostos_by_rule: {
        Args: {
          p_category: Database["public"]["Enums"]["character_category"];
          p_origin: string;
        };
        Returns: Database["public"]["Enums"]["gosto"][];
      };
      impostor_count_questions: {
        Args: { p_rows: Json };
        Returns: undefined;
      };
      impostor_facts: {
        Args: { p_ids: string[]; p_lang: string };
        Returns: {
          category: Database["public"]["Enums"]["character_category"];
          character_id: string;
          gostos: Database["public"]["Enums"]["gosto"][];
          popularity: number;
          work: string;
        }[];
      };
      impostor_known_floor: { Args: { p_lang: string }; Returns: number };
      played_together: {
        Args: { p_a: string; p_b: string };
        Returns: boolean;
      };
      player_matches: {
        Args: { p_since: string; p_user: string };
        Returns: {
          details: Json;
          finished_at: string;
          game: string;
          lang: string;
          match_id: string;
          others: Json;
          place: number;
          time_ms: number;
          xp: number;
        }[];
      };
      player_totals: {
        Args: { p_user: string };
        Returns: {
          first_at: string;
          game: string;
          matches: number;
          time_ms: number;
          wins: number;
          xp: number;
        }[];
      };
      popular_picks: {
        Args: { p_limit: number; p_theme: string };
        Returns: {
          id: string;
          picks: number;
        }[];
      };
      post_profile_comment: {
        Args: {
          p_author: string;
          p_body: string;
          p_parent: number;
          p_profile: string;
        };
        Returns: number;
      };
      reassign_matches: {
        Args: { from_id: string; to_id: string };
        Returns: undefined;
      };
      reassign_room_messages: {
        Args: { p_from: string; p_to: string };
        Returns: undefined;
      };
      record_image_pick:
        | {
            Args: { p_character: string; p_player: string; p_url: string };
            Returns: undefined;
          }
        | {
            Args: {
              p_character: string;
              p_chosen: boolean;
              p_player: string;
              p_url: string;
            };
            Returns: undefined;
          };
      record_match: { Args: { m: Json }; Returns: undefined };
      refresh_character_cover: {
        Args: { p_character: string };
        Returns: undefined;
      };
      report_character_image: {
        Args: { p_hide_at: number; p_image: string; p_reporter: string };
        Returns: string;
      };
      report_profile_comment: {
        Args: { p_comment: number; p_reporter: string };
        Returns: boolean;
      };
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
          other_names: string[] | null;
          popularity: number | null;
          shadowed: boolean | null;
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
      whoami_pick_key: { Args: { p_id: string }; Returns: string };
      whoami_theme_stats: {
        Args: { p_limit: number; p_theme: string };
        Returns: {
          character_id: string;
          fits: number;
          lang: string;
          misfits: number;
          picks: number;
          suggested: number;
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
      gosto:
        | "anime"
        | "animation"
        | "live"
        | "games"
        | "comics"
        | "books"
        | "faith"
        | "real";
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
      gosto: [
        "anime",
        "animation",
        "live",
        "games",
        "comics",
        "books",
        "faith",
        "real",
      ],
    },
  },
} as const;
