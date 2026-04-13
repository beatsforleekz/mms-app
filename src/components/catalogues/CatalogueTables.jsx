'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ScreenHeader from '@/components/ScreenHeader';
import {
  createLabelCatalogueRow,
  createPublishingCatalogueRow,
  createCataloguePipelineEntry,
  deleteLabelCatalogueRows,
  deletePublishingCatalogueRows,
  fetchCataloguePipelineLinks,
  fetchLabelCatalogue,
  fetchPublishingCatalogue,
  hasPipelineLink,
  importMappedCatalogueRows,
  parseCatalogueFilePreview,
  updateLabelCatalogueRow,
  updatePublishingCatalogueRow
} from '@/lib/services/catalogues';

const PAGE_SIZE = 100;

function CatalogueActions({ importType, onTypeChange, onImport, onAddNew, disabled }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className={`shell-btn${importType === 'label' ? ' shell-btn-primary' : ''}`} onClick={() => onTypeChange('label')} disabled={disabled}>
          Label Catalogue
        </button>
        <button type="button" className={`shell-btn${importType === 'publishing' ? ' shell-btn-primary' : ''}`} onClick={() => onTypeChange('publishing')} disabled={disabled}>
          Publishing Catalogue
        </button>
      </div>
      <button type="button" className="shell-btn" onClick={onAddNew} disabled={disabled}>Add New</button>
      <button type="button" className="shell-btn shell-btn-primary" onClick={onImport} disabled={disabled}>
        {disabled ? 'Loading…' : 'Import Catalogue'}
      </button>
    </>
  );
}

function ManualEntryForm({ type, values, onChange, onSave, onCancel, saving, mode }) {
  const fields = type === 'publishing'
    ? [
        ['work_title', 'Work Title *'],
        ['writers', 'Writers'],
        ['tempo_id', 'Tempo ID'],
        ['iswc', 'ISWC']
      ]
    : [
        ['artist', 'Artist *'],
        ['track_title', 'Track Title *'],
        ['version', 'Version'],
        ['release_title', 'Release Title'],
        ['isrc', 'ISRC']
      ];

  return (
    <div className="module-card">
      <div className="module-card-head">
        <h3>{mode === 'edit' ? (type === 'publishing' ? 'Edit Publishing Catalogue Row' : 'Edit Label Catalogue Row') : (type === 'publishing' ? 'Add Publishing Catalogue Row' : 'Add Label Catalogue Row')}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {fields.map(([key, label]) => (
          <label key={key} style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>{label}</span>
            <input
              type="text"
              value={values[key] || ''}
              onChange={(event) => onChange(key, event.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}
            />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button type="button" className="shell-btn shell-btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="shell-btn" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

function ImportPreview({
  importType,
  preview,
  mapping,
  onMappingChange,
  onConfirm,
  onCancel,
  importing
}) {
  const fields = importType === 'publishing'
    ? ['work_title', 'writers', 'tempo_id', 'iswc']
    : ['artist', 'track_title', 'version', 'release_title', 'isrc'];

  return (
    <div className="module-card">
      <div className="module-card-head">
        <h3>Import Preview</h3>
        <span className="count-pill">{preview.parsedCount} rows parsed</span>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="table-wrap">
          <table className="catalogue-table">
            <thead>
              <tr>
                {preview.headers.map((header) => <th key={header}>{header || '—'}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, 20).map((row, index) => (
                <tr key={`preview-${index}`}>
                  {preview.headers.map((header, cellIndex) => <td key={`${header}-${cellIndex}`}>{row[cellIndex] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {fields.map((field) => (
            <label key={field} style={{ display: 'grid', gap: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{field}</span>
              <select className="shell-btn" value={mapping[field] || ''} onChange={(event) => onMappingChange(field, event.target.value)}>
                <option value="">Unmapped</option>
                {preview.headers.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="shell-btn shell-btn-primary" onClick={onConfirm} disabled={importing}>
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button type="button" className="shell-btn" onClick={onCancel} disabled={importing}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CatalogueTable({
  type,
  rows,
  totalRows,
  rangeStart,
  rangeEnd,
  page,
  totalPages,
  linkedIds,
  busyId,
  selectedIds,
  onToggleAll,
  onToggleRow,
  onAdd,
  onEditRow,
  onDeleteRow,
  onDeleteSelected,
  deleting,
  search,
  onSearchChange,
  sortOrder,
  onSortChange,
  onPrevPage,
  onNextPage,
  onExport
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  return (
    <div className="module-card">
      <div className="module-card-head">
        <h3>{type === 'publishing' ? 'Publishing Catalogue' : 'Label Catalogue'}</h3>
        <span className="count-pill">{totalRows}</span>
      </div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={type === 'publishing' ? 'Search title or writer…' : 'Search artist or title…'}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}
        />
        <select className="shell-btn" value={sortOrder} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort catalogue">
          <option value="az">A–Z</option>
          <option value="za">Z–A</option>
          <option value="recent">Recently Added</option>
        </select>
        <button type="button" className="shell-btn" onClick={onExport}>
          Export
        </button>
      </div>
      {selectedIds.size ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedIds.size} selected</span>
          <button type="button" className="shell-btn" onClick={onDeleteSelected} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Selected'}
          </button>
        </div>
      ) : null}
      {rows.length ? (
        <>
          <div className="table-wrap">
            <table className="catalogue-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} aria-label="Select all visible rows" />
                  </th>
                  {type === 'publishing' ? (
                    <>
                      <th>Title</th>
                      <th>Writer</th>
                      <th>Tempo ID</th>
                      <th>ISWC</th>
                    </>
                  ) : (
                    <>
                      <th>Artist</th>
                      <th>Title</th>
                      <th>Version / Mix</th>
                      <th>Release / Project</th>
                      <th>ISRC</th>
                    </>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isLinked = linkedIds.has(row.id);
                  const isBusy = busyId === row.id;
                  return (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={(event) => onToggleRow(row.id, event.target.checked)}
                          aria-label="Select row"
                        />
                      </td>
                      {type === 'publishing' ? (
                        <>
                          <td title={row.work_title || ''}><strong>{row.work_title || '—'}</strong></td>
                          <td title={row.writers || ''}>{row.writers || '—'}</td>
                          <td title={row.tempo_id || ''}>{row.tempo_id || '—'}</td>
                          <td title={row.iswc || ''}>{row.iswc || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td title={row.artist || ''}><strong>{row.artist || '—'}</strong></td>
                          <td title={row.track_title || ''}>{row.track_title || '—'}</td>
                          <td title={row.version || ''}>{row.version || '—'}</td>
                          <td title={row.release_title || ''}>{row.release_title || '—'}</td>
                          <td title={row.isrc || ''}>{row.isrc || '—'}</td>
                        </>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="shell-btn"
                            onClick={() => onAdd(row)}
                            disabled={isLinked || isBusy}
                          >
                            {isBusy ? 'Adding…' : isLinked ? 'Added' : 'Add to Pipeline'}
                          </button>
                          <button
                            type="button"
                            className="shell-btn"
                            onClick={() => onEditRow(row)}
                            disabled={deleting || isBusy}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="shell-btn"
                            onClick={() => onDeleteRow(row.id)}
                            disabled={deleting}
                          >
                            {deleting ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="list-pagination">
            <span className="list-pagination-range">{rangeStart}-{rangeEnd} of {totalRows}</span>
            <div className="list-pagination-actions">
              <button type="button" className="shell-btn" onClick={onPrevPage} disabled={page <= 1}>Previous</button>
              <button type="button" className="shell-btn" onClick={onNextPage} disabled={page >= totalPages}>Next</button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-block">{type === 'publishing' ? 'No publishing catalogue rows imported yet.' : 'No label catalogue rows imported yet.'}</div>
      )}
    </div>
  );
}

export default function CatalogueTables() {
  const inputRef = useRef(null);
  const [activeType, setActiveType] = useState('label');
  const [rows, setRows] = useState([]);
  const [linkedIds, setLinkedIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualValues, setManualValues] = useState({});
  const [editingRowId, setEditingRowId] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (!lowered) return true;
      if (activeType === 'publishing') {
        return `${row.work_title || ''} ${row.writers || ''}`.toLowerCase().includes(lowered);
      }
      return `${row.artist || ''} ${row.track_title || ''}`.toLowerCase().includes(lowered);
    }).slice();
    next.sort((a, b) => {
      if (sortOrder === 'recent') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      const left = activeType === 'publishing' ? (a.work_title || '') : (a.track_title || '');
      const right = activeType === 'publishing' ? (b.work_title || '') : (b.track_title || '');
      const base = left.localeCompare(right, undefined, { sensitivity: 'base' });
      return sortOrder === 'za' ? -base : base;
    });
    return next;
  }, [rows, activeType, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [activeType, search, sortOrder]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const rangeStart = filteredRows.length ? ((page - 1) * PAGE_SIZE) + 1 : 0;
  const rangeEnd = filteredRows.length ? Math.min(page * PAGE_SIZE, filteredRows.length) : 0;

  function exportCsvFile(filenameBase, headers, dataRows) {
    const escapeCell = (value) => {
      const text = String(value == null ? '' : value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...dataRows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = href;
    link.download = `${filenameBase}-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }

  function handleExport() {
    if (activeType === 'publishing') {
      exportCsvFile('publishing-catalogue', ['Title', 'Writer', 'Tempo ID', 'ISWC'], filteredRows.map((row) => [
        row.work_title || '',
        row.writers || '',
        row.tempo_id || '',
        row.iswc || ''
      ]));
      return;
    }
    exportCsvFile('label-catalogue', ['Artist', 'Title', 'Version / Mix', 'Release / Project', 'ISRC'], filteredRows.map((row) => [
      row.artist || '',
      row.track_title || '',
      row.version || '',
      row.release_title || '',
      row.isrc || ''
    ]));
  }

  async function loadActiveCatalogue(type = activeType) {
    setFetching(true);
    try {
      const [nextRows, pipelineLinks] = await Promise.all([
        type === 'publishing' ? fetchPublishingCatalogue() : fetchLabelCatalogue(),
        fetchCataloguePipelineLinks()
      ]);
      setRows(nextRows);
      const linkedLookup = new Set((pipelineLinks || []).filter((row) => row.catalogue_type === type).map((row) => row.catalogue_id));
      setLinkedIds(new Set(nextRows.filter((row) => linkedLookup.has(row.id)).map((row) => row.id)));
      setSelectedIds(new Set());
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    setSearch('');
    setShowAddForm(false);
    setManualValues({});
    setEditingRowId('');
    loadActiveCatalogue(activeType).catch((err) => {
      setError(err.message || 'Failed to load catalogue.');
    });
  }, [activeType]);

  async function handleImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setError('');
    setMessage('');
    try {
      const nextPreview = await parseCatalogueFilePreview(file, activeType);
      setPreview(nextPreview);
      setMapping(nextPreview.mapping || {});
      if (!nextPreview.parsedCount) setError('No rows parsed — check file format');
    } catch (err) {
      setError(err.message || 'Failed to import catalogue.');
    } finally {
      event.target.value = '';
    }
  }

  function handleMappingChange(field, value) {
    setMapping((prev) => ({ ...prev, [field]: value }));
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const result = await importMappedCatalogueRows(activeType, preview.headers, preview.rows, mapping);
      await loadActiveCatalogue(activeType);
      setMessage(`Import successful. Parsed ${result.parsedCount} rows. Imported ${result.insertedCount} rows.`);
      setPreview(null);
      setMapping({});
    } catch (err) {
      setError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  function handleCancelImport() {
    setPreview(null);
    setMapping({});
    setError('');
  }

  function handleManualChange(field, value) {
    setManualValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveManual() {
    setError('');
    setMessage('');
    setSavingManual(true);
    try {
      if (editingRowId) {
        if (activeType === 'publishing') {
          if (!String(manualValues.work_title || '').trim()) throw new Error('Work Title is required.');
          await updatePublishingCatalogueRow(editingRowId, manualValues);
        } else {
          if (!String(manualValues.artist || '').trim() || !String(manualValues.track_title || '').trim()) throw new Error('Artist and Track Title are required.');
          await updateLabelCatalogueRow(editingRowId, manualValues);
        }
        setMessage('Catalogue row updated.');
      } else {
        if (activeType === 'publishing') {
          if (!String(manualValues.work_title || '').trim()) throw new Error('Work Title is required.');
          await createPublishingCatalogueRow(manualValues);
        } else {
          if (!String(manualValues.artist || '').trim() || !String(manualValues.track_title || '').trim()) throw new Error('Artist and Track Title are required.');
          await createLabelCatalogueRow(manualValues);
        }
        setMessage('Added new catalogue row.');
      }
      await loadActiveCatalogue(activeType);
      setShowAddForm(false);
      setManualValues({});
      setEditingRowId('');
    } catch (err) {
      setError(err.message || 'Failed to save catalogue row.');
    } finally {
      setSavingManual(false);
    }
  }

  function handleOpenAddForm() {
    setError('');
    setMessage('');
    setPreview(null);
    setShowAddForm(true);
    setEditingRowId('');
    setManualValues(activeType === 'publishing'
      ? { work_title: '', writers: '', tempo_id: '', iswc: '' }
      : { artist: '', track_title: '', version: '', release_title: '', isrc: '' });
  }

  function handleOpenEditForm(row) {
    setError('');
    setMessage('');
    setPreview(null);
    setShowAddForm(true);
    setEditingRowId(String(row.id || ''));
    setManualValues(activeType === 'publishing'
      ? {
          work_title: row.work_title || '',
          writers: row.writers || '',
          tempo_id: row.tempo_id || '',
          iswc: row.iswc || ''
        }
      : {
          artist: row.artist || '',
          track_title: row.track_title || '',
          version: row.version || '',
          release_title: row.release_title || '',
          isrc: row.isrc || ''
        });
  }

  async function handleAddToPipeline(row) {
    const rowId = String(row.id || '');
    if (!rowId) return;
    setBusyKey(rowId);
    setError('');
    setMessage('');
    try {
      await createCataloguePipelineEntry(activeType, rowId, 'New', row);
      setLinkedIds((prev) => {
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
      setMessage('Added to Pipeline.');
    } catch (err) {
      setError(err.message || 'Failed to add catalogue row to pipeline.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleDelete(ids) {
    const rowIds = Array.from(ids || []).map(String).filter(Boolean);
    if (!rowIds.length) return;
    if (!confirm(`Delete ${rowIds.length} ${rowIds.length === 1 ? 'row' : 'rows'}?`)) return;
    setError('');
    setMessage('');
    setDeleting(true);
    try {
      const deletedCount = activeType === 'publishing'
        ? await deletePublishingCatalogueRows(rowIds)
        : await deleteLabelCatalogueRows(rowIds);
      await loadActiveCatalogue(activeType);
      setMessage(`Deleted ${deletedCount} rows`);
    } catch (err) {
      console.error('[Catalogue Delete] UI delete failed:', err);
      setError(err.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  function handleToggleAll(checked) {
    setSelectedIds(checked ? new Set(pagedRows.map((row) => row.id)) : new Set());
  }

  function handleToggleRow(id, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <section className="screen">
      <ScreenHeader
        title="Catalogues"
        subtitle="Dedicated catalogue views for label and publishing records."
        actions={<CatalogueActions importType={activeType} onTypeChange={setActiveType} onImport={() => inputRef.current?.click()} onAddNew={handleOpenAddForm} disabled={fetching || importing || deleting || savingManual} />}
      />
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} hidden />
      {fetching ? <div className="module-card"><div className="loading-block">Loading…</div></div> : null}
      {message ? <div className="module-card"><div className="success-note">{message}</div></div> : null}
      {error ? <div className="module-card"><div className="empty-block">{error}</div></div> : null}
      {showAddForm ? (
        <ManualEntryForm
          type={activeType}
          values={manualValues}
          onChange={handleManualChange}
          onSave={handleSaveManual}
          onCancel={() => { setShowAddForm(false); setManualValues({}); setEditingRowId(''); }}
          saving={savingManual}
          mode={editingRowId ? 'edit' : 'create'}
        />
      ) : null}
      {preview ? (
        <ImportPreview
          importType={activeType}
          preview={preview}
          mapping={mapping}
          onMappingChange={handleMappingChange}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
          importing={importing}
        />
      ) : null}
      <CatalogueTable
        type={activeType}
        rows={pagedRows}
        totalRows={filteredRows.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        page={page}
        totalPages={totalPages}
        linkedIds={linkedIds}
        busyId={busyKey}
        selectedIds={selectedIds}
        onToggleAll={handleToggleAll}
        onToggleRow={handleToggleRow}
        onAdd={handleAddToPipeline}
        onEditRow={handleOpenEditForm}
        onDeleteRow={(id) => handleDelete([id])}
        onDeleteSelected={() => handleDelete(Array.from(selectedIds))}
        deleting={deleting}
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        onExport={handleExport}
      />
    </section>
  );
}
