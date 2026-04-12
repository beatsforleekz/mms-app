import ReleaseDetailView from '@/components/releases/ReleaseDetailView';

export default function ReleaseDetailPage({ params, searchParams }) {
  return (
    <ReleaseDetailView
      releaseId={params.id}
      catalogueId={searchParams && searchParams.catalogue_id ? searchParams.catalogue_id : ''}
      catalogueType={searchParams && searchParams.catalogue_type ? searchParams.catalogue_type : ''}
    />
  );
}
