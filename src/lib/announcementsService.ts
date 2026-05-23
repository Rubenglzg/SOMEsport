import { supabase } from './supabase';
import type { UserProfile } from '../store/authStore';

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  scope: 'global' | 'club';
  clubId?: string;
  createdAt: string;
  pinned: boolean;
  imageURL?: string; // Support for optional announcement image
  targetClubs?: string[];   // Specific clubs targeted (if empty, matches all clubs)
  targetAudience?: string[]; // Specific roles/demographics targeted (if empty, matches all)
  readBy?: string[];         // List of user UIDs who have marked this announcement as read
}

const mapRowToAnnouncement = (row: any): Announcement => ({
  id: row.id,
  title: row.title,
  body: row.body,
  authorId: row.author_id,
  authorName: row.author_name,
  scope: row.scope as 'global' | 'club',
  clubId: row.club_id || undefined,
  createdAt: row.created_at,
  pinned: row.pinned,
  imageURL: row.image_url || undefined,
  targetClubs: row.target_clubs || [],
  targetAudience: row.target_audience || [],
  readBy: row.read_by || []
});

const mapAnnouncementToRow = (data: Partial<Announcement>): any => {
  const row: any = {};
  if (data.title !== undefined) row.title = data.title;
  if (data.body !== undefined) row.body = data.body;
  if (data.authorId !== undefined) row.author_id = data.authorId;
  if (data.authorName !== undefined) row.author_name = data.authorName;
  if (data.scope !== undefined) row.scope = data.scope;
  if (data.clubId !== undefined) row.club_id = data.clubId || null;
  if (data.pinned !== undefined) row.pinned = data.pinned;
  if (data.imageURL !== undefined) row.image_url = data.imageURL || null;
  if (data.targetClubs !== undefined) row.target_clubs = data.targetClubs || [];
  if (data.targetAudience !== undefined) row.target_audience = data.targetAudience || [];
  if (data.readBy !== undefined) row.read_by = data.readBy || [];
  return row;
};

export const createAnnouncement = async (data: Omit<Announcement, 'id'>): Promise<Announcement> => {
  const now = new Date().toISOString();
  const insertData = {
    ...mapAnnouncementToRow(data),
    created_at: now
  };

  const { data: inserted, error } = await supabase
    .from('announcements')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating announcement in Supabase:", error);
    throw error;
  }

  return mapRowToAnnouncement(inserted);
};

export const getGlobalAnnouncements = async (): Promise<Announcement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('scope', 'global')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching global announcements from Supabase:", error);
    return [];
  }
  return (data || []).map(mapRowToAnnouncement);
};

export const getClubAnnouncements = async (clubId: string): Promise<Announcement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('scope', 'club')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching club announcements from Supabase:", error);
    return [];
  }
  return (data || []).map(mapRowToAnnouncement);
};

export const getAnnouncementsForUser = async (profile: UserProfile): Promise<Announcement[]> => {
  if (!profile) return [];
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*');

  if (error) {
    console.error("Error fetching announcements for user from Supabase:", error);
    return [];
  }

  const all = (data || []).map(mapRowToAnnouncement);
  
  const userRole = profile.role || 'player';
  const userClubId = profile.clubId || profile.uid; // For clubs, uid is their identifier
  
  const filtered = all.filter(a => {
    // 1. If scope is club, it must match the user's clubId
    if (a.scope === 'club') {
      if (a.clubId !== userClubId) {
        return false;
      }
    }
    
    // 2. If scope is global:
    // Check club filters:
    if (a.scope === 'global' && a.targetClubs && a.targetClubs.length > 0) {
      if (!userClubId || !a.targetClubs.includes(userClubId)) {
        return false;
      }
    }
    
    // Check audience filters:
    if (a.targetAudience && a.targetAudience.length > 0) {
      const userTags: string[] = [];
      if (userRole === 'club') {
        userTags.push('presidentes');
      } else if (userRole === 'staff') {
        if (profile.accountType === 'directivo') {
          userTags.push('cuerpo_tecnico');
        } else if (profile.accountType === 'entrenador') {
          userTags.push('entrenadores');
        }
      } else if (userRole === 'player') {
        if (profile.accountType === 'jugador') {
          userTags.push('jugadores');
          if (profile.isAdult === true) {
            userTags.push('mayores_edad');
          } else {
            userTags.push('menores_edad');
          }
        } else if (profile.accountType === 'tutor') {
          userTags.push('tutores');
          userTags.push('mayores_edad'); // Tutors are adults
        }
      }
      
      const hasMatch = a.targetAudience.some(tag => userTags.includes(tag));
      if (!hasMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  return filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export const getPlayerAnnouncements = async (clubId: string): Promise<Announcement[]> => {
  const [global, club] = await Promise.all([
    getGlobalAnnouncements(),
    getClubAnnouncements(clubId)
  ]);
  return [...global, ...club].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const updateAnnouncement = async (id: string, data: Partial<Announcement>): Promise<void> => {
  const { error } = await supabase
    .from('announcements')
    .update(mapAnnouncementToRow(data))
    .eq('id', id);

  if (error) {
    console.error("Error updating announcement in Supabase:", error);
    throw error;
  }
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting announcement from Supabase:", error);
    throw error;
  }
};

export const markAnnouncementAsRead = async (announcementId: string, userId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('read_by')
    .eq('id', announcementId)
    .single();

  if (error) {
    console.error("Error fetching announcement read_by list:", error);
    throw error;
  }

  const currentReadBy: string[] = data.read_by || [];
  if (!currentReadBy.includes(userId)) {
    const updatedReadBy = [...currentReadBy, userId];
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ read_by: updatedReadBy })
      .eq('id', announcementId);

    if (updateError) {
      console.error("Error marking announcement as read in Supabase:", updateError);
      throw updateError;
    }
  }
};
