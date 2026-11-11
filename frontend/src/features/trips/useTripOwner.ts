import type { TripOwner } from '@/data';
import { useAuth } from '@/features/auth/AuthProvider';

/** Owner and snapshot values for a new trip, from the logged-in user. */
export function useTripOwner(): TripOwner | null {
  const { user } = useAuth();
  if (!user?.profile) return null;
  return {
    ownerId: user.id,
    passportCountry: user.profile.passportCountry,
    homeCurrency: user.profile.homeCurrency,
  };
}
