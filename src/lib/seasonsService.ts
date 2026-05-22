import { collection, addDoc, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface Season {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  fee?: number; // Obsolete/Optional now
  createdAt: string;
  clubId?: string; // Distinguishes club-specific seasons. If undefined/global, it is global.
  feesByCategory?: Record<string, number>; // Map of category name to price (e.g. {"Alevín": 150})
  paymentInstallments?: {
    enabled: boolean;
    installments: { name: string; percentage: number; dueDate?: string }[];
  };
}

export const createSeason = async (data: Omit<Season, 'id'>): Promise<Season> => {
  // If active, deactivate all other seasons of the same scope (global vs specific club)
  if (data.isActive) {
    const clubId = data.clubId || 'global';
    const active = clubId === 'global' 
      ? await getActiveSeason() 
      : await getActiveClubSeason(clubId);
    if (active?.id) {
      await updateDoc(doc(db, 'seasons', active.id), { isActive: false });
    }
  }
  const docRef = await addDoc(collection(db, 'seasons'), data);
  return { id: docRef.id, ...data };
};

export const getSeasons = async (): Promise<Season[]> => {
  const q = query(collection(db, 'seasons'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Season));
  // Filter for global/admin-managed seasons
  return all.filter(s => !s.clubId || s.clubId === 'global');
};

export const getClubSeasons = async (clubId: string): Promise<Season[]> => {
  const q = query(
    collection(db, 'seasons'),
    where('clubId', '==', clubId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Season));
};

export const getActiveSeason = async (): Promise<Season | null> => {
  const q = query(collection(db, 'seasons'), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  const activeList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Season));
  const globalActive = activeList.find(s => !s.clubId || s.clubId === 'global');
  return globalActive || null;
};

export const getActiveClubSeason = async (clubId: string): Promise<Season | null> => {
  const q = query(
    collection(db, 'seasons'),
    where('clubId', '==', clubId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Season;
};

export const updateSeason = async (id: string, data: Partial<Season>): Promise<void> => {
  await updateDoc(doc(db, 'seasons', id), data);
};

export const setActiveSeason = async (id: string): Promise<void> => {
  // Deactivate all global seasons
  const seasons = await getSeasons();
  for (const s of seasons) {
    if (s.id && s.isActive) {
      await updateDoc(doc(db, 'seasons', s.id), { isActive: false });
    }
  }
  // Activate selected
  await updateDoc(doc(db, 'seasons', id), { isActive: true });
};

export const setClubActiveSeason = async (clubId: string, id: string): Promise<void> => {
  // Deactivate all seasons for this club
  const seasons = await getClubSeasons(clubId);
  for (const s of seasons) {
    if (s.id && s.isActive) {
      await updateDoc(doc(db, 'seasons', s.id), { isActive: false });
    }
  }
  // Activate selected
  await updateDoc(doc(db, 'seasons', id), { isActive: true });
};

