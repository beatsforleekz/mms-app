'use client';

import { LEGACY_SECTION_PATH, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';

export default function LegacySectionFrame({ section }) {
  const params = new URLSearchParams({
    embed: '1',
    section: String(section),
    supabase_url: SUPABASE_URL,
    supabase_anon_key: SUPABASE_ANON_KEY
  });
  const src = `${LEGACY_SECTION_PATH}?${params.toString()}`;
  return (
    <section className="screen">
      <iframe className="legacy-frame" src={src} title={section} />
    </section>
  );
}
