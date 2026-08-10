import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

export function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url) {
      throw new Error("SUPABASE_URL environment variable is required. Please add it in your settings.");
    }
    if (!key) {
      throw new Error("SUPABASE_KEY environment variable is required. Please add it in your settings.");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  price_per_client: "10",
  price_per_accountant: "5",
  featured_monthly_price: "9",
  free_client_limit: "1",
  free_accountant_limit: "1",
  free_tx_limit: "50",
  wallet_bonus_tier1_amount: "50",
  wallet_bonus_tier1_percent: "10",
  wallet_bonus_tier2_amount: "100",
  wallet_bonus_tier2_percent: "20",
  signup_bonus_enabled: "true",
  signup_bonus_amount: "15",
  wallet_bonus_tier3_amount: "200",
  wallet_bonus_tier3_percent: "30",
};

export async function getPlatformSettings(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("platform_settings").select("*");
    if (error || !data) return DEFAULT_SETTINGS;
    
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    data.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
