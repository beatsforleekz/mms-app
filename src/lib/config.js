export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mzzwkqquvrupxagfsnqm.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_50qTJH-gY--FKXu4babiog_WI1iMJ5k';

export const LEGACY_SECTION_PATH = '/legacy/index_v38.html';

export const ROUTE_META = {
  '/dashboard': { title: 'Dashboard', subtitle: "Today's actions, overdue items, what needs follow up, and upcoming deadlines." },
  '/releases': { title: 'Release Pipeline', subtitle: 'Full release tracking with dedicated release record views.' },
  '/catalogues': { title: 'Catalogues', subtitle: 'Structured catalogue views for label and publishing records.' },
  '/assets': { title: 'Assets Checklist', subtitle: 'Per-release asset checklist and linked delivery status.' },
  '/contracts': { title: 'Contracts', subtitle: 'Contract records, payees, royalty participation, and file links.' },
  '/workflow': { title: 'Workflow Suite', subtitle: 'Release workflow tracker from track pick through promo.' },
  '/actions': { title: 'Actions', subtitle: 'Operational task tracking ordered for day-to-day use.' },
  '/statements': { title: 'Statements', subtitle: 'Statement tracking, imports, and local storage workflows.' },
  '/contract-generator': { title: 'Doc Generator', subtitle: 'Plain-text document generation with reusable templates.' },
  '/help': { title: 'Help', subtitle: 'A simple guide to using the app in the right workflow order.' },
  '/settings': { title: 'Settings', subtitle: 'Account access and basic security controls.' }
};

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/actions', label: 'Actions' },
  { href: '/workflow', label: 'Workflow Suite' },
  { href: '/releases', label: 'Release Pipeline' },
  { href: '/assets', label: 'Assets Checklist' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/qa', label: 'Quality Assurance' },
  { href: '/statements', label: 'Statements' },
  { href: '/contract-generator', label: 'Contract Generator' },
  { href: '/catalogues', label: 'Catalogues' },
  { href: '/help', label: 'Help' },
  { href: '/settings', label: 'Settings' }
];
