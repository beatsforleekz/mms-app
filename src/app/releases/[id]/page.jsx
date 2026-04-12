import ReleaseDetailView from '@/components/releases/ReleaseDetailView';

export default function ReleaseDetailPage({ params }) {
  return <ReleaseDetailView releaseId={params.id} />;
}
