import { supabase } from './supabase';

export type EventType = 'training' | 'match' | 'event';

export interface MatchPlayerStats {
  playerId: string;
  playerName: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  rating: number;
  privateNotes?: string;
}

export interface ClubEvent {
  id?: string;
  clubId: string;
  teamId?: string;
  title: string;
  description: string;
  type: EventType;
  date: string;       // ISO date string YYYY-MM-DD
  time: string;       // HH:MM
  location: string;
  createdAt: string;
  squadIds?: string[];
  result?: string;
  rivalName?: string;
  goalsFor?: number;
  goalsAgainst?: number;
  matchReport?: string;
  playerStats?: Record<string, MatchPlayerStats>;
  teamNotes?: string;
  mvpVotes?: Record<string, string>; // voterPlayerUid -> votedPlayerUid
}

const mapRowToEvent = (row: any): ClubEvent => ({
  id: row.id,
  clubId: row.club_id,
  teamId: row.team_id || undefined,
  title: row.title,
  description: row.description || '',
  type: (row.type || 'event') as EventType,
  date: row.date || (row.start_time ? row.start_time.split('T')[0] : ''),
  time: row.time || (row.start_time ? row.start_time.split('T')[1]?.substring(0, 5) : '12:00'),
  location: row.location || '',
  createdAt: row.created_at,
  squadIds: row.squad_ids || [],
  result: row.result || undefined,
  rivalName: row.rival_name || undefined,
  goalsFor: row.goals_for !== null && row.goals_for !== undefined ? row.goals_for : undefined,
  goalsAgainst: row.goals_against !== null && row.goals_against !== undefined ? row.goals_against : undefined,
  matchReport: row.match_report || undefined,
  playerStats: row.player_stats || {},
  teamNotes: row.team_notes || undefined,
  mvpVotes: row.mvp_votes || {}
});

const mapEventToRow = (data: Partial<ClubEvent>): any => {
  const row: any = {};
  if (data.clubId !== undefined) row.club_id = data.clubId;
  if (data.teamId !== undefined) row.team_id = data.teamId || null;
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description || '';
  if (data.type !== undefined) row.type = data.type;
  if (data.date !== undefined) row.date = data.date;
  if (data.time !== undefined) row.time = data.time;
  if (data.location !== undefined) row.location = data.location || '';
  if (data.squadIds !== undefined) row.squad_ids = data.squadIds || [];
  if (data.result !== undefined) row.result = data.result || null;
  if (data.rivalName !== undefined) row.rival_name = data.rivalName || null;
  if (data.goalsFor !== undefined) row.goals_for = data.goalsFor !== undefined ? data.goalsFor : null;
  if (data.goalsAgainst !== undefined) row.goals_against = data.goalsAgainst !== undefined ? data.goalsAgainst : null;
  if (data.matchReport !== undefined) row.match_report = data.matchReport || null;
  if (data.playerStats !== undefined) row.player_stats = data.playerStats || {};
  if (data.teamNotes !== undefined) row.team_notes = data.teamNotes || null;
  if (data.mvpVotes !== undefined) row.mvp_votes = data.mvpVotes || {};

  if (data.date || data.time) {
    const d = data.date || '2026-05-22';
    const t = data.time || '12:00';
    try {
      const start = new Date(`${d}T${t}:00`);
      row.start_time = start.toISOString();
      row.end_time = new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString();
    } catch (e) {
      console.warn("Error processing event date/time conversion:", e);
    }
  }

  return row;
};

export const createEvent = async (data: Omit<ClubEvent, 'id'>): Promise<ClubEvent> => {
  const now = new Date().toISOString();
  const insertData = {
    ...mapEventToRow(data),
    created_at: now
  };

  const { data: inserted, error } = await supabase
    .from('events')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating event in Supabase:", error);
    throw error;
  }

  return mapRowToEvent(inserted);
};

export const getClubEvents = async (clubId: string): Promise<ClubEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('club_id', clubId);

  if (error) {
    console.error("Error fetching events by club from Supabase:", error);
    return [];
  }

  const events = (data || []).map(mapRowToEvent);
  return events.sort((a, b) => a.date.localeCompare(b.date));
};

export const getPlayerEvents = async (clubId: string, teamId?: string): Promise<ClubEvent[]> => {
  const allEvents = await getClubEvents(clubId);
  return allEvents.filter(e => !e.teamId || e.teamId === teamId);
};

export const updateEvent = async (eventId: string, data: Partial<ClubEvent>): Promise<void> => {
  const updateData = mapEventToRow(data);

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId);

  if (error) {
    console.error("Error updating event in Supabase:", error);
    throw error;
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error("Error deleting event from Supabase:", error);
    throw error;
  }
};
