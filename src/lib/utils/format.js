export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMoney(amount, type) {
  const value = Number.isFinite(parseFloat(amount)) ? parseFloat(amount) : 0;
  return `${type === 'Publishing' ? '€' : '£'}${value.toFixed(2)}`;
}

export function actionTodayBool(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  return v === true || v === 1 || s === '1' || s === 'true' || s === 't' || s === 'yes';
}

export function priorityRank(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'high') return 0;
  if (p === 'medium') return 1;
  if (p === 'low') return 2;
  return 3;
}

export function compareActions(a, b) {
  const aToday = actionTodayBool(a && a.to_do_today) ? 0 : 1;
  const bToday = actionTodayBool(b && b.to_do_today) ? 0 : 1;
  if (aToday !== bToday) return aToday - bToday;

  const aDue = a && a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
  const bDue = b && b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;

  const pDiff = priorityRank(a && a.priority) - priorityRank(b && b.priority);
  if (pDiff !== 0) return pDiff;

  return String((a && a.title) || '').localeCompare(String((b && b.title) || ''));
}
