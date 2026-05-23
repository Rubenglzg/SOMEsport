import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'club' | 'player' | 'staff';

export interface ModulePermission {
  enabled: boolean;
  accessLevel: 'all' | 'assigned';
  canEdit: boolean;
}

export interface StaffPermissions {
  teams?: ModulePermission;
  facilities?: ModulePermission;
  injuries?: ModulePermission;
  inventory?: ModulePermission;
  calendar?: ModulePermission;
  attendance?: ModulePermission;
}

export interface UserProfile {
  uid?: string;
  role: UserRole;
  clubId?: string | null;
  name?: string;
  username?: string;
  email?: string;
  category?: string;
  teamId?: string; // Legacy single team support
  teamIds?: string[]; // Array of assigned teams
  sportType?: string; // Ej: 'Fútbol', 'Baloncesto', 'eSports'
  accountType?: 'jugador' | 'tutor' | 'entrenador' | 'directivo';
  directorSpecialization?: 'general' | 'financiero' | 'tactico' | 'material';
  fichaId?: string; // ID de la ficha central (para agrupar 1 jugador y 2 tutores)
  activeSports?: string[]; // Array de deportes habilitados por el club
  isAdult?: boolean;
  dni?: string;
  birthDate?: string;
  phone?: string;
  tutorName?: string;
  tutorPhone?: string;
  tutorEmail?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  photoURL?: string;
  staffPermissions?: StaffPermissions;
}




interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
