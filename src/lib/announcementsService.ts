import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
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

export const createAnnouncement = async (data: Omit<Announcement, 'id'>): Promise<Announcement> => {
  const docRef = await addDoc(collection(db, 'announcements'), data);
  return { id: docRef.id, ...data };
};

export const getGlobalAnnouncements = async (): Promise<Announcement[]> => {
  const allAnnouncementsSnapshot = await getDocs(collection(db, 'announcements'));
  const announcements = allAnnouncementsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
  const global = announcements.filter(a => a.scope === 'global');
  return global.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getClubAnnouncements = async (clubId: string): Promise<Announcement[]> => {
  const allAnnouncementsSnapshot = await getDocs(collection(db, 'announcements'));
  const announcements = allAnnouncementsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
  const club = announcements.filter(a => a.scope === 'club' && a.clubId === clubId);
  return club.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAnnouncementsForUser = async (profile: UserProfile): Promise<Announcement[]> => {
  if (!profile) return [];
  const allAnnouncementsSnapshot = await getDocs(collection(db, 'announcements'));
  const all = allAnnouncementsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
  
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
      // Determine what tags the user qualifies for
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
      
      // The user must have at least one matching tag in targetAudience
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
  // Backwards compatibility or direct player page call
  // This fallback returns all announcements for that club (both global + club specific)
  const [global, club] = await Promise.all([
    getGlobalAnnouncements(),
    getClubAnnouncements(clubId)
  ]);
  return [...global, ...club].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const updateAnnouncement = async (id: string, data: Partial<Announcement>): Promise<void> => {
  await updateDoc(doc(db, 'announcements', id), data);
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'announcements', id));
};

export const markAnnouncementAsRead = async (announcementId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, 'announcements', announcementId), {
    readBy: arrayUnion(userId)
  });
};


