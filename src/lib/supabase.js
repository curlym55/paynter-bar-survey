import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isConnected = () => !!supabase;

// ── Drinks (suggestions + seed list) ─────────────────────────

export async function getDrinks() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('drinks')
    .select('*')
    .order('category')
    .order('price_range_order')
    .order('name');
  if (error) throw error;
  return data;
}

export async function addDrink(drink) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('drinks')
    .insert([{ ...drink, is_current_stock: false, current_bar_price: null }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Votes ─────────────────────────────────────────────────────

export async function castVotes(residentName, drinkIds) {
  if (!supabase) return null;
  // Upsert so the same person can't double-vote on the same drink
  const rows = drinkIds.map(id => ({
    resident_name: residentName,
    drink_id: id,
  }));
  const { error } = await supabase
    .from('votes')
    .upsert(rows, { onConflict: 'resident_name,drink_id' });
  if (error) throw error;
  return true;
}

export async function getVoteCounts() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vote_counts')   // a view — see schema.sql
    .select('*');
  if (error) throw error;
  // Return as { drink_id: count } map
  const map = {};
  (data || []).forEach(r => { map[r.drink_id] = r.vote_count; });
  return map;
}

// ── Settings ──────────────────────────────────────────────────

export async function getVotingOpen() {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'voting_open')
    .single();
  if (error) return false;
  return data?.value === 'true';
}

export async function setVotingOpen(open) {
  if (!supabase) return null;
  const { error } = await supabase
    .from('settings')
    .update({ value: open ? 'true' : 'false' })
    .eq('key', 'voting_open');
  if (error) throw error;
  return true;
}

// ── Admin reset ───────────────────────────────────────────────

export async function resetVotes() {
  if (!supabase) return null;
  const { error } = await supabase.from('votes').delete().neq('id', 0);
  if (error) throw error;
  return true;
}

export async function resetSuggestions() {
  if (!supabase) return null;
  // Only delete user-suggested drinks (not the seeded ones)
  const { error } = await supabase
    .from('drinks')
    .delete()
    .eq('is_seed', false);
  if (error) throw error;
  return true;
}
