import { supabase } from './supabase';

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

const mapRowToFeedback = (row: any): TrainingFeedback => ({
  id: row.id,
  clubId: row.club_id,
  teamId: row.team_id,
  teamName: row.team_name,
  coachId: row.coach_id,
  coachName: row.coach_name,
  date: row.date,
  category: row.category as any,
  intensity: row.intensity,
  notes: row.notes || '',
  createdAt: row.created_at
});

const mapFeedbackToRow = (data: Partial<TrainingFeedback>): any => {
  const row: any = {};
  if (data.clubId !== undefined) row.club_id = data.clubId;
  if (data.teamId !== undefined) row.team_id = data.teamId;
  if (data.teamName !== undefined) row.team_name = data.teamName;
  if (data.coachId !== undefined) row.coach_id = data.coachId;
  if (data.coachName !== undefined) row.coach_name = data.coachName;
  if (data.date !== undefined) row.date = data.date;
  if (data.category !== undefined) row.category = data.category;
  if (data.intensity !== undefined) row.intensity = data.intensity;
  if (data.notes !== undefined) row.notes = data.notes;
  return row;
};

export const createTrainingFeedback = async (
  feedback: Omit<TrainingFeedback, 'id' | 'createdAt'>
): Promise<TrainingFeedback> => {
  const now = new Date().toISOString();
  const insertData = {
    ...mapFeedbackToRow(feedback),
    created_at: now
  };

  const { data: inserted, error } = await supabase
    .from('training_feedback')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating training feedback in Supabase:", error);
    throw error;
  }

  return mapRowToFeedback(inserted);
};

export const getFeedbackByTeam = async (teamId: string): Promise<TrainingFeedback[]> => {
  const { data, error } = await supabase
    .from('training_feedback')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching feedback by team from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToFeedback);
};

export const getFeedbackByCoach = async (coachId: string): Promise<TrainingFeedback[]> => {
  const { data, error } = await supabase
    .from('training_feedback')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching feedback by coach from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToFeedback);
};

export const getFeedbackByClub = async (clubId: string): Promise<TrainingFeedback[]> => {
  const { data, error } = await supabase
    .from('training_feedback')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching feedback by club from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToFeedback);
};
