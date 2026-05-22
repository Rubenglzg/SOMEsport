import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface Injury {
  id?: string;
  clubId: string;
  playerId: string;
  playerName: string;
  category?: string;
  type: 'muscular' | 'osea' | 'articular' | 'ligamentosa' | 'tendinosa' | 'otra';
  severity: 'leve' | 'moderada' | 'grave';
  status: 'activa' | 'recuperado';
  injuryDate: string;
  estimatedRecoveryDate?: string;
  notes?: string;
  recommendations?: string;
  progressNotes?: string[];
  updatedAt: string;
}

const cleanData = <T extends object>(obj: T): T => {
  const newObj = { ...obj } as Record<string, unknown>;
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj as T;
};

export const createInjury = async (data: Omit<Injury, 'id'>): Promise<Injury> => {
  const cleaned = cleanData(data);
  const docRef = await addDoc(collection(db, 'injuries'), cleaned);
  return { id: docRef.id, ...cleaned };
};

export const updateInjury = async (id: string, data: Partial<Injury>): Promise<void> => {
  await updateDoc(doc(db, 'injuries', id), cleanData(data));
};

export const deleteInjury = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'injuries', id));
};

export const getInjuriesByClub = async (clubId: string): Promise<Injury[]> => {
  const q = query(
    collection(db, 'injuries'),
    where('clubId', '==', clubId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Injury));
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getInjuriesByPlayer = async (playerId: string): Promise<Injury[]> => {
  const q = query(
    collection(db, 'injuries'),
    where('playerId', '==', playerId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Injury));
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

