import { getSupabaseClient } from '@/lib/supabase/client';
import { actionTodayBool } from '@/lib/utils/format';

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeVisibility(value) {
  return normalizeText(value).toLowerCase() === 'personal' ? 'Personal' : 'Shared';
}

function normalizeStatus(value) {
  const raw = normalizeText(value);
  if (!raw) return 'open';
  return raw === 'Chase' ? 'Chase' : raw.toLowerCase();
}

function normalizeActionRow(row) {
  return {
    id: normalizeText(row?.id),
    title: normalizeText(row?.title),
    related_to: normalizeText(row?.related_to),
    reference_name: normalizeText(row?.reference_name),
    notes: normalizeText(row?.notes),
    due_date: normalizeText(row?.due_date),
    priority: normalizeText(row?.priority),
    to_do_today: actionTodayBool(row?.to_do_today),
    status: normalizeStatus(row?.status),
    completed_date: normalizeText(row?.completed_date),
    release_id: normalizeText(row?.release_id),
    visibility: normalizeVisibility(row?.visibility),
    owner_user_id: normalizeText(row?.owner_user_id)
  };
}

export async function fetchCurrentUserId() {
  const db = getSupabaseClient();
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  return normalizeText(data?.user?.id);
}

export async function fetchActions() {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('actions')
    .select('id,title,related_to,reference_name,notes,due_date,priority,to_do_today,status,completed_date,release_id,visibility,owner_user_id')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeActionRow);
}

export async function createAction(payload) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('actions')
    .insert({
      title: normalizeText(payload?.title),
      related_to: normalizeText(payload?.related_to) || null,
      reference_name: normalizeText(payload?.reference_name) || null,
      notes: normalizeText(payload?.notes) || null,
      due_date: normalizeText(payload?.due_date) || null,
      priority: normalizeText(payload?.priority) || null,
      to_do_today: actionTodayBool(payload?.to_do_today),
      status: normalizeStatus(payload?.status) || 'open',
      completed_date: normalizeText(payload?.completed_date) || null,
      release_id: normalizeText(payload?.release_id) || null,
      visibility: normalizeVisibility(payload?.visibility),
      owner_user_id: normalizeVisibility(payload?.visibility) === 'Personal' ? (normalizeText(payload?.owner_user_id) || null) : null
    })
    .select('id,title,related_to,reference_name,notes,due_date,priority,to_do_today,status,completed_date,release_id,visibility,owner_user_id')
    .single();
  if (error) throw error;
  return normalizeActionRow(data);
}

export async function updateAction(actionId, payload) {
  const db = getSupabaseClient();
  const id = normalizeText(actionId);
  if (!id) throw new Error('Missing action id.');
  const { data, error } = await db
    .from('actions')
    .update({
      title: normalizeText(payload?.title),
      related_to: normalizeText(payload?.related_to) || null,
      reference_name: normalizeText(payload?.reference_name) || null,
      notes: normalizeText(payload?.notes) || null,
      due_date: normalizeText(payload?.due_date) || null,
      priority: normalizeText(payload?.priority) || null,
      to_do_today: actionTodayBool(payload?.to_do_today),
      status: normalizeStatus(payload?.status) || 'open',
      completed_date: normalizeText(payload?.completed_date) || null,
      release_id: normalizeText(payload?.release_id) || null,
      visibility: normalizeVisibility(payload?.visibility),
      owner_user_id: normalizeVisibility(payload?.visibility) === 'Personal' ? (normalizeText(payload?.owner_user_id) || null) : null
    })
    .eq('id', id)
    .select('id,title,related_to,reference_name,notes,due_date,priority,to_do_today,status,completed_date,release_id,visibility,owner_user_id')
    .single();
  if (error) throw error;
  return normalizeActionRow(data);
}

export async function deleteAction(actionId) {
  const db = getSupabaseClient();
  const id = normalizeText(actionId);
  if (!id) throw new Error('Missing action id.');
  const { error } = await db.from('actions').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleActionDone(action) {
  const isDone = normalizeStatus(action?.status) === 'done';
  return updateAction(action?.id, {
    ...action,
    status: isDone ? 'open' : 'done',
    completed_date: isDone ? '' : new Date().toISOString().slice(0, 10)
  });
}
