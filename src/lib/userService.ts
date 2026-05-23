import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile, StaffPermissions } from '../store/authStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a secondary non-persisting client to register other users without logging out the current session
const createSecondaryClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

export const checkUsernameExists = async (username: string): Promise<boolean> => {
  if (!username) return false;
  const { data, error } = await supabase
    .from('users_profiles')
    .select('id')
    .eq('username', username.toLowerCase().trim());

  if (error) {
    console.error("Error checking username:", error.message);
    return false;
  }
  return data && data.length > 0;
};

export const getEmailByUsername = async (username: string): Promise<string | null> => {
  if (!username) return null;
  try {
    const { data, error } = await supabase.rpc('resolve_username_to_email', {
      p_username: username.toLowerCase().trim()
    });

    if (error) {
      console.error("Error getting email by username via RPC:", error.message);
      return null;
    }
    return data || null;
  } catch (error: any) {
    console.error("Exception getting email by username:", error);
    return null;
  }
};

export const updateUsername = async (uid: string, newUsername: string): Promise<void> => {
  const isTaken = await checkUsernameExists(newUsername);
  if (isTaken) {
    throw new Error('El nombre de usuario ya está en uso.');
  }

  const { error } = await supabase
    .from('users_profiles')
    .update({ username: newUsername.toLowerCase().trim() })
    .eq('id', uid);

  if (error) throw error;
};

export const createClubUser = async (email: string, password: string, name: string, username: string) => {
  const isTaken = await checkUsernameExists(username);
  if (isTaken) {
    throw new Error('El nombre de usuario ya está en uso.');
  }

  const secondaryClient = createSecondaryClient();
  const { data, error } = await secondaryClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        username: username.toLowerCase().trim(),
        role: 'club',
        status: 'Activo',
        sportType: 'soccer'
      }
    }
  });

  if (error) throw error;
  if (!data.user) throw new Error('Error al crear usuario.');

  const clubData: UserProfile = {
    uid: data.user.id,
    email,
    name,
    username: username.toLowerCase().trim(),
    role: 'club',
    sportType: 'soccer',
    createdAt: new Date().toISOString(),
    status: 'Activo'
  };

  return clubData;
};

export const createPlayerUser = async (data: { 
  email: string, 
  password: string, 
  name: string, 
  username: string,
  clubId: string, 
  teamId?: string, 
  accountType: 'jugador' | 'tutor', 
  isAdult: boolean,
  fichaId?: string,
  phone?: string,
  tutorName?: string,
  tutorPhone?: string,
  tutorEmail?: string,
  notes?: string,
  dni?: string,
  birthDate?: string
}) => {
  const isTaken = await checkUsernameExists(data.username);
  if (isTaken) {
    throw new Error('El nombre de usuario ya está en uso.');
  }

  const secondaryClient = createSecondaryClient();
  const { data: signUpData, error: signUpError } = await secondaryClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        username: data.username.toLowerCase().trim(),
        role: 'player',
        club_id: data.clubId,
        accountType: data.accountType,
        isAdult: data.isAdult,
        fichaId: data.fichaId,
        phone: data.phone,
        tutorName: data.tutorName,
        tutorPhone: data.tutorPhone,
        tutorEmail: data.tutorEmail,
        notes: data.notes,
        dni: data.dni,
        birthDate: data.birthDate
      }
    }
  });

  if (signUpError) throw signUpError;
  const uid = signUpData.user!.id;

  // Insert into public.players
  const { error: playerError } = await supabase
    .from('players')
    .insert({
      id: uid,
      club_id: data.clubId,
      nombre: data.name.split(' ')[0] || data.name,
      apellidos: data.name.split(' ').slice(1).join(' ') || '',
      dni: data.dni || null,
      fecha_nacimiento: data.birthDate || new Date().toISOString().split('T')[0],
      datos_tutor: {
        tutorName: data.tutorName || '',
        tutorPhone: data.tutorPhone || '',
        tutorEmail: data.tutorEmail || ''
      }
    });

  if (playerError) throw playerError;

  // Insert into team_players if teamId is provided
  if (data.teamId) {
    const { error: teamPlayerError } = await supabase
      .from('team_players')
      .insert({
        team_id: data.teamId,
        player_id: uid
      });

    if (teamPlayerError) {
      console.warn("Could not associate player to team:", teamPlayerError.message);
    }
  }

  const playerData: UserProfile = {
    uid,
    email: data.email,
    name: data.name,
    username: data.username.toLowerCase().trim(),
    role: 'player',
    clubId: data.clubId,
    teamId: data.teamId,
    accountType: data.accountType,
    isAdult: data.isAdult,
    fichaId: data.fichaId,
    phone: data.phone || '',
    tutorName: data.tutorName || '',
    tutorPhone: data.tutorPhone || '',
    tutorEmail: data.tutorEmail || '',
    notes: data.notes || '',
    dni: data.dni || '',
    birthDate: data.birthDate || '',
    status: 'Pendiente',
    createdAt: new Date().toISOString()
  };

  return playerData;
};

export const getClubs = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('role', 'club');

  if (error) {
    console.error("Error getting clubs:", error.message);
    throw error;
  }

  return (data || []).map((c: any) => ({
    uid: c.id,
    email: c.email,
    name: c.name,
    username: c.username,
    role: 'club',
    clubId: c.club_id,
    createdAt: c.created_at,
    status: 'Activo'
  } as UserProfile));
};

export const createStaffUser = async (data: { 
  email: string, 
  password: string, 
  name: string, 
  username: string,
  clubId: string, 
  accountType: 'entrenador' | 'directivo',
  directorSpecialization?: 'general' | 'financiero' | 'tactico' | 'material',
  sportType?: string,
  teamId?: string,
  teamIds?: string[],
  staffPermissions?: StaffPermissions
}) => {
  const isTaken = await checkUsernameExists(data.username);
  if (isTaken) {
    throw new Error('El nombre de usuario ya está en uso.');
  }

  const secondaryClient = createSecondaryClient();
  const { data: signUpData, error: signUpError } = await secondaryClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        username: data.username.toLowerCase().trim(),
        role: 'staff',
        club_id: data.clubId,
        accountType: data.accountType,
        directorSpecialization: data.directorSpecialization,
        sportType: data.sportType,
        teamId: data.teamId,
        teamIds: data.teamIds,
        staffPermissions: data.staffPermissions
      }
    }
  });

  if (signUpError) throw signUpError;
  const uid = signUpData.user!.id;

  const staffData: UserProfile = {
    uid,
    email: data.email,
    name: data.name,
    username: data.username.toLowerCase().trim(),
    role: 'staff',
    clubId: data.clubId,
    accountType: data.accountType,
    directorSpecialization: data.directorSpecialization,
    sportType: data.sportType,
    teamId: data.teamId,
    teamIds: data.teamIds,
    staffPermissions: data.staffPermissions,
    status: 'Activo',
    createdAt: new Date().toISOString()
  };

  return staffData;
};

export const getPlayersByClub = async (clubId: string): Promise<UserProfile[]> => {
  // Query 1: Get profiles with role = 'player' and club_id = clubId
  const { data: profiles, error: profError } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('role', 'player')
    .eq('club_id', clubId);

  if (profError) {
    console.error("Error getting player profiles:", profError.message);
    throw profError;
  }

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map(p => p.id);

  // Query 2: Get player data from players table
  const { data: players, error: playError } = await supabase
    .from('players')
    .select('*')
    .in('id', profileIds);

  if (playError) {
    console.error("Error getting player data:", playError.message);
    throw playError;
  }

  const playerMap = new Map(players?.map(p => [p.id, p]) || []);

  return profiles.map((profile: any) => {
    const p = playerMap.get(profile.id) || {};
    return {
      uid: profile.id,
      name: p.nombre && p.apellidos ? `${p.nombre} ${p.apellidos}`.trim() : profile.name || '',
      dni: p.dni || '',
      birthDate: p.fecha_nacimiento || '',
      email: profile.email || '',
      username: profile.username || '',
      role: 'player',
      clubId: profile.club_id || p.club_id,
      accountType: profile.account_type || 'jugador',
      tutorName: p.datos_tutor?.tutorName || '',
      tutorPhone: p.datos_tutor?.tutorPhone || '',
      tutorEmail: p.datos_tutor?.tutorEmail || '',
      createdAt: profile.created_at || p.created_at,
      status: profile.status || 'Activo'
    } as UserProfile;
  });
};

export const getStaffByClub = async (clubId: string): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('role', 'staff')
    .eq('club_id', clubId);

  if (error) {
    console.error("Error getting staff by club:", error.message);
    throw error;
  }

  return (data || []).map((s: any) => ({
    uid: s.id,
    email: s.email,
    name: s.name,
    username: s.username,
    role: 'staff',
    clubId: s.club_id,
    createdAt: s.created_at,
    status: s.status || 'Activo',
    accountType: s.account_type,
    sportType: s.sport_type,
    teamId: s.team_id,
    teamIds: s.team_ids,
    staffPermissions: s.staff_permissions,
    directorSpecialization: s.director_specialization
  } as UserProfile));
};

export const getAllPlayers = async (): Promise<UserProfile[]> => {
  // Query 1: Get all player profiles
  const { data: profiles, error: profError } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('role', 'player');

  if (profError) {
    console.error("Error getting all player profiles:", profError.message);
    throw profError;
  }

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map(p => p.id);

  // Query 2: Get players detail data
  const { data: players, error: playError } = await supabase
    .from('players')
    .select('*')
    .in('id', profileIds);

  if (playError) {
    console.error("Error getting all players detail:", playError.message);
    throw playError;
  }

  const playerMap = new Map(players?.map(p => [p.id, p]) || []);

  return profiles.map((profile: any) => {
    const p = playerMap.get(profile.id) || {};
    return {
      uid: profile.id,
      name: p.nombre && p.apellidos ? `${p.nombre} ${p.apellidos}`.trim() : profile.name || '',
      dni: p.dni || '',
      birthDate: p.fecha_nacimiento || '',
      email: profile.email || '',
      username: profile.username || '',
      role: 'player',
      clubId: profile.club_id || p.club_id,
      accountType: profile.account_type || 'jugador',
      tutorName: p.datos_tutor?.tutorName || '',
      tutorPhone: p.datos_tutor?.tutorPhone || '',
      tutorEmail: p.datos_tutor?.tutorEmail || '',
      createdAt: profile.created_at || p.created_at,
      status: profile.status || 'Activo'
    } as UserProfile;
  });
};

export const deleteUserAccount = async (uid: string): Promise<void> => {
  // Delete from players first
  const { error: playerError } = await supabase
    .from('players')
    .delete()
    .eq('id', uid);

  if (playerError) {
    console.warn("Could not delete from players table:", playerError.message);
  }

  // Delete from users_profiles
  const { error: profileError } = await supabase
    .from('users_profiles')
    .delete()
    .eq('id', uid);

  if (profileError) {
    console.error("Could not delete from users_profiles table:", profileError.message);
    throw profileError;
  }
};

export const updateUserAuth = async (uid: string, email?: string, password?: string): Promise<void> => {
  console.warn("Administratively updating user auth credentials (email/password) in Supabase frontend client requires service_role key or an Edge Function. Updating the database users_profiles record.");
  
  if (email) {
    const { error } = await supabase
      .from('users_profiles')
      .update({ email })
      .eq('id', uid);
    if (error) throw error;
  }
  
  if (password) {
    console.warn("Password change for another user is not possible from standard frontend client. This must be handled via Supabase Auth Admin API on a backend or Edge Function.");
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  if (data.username) {
    const isTaken = await checkUsernameExists(data.username);
    if (isTaken) {
      // Wait, is it another user's username?
      const { data: ownProfile } = await supabase
        .from('users_profiles')
        .select('username')
        .eq('id', uid)
        .maybeSingle();

      if (ownProfile && ownProfile.username !== data.username.toLowerCase().trim()) {
        throw new Error('El nombre de usuario ya está en uso.');
      }
    }
    data.username = data.username.toLowerCase().trim();
  }

  const profileUpdates: any = {};
  if (data.email !== undefined) profileUpdates.email = data.email;
  if (data.name !== undefined) profileUpdates.name = data.name;
  if (data.username !== undefined) profileUpdates.username = data.username;
  if (data.role !== undefined) profileUpdates.role = data.role;
  if (data.clubId !== undefined) profileUpdates.club_id = data.clubId;
  if (data.accountType !== undefined) profileUpdates.account_type = data.accountType;
  if (data.sportType !== undefined) profileUpdates.sport_type = data.sportType;
  if (data.teamId !== undefined) profileUpdates.team_id = data.teamId;
  if (data.teamIds !== undefined) profileUpdates.team_ids = data.teamIds;
  if (data.staffPermissions !== undefined) profileUpdates.staff_permissions = data.staffPermissions;
  if (data.directorSpecialization !== undefined) profileUpdates.director_specialization = data.directorSpecialization;
  if (data.status !== undefined) profileUpdates.status = data.status;

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('users_profiles')
      .update(profileUpdates)
      .eq('id', uid);
    if (profileError) throw profileError;
  }

  const playerUpdates: any = {};
  if (data.name !== undefined) {
    playerUpdates.nombre = data.name.split(' ')[0] || data.name;
    playerUpdates.apellidos = data.name.split(' ').slice(1).join(' ') || '';
  }
  if (data.dni !== undefined) playerUpdates.dni = data.dni;
  if (data.birthDate !== undefined) playerUpdates.fecha_nacimiento = data.birthDate;

  if (data.tutorName !== undefined || data.tutorPhone !== undefined || data.tutorEmail !== undefined) {
    playerUpdates.datos_tutor = {
      tutorName: data.tutorName || '',
      tutorPhone: data.tutorPhone || '',
      tutorEmail: data.tutorEmail || ''
    };
  }

  if (Object.keys(playerUpdates).length > 0) {
    const { error: playerError } = await supabase
      .from('players')
      .update(playerUpdates)
      .eq('id', uid);
    
    // Ignore if not a player profile
    if (playerError) {
      console.log("Ignored players table update (user might not be a player):", playerError.message);
    }
  }
};
