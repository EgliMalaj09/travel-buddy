import { Link } from 'react-router';

import { EmptyState } from '@/components';

export function NotFoundPage() {
  return <EmptyState icon="search" title="This page does not exist" action={<Link to="/">Go to the dashboard</Link>} />;
}
