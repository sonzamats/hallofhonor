import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase URL and Anon Key must be set');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service credentials not set');
  return createClient(url, serviceKey);
}

export type Award = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  precedence_rank: number | null;
  description: string | null;
  established_year: number | null;
  color_hex: string | null;
  ribbon_image_url: string | null;
  medal_image_url: string | null;
  total_awarded: number | null;
  branch_variants: string[] | null;
};

export type Recipient = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  rank: string | null;
  branch: string | null;
  conflict: string | null;
  entered_service_state: string | null;
  birth_state: string | null;
  birth_city: string | null;
  birth_country: string | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  date_of_action: string | null;
  date_awarded: string | null;
  posthumous: boolean;
  pow: boolean;
  citation: string | null;
  photo_url: string | null;
  wikipedia_url: string | null;
  action_location_name: string | null;
  action_latitude: number | null;
  action_longitude: number | null;
};

export type RecipientAward = {
  id: string;
  recipient_id: string;
  award_id: string;
  award_number: number;
  with_valor: boolean;
  oak_leaf_clusters: number;
  citation_override: string | null;
  date_awarded: string | null;
  conflict: string | null;
  award?: Award;
};

export type RecipientWithAwards = Recipient & {
  recipient_awards: (RecipientAward & { awards: Award })[];
};
