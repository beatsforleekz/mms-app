import { getSupabaseClient } from '@/lib/supabase/client';

export async function fetchReleases() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('releases')
    .select('id, internal_id, title, artist, type, company_role, status, release_date, owner, notes, isrc, contract_received, uploads_complete, registrations_complete, added_to_pub_cat, registered_with_sony')
    .order('release_date', { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

export async function fetchReleaseById(releaseId) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('releases')
    .select('id, internal_id, title, artist, type, company_role, status, release_date, owner, notes, isrc, contract_received, uploads_complete, registrations_complete, added_to_pub_cat, registered_with_sony')
    .eq('id', releaseId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAssetsByRelease(releaseId) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('assets')
    .select('id, area, asset_title, dropbox_url, received, required, sort_order')
    .eq('release_id', releaseId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchContractsByRelease(releaseId) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('contracts')
    .select('*')
    .eq('release_id', releaseId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllContracts() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

export async function fetchActionsByRelease(releaseId) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('actions')
    .select('id, title, related_to, reference_name, notes, due_date, priority, to_do_today, status, completed_date, release_id')
    .eq('release_id', releaseId);
  if (error) throw error;
  return data || [];
}
