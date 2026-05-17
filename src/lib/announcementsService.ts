import { collection, addDoc, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  scope: 'global' | 'club';
  clubId?: string;
  createdAt: string;
  pinned: boolean;
}

export const createAnnouncement = async (data: Omit<Announcement, 'id'>): Promise<Announcement> => {
  const docRef = await addDoc(collection(db, 'announcements'), data);
  return { id: docRef.id, ...data };
};

export const getGlobalAnnouncements = async (): Promise<Announcement[]> => {
  const q = query(collection(db, 'announcements'), where('scope', '==', 'global'));
  const snapshot = await getDocs(q);
  const announcements = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
  return announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getClubAnnouncements = async (clubId: string): Promise<Announcement[]> => {
  const q = query(collection(db, 'announcements'), where('scope', '==', 'club'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  const announcements = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
  return announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getPlayerAnnouncements = async (clubId: string): Promise<Announcement[]> => {
  // Get both global + club announcements
  const [global, club] = await Promise.all([
    getGlobalAnnouncements(),
    getClubAnnouncements(clubId)
  ]);
  return [...global, ...club].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'announcements', id));
};
