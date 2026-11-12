import { useAuth } from '@/features/auth/AuthProvider';
import { HomeScreen } from '@/features/home/HomeScreen';

/** Home tab. The screen lives in src/features/home/. */
export default function HomeRoute() {
  const { user } = useAuth();
  return <HomeScreen firstName={user?.profile?.firstName} />;
}
