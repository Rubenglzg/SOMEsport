import { supabase } from './supabase';

export interface Team {
  id?: string;
  clubId: string;
  name: string;
  category: string;
  sportType?: string; // Ej: 'Fútbol', 'Baloncesto'
  createdAt: string;
  playerIds: string[]; // UIDs of players assigned to this team
}

export const createTeam = async (clubId: string, name: string, category: string = 'Sin categoría', sportType: string = 'Fútbol'): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      club_id: clubId,
      nombre: name,
      categoria: category,
      temporada: '2025/2026' // Temporada por defecto
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating team:", error.message);
    throw error;
  }

  return {
    id: data.id,
    clubId: data.club_id,
    name: data.nombre,
    category: data.categoria,
    sportType: sportType,
    createdAt: data.created_at,
    playerIds: []
  };
};

export const getTeamsByClub = async (clubId: string): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id,
      club_id,
      nombre,
      categoria,
      created_at,
      team_players (
        player_id
      )
    `)
    .eq('club_id', clubId);

  if (error) {
    console.error("Error getting teams by club:", error.message);
    throw error;
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    clubId: t.club_id,
    name: t.nombre,
    category: t.categoria,
    sportType: 'Fútbol',
    createdAt: t.created_at,
    playerIds: (t.team_players || []).map((tp: any) => tp.player_id)
  } as Team));
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw error;
};

export const assignPlayerToTeam = async (teamId: string, playerId: string): Promise<void> => {
  // Primero comprobamos si ya está asignado para evitar errores de clave primaria duplicada
  const { data } = await supabase
    .from('team_players')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (!data) {
    const { error } = await supabase
      .from('team_players')
      .insert({
        team_id: teamId,
        player_id: playerId
      });

    if (error) throw error;
  }
};

export const removePlayerFromTeam = async (teamId: string, playerId: string): Promise<void> => {
  const { error } = await supabase
    .from('team_players')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', playerId);

  if (error) throw error;
};

export const getPlayerTeam = async (playerId: string): Promise<Team | null> => {
  const { data, error } = await supabase
    .from('team_players')
    .select(`
      team_id,
      teams (
        id,
        club_id,
        nombre,
        categoria,
        created_at
      )
    `)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error || !data || !data.teams) {
    return null;
  }

  const t = data.teams as any;

  // Obtenemos los demás jugadores del mismo equipo
  const { data: siblingData } = await supabase
    .from('team_players')
    .select('player_id')
    .eq('team_id', t.id);

  return {
    id: t.id,
    clubId: t.club_id,
    name: t.nombre,
    category: t.categoria,
    sportType: 'Fútbol',
    createdAt: t.created_at,
    playerIds: (siblingData || []).map((tp: any) => tp.player_id)
  };
};
