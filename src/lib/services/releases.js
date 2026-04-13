import { getSupabaseClient } from '@/lib/supabase/client';
const RELEASE_NOTES_STORAGE_KEY = 'release_detail_notes';

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function readStorageObject(key) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch (err) {
    return {};
  }
}

function writeStorageObject(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value && typeof value === 'object' ? value : {}));
}

async function getPipelineEntries() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('catalogue_pipeline_links')
    .select('id, catalogue_id, catalogue_type, status')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: normalizeText(row && (row.id || row.release_id)),
    release_id: normalizeText(row && row.release_id),
    catalogue_id: normalizeText(row && row.catalogue_id),
    catalogue_type: normalizeText(row && row.catalogue_type).toLowerCase() === 'publishing' ? 'publishing' : 'label',
    status: normalizeText(row && row.status) || 'New'
  })).filter((row) => row.id && row.catalogue_id && row.catalogue_type);
}

async function getPipelineEntry(releaseId) {
  const normalizedId = normalizeText(releaseId);
  const entries = await getPipelineEntries();
  return entries.find((row) => row.id === normalizedId) || null;
}

async function getCurrentUserId() {
  const db = getSupabaseClient();
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  return normalizeText(data?.user?.id);
}

async function resolvePipelineEntry(releaseId, catalogueId = '', catalogueType = '') {
  const normalizedCatalogueId = normalizeText(catalogueId);
  const normalizedCatalogueType = normalizeText(catalogueType).toLowerCase() === 'publishing' ? 'publishing' : 'label';
  if (normalizedCatalogueId) {
    return {
      id: normalizeText(releaseId) || `catalogue:${normalizedCatalogueType}:${normalizedCatalogueId}`,
      release_id: normalizeText(releaseId),
      catalogue_id: normalizedCatalogueId,
      catalogue_type: normalizedCatalogueType,
      status: 'New'
    };
  }
  return getPipelineEntry(releaseId);
}

function getReleaseLookupKeys(releaseId, entry = null) {
  const keys = [];
  const resolvedEntry = entry || getPipelineEntry(releaseId);
  function pushKey(value) {
    const normalized = normalizeText(value);
    if (!normalized || keys.includes(normalized)) return;
    keys.push(normalized);
  }
  if (resolvedEntry) {
    pushKey(resolvedEntry.catalogue_id);
    pushKey(resolvedEntry.id);
    pushKey(resolvedEntry.release_id);
  } else {
    pushKey(releaseId);
  }
  return keys;
}

function getReleaseNotesMap() {
  return readStorageObject(RELEASE_NOTES_STORAGE_KEY);
}

export function getReleaseNote(releaseId) {
  const notesMap = getReleaseNotesMap();
  return normalizeText(notesMap[normalizeText(releaseId)]);
}

export function saveReleaseNote(releaseId, notes) {
  const key = normalizeText(releaseId);
  if (!key) throw new Error('Missing release id.');
  const next = getReleaseNotesMap();
  next[key] = normalizeText(notes);
  writeStorageObject(RELEASE_NOTES_STORAGE_KEY, next);
  return next[key];
}

async function fetchCatalogueSource(entry) {
  if (!entry || !entry.catalogue_id) return null;
  const db = getSupabaseClient();
  if (entry.catalogue_type === 'publishing') {
    const { data, error } = await db
      .from('publishing_catalogue')
      .select('id, work_title, writers, tempo_id, iswc')
      .eq('id', entry.catalogue_id)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...data, catalogue_type: 'publishing' } : null;
  }
  const { data, error } = await db
    .from('label_catalogue')
    .select('id, artist, track_title, version, release_title, isrc')
    .eq('id', entry.catalogue_id)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, catalogue_type: 'label' } : null;
}

export async function fetchReleases() {
  const entries = await getPipelineEntries();
  const rows = await Promise.all(entries.map((entry) => fetchReleaseById(entry.id, entry.catalogue_id, entry.catalogue_type)));
  return rows.filter(Boolean);
}

export async function fetchReleaseById(releaseId, catalogueId = '', catalogueType = '') {
  const entry = await resolvePipelineEntry(releaseId, catalogueId, catalogueType);
  if (!entry || !entry.catalogue_id) return null;
  const source = await fetchCatalogueSource(entry);
  const savedNote = getReleaseNote(entry.id);
  if (!source) return null;

  if (entry.catalogue_type === 'publishing') {
    return {
      id: entry.id,
      catalogue_id: entry.catalogue_id,
      catalogue_type: entry.catalogue_type,
      title: source.work_title || '—',
      artist: source.writers || '—',
      type: 'Publishing',
      company_role: 'Publisher',
      status: entry.status || 'New',
      release_date: null,
      owner: '',
      notes: savedNote || '',
      isrc: source.iswc || '',
      missing_catalogue_data: false
    };
  }

  return {
    id: entry.id,
    catalogue_id: entry.catalogue_id,
    catalogue_type: entry.catalogue_type,
    title: source.track_title || '—',
    artist: source.artist || '—',
    type: 'Label',
    company_role: 'Label',
    status: entry.status || 'New',
    release_date: null,
    owner: '',
    notes: savedNote || '',
    isrc: source.isrc || '',
    missing_catalogue_data: false
  };
}

export async function fetchAssetsByRelease(releaseId, catalogueId = '', catalogueType = '') {
  const entry = await resolvePipelineEntry(releaseId, catalogueId, catalogueType);
  const lookupKeys = getReleaseLookupKeys(releaseId, entry);
  const db = getSupabaseClient();
  let query = db
    .from('assets')
    .select('id, release_id, area, asset_title, dropbox_url, received, required, sort_order');
  query = lookupKeys.length > 1 ? query.in('release_id', lookupKeys) : query.eq('release_id', lookupKeys[0] || normalizeText(releaseId));
  const { data, error } = await query
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchContractsByRelease(releaseId, catalogueId = '', catalogueType = '') {
  const entry = await resolvePipelineEntry(releaseId, catalogueId, catalogueType);
  if (!entry) return [];
  const db = getSupabaseClient();
  const [{ data: linkedData, error: linkedError }, { data: legacyData, error: legacyError }, { data: joinRows, error: joinError }] = await Promise.all([
    db
      .from('contracts')
      .select('*')
      .eq('catalogue_id', entry.catalogue_id)
      .eq('catalogue_type', entry.catalogue_type)
      .order('created_at', { ascending: false }),
    db
      .from('contracts')
      .select('*')
      .eq('release_id', entry.id)
      .order('created_at', { ascending: false }),
    db
      .from('contract_catalogue_links')
      .select('contract_id')
      .eq('catalogue_id', entry.catalogue_id)
      .eq('catalogue_type', entry.catalogue_type)
  ]);
  if (linkedError) throw linkedError;
  if (legacyError) throw legacyError;
  if (joinError) throw joinError;
  let joinContracts = [];
  const joinIds = Array.from(new Set((joinRows || []).map((row) => normalizeText(row && row.contract_id)).filter(Boolean)));
  if (joinIds.length) {
    const { data: joinData, error: joinDataError } = await db
      .from('contracts')
      .select('*')
      .in('id', joinIds)
      .order('created_at', { ascending: false });
    if (joinDataError) throw joinDataError;
    joinContracts = joinData || [];
  }
  const merged = [];
  const seen = new Set();
  (linkedData || []).concat(legacyData || []).concat(joinContracts).forEach((row) => {
    const key = normalizeText(row && row.id);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(row);
  });
  return merged;
}

export async function fetchAllContracts() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchActionsByRelease(releaseId, catalogueId = '', catalogueType = '') {
  const entry = await resolvePipelineEntry(releaseId, catalogueId, catalogueType);
  const lookupKeys = getReleaseLookupKeys(releaseId, entry);
  const db = getSupabaseClient();
  const currentUserId = await getCurrentUserId();
  let query = db
    .from('actions')
    .select('id, title, related_to, reference_name, notes, due_date, priority, to_do_today, status, completed_date, release_id, visibility, owner_user_id');
  query = lookupKeys.length > 1 ? query.in('release_id', lookupKeys) : query.eq('release_id', lookupKeys[0] || normalizeText(releaseId));
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).filter((row) => {
    const visibility = normalizeText(row?.visibility).toLowerCase() === 'personal' ? 'Personal' : 'Shared';
    if (visibility !== 'Personal') return true;
    return normalizeText(row?.owner_user_id) === currentUserId;
  });
}
