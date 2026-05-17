import { create } from 'zustand';
import type { User } from 'firebase/auth';

export type UserRole = 'admin' | 'club' | 'player' | 'staff';

export interface UserProfile {
  uid?: string;
  role: UserRole;
  clubId?: string | null;
  name?: string;
  username?: string;
  email?: string;
  category?: string;
  teamId?: string;
  sportType?: string; // Ej: 'Fútbol', 'Baloncesto', 'eSports'
  accountType?: 'jugador' | 'tutor' | 'entrenador' | 'directivo';
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
