const STATEMENTS_STORAGE_KEY = 'leah_statements';

function normalizeStatementEntry(entry) {
  const normalized = { ...(entry || {}) };
  normalized.payee = String(normalized.payee || '').trim();
  normalized.type = normalized.type === 'Publishing' ? 'Publishing' : 'Master';
  normalized.period = String(normalized.period || '').trim();
  normalized.balance = Number.isFinite(parseFloat(normalized.balance)) ? parseFloat(normalized.balance) : 0;
  normalized.lastPayment = Number.isFinite(parseFloat(normalized.lastPayment)) ? parseFloat(normalized.lastPayment) : 0;
  normalized.emailSent = !!normalized.emailSent;
  normalized.contractNo = String(normalized.contractNo || '').trim();
  normalized.notes = String(normalized.notes || '').trim();
  return normalized;
}

export function getStatementEntries() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(STATEMENTS_STORAGE_KEY) || '[]');
    const entries = Array.isArray(raw)
      ? raw
      : Array.isArray(raw && raw.entries)
        ? raw.entries
        : Array.isArray(raw && raw.statements)
          ? raw.statements
          : [];
    return entries.map(normalizeStatementEntry);
  } catch (err) {
    return [];
  }
}

export function filterStatementsByPayees(payeeNames) {
  const lowered = new Set(Array.from(payeeNames || []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
  return getStatementEntries().filter((entry) => lowered.has(String(entry && entry.payee || '').trim().toLowerCase()));
}
