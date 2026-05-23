import { supabase } from './supabase';

export type AttendanceStatus = 'present' | 'absent' | 'justified';

export interface AttendanceRecord {
  playerId: string;
  status: AttendanceStatus;
}

export interface AttendanceSheet {
  id?: string;
  eventId: string;
  eventTitle: string;
  clubId: string;
  date: string;
  records: AttendanceRecord[];
}

const mapRowToSheet = (row: any): AttendanceSheet => ({
  id: row.id,
  eventId: row.event_id,
  eventTitle: row.event_title,
  clubId: row.club_id,
  date: row.date,
  records: row.records || []
});

const mapSheetToRow = (data: Partial<AttendanceSheet>): any => {
  const row: any = {};
  if (data.eventId !== undefined) row.event_id = data.eventId;
  if (data.eventTitle !== undefined) row.event_title = data.eventTitle;
  if (data.clubId !== undefined) row.club_id = data.clubId;
  if (data.date !== undefined) row.date = data.date;
  if (data.records !== undefined) row.records = data.records;
  return row;
};

export const saveAttendance = async (data: Omit<AttendanceSheet, 'id'>): Promise<AttendanceSheet> => {
  // Check if attendance already exists for this event
  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('id')
    .eq('event_id', data.eventId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching existing attendance from Supabase:", fetchError);
  }

  if (existing?.id) {
    // Update existing records
    const { error: updateError } = await supabase
      .from('attendance')
      .update({ records: data.records })
      .eq('id', existing.id);

    if (updateError) {
      console.error("Error updating attendance in Supabase:", updateError);
      throw updateError;
    }
    return { id: existing.id, ...data };
  }

  // Create new
  const now = new Date().toISOString();
  const insertData = {
    ...mapSheetToRow(data),
    created_at: now
  };

  const { data: inserted, error: insertError } = await supabase
    .from('attendance')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error("Error inserting attendance sheet in Supabase:", insertError);
    throw insertError;
  }

  return mapRowToSheet(inserted);
};

export const getEventAttendance = async (eventId: string): Promise<AttendanceSheet | null> => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching event attendance from Supabase:", error);
    return null;
  }

  if (!data) return null;
  return mapRowToSheet(data);
};

export const getClubAttendanceHistory = async (clubId: string): Promise<AttendanceSheet[]> => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('club_id', clubId);

  if (error) {
    console.error("Error fetching club attendance history from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToSheet);
};

export const getPlayerAttendanceHistory = async (clubId: string, playerId: string): Promise<{ date: string; eventTitle: string; status: AttendanceStatus }[]> => {
  const sheets = await getClubAttendanceHistory(clubId);
  const results: { date: string; eventTitle: string; status: AttendanceStatus }[] = [];

  sheets.forEach(sheet => {
    const record = sheet.records.find(r => r.playerId === playerId);
    if (record) {
      results.push({ date: sheet.date, eventTitle: sheet.eventTitle, status: record.status });
    }
  });

  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
