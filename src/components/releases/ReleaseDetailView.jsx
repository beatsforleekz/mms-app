'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ScreenHeader from '@/components/ScreenHeader';
import { fetchActionsByRelease, fetchAssetsByRelease, fetchContractsByRelease, fetchReleaseById } from '@/lib/services/releases';
import { filterStatementsByPayees } from '@/lib/services/statements';
import { compareActions, formatDate, formatMoney } from '@/lib/utils/format';

function collectPayeeNames(contracts) {
  const names = new Set();
  contracts.forEach((contract) => {
    if (contract.parties) {
      String(contract.parties).split(',').map((v) => v.trim()).filter(Boolean).forEach((name) => names.add(name.toLowerCase()));
    }
    if (contract.payees_json) {
      try {
        const rows = JSON.parse(contract.payees_json) || [];
        rows.forEach((row) => {
          const name = String(row && row.name || '').trim().toLowerCase();
          if (name) names.add(name);
        });
      } catch (err) {
        // ignore malformed legacy rows
      }
    }
  });
  return names;
}

function DetailCard({ title, count, children }) {
  return (
    <div className="detail-card">
      <div className="detail-card-head">
        <h3>{title}</h3>
        {typeof count === 'number' ? <span className="count-pill">{count}</span> : null}
      </div>
      {children}
    </div>
  );
}

function DetailList({ items, emptyText, renderItem }) {
  if (!items.length) return <div className="empty-block">{emptyText}</div>;
  return <div className="detail-list">{items.map(renderItem)}</div>;
}

export default function ReleaseDetailView({ releaseId }) {
  const [state, setState] = useState({ loading: true, error: '', release: null, assets: [], contracts: [], actions: [], statements: [] });

  useEffect(() => {
    let active = true;
    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const [release, assets, contracts, actions] = await Promise.all([
          fetchReleaseById(releaseId),
          fetchAssetsByRelease(releaseId),
          fetchContractsByRelease(releaseId),
          fetchActionsByRelease(releaseId)
        ]);
        if (!active) return;
        const statements = filterStatementsByPayees(collectPayeeNames(contracts));
        setState({
          loading: false,
          error: '',
          release,
          assets,
          contracts,
          actions: actions.slice().sort(compareActions),
          statements
        });
      } catch (err) {
        if (!active) return;
        setState({ loading: false, error: err.message || 'Failed to load release.', release: null, assets: [], contracts: [], actions: [], statements: [] });
      }
    }
    if (releaseId) load();
    return () => { active = false; };
  }, [releaseId]);

  if (state.loading) {
    return <section className="screen"><div className="module-card"><div className="loading-block">Loading release…</div></div></section>;
  }

  if (state.error || !state.release) {
    return <section className="screen"><div className="module-card"><div className="empty-block">{state.error || 'Release not found.'}</div></div></section>;
  }

  const { release, assets, contracts, actions, statements } = state;
  const links = assets.filter((asset) => asset.dropbox_url);

  return (
    <section className="screen">
      <ScreenHeader
        title={release.title || 'Release Detail'}
        subtitle={`${release.artist || '—'} · ${release.company_role || '—'}`}
        actions={(
          <>
            <Link href="/releases" className="shell-btn">Back to Pipeline</Link>
            <Link href="/releases" className="shell-btn shell-btn-primary">Open Pipeline</Link>
          </>
        )}
      />

      <div className="detail-layout">
        <DetailCard title="Release Overview">
          <div className="detail-grid">
            <div><span className="detail-label">Title</span><strong>{release.title || '—'}</strong></div>
            <div><span className="detail-label">Artist</span><strong>{release.artist || '—'}</strong></div>
            <div><span className="detail-label">Type</span><strong>{release.type || '—'}</strong></div>
            <div><span className="detail-label">Company Role</span><strong>{release.company_role || '—'}</strong></div>
            <div><span className="detail-label">Status</span><strong>{release.status || '—'}</strong></div>
            <div><span className="detail-label">Release Date</span><strong>{formatDate(release.release_date)}</strong></div>
            <div><span className="detail-label">Owner</span><strong>{release.owner || '—'}</strong></div>
            <div><span className="detail-label">ISRC</span><strong>{release.isrc || '—'}</strong></div>
          </div>
        </DetailCard>

        <DetailCard title="Assets" count={assets.length}>
          <DetailList
            items={assets}
            emptyText="No asset rows linked to this release."
            renderItem={(asset) => (
              <div className="detail-item" key={asset.id}>
                <div>
                  <strong>{asset.asset_title || '—'}</strong>
                  <div className="detail-meta">{asset.area || '—'} · {asset.received ? 'Received' : 'Pending'} · {asset.required === false ? 'Optional' : 'Required'}</div>
                </div>
              </div>
            )}
          />
        </DetailCard>

        <DetailCard title="Links" count={links.length}>
          <DetailList
            items={links}
            emptyText="No linked files or URLs yet."
            renderItem={(asset) => (
              <div className="detail-item" key={asset.id}>
                <div>
                  <strong>{asset.asset_title || '—'}</strong>
                  <div className="detail-meta"><a href={asset.dropbox_url} target="_blank" rel="noopener noreferrer">{asset.dropbox_url}</a></div>
                </div>
              </div>
            )}
          />
        </DetailCard>

        <DetailCard title="Notes">
          <div className="detail-notes">{release.notes || 'No notes recorded for this release.'}</div>
        </DetailCard>

        <DetailCard title="Contracts" count={contracts.length}>
          <DetailList
            items={contracts}
            emptyText="No contracts linked to this release."
            renderItem={(contract) => (
              <div className="detail-item" key={contract.id}>
                <div>
                  <strong>{contract.title || '—'}</strong>
                  <div className="detail-meta">{contract.contract_type || '—'} · {contract.status || '—'} · Sent {formatDate(contract.date_sent)}</div>
                </div>
              </div>
            )}
          />
        </DetailCard>

        <DetailCard title="Actions" count={actions.length}>
          <DetailList
            items={actions}
            emptyText="No actions linked to this release."
            renderItem={(action) => (
              <div className="detail-item" key={action.id}>
                <div>
                  <strong>{action.title || '—'}</strong>
                  <div className="detail-meta">{action.status || 'open'} · Due {formatDate(action.due_date)}{action.notes ? ` · ${action.notes}` : ''}</div>
                </div>
              </div>
            )}
          />
        </DetailCard>

        <DetailCard title="Related Statement Info" count={statements.length}>
          <DetailList
            items={statements}
            emptyText="No related statement entries found for linked contract payees."
            renderItem={(statement, index) => (
              <div className="detail-item" key={`${statement.payee || 'stmt'}-${statement.period || index}`}>
                <div>
                  <strong>{statement.payee || '—'}</strong>
                  <div className="detail-meta">{statement.type || '—'} · {statement.period || '—'} · {formatMoney(statement.balance, statement.type)}</div>
                </div>
              </div>
            )}
          />
        </DetailCard>
      </div>
    </section>
  );
}
