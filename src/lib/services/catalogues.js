'use client';

import * as XLSX from 'xlsx';
import { getSupabaseClient } from '@/lib/supabase/client';

const PIPELINE_LINKS_STORAGE_KEY = 'catalogue_pipeline_links';

let labelCatalogueCache = [];
let publishingCatalogueCache = [];

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

export async function deleteLabelCatalogueRows(ids) {
  const rowIds = Array.from(ids || []).map((id) => normalizeText(id)).filter(Boolean);
  if (!rowIds.length) return 0;
  const db = getSupabaseClient();
  const { error } = await db.from('label_catalogue').delete().in('id', rowIds);
  if (error) throw error;
  labelCatalogueCache = labelCatalogueCache.filter((row) => !rowIds.includes(row.id));
  return rowIds.length;
}

export async function deletePublishingCatalogueRows(ids) {
  const rowIds = Array.from(ids || []).map((id) => normalizeText(id)).filter(Boolean);
  if (!rowIds.length) return 0;
  const db = getSupabaseClient();
  const { error } = await db.from('publishing_catalogue').delete().in('id', rowIds);
  if (error) throw error;
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

export function saveCataloguePipelineLink(link) {
  const next = getCataloguePipelineLinks();
  const catalogueType = normalizeText(link.catalogue_type).toLowerCase() === 'publishing' ? 'publishing' : 'label';
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
  const normalizedType = normalizeText(catalogueType).toLowerCase() === 'publishing' ? 'publishing' : 'label';
  const normalizedId = normalizeText(catalogueId);
  const rows = normalizedType === 'publishing' ? publishingCatalogueCache : labelCatalogueCache;
  return rows.find((row) => row.id === normalizedId) || null;
}

export function createCataloguePipelineEntry(catalogueType, catalogueId, status = 'New', sourceRow = null) {
  const normalizedType = normalizeText(catalogueType).toLowerCase() === 'publishing' ? 'publishing' : 'label';
  const normalizedId = normalizeText(catalogueId);
  const resolvedSource = sourceRow || getCatalogueRow(normalizedType, normalizedId);
  if (!resolvedSource) {
    console.warn('[Catalogue → Pipeline] Blocked reference entry because catalogue data is missing.', {
      catalogue_type: normalizedType,
      catalogue_id: normalizedId
    });
    throw new Error('Missing catalogue data');
  }
  const entry = {
    id: `catalogue:${normalizedType}:${normalizedId}`,
    catalogue_id: normalizedId,
    catalogue_type: normalizedType,
    status: normalizeText(status) || 'New'
  };
  saveCataloguePipelineLink(entry);
  return entry;
}
