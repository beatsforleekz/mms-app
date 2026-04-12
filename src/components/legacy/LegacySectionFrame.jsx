'use client';

import { LEGACY_SECTION_PATH } from '@/lib/config';

export default function LegacySectionFrame({ section }) {
  const src = `${LEGACY_SECTION_PATH}?embed=1&section=${encodeURIComponent(section)}`;
  return (
    <section className="screen">
      <iframe className="legacy-frame" src={src} title={section} />
    </section>
  );
}
