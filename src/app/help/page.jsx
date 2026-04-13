import ScreenHeader from '@/components/ScreenHeader';

function HelpSection({ title, children }) {
  return (
    <section className="module-card">
      <div className="module-card-head">
        <h3>{title}</h3>
      </div>
      <div className="help-section-body">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <section className="screen">
      <ScreenHeader
        title="Help"
        subtitle="A simple guide for using the app in the right order."
      />

      <div className="screen-grid">
        <HelpSection title="1) Overview">
          <p>This app helps you manage catalogue records, contracts, release progress, assets, tasks, and documents in one place.</p>
          <p>The usual workflow is: Catalogue → Contracts → Release Pipeline → Actions → Documents.</p>
          <p>In simple terms, you start by adding the song or work, then link the contract, move it through the release pipeline, track delivery items, manage day-to-day tasks, and generate documents when needed.</p>
        </HelpSection>

        <HelpSection title="2) Step-by-step workflow">
          <div className="help-steps">
            <div className="help-step">
              <h4>Step 1: Catalogue</h4>
              <p>The catalogue is the master list of what exists in the system.</p>
              <p>Add items manually or import them in bulk.</p>
              <p>Label Catalogue is for release recordings. Publishing Catalogue is for works and writer information.</p>
            </div>

            <div className="help-step">
              <h4>Step 2: Contracts</h4>
              <p>Create a contract record when an agreement is in place or being prepared.</p>
              <p>Link the correct catalogue items so the contract is connected to the right release or work.</p>
              <p>Templates are reusable document setups. You choose a template, complete the fields it asks for, and use that to generate the document.</p>
            </div>

            <div className="help-step">
              <h4>Step 3: Release Pipeline</h4>
              <p>Start a new release from a catalogue item. The pipeline is the working view for tracking release progress.</p>
              <p>Status meanings:</p>
              <ul className="help-list">
                <li><strong>New</strong>: the release has been created in the pipeline but work has not started.</li>
                <li><strong>Signed</strong>: contracts are signed and the release is cleared to move forward.</li>
                <li><strong>In Progress</strong>: active work is underway.</li>
                <li><strong>Delivered</strong>: required items have been delivered.</li>
                <li><strong>Released</strong>: the release is complete and live.</li>
              </ul>
              <p>Completion indicators show what has been finished and what still needs attention.</p>
            </div>

            <div className="help-step">
              <h4>Step 4: Assets / Tracking</h4>
              <p>Assets are the delivery items tied to a release, such as artwork, audio files, versions, and links.</p>
              <p>Completion shows how many required items are done compared with the total expected items.</p>
            </div>

            <div className="help-step">
              <h4>Step 5: Actions</h4>
              <p>Add tasks for the day-to-day work that needs doing.</p>
              <p><strong>Shared</strong> tasks are visible to everyone. <strong>Personal</strong> tasks are only for the person who created them.</p>
              <p>The <strong>Today</strong> marker is controlled by the Today checkbox. It is used to highlight what needs focus today.</p>
              <p>When a task is finished, mark it as done.</p>
            </div>

            <div className="help-step">
              <h4>Step 6: Doc Generator</h4>
              <p>Select a template, then complete the fields shown for that template.</p>
              <p>Each field feeds into the matching placeholders in the document.</p>
              <p>When you generate the document, the template text is filled with the values you entered.</p>
            </div>
          </div>
        </HelpSection>

        <HelpSection title="3) Key rules / logic">
          <ul className="help-list">
            <li>Work should not begin until contracts are signed.</li>
            <li>The Release Pipeline tracks progress of releases, not daily tasks.</li>
            <li>Actions are for day-to-day tasks and follow-up work.</li>
          </ul>
        </HelpSection>

        <HelpSection title="4) Keep it simple">
          <ul className="help-list">
            <li>Start with Catalogue.</li>
            <li>Link Contracts before moving work forward.</li>
            <li>Use Release Pipeline to track overall progress.</li>
            <li>Use Assets Checklist to track delivery items.</li>
            <li>Use Actions for operational follow-up.</li>
            <li>Use Doc Generator when you need a document from a template.</li>
          </ul>
        </HelpSection>
      </div>
    </section>
  );
}
