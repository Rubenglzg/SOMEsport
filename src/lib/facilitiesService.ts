import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Facility {
  id?: string;
  clubId: string;
  name: string;
  type: string; // Ej: 'Campo de Fútbol', 'Pista de Baloncesto'
  status: 'Disponible' | 'Mantenimiento' | 'Fuera de Servicio';
  imageURL?: string;
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
  createdBy?: string; // UID del usuario que creó la reserva
  coachName?: string;  // Nombre del entrenador que reserva
  facilityName?: string; // Nombre de la pista/instalación
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const cleanData = <T extends object>(obj: T): T => {
  const newObj = { ...obj } as any;
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
};

export const createFacility = async (clubId: string, name: string, type: string, imageURL?: string): Promise<Facility> => {
  const newFacility: Omit<Facility, 'id'> = {
    clubId,
    name,
    type,
    status: 'Disponible',
    imageURL,
    createdAt: new Date().toISOString()
  };
  const cleaned = cleanData(newFacility);
  const docRef = await addDoc(collection(db, 'facilities'), cleaned);
  return { id: docRef.id, ...cleaned };
};

export const getFacilitiesByClub = async (clubId: string): Promise<Facility[]> => {
  const q = query(collection(db, 'facilities'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility));
};

export const updateFacility = async (facilityId: string, data: Partial<Facility>): Promise<void> => {
  await updateDoc(doc(db, 'facilities', facilityId), cleanData(data));
};

export const deleteFacility = async (facilityId: string): Promise<void> => {
  await deleteDoc(doc(db, 'facilities', facilityId));
};

// Bookings
export const createBooking = async (data: Omit<FacilityBooking, 'id' | 'createdAt'>): Promise<FacilityBooking> => {
  const newBooking: Omit<FacilityBooking, 'id'> = {
    status: 'approved', // Por defecto aprobado, a menos que se defina 'pending'
    ...data,
    createdAt: new Date().toISOString()
  };
  const cleaned = cleanData(newBooking);
  const docRef = await addDoc(collection(db, 'facility_bookings'), cleaned);
  return { id: docRef.id, ...cleaned };
};

export const getBookingsByClub = async (clubId: string): Promise<FacilityBooking[]> => {
  const q = query(collection(db, 'facility_bookings'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacilityBooking));
};

export const updateBookingStatus = async (bookingId: string, status: 'approved' | 'rejected'): Promise<void> => {
  await updateDoc(doc(db, 'facility_bookings', bookingId), { status });
};

export const deleteBooking = async (bookingId: string): Promise<void> => {
  await deleteDoc(doc(db, 'facility_bookings', bookingId));
};
