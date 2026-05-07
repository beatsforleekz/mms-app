'use client';

import * as XLSX from 'xlsx';
import { getSupabaseClient } from '@/lib/supabase/client';

const PIPELINE_LINKS_STORAGE_KEY = 'catalogue_pipeline_links';

let labelCatalogueCache = [];
let publishingCatalogueCache = [];
let parentReleaseCache = [];

function readStorageArray(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    return [];
  }
}

function writeStorageArray(key, rows) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []));
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeLabelRow(row) {
  return {
    id: normalizeText(row.id),
    artist: normalizeText(row.artist),
    track_title: normalizeText(row.track_title),
    version: normalizeText(row.version),
    release_title: normalizeText(row.release_title),
    isrc: normalizeText(row.isrc)
  };
}

function normalizePublishingRow(row) {
  return {
    id: normalizeText(row.id),
    work_title: normalizeText(row.work_title),
    writers: normalizeText(row.writers),
    tempo_id: normalizeText(row.tempo_id),
    iswc: normalizeText(row.iswc)
  };
}

function normalizeParentReleaseRow(row) {
  return {
    id: normalizeText(row.id),
    title: normalizeText(row.title),
    release_type: normalizeText(row.release_type) || 'EP',
    status: normalizeText(row.status) || 'New',
    created_at: row && row.created_at ? String(row.created_at) : '',
    updated_at: row && row.updated_at ? String(row.updated_at) : ''
  };
}

function normalizeParentReleaseTrackRow(row) {
  return {
    id: normalizeText(row.id),
    parent_release_id: normalizeText(row.parent_release_id),
    child_catalogue_type: normalizeText(row.child_catalogue_type).toLowerCase() === 'label' ? 'label' : 'label',
    child_catalogue_id: normalizeText(row.child_catalogue_id),
    track_order: Number(row && row.track_order) || 0,
    created_at: row && row.created_at ? String(row.created_at) : ''
  };
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
}

function headerIndex(headers, names) {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (let i = 0; i < normalizedHeaders.length; i += 1) {
    if (names.includes(normalizedHeaders[i])) return i;
  }
  return -1;
}

function readWorkbookRows(source, type) {
  const workbook = XLSX.read(source, { type, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
}

function isCompletelyEmptyRow(row) {
  return !Array.isArray(row) || row.every((cell) => normalizeText(cell) === '');
}

async function extractRowsFromFile(file) {
  const ext = normalizeText(file.name.split('.').pop()).toLowerCase();
  if (ext === 'csv') {
    const text = await file.text();
    return readWorkbookRows(text, 'string');
  }
  const buffer = await file.arrayBuffer();
  return readWorkbookRows(buffer, 'array');
}

function getImportFields(type) {
  return normalizeText(type).toLowerCase() === 'publishing'
    ? ['work_title', 'writers', 'tempo_id', 'iswc']
    : ['artist', 'track_title', 'version', 'release_title', 'isrc'];
}

function suggestMapping(type, headers) {
  const fieldNames = getImportFields(type);
  const normalizedHeaders = headers.map(normalizeHeader);
  const guesses = {
    artist: ['artist'],
    track_title: ['title', 'track', 'title / track', 'track title'],
    version: ['version / mix', 'version/mix', 'version', 'mix'],
    release_title: ['release / project', 'release/project', 'release', 'project'],
    isrc: ['isrc'],
    work_title: ['title'],
    writers: ['writer', 'writers'],
    tempo_id: ['tempo id', 'tempo'],
    iswc: ['iswc']
  };
  return fieldNames.reduce((acc, field) => {
    const idx = normalizedHeaders.findIndex((header) => (guesses[field] || []).includes(header));
    acc[field] = idx >= 0 ? headers[idx] : '';
    return acc;
  }, {});
}

function buildMappedRows(type, headers, rows, mapping) {
  const headerLookup = headers.reduce((acc, header, index) => {
    acc[normalizeText(header)] = index;
    return acc;
  }, {});
  const fieldNames = getImportFields(type);
  return rows.map((row) => {
    const mapped = fieldNames.reduce((acc, field) => {
      const selectedHeader = normalizeText(mapping[field]);
      const index = selectedHeader ? headerLookup[selectedHeader] : -1;
      acc[field] = index >= 0 ? normalizeText(row[index]) : '';
      return acc;
    }, {});
    return normalizeText(type).toLowerCase() === 'publishing'
      ? normalizePublishingRow(mapped)
      : normalizeLabelRow(mapped);
  }).filter((row) => {
    return normalizeText(type).toLowerCase() === 'publishing'
      ? !!row.work_title
      : !!(row.track_title || row.artist);
  });
}

export async function parseCatalogueFilePreview(file, type) {
  const rawRows = await extractRowsFromFile(file);
  const nonEmptyRows = (rawRows || []).filter((row, index) => index === 0 || !isCompletelyEmptyRow(row));
  if (!nonEmptyRows.length) {
    return { headers: [], rows: [], mapping: suggestMapping(type, []), parsedCount: 0 };
  }
  const headers = (nonEmptyRows[0] || []).map((header) => normalizeText(header));
  const rows = nonEmptyRows.slice(1);
  return {
    headers,
    rows,
    mapping: suggestMapping(type, headers),
    parsedCount: rows.length
  };
}

export async function importMappedCatalogueRows(type, headers, rows, mapping) {
  const importType = normalizeText(type).toLowerCase() === 'publishing' ? 'publishing' : 'label';
  const parsedRows = buildMappedRows(importType, headers, rows, mapping);
  console.log(`[Catalogue Import] ${importType} rows parsed before insert:`, parsedRows.length);
  if (!parsedRows.length) {
    return { parsedCount: 0, insertedCount: 0 };
  }

  const db = getSupabaseClient();
  const table = importType === 'publishing' ? 'publishing_catalogue' : 'label_catalogue';
  const payload = importType === 'publishing'
    ? parsedRows.map((row) => ({
        work_title: row.work_title,
        writers: row.writers || null,
        tempo_id: row.tempo_id || null,
        iswc: row.iswc || null
      }))
    : parsedRows.map((row) => ({
        artist: row.artist || null,
        track_title: row.track_title || null,
        version: row.version || null,
        release_title: row.release_title || null,
        isrc: row.isrc || null
      }));

  const { data, error } = await db.from(table).insert(payload).select();
  if (error) throw error;

  if (importType === 'publishing') {
    publishingCatalogueCache = await fetchPublishingCatalogue();
  } else {
    labelCatalogueCache = await fetchLabelCatalogue();
  }

  return {
    parsedCount: rows.length,
    insertedCount: Array.isArray(data) ? data.length : payload.length
  };
}

export async function fetchLabelCatalogue() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('label_catalogue')
    .select('id, artist, track_title, version, release_title, isrc')
    .order('artist', { ascending: true })
    .order('track_title', { ascending: true });
  if (error) throw error;
  labelCatalogueCache = (data || []).map(normalizeLabelRow);
  return labelCatalogueCache.slice();
}

export async function fetchPublishingCatalogue() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('publishing_catalogue')
    .select('id, work_title, writers, tempo_id, iswc')
    .order('work_title', { ascending: true })
    .order('writers', { ascending: true });
  if (error) throw error;
  publishingCatalogueCache = (data || []).map(normalizePublishingRow);
  return publishingCatalogueCache.slice();
}

export async function fetchParentReleases() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('parent_releases')
    .select('id, title, release_type, status, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  parentReleaseCache = (data || []).map(normalizeParentReleaseRow);
  return parentReleaseCache.slice();
}

export async function fetchParentReleaseTracks(parentReleaseId) {
  const parentId = normalizeText(parentReleaseId);
  if (!parentId) return [];
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('parent_release_tracks')
    .select('id, parent_release_id, child_catalogue_type, child_catalogue_id, track_order, created_at')
    .eq('parent_release_id', parentId)
    .order('track_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeParentReleaseTrackRow);
}

export async function createParentRelease(values) {
  const db = getSupabaseClient();
  const title = normalizeText(values && values.title);
  const releaseType = normalizeText(values && values.release_type);
  const status = normalizeText(values && values.status) || 'New';
  const rawTracks = Array.isArray(values && values.tracks) ? values.tracks : [];
  const tracks = rawTracks
    .map((row, index) => ({
      child_catalogue_type: normalizeText(row && row.child_catalogue_type).toLowerCase() === 'label' ? 'label' : 'label',
      child_catalogue_id: normalizeText(row && row.child_catalogue_id),
      track_order: Number(row && row.track_order) > 0 ? Number(row.track_order) : (index + 1)
    }))
    .filter((row) => row.child_catalogue_id);
  if (!title) throw new Error('Parent release title is required.');
  if (!releaseType) throw new Error('Release type is required.');
  if (!tracks.length) throw new Error('Select at least one existing track.');
  const { data: insertedParent, error: parentError } = await db
    .from('parent_releases')
    .insert({ title, release_type: releaseType, status })
    .select('id, title, release_type, status, created_at, updated_at')
    .single();
  if (parentError) throw parentError;
  const parentId = normalizeText(insertedParent && insertedParent.id);
  const trackPayload = tracks.map((row, index) => ({
    parent_release_id: parentId,
    child_catalogue_type: row.child_catalogue_type,
    child_catalogue_id: row.child_catalogue_id,
    track_order: Number(row.track_order) > 0 ? Number(row.track_order) : (index + 1)
  }));
  const { error: trackError } = await db.from('parent_release_tracks').insert(trackPayload);
  if (trackError) throw trackError;
  const normalizedParent = normalizeParentReleaseRow(insertedParent);
  parentReleaseCache = [normalizedParent].concat(parentReleaseCache.filter((row) => row.id !== normalizedParent.id));
  return normalizedParent;
}

export async function updateParentRelease(parentReleaseId, values) {
  const parentId = normalizeText(parentReleaseId);
  if (!parentId) throw new Error('Missing parent release id.');
  const db = getSupabaseClient();
  const title = normalizeText(values && values.title);
  const releaseType = normalizeText(values && values.release_type);
  const status = normalizeText(values && values.status) || 'New';
  const rawTracks = Array.isArray(values && values.tracks) ? values.tracks : [];
  const tracks = rawTracks
    .map((row, index) => ({
      child_catalogue_type: normalizeText(row && row.child_catalogue_type).toLowerCase() === 'label' ? 'label' : 'label',
      child_catalogue_id: normalizeText(row && row.child_catalogue_id),
      track_order: Number(row && row.track_order) > 0 ? Number(row.track_order) : (index + 1)
    }))
    .filter((row) => row.child_catalogue_id);
  if (!title) throw new Error('Parent release title is required.');
  if (!releaseType) throw new Error('Release type is required.');
  if (!tracks.length) throw new Error('Select at least one existing track.');

  const { data: updatedParent, error: updateError } = await db
    .from('parent_releases')
    .update({ title, release_type: releaseType, status, updated_at: new Date().toISOString() })
    .eq('id', parentId)
    .select('id, title, release_type, status, created_at, updated_at')
    .single();
  if (updateError) throw updateError;

  const { error: deleteTracksError } = await db
    .from('parent_release_tracks')
    .delete()
    .eq('parent_release_id', parentId);
  if (deleteTracksError) throw deleteTracksError;

  const trackPayload = tracks.map((row, index) => ({
    parent_release_id: parentId,
    child_catalogue_type: row.child_catalogue_type,
    child_catalogue_id: row.child_catalogue_id,
    track_order: Number(row.track_order) > 0 ? Number(row.track_order) : (index + 1)
  }));
  const { error: insertTracksError } = await db.from('parent_release_tracks').insert(trackPayload);
  if (insertTracksError) throw insertTracksError;

  const normalizedParent = normalizeParentReleaseRow(updatedParent);
  parentReleaseCache = [normalizedParent].concat(parentReleaseCache.filter((row) => row.id !== normalizedParent.id));
  return normalizedParent;
}

export async function deleteParentRelease(parentReleaseId) {
  const parentId = normalizeText(parentReleaseId);
  if (!parentId) throw new Error('Missing parent release id.');
  const db = getSupabaseClient();
  const { error: deleteParentError } = await db
    .from('parent_releases')
    .delete()
    .eq('id', parentId);
  if (deleteParentError) throw deleteParentError;
  parentReleaseCache = parentReleaseCache.filter((row) => row.id !== parentId);
  return parentId;
}

export async function createLabelCatalogueRow(values) {
  const db = getSupabaseClient();
  const payload = {
    artist: normalizeText(values && values.artist),
    track_title: normalizeText(values && values.track_title),
    version: normalizeText(values && values.version) || null,
    release_title: normalizeText(values && values.release_title) || null,
    isrc: normalizeText(values && values.isrc) || null
  };
  const { data, error } = await db
    .from('label_catalogue')
    .insert(payload)
    .select('id, artist, track_title, version, release_title, isrc')
    .single();
  if (error) throw error;
  const normalized = normalizeLabelRow(data || payload);
  labelCatalogueCache = [normalized].concat(labelCatalogueCache.filter((row) => row.id !== normalized.id));
  return normalized;
}

export async function createPublishingCatalogueRow(values) {
  const db = getSupabaseClient();
  const payload = {
    work_title: normalizeText(values && values.work_title),
    writers: normalizeText(values && values.writers) || null,
    tempo_id: normalizeText(values && values.tempo_id) || null,
    iswc: normalizeText(values && values.iswc) || null
  };
  const { data, error } = await db
    .from('publishing_catalogue')
    .insert(payload)
    .select('id, work_title, writers, tempo_id, iswc')
    .single();
  if (error) throw error;
  const normalized = normalizePublishingRow(data || payload);
  publishingCatalogueCache = [normalized].concat(publishingCatalogueCache.filter((row) => row.id !== normalized.id));
  return normalized;
}

export async function updateLabelCatalogueRow(id, values) {
  const rowId = normalizeText(id);
  if (!rowId) throw new Error('Missing label catalogue row id.');
  const db = getSupabaseClient();
  console.log('[Catalogue Edit] Updating label row id:', rowId);
  const payload = {
    artist: normalizeText(values && values.artist),
    track_title: normalizeText(values && values.track_title),
    version: normalizeText(values && values.version) || null,
    release_title: normalizeText(values && values.release_title) || null,
    isrc: normalizeText(values && values.isrc) || null
  };
  const { data, error } = await db
    .from('label_catalogue')
    .update(payload)
    .eq('id', rowId)
    .select('id, artist, track_title, version, release_title, isrc');
  if (error) throw error;
  if (!Array.isArray(data) || !data.length) throw new Error('Label catalogue update failed.');
  const freshRows = await fetchLabelCatalogue();
  return freshRows.find((row) => row.id === rowId) || normalizeLabelRow(data[0]);
}

export async function updatePublishingCatalogueRow(id, values) {
  const rowId = normalizeText(id);
  if (!rowId) throw new Error('Missing publishing catalogue row id.');
  const db = getSupabaseClient();
  console.log('[Catalogue Edit] Updating publishing row id:', rowId);
  const payload = {
    work_title: normalizeText(values && values.work_title),
    writers: normalizeText(values && values.writers) || null,
    tempo_id: normalizeText(values && values.tempo_id) || null,
    iswc: normalizeText(values && values.iswc) || null
  };
  const { data, error } = await db
    .from('publishing_catalogue')
    .update(payload)
    .eq('id', rowId)
    .select('id, work_title, writers, tempo_id, iswc');
  if (error) throw error;
  if (!Array.isArray(data) || !data.length) throw new Error('Publishing catalogue update failed.');
  const freshRows = await fetchPublishingCatalogue();
  return freshRows.find((row) => row.id === rowId) || normalizePublishingRow(data[0]);
}

export async function deleteLabelCatalogueRows(ids) {
  const rowIds = Array.from(ids || []).map((id) => normalizeText(id)).filter(Boolean);
  if (!rowIds.length) return 0;
  const db = getSupabaseClient();
  const query = rowIds.length === 1
    ? db.from('label_catalogue').delete().eq('id', rowIds[0])
    : db.from('label_catalogue').delete().in('id', rowIds);
  const { error } = await query;
  if (error) {
    console.error('[Catalogue Delete] label_catalogue delete failed:', error);
    throw error;
  }
  labelCatalogueCache = labelCatalogueCache.filter((row) => !rowIds.includes(row.id));
  return rowIds.length;
}

export async function deletePublishingCatalogueRows(ids) {
  const rowIds = Array.from(ids || []).map((id) => normalizeText(id)).filter(Boolean);
  if (!rowIds.length) return 0;
  const db = getSupabaseClient();
  const query = rowIds.length === 1
    ? db.from('publishing_catalogue').delete().eq('id', rowIds[0])
    : db.from('publishing_catalogue').delete().in('id', rowIds);
  const { error } = await query;
  if (error) {
    console.error('[Catalogue Delete] publishing_catalogue delete failed:', error);
    throw error;
  }
  publishingCatalogueCache = publishingCatalogueCache.filter((row) => !rowIds.includes(row.id));
  return rowIds.length;
}

export function getCataloguePipelineLinks() {
  return readStorageArray(PIPELINE_LINKS_STORAGE_KEY).map((row) => ({
    id: normalizeText(row.id || row.release_id),
    release_id: normalizeText(row.release_id),
    catalogue_id: normalizeText(row.catalogue_id),
    catalogue_type: normalizeText(row.catalogue_type),
    status: normalizeText(row.status) || 'New'
  })).filter((row) => row.catalogue_id && row.catalogue_type && (row.id || row.release_id));
}

export async function fetchCataloguePipelineLinks() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('catalogue_pipeline_links')
    .select('id, catalogue_id, catalogue_type, status')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data || []).map((row) => ({
    id: normalizeText(row.id || row.release_id),
    release_id: normalizeText(row.release_id),
    catalogue_id: normalizeText(row.catalogue_id),
    catalogue_type: normalizeText(row.catalogue_type),
    status: normalizeText(row.status) || 'New'
  })).filter((row) => row.catalogue_id && row.catalogue_type && row.id);
  writeStorageArray(PIPELINE_LINKS_STORAGE_KEY, rows);
  return rows;
}

export function saveCataloguePipelineLink(link) {
  const next = getCataloguePipelineLinks();
  const requestedType = normalizeText(link.catalogue_type).toLowerCase();
  const catalogueType = requestedType === 'publishing' ? 'publishing' : (requestedType === 'parent' ? 'parent' : 'label');
  const catalogueId = normalizeText(link.catalogue_id);
  const normalized = {
    id: normalizeText(link.id) || `catalogue:${catalogueType}:${catalogueId}`,
    release_id: normalizeText(link.release_id),
    catalogue_id: catalogueId,
    catalogue_type: catalogueType,
    status: normalizeText(link.status) || 'New'
  };
  const existingIndex = next.findIndex((row) => (
    row.id === normalized.id
    || (row.catalogue_id === normalized.catalogue_id && row.catalogue_type === normalized.catalogue_type)
    || (normalized.release_id && row.release_id === normalized.release_id)
  ));
  if (existingIndex >= 0) next[existingIndex] = normalized;
  else next.push(normalized);
  writeStorageArray(PIPELINE_LINKS_STORAGE_KEY, next);
}

export function hasPipelineLink(catalogueType, catalogueId) {
  return getCataloguePipelineLinks().some((row) => row.catalogue_type === catalogueType && row.catalogue_id === catalogueId);
}

export function getCatalogueRow(catalogueType, catalogueId) {
  const requestedType = normalizeText(catalogueType).toLowerCase();
  const normalizedType = requestedType === 'publishing' ? 'publishing' : (requestedType === 'parent' ? 'parent' : 'label');
  const normalizedId = normalizeText(catalogueId);
  const rows = normalizedType === 'publishing' ? publishingCatalogueCache : (normalizedType === 'parent' ? parentReleaseCache : labelCatalogueCache);
  return rows.find((row) => row.id === normalizedId) || null;
}

export async function createCataloguePipelineEntry(catalogueType, catalogueId, status = 'New', sourceRow = null) {
  const requestedType = normalizeText(catalogueType).toLowerCase();
  const normalizedType = requestedType === 'publishing' ? 'publishing' : (requestedType === 'parent' ? 'parent' : 'label');
  const normalizedId = normalizeText(catalogueId);
  if (!normalizedId) throw new Error('Missing catalogue id.');
  const resolvedSource = sourceRow || getCatalogueRow(normalizedType, normalizedId);
  if (!resolvedSource) {
    console.warn('[Catalogue → Pipeline] Blocked reference entry because catalogue data is missing.', {
      catalogue_type: normalizedType,
      catalogue_id: normalizedId
    });
    throw new Error('Missing catalogue data');
  }
  const db = getSupabaseClient();
  const nextStatus = normalizeText(status) || 'New';
  const { data: existing, error: existingError } = await db
    .from('catalogue_pipeline_links')
    .select('id, catalogue_id, catalogue_type, status')
    .eq('catalogue_id', normalizedId)
    .eq('catalogue_type', normalizedType)
    .maybeSingle();
  if (existingError) {
    console.error('[Catalogue → Pipeline] Failed to check existing entry:', existingError);
    throw existingError;
  }
  if (existing) {
    await fetchCataloguePipelineLinks();
    return {
      id: normalizeText(existing.id),
      catalogue_id: normalizeText(existing.catalogue_id),
      catalogue_type: normalizeText(existing.catalogue_type),
      status: normalizeText(existing.status) || 'New'
    };
  }
  const payload = {
    catalogue_id: normalizedId,
    catalogue_type: normalizedType,
    status: nextStatus
  };
  const { data: inserted, error } = await db
    .from('catalogue_pipeline_links')
    .insert(payload)
    .select('id, catalogue_id, catalogue_type, status')
    .single();
  if (error) {
    console.error('[Catalogue → Pipeline] Insert failed:', error);
    throw error;
  }
  await fetchCataloguePipelineLinks();
  return {
    id: normalizeText(inserted && inserted.id),
    catalogue_id: normalizeText(inserted && inserted.catalogue_id),
    catalogue_type: normalizeText(inserted && inserted.catalogue_type),
    status: normalizeText(inserted && inserted.status) || 'New'
  };
}

export async function deleteCataloguePipelineEntries(ids) {
  const rowIds = Array.from(ids || []).map((id) => normalizeText(id)).filter(Boolean);
  if (!rowIds.length) return 0;
  const db = getSupabaseClient();
  const query = rowIds.length === 1
    ? db.from('catalogue_pipeline_links').delete().eq('id', rowIds[0])
    : db.from('catalogue_pipeline_links').delete().in('id', rowIds);
  const { error } = await query;
  if (error) throw error;
  await fetchCataloguePipelineLinks();
  return rowIds.length;
}
