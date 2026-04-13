'use client';

import { useEffect, useMemo, useState } from 'react';
import ScreenHeader from '@/components/ScreenHeader';
import { createAction, deleteAction, fetchActions, fetchCurrentUserId, toggleActionDone, updateAction } from '@/lib/services/actions';
import { fetchReleases } from '@/lib/services/releases';
import { actionTodayBool, compareActions, formatDate } from '@/lib/utils/format';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'Chase', label: 'Chase' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' }
];

const GROUPS = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'Chase', label: 'Chase' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' }
];

function visibilityValue(value) {
  return String(value || '').toLowerCase() === 'personal' ? 'Personal' : 'Shared';
}

function priorityClass(priority) {
  const value = String(priority || '').toLowerCase();
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  if (value === 'low') return 'low';
  return '';
}

function statusLabel(status) {
  const found = STATUS_OPTIONS.find((option) => option.value === status);
  return found ? found.label : (status || 'Open');
}

function statusClass(status) {
  if (status === 'done') return 'done';
  if (status === 'Chase') return 'chase';
  return 'open';
}

function releaseLabelForId(releases, releaseId) {
  const found = releases.find((release) => String(release.id) === String(releaseId));
  if (!found) return '';
  const bits = [found.artist || '', found.title || ''].filter(Boolean);
  return bits.join(' — ');
}

function emptyQuickAdd() {
  return {
    title: '',
    release_id: '',
    visibility: 'Shared',
    status: 'open',
    due_date: '',
    to_do_today: false
  };
}

function emptyEditor() {
  return {
    id: '',
    title: '',
    related_to: '',
    reference_name: '',
    release_id: '',
    priority: '',
    status: 'open',
    visibility: 'Shared',
    due_date: '',
    completed_date: '',
    to_do_today: false,
    notes: ''
  };
}

export default function ActionsWorkspace() {
  const [actions, setActions] = useState([]);
  const [releases, setReleases] = useState([]);
  const [userId, setUserId] = useState('');
  const [viewMode, setViewMode] = useState('both');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickAdd, setQuickAdd] = useState(emptyQuickAdd());
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editor, setEditor] = useState(emptyEditor());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [nextActions, nextReleases, nextUserId] = await Promise.all([
          fetchActions(),
          fetchReleases().catch(() => []),
          fetchCurrentUserId().catch(() => '')
        ]);
        if (!active) return;
        setActions(nextActions);
        setReleases(nextReleases);
        setUserId(nextUserId);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Failed to load actions.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const visibleActions = useMemo(() => {
    return actions
      .filter((action) => {
        const visibility = visibilityValue(action.visibility);
        if (viewMode === 'shared') return visibility === 'Shared';
        if (viewMode === 'mine') return visibility === 'Personal' && String(action.owner_user_id || '') === String(userId || '');
        return visibility === 'Shared' || String(action.owner_user_id || '') === String(userId || '');
      })
      .slice()
      .sort(compareActions);
  }, [actions, userId, viewMode]);

  const groupedActions = useMemo(() => {
    return GROUPS.map((group) => ({
      ...group,
      items: visibleActions.filter((action) => action.status === group.key)
    })).filter((group) => group.items.length);
  }, [visibleActions]);

  const allVisibleSelected = visibleActions.length > 0 && visibleActions.every((action) => selectedIds.has(action.id));

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set();
      visibleActions.forEach((action) => {
        if (prev.has(action.id)) next.add(action.id);
      });
      return next;
    });
  }, [visibleActions]);

  function openEditor(action = null) {
    if (!action) {
      setEditor(emptyEditor());
      setEditorOpen(true);
      return;
    }
    setEditor({
      id: action.id,
      title: action.title || '',
      related_to: action.related_to || '',
      reference_name: action.reference_name || '',
      release_id: action.release_id || '',
      priority: action.priority || '',
      status: action.status || 'open',
      visibility: visibilityValue(action.visibility),
      due_date: action.due_date || '',
      completed_date: action.completed_date || '',
      to_do_today: actionTodayBool(action.to_do_today),
      notes: action.notes || ''
    });
    setEditorOpen(true);
  }

  async function handleQuickAdd() {
    if (!quickAdd.title.trim()) return;
    setAdding(true);
    setError('');
    try {
      const created = await createAction({
        ...quickAdd,
        owner_user_id: quickAdd.visibility === 'Personal' ? userId : null
      });
      setActions((prev) => prev.concat(created));
      setQuickAdd(emptyQuickAdd());
    } catch (err) {
      setError(err?.message || 'Failed to add action.');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEditor() {
    if (!editor.title.trim()) return;
    setEditorSaving(true);
    setError('');
    try {
      const payload = {
        ...editor,
        owner_user_id: editor.visibility === 'Personal' ? userId : null
      };
      const saved = editor.id ? await updateAction(editor.id, payload) : await createAction(payload);
      setActions((prev) => {
        if (!editor.id) return prev.concat(saved);
        return prev.map((item) => item.id === saved.id ? saved : item);
      });
      setEditorOpen(false);
      setEditor(emptyEditor());
    } catch (err) {
      setError(err?.message || 'Failed to save action.');
    } finally {
      setEditorSaving(false);
    }
  }

  async function handleToggleDone(action, event) {
    event.stopPropagation();
    setError('');
    try {
      const updated = await toggleActionDone(action);
      setActions((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err?.message || 'Failed to update action.');
    }
  }

  async function handleDelete(action, event) {
    event.stopPropagation();
    if (!confirm(`Delete "${action.title || 'this action'}"?`)) return;
    setError('');
    try {
      await deleteAction(action.id);
      setActions((prev) => prev.filter((item) => item.id !== action.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    } catch (err) {
      setError(err?.message || 'Failed to delete action.');
    }
  }

  async function handleDeleteSelected() {
    const ids = visibleActions.map((action) => action.id).filter((id) => selectedIds.has(id));
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected action${ids.length === 1 ? '' : 's'}?`)) return;
    setError('');
    try {
      await Promise.all(ids.map((id) => deleteAction(id)));
      setActions((prev) => prev.filter((action) => !ids.includes(action.id)));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to delete selected actions.');
    }
  }

  return (
    <section className="screen">
      <ScreenHeader
        title="Actions"
        subtitle="Action items with due dates linked to releases. Keep the list readable, compact, and easy to update."
        actions={<button type="button" className="shell-btn shell-btn-primary" onClick={() => openEditor()}>+ New Action</button>}
      />

      <div className="module-card">
        <div className="actions-workspace-pad">
          <div className="actions-head-tools">
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>View:</span>
            <div className="actions-view-toggle">
              <button type="button" className={`shell-btn${viewMode === 'both' ? ' actions-view-active' : ''}`} onClick={() => setViewMode('both')}>Shared + Mine</button>
              <button type="button" className={`shell-btn${viewMode === 'shared' ? ' actions-view-active' : ''}`} onClick={() => setViewMode('shared')}>All Shared</button>
              <button type="button" className={`shell-btn${viewMode === 'mine' ? ' actions-view-active' : ''}`} onClick={() => setViewMode('mine')}>My Tasks</button>
            </div>
            <label className="actions-checkline" style={{ marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedIds(new Set(visibleActions.map((action) => action.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />
              <span>Select All</span>
            </label>
          </div>

          {selectedIds.size ? (
            <div className="actions-head-tools">
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedIds.size} selected</span>
              <button type="button" className="shell-btn" onClick={() => setSelectedIds(new Set())}>Clear Selection</button>
              <button type="button" className="shell-btn" onClick={handleDeleteSelected}>Delete Selected</button>
            </div>
          ) : null}

          <div className="actions-quick-grid">
            <label className="actions-field actions-field-wide">
              <span>Quick Add</span>
              <input value={quickAdd.title} onChange={(event) => setQuickAdd((prev) => ({ ...prev, title: event.target.value }))} placeholder="What needs to happen…" />
            </label>
            <label className="actions-field">
              <span>Release</span>
              <select value={quickAdd.release_id} onChange={(event) => setQuickAdd((prev) => ({ ...prev, release_id: event.target.value }))}>
                <option value="">— release (optional) —</option>
                {releases.map((release) => <option key={release.id} value={release.id}>{releaseLabelForId(releases, release.id) || release.title || release.id}</option>)}
              </select>
            </label>
            <label className="actions-field">
              <span>Task Type</span>
              <select value={quickAdd.visibility} onChange={(event) => setQuickAdd((prev) => ({ ...prev, visibility: event.target.value }))}>
                <option value="Shared">Shared</option>
                <option value="Personal">Personal</option>
              </select>
            </label>
            <label className="actions-field">
              <span>Status</span>
              <select value={quickAdd.status} onChange={(event) => setQuickAdd((prev) => ({ ...prev, status: event.target.value }))}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="actions-field">
              <span>Due Date</span>
              <input type="date" value={quickAdd.due_date} onChange={(event) => setQuickAdd((prev) => ({ ...prev, due_date: event.target.value }))} />
            </label>
            <label className="actions-checkline">
              <input type="checkbox" checked={quickAdd.to_do_today} onChange={(event) => setQuickAdd((prev) => ({ ...prev, to_do_today: event.target.checked }))} />
              <span>Today</span>
            </label>
            <div className="actions-editor-actions">
              <button type="button" className="shell-btn" onClick={handleQuickAdd} disabled={adding}>{adding ? 'Adding…' : '+ Quick Add'}</button>
            </div>
          </div>

          {editorOpen ? (
            <div className="detail-card">
              <div className="detail-card-head">
                <h3>{editor.id ? 'Edit Action' : 'New Action'}</h3>
              </div>
              <div className="actions-workspace-pad">
                <div className="actions-edit-grid">
                  <label className="actions-field actions-field-wide"><span>Action</span><input value={editor.title} onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))} /></label>
                  <label className="actions-field"><span>Related To</span><input value={editor.related_to} onChange={(event) => setEditor((prev) => ({ ...prev, related_to: event.target.value }))} /></label>
                  <label className="actions-field"><span>Reference Name</span><input value={editor.reference_name} onChange={(event) => setEditor((prev) => ({ ...prev, reference_name: event.target.value }))} /></label>
                  <label className="actions-field"><span>Linked Release</span><select value={editor.release_id} onChange={(event) => setEditor((prev) => ({ ...prev, release_id: event.target.value }))}><option value="">— none —</option>{releases.map((release) => <option key={release.id} value={release.id}>{releaseLabelForId(releases, release.id) || release.title || release.id}</option>)}</select></label>
                  <label className="actions-field"><span>Priority</span><select value={editor.priority} onChange={(event) => setEditor((prev) => ({ ...prev, priority: event.target.value }))}><option value="">—</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></label>
                  <label className="actions-field"><span>Status</span><select value={editor.status} onChange={(event) => setEditor((prev) => ({ ...prev, status: event.target.value }))}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="actions-field"><span>Task Type</span><select value={editor.visibility} onChange={(event) => setEditor((prev) => ({ ...prev, visibility: event.target.value }))}><option value="Shared">Shared</option><option value="Personal">Personal</option></select></label>
                  <label className="actions-field"><span>Due Date</span><input type="date" value={editor.due_date} onChange={(event) => setEditor((prev) => ({ ...prev, due_date: event.target.value }))} /></label>
                  <label className="actions-field"><span>Completed Date</span><input type="date" value={editor.completed_date} onChange={(event) => setEditor((prev) => ({ ...prev, completed_date: event.target.value }))} /></label>
                  <label className="actions-checkline"><input type="checkbox" checked={editor.to_do_today} onChange={(event) => setEditor((prev) => ({ ...prev, to_do_today: event.target.checked }))} /><span>Today</span></label>
                  <label className="actions-field actions-field-wide"><span>Notes</span><textarea rows={3} value={editor.notes} onChange={(event) => setEditor((prev) => ({ ...prev, notes: event.target.value }))} /></label>
                </div>
                <div className="actions-editor-actions">
                  <button type="button" className="shell-btn shell-btn-primary" onClick={handleSaveEditor} disabled={editorSaving}>{editorSaving ? 'Saving…' : 'Save Action'}</button>
                  <button type="button" className="shell-btn" onClick={() => { setEditorOpen(false); setEditor(emptyEditor()); }} disabled={editorSaving}>Cancel</button>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className="empty-block">{error}</div> : null}
          {loading ? <div className="loading-block">Loading actions…</div> : null}
          {!loading && !groupedActions.length ? <div className="empty-block">No actions yet.</div> : null}

          {!loading && groupedActions.length ? (
            <div className="actions-list">
              {groupedActions.map((group) => (
                <div className="actions-group" key={group.key}>
                  <div className="actions-group-head">{group.label}</div>
                  {group.items.map((action) => {
                    const releaseLabel = releaseLabelForId(releases, action.release_id);
                    const meta = [action.related_to, action.reference_name, releaseLabel].filter(Boolean).join(' · ');
                    const isDone = action.status === 'done';
                    return (
                      <div className={`actions-row${isDone ? ' is-done' : ''}`} key={action.id}>
                        <div className="actions-select-cell">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(action.id)}
                            onChange={(event) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) next.add(action.id);
                                else next.delete(action.id);
                                return next;
                              });
                            }}
                          />
                        </div>
                        <div className="actions-title-cell">
                          <div className="actions-title-topline">
                            {actionTodayBool(action.to_do_today) ? <span className="actions-today-flag">TODAY</span> : null}
                            <div className="actions-title-line" title={action.title || '—'}>{action.title || '—'}</div>
                          </div>
                          <div className="actions-meta-line" title={meta || ''}>{meta || '—'}</div>
                        </div>
                        <div className="actions-marker-cell">
                          <span className={`actions-marker ${visibilityValue(action.visibility) === 'Personal' ? 'personal' : 'shared'}`}>
                            {visibilityValue(action.visibility) === 'Personal' ? 'PERSONAL' : 'SHARED'}
                          </span>
                        </div>
                        <div className="actions-priority-cell">
                          {action.priority ? <span className={`actions-priority-tag ${priorityClass(action.priority)}`}>{action.priority}</span> : '—'}
                        </div>
                        <div className="actions-due-cell" title={action.due_date ? formatDate(action.due_date) : '—'}>{action.due_date ? formatDate(action.due_date) : '—'}</div>
                        <div className="actions-status-cell"><span className={`actions-badge ${statusClass(action.status)}`}>{statusLabel(action.status)}</span></div>
                        <div className="actions-controls-cell">
                          <button type="button" className={`actions-done-btn${isDone ? '' : ' ready'}`} onClick={(event) => handleToggleDone(action, event)}>{isDone ? 'Reopen' : 'Done'}</button>
                          <button type="button" className="shell-btn" onClick={() => openEditor(action)}>Edit</button>
                          <button type="button" className="shell-btn" onClick={(event) => handleDelete(action, event)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
