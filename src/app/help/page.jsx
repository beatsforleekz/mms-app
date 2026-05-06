import ScreenHeader from '@/components/ScreenHeader';

function HelpSection({ title, children }) {
  return (
    <section className="module-card">
      <div className="module-card-head">
        <h3>{title}</h3>
      </div>
      <div className="help-section-body">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <section className="screen">
      <ScreenHeader title="Help" subtitle="Operational guide for the current MMS workflow." />

      <div className="screen-grid">
        <HelpSection title="Release Pipeline">
          <p>Use Release Pipeline as the release-level command view.</p>
          <ul className="help-list">
            <li>Create or open releases from catalogue links.</li>
            <li>Use status and completion chips to spot blockers quickly.</li>
            <li>Open the release detail when you need contract/action/statement context together.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Workflow Suite">
          <p>Workflow Suite tracks operational steps for each release from track pick to promo.</p>
          <ul className="help-list">
            <li>Select a release first, then update step status, due date, and notes.</li>
            <li>Use status values consistently: Not Started, In Progress, Done, Blocked.</li>
            <li>Save Workflow persists the current release steps.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Assets Checklist">
          <p>Assets Checklist confirms required deliverables are received.</p>
          <ul className="help-list">
            <li>Legal covers contracts and legal docs.</li>
            <li>Onboarding covers artist-facing setup materials.</li>
            <li>Upload covers Traxsource, Beatport, and DSP delivery checks.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Contracts">
          <p>Contracts stores agreement records and receiving parties used for royalty operations.</p>
          <ul className="help-list">
            <li>Keep linked releases accurate for dashboard and pipeline visibility.</li>
            <li>Signed contracts directly impact release readiness views.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Doc Generator">
          <p>Doc Generator is template-driven for repeatable legal/commercial documents.</p>
          <ul className="help-list">
            <li>Select document type, then template, then fill variables.</li>
            <li>Use generated output for operational draft/final workflows.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Statements Relationship">
          <p>Statements track balances and communication status. Contract receiving parties feed statement and release oversight.</p>
          <ul className="help-list">
            <li>Use Statements for financial follow-up and payment status.</li>
            <li>Use Dashboard to surface statement items that need attention.</li>
          </ul>
        </HelpSection>
      </div>
    </section>
  );
}
