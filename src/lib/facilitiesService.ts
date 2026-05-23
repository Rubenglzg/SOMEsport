import { supabase } from './supabase';

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

const mapStatusToDb = (status: string): string => {
  if (status === 'Disponible') return 'disponible';
  if (status === 'Mantenimiento') return 'mantenimiento';
  return 'ocupada'; // 'Fuera de Servicio' -> 'ocupada'
};

const mapStatusFromDb = (estado: string): 'Disponible' | 'Mantenimiento' | 'Fuera de Servicio' => {
  if (estado === 'disponible') return 'Disponible';
  if (estado === 'mantenimiento') return 'Mantenimiento';
  return 'Fuera de Servicio'; // 'ocupada' -> 'Fuera de Servicio'
};

const mapRowToFacility = (row: any): Facility => ({
  id: row.id,
  clubId: row.club_id,
  name: row.nombre,
  type: row.tipo,
  status: mapStatusFromDb(row.estado),
  imageURL: row.image_url || undefined,
  createdAt: row.created_at
});

const mapFacilityToRow = (data: Partial<Facility>): any => {
  const row: any = {};
  if (data.clubId !== undefined) row.club_id = data.clubId;
  if (data.name !== undefined) row.nombre = data.name;
  if (data.type !== undefined) row.tipo = data.type;
  if (data.status !== undefined) row.estado = mapStatusToDb(data.status);
  if (data.imageURL !== undefined) row.image_url = data.imageURL || null;
  return row;
};

const mapRowToBooking = (row: any): FacilityBooking => ({
  id: row.id,
  clubId: row.club_id,
  facilityId: row.facility_id,
  title: row.title,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  createdBy: row.created_by || undefined,
  coachName: row.coach_name || undefined,
  facilityName: row.facility_name || undefined,
  status: row.status as any,
  createdAt: row.created_at
});

const mapBookingToRow = (data: Partial<FacilityBooking>): any => {
  const row: any = {};
  if (data.clubId !== undefined) row.club_id = data.clubId;
  if (data.facilityId !== undefined) row.facility_id = data.facilityId;
  if (data.title !== undefined) row.title = data.title;
  if (data.date !== undefined) row.date = data.date;
  if (data.startTime !== undefined) row.start_time = data.startTime;
  if (data.endTime !== undefined) row.end_time = data.endTime;
  if (data.createdBy !== undefined) row.created_by = data.createdBy || null;
  if (data.coachName !== undefined) row.coach_name = data.coachName || null;
  if (data.facilityName !== undefined) row.facility_name = data.facilityName || null;
  if (data.status !== undefined) row.status = data.status;
  return row;
};

export const createFacility = async (clubId: string, name: string, type: string, imageURL?: string): Promise<Facility> => {
  const now = new Date().toISOString();
  const insertData = {
    club_id: clubId,
    nombre: name,
    tipo: type,
    estado: 'disponible',
    image_url: imageURL || null,
    created_at: now
  };

  const { data: inserted, error } = await supabase
    .from('facilities')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating facility in Supabase:", error);
    throw error;
  }

  return mapRowToFacility(inserted);
};

export const getFacilitiesByClub = async (clubId: string): Promise<Facility[]> => {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching facilities by club from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToFacility);
};

export const updateFacility = async (facilityId: string, data: Partial<Facility>): Promise<void> => {
  const { error } = await supabase
    .from('facilities')
    .update(mapFacilityToRow(data))
    .eq('id', facilityId);

  if (error) {
    console.error("Error updating facility in Supabase:", error);
    throw error;
  }
};

export const deleteFacility = async (facilityId: string): Promise<void> => {
  const { error } = await supabase
    .from('facilities')
    .delete()
    .eq('id', facilityId);

  if (error) {
    console.error("Error deleting facility from Supabase:", error);
    throw error;
  }
};

// Bookings
export const createBooking = async (data: Omit<FacilityBooking, 'id' | 'createdAt'>): Promise<FacilityBooking> => {
  const now = new Date().toISOString();
  const insertData = {
    ...mapBookingToRow(data),
    status: data.status || 'approved',
    created_at: now
  };

  const { data: inserted, error } = await supabase
    .from('facility_bookings')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating booking in Supabase:", error);
    throw error;
  }

  return mapRowToBooking(inserted);
};

export const getBookingsByClub = async (clubId: string): Promise<FacilityBooking[]> => {
  const { data, error } = await supabase
    .from('facility_bookings')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching bookings by club from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToBooking);
};

export const updateBookingStatus = async (bookingId: string, status: 'approved' | 'rejected'): Promise<void> => {
  const { error } = await supabase
    .from('facility_bookings')
    .update({ status })
    .eq('id', bookingId);

  if (error) {
    console.error("Error updating booking status in Supabase:", error);
    throw error;
  }
};

export const deleteBooking = async (bookingId: string): Promise<void> => {
  const { error } = await supabase
    .from('facility_bookings')
    .delete()
    .eq('id', bookingId);

  if (error) {
    console.error("Error deleting booking from Supabase:", error);
    throw error;
  }
};
