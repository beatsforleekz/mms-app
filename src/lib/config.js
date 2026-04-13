export const SUPABASE_URL = 'https://mzzwkqquvrupxagfsnqm.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_50qTJH-gY--FKXu4babiog_WI1iMJ5k';

export const LEGACY_SECTION_PATH = '/legacy/index_v38.html';

export const ROUTE_META = {
  '/dashboard': { title: 'Dashboard', subtitle: "Today's actions, overdue items, what needs chasing, and upcoming deadlines." },
  '/releases': { title: 'Release Pipeline', subtitle: 'Full release tracking with dedicated release record views.' },
  '/catalogues': { title: 'Catalogues', subtitle: 'Structured catalogue views for label and publishing records.' },
  '/assets': { title: 'Assets Checklist', subtitle: 'Per-release asset checklist and linked delivery status.' },
  '/contracts': { title: 'Contracts', subtitle: 'Contract records, payees, royalty participation, and file links.' },
  '/payees': { title: 'Payees', subtitle: 'Reusable payee records shared across contracts and statements.' },
  '/actions': { title: 'Actions', subtitle: 'Operational task tracking ordered for day-to-day use.' },
  '/statements': { title: 'Statements', subtitle: 'Statement tracking, imports, and local storage workflows.' },
  '/contract-generator': { title: 'Doc Generator', subtitle: 'Plain-text document generation with reusable templates.' },
  '/settings': { title: 'Settings', subtitle: 'Account access and basic security controls.' }
};

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/releases', label: 'Release Pipeline' },
  { href: '/catalogues', label: 'Catalogues' },
  { href: '/assets', label: 'Assets Checklist' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/payees', label: 'Payees' },
  { href: '/actions', label: 'Actions' },
  { href: '/statements', label: 'Statements' },
  { href: '/contract-generator', label: 'Doc Generator' },
  { href: '/settings', label: 'Settings' }
];
