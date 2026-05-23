import { supabase } from './supabase';

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

const mapRowToInjury = (row: any): Injury => ({
  id: row.id,
  clubId: row.club_id,
  playerId: row.player_id,
  playerName: row.player_name,
  category: row.category || undefined,
  type: row.type,
  severity: row.severity,
  status: row.status,
  injuryDate: row.injury_date,
  estimatedRecoveryDate: row.estimated_recovery_date || undefined,
  notes: row.notes || undefined,
  recommendations: row.recommendations || undefined,
  progressNotes: row.progress_notes || [],
  updatedAt: row.updated_at
});

const mapInjuryToRow = (data: Partial<Injury>): any => {
  const row: any = {};
  if (data.clubId !== undefined) row.club_id = data.clubId;
  if (data.playerId !== undefined) row.player_id = data.playerId;
  if (data.playerName !== undefined) row.player_name = data.playerName;
  if (data.category !== undefined) row.category = data.category || null;
  if (data.type !== undefined) row.type = data.type;
  if (data.severity !== undefined) row.severity = data.severity;
  if (data.status !== undefined) row.status = data.status;
  if (data.injuryDate !== undefined) row.injury_date = data.injuryDate;
  if (data.estimatedRecoveryDate !== undefined) row.estimated_recovery_date = data.estimatedRecoveryDate || null;
  if (data.notes !== undefined) row.notes = data.notes || null;
  if (data.recommendations !== undefined) row.recommendations = data.recommendations || null;
  if (data.progressNotes !== undefined) row.progress_notes = data.progressNotes || [];
  return row;
};

export const createInjury = async (data: Omit<Injury, 'id'>): Promise<Injury> => {
  const now = new Date().toISOString();
  const insertData = {
    ...mapInjuryToRow(data),
    created_at: now,
    updated_at: now
  };

  const { data: inserted, error } = await supabase
    .from('injuries')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating injury in Supabase:", error);
    throw error;
  }

  return mapRowToInjury(inserted);
};

export const updateInjury = async (id: string, data: Partial<Injury>): Promise<void> => {
  const updateData = {
    ...mapInjuryToRow(data),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('injuries')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error("Error updating injury in Supabase:", error);
    throw error;
  }
};

export const deleteInjury = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('injuries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting injury in Supabase:", error);
    throw error;
  }
};

export const getInjuriesByClub = async (clubId: string): Promise<Injury[]> => {
  const { data, error } = await supabase
    .from('injuries')
    .select('*')
    .eq('club_id', clubId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching injuries by club from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToInjury);
};

export const getInjuriesByPlayer = async (playerId: string): Promise<Injury[]> => {
  const { data, error } = await supabase
    .from('injuries')
    .select('*')
    .eq('player_id', playerId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching injuries by player from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToInjury);
};
