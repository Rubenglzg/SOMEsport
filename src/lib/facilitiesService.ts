import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Facility {
  id?: string;
  clubId: string;
  name: string;
  type: string; // Ej: 'Campo de Fútbol', 'Pista de Baloncesto'
  status: 'Disponible' | 'Mantenimiento' | 'Fuera de Servicio';
  createdAt: string;
}

export interface FacilityBooking {
  id?: string;
  clubId: string;
  facilityId: string;
  title: string; // Ej: 'Entrenamiento Cadete A'
  date: string;  // AAAA-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  createdAt: string;
}

export const createFacility = async (clubId: string, name: string, type: string): Promise<Facility> => {
  const newFacility: Omit<Facility, 'id'> = {
    clubId,
    name,
    type,
    status: 'Disponible',
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'facilities'), newFacility);
  return { id: docRef.id, ...newFacility };
};

export const getFacilitiesByClub = async (clubId: string): Promise<Facility[]> => {
  const q = query(collection(db, 'facilities'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility));
};

export const updateFacility = async (facilityId: string, data: Partial<Facility>): Promise<void> => {
  await updateDoc(doc(db, 'facilities', facilityId), data);
};

export const deleteFacility = async (facilityId: string): Promise<void> => {
  await deleteDoc(doc(db, 'facilities', facilityId));
};

// Bookings
export const createBooking = async (data: Omit<FacilityBooking, 'id' | 'createdAt'>): Promise<FacilityBooking> => {
  const newBooking: Omit<FacilityBooking, 'id'> = {
    ...data,
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'facility_bookings'), newBooking);
  return { id: docRef.id, ...newBooking };
};

export const getBookingsByClub = async (clubId: string): Promise<FacilityBooking[]> => {
  const q = query(collection(db, 'facility_bookings'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacilityBooking));
};

export const deleteBooking = async (bookingId: string): Promise<void> => {
  await deleteDoc(doc(db, 'facility_bookings', bookingId));
};
