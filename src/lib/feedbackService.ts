import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface TrainingFeedback {
  id?: string;
  clubId: string;
  teamId: string;
  teamName: string;
  coachId: string;
  coachName: string;
  date: string;
  category: 'Táctica' | 'Físico' | 'Mental' | 'General';
  intensity: number; // 1-5
  notes: string;
  createdAt: string;
}

const COLLECTION_NAME = 'training_feedback';

export const createTrainingFeedback = async (feedback: Omit<TrainingFeedback, 'id' | 'createdAt'>): Promise<TrainingFeedback> => {
  const newFeedback: Omit<TrainingFeedback, 'id'> = {
    ...feedback,
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newFeedback);
  return { id: docRef.id, ...newFeedback };
};

export const getFeedbackByTeam = async (teamId: string): Promise<TrainingFeedback[]> => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('teamId', '==', teamId)
  );
  const snapshot = await getDocs(q);
  const feed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingFeedback));
  // Sort in memory to avoid requiring indexes
  return feed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getFeedbackByCoach = async (coachId: string): Promise<TrainingFeedback[]> => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('coachId', '==', coachId)
  );
  const snapshot = await getDocs(q);
  const feed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingFeedback));
  return feed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getFeedbackByClub = async (clubId: string): Promise<TrainingFeedback[]> => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('clubId', '==', clubId)
  );
  const snapshot = await getDocs(q);
  const feed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingFeedback));
  return feed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
