import { supabase } from './supabase';

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

const mapRowToSeason = (row: any): Season => ({
  id: row.id,
  name: row.name,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: row.is_active,
  createdAt: row.created_at,
  clubId: row.club_id || undefined,
  feesByCategory: row.fees_by_category || {},
  paymentInstallments: row.payment_installments || { enabled: false, installments: [] }
});

const mapSeasonToRow = (data: Partial<Season>): any => {
  const row: any = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.startDate !== undefined) row.start_date = data.startDate;
  if (data.endDate !== undefined) row.end_date = data.endDate;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.clubId !== undefined) row.club_id = data.clubId || null;
  if (data.feesByCategory !== undefined) row.fees_by_category = data.feesByCategory;
  if (data.paymentInstallments !== undefined) row.payment_installments = data.paymentInstallments;
  return row;
};

export const createSeason = async (data: Omit<Season, 'id'>): Promise<Season> => {
  const now = new Date().toISOString();
  
  // If active, deactivate all other seasons of the same scope (global vs specific club)
  if (data.isActive) {
    const clubId = data.clubId || 'global';
    const active = clubId === 'global' 
      ? await getActiveSeason() 
      : await getActiveClubSeason(clubId);
    if (active?.id) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', active.id);
    }
  }

  const insertData = {
    name: data.name,
    start_date: data.startDate,
    end_date: data.endDate,
    is_active: data.isActive,
    club_id: data.clubId || null,
    fees_by_category: data.feesByCategory || {},
    payment_installments: data.paymentInstallments || { enabled: false, installments: [] },
    created_at: now
  };

  const { data: inserted, error } = await supabase
    .from('seasons')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating season in Supabase:", error);
    throw error;
  }

  return mapRowToSeason(inserted);
};

export const getSeasons = async (): Promise<Season[]> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching global seasons from Supabase:", error);
    return [];
  }

  const all = (data || []).map(mapRowToSeason);
  // Filter for global/admin-managed seasons
  return all.filter(s => !s.clubId || s.clubId === 'global');
};

export const getClubSeasons = async (clubId: string): Promise<Season[]> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching club seasons from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToSeason);
};

export const getActiveSeason = async (): Promise<Season | null> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching active global seasons from Supabase:", error);
    return null;
  }

  const activeList = (data || []).map(mapRowToSeason);
  const globalActive = activeList.find(s => !s.clubId || s.clubId === 'global');
  return globalActive || null;
};

export const getActiveClubSeason = async (clubId: string): Promise<Season | null> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error("Error fetching active club seasons from Supabase:", error);
    return null;
  }

  if (!data || data.length === 0) return null;
  return mapRowToSeason(data[0]);
};

export const updateSeason = async (id: string, data: Partial<Season>): Promise<void> => {
  const { error } = await supabase
    .from('seasons')
    .update(mapSeasonToRow(data))
    .eq('id', id);

  if (error) {
    console.error("Error updating season in Supabase:", error);
    throw error;
  }
};

export const setActiveSeason = async (id: string): Promise<void> => {
  // Deactivate all global seasons
  const seasons = await getSeasons();
  for (const s of seasons) {
    if (s.id && s.isActive) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', s.id);
    }
  }
  // Activate selected
  await supabase
    .from('seasons')
    .update({ is_active: true })
    .eq('id', id);
};

export const setClubActiveSeason = async (clubId: string, id: string): Promise<void> => {
  // Deactivate all seasons for this club
  const seasons = await getClubSeasons(clubId);
  for (const s of seasons) {
    if (s.id && s.isActive) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', s.id);
    }
  }
  // Activate selected
  await supabase
    .from('seasons')
    .update({ is_active: true })
    .eq('id', id);
};
