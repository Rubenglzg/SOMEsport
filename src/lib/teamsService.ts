import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';


export interface Team {
  id?: string;
  clubId: string;
  name: string;
  category: string;
  sportType?: string; // Ej: 'Fútbol', 'Baloncesto'
  createdAt: string;
  playerIds: string[]; // UIDs of players assigned to this team
}

export const createTeam = async (clubId: string, name: string, category: string = 'Sin categoría', sportType: string = 'Fútbol'): Promise<Team> => {
  const newTeam: Omit<Team, 'id'> = {
    clubId,
    name,
    category,
    sportType,
    createdAt: new Date().toISOString(),
    playerIds: []
  };
  
  const docRef = await addDoc(collection(db, 'teams'), newTeam);
  return { id: docRef.id, ...newTeam };
};

export const getTeamsByClub = async (clubId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  await deleteDoc(doc(db, 'teams', teamId));
};

export const assignPlayerToTeam = async (teamId: string, playerId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    playerIds: arrayUnion(playerId)
  });
};

export const removePlayerFromTeam = async (teamId: string, playerId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    playerIds: arrayRemove(playerId)
  });
};

export const getPlayerTeam = async (playerId: string): Promise<Team | null> => {
  const q = query(collection(db, 'teams'), where('playerIds', 'array-contains', playerId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Team;
};
