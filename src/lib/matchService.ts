import { supabase } from './supabase';
import type { UserProfile } from '../store/authStore';

export interface MatchConvocation {
  id?: string;
  eventId: string;
  playerId: string;
  clubId: string;
  status: 'pendiente' | 'confirmado' | 'declinado';
  transportMode: 'autobus_club' | 'por_cuenta_propia';
  notes?: string;
  playerName?: string;
  playerCategory?: string;
  createdAt?: string;
}

/**
 * 1. MÓDULO DE CONVOCATORIAS Y LOGÍSTICA DE PARTIDOS ("MATCH DAY")
 */

/**
 * Recupera todas las convocatorias activas para un partido específico.
 */
export const getMatchConvocations = async (eventId: string): Promise<MatchConvocation[]> => {
  const { data, error } = await supabase
    .from('match_convocations')
    .select(`
      id,
      event_id,
      player_id,
      club_id,
      status,
      transport_mode,
      notes,
      created_at,
      users_profiles!inner (
        name,
        category
      )
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error("Error getting match convocations:", error.message);
    throw error;
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    eventId: c.event_id,
    playerId: c.player_id,
    clubId: c.club_id,
    status: c.status,
    transportMode: c.transport_mode,
    notes: c.notes || '',
    playerName: c.users_profiles?.name || 'Jugador',
    playerCategory: c.users_profiles?.category || 'Sin categoría',
    createdAt: c.created_at
  }));
};

/**
 * Convoca a múltiples jugadores de forma atómica a un partido (estado inicial 'pendiente').
 */
export const convokePlayers = async (
  eventId: string,
  clubId: string,
  playerIds: string[]
): Promise<void> => {
  if (playerIds.length === 0) return;

  const insertData = playerIds.map(playerId => ({
    event_id: eventId,
    player_id: playerId,
    club_id: clubId,
    status: 'pendiente',
    transport_mode: 'por_cuenta_propia'
  }));

  const { error } = await supabase
    .from('match_convocations')
    .insert(insertData)
    .onConflict('event_id, player_id') // Evita duplicar inserciones por concurrencia
    .ignore();

  if (error) {
    console.error("Error creating convocations:", error.message);
    throw error;
  }
};

/**
 * Permite al jugador o tutor confirmar o declinar la convocatoria con 1 clic desde el móvil.
 */
export const updatePlayerConvocationStatus = async (
  convocationId: string,
  status: 'confirmado' | 'declinado',
  transportMode: 'autobus_club' | 'por_cuenta_propia',
  notes?: string
): Promise<void> => {
  const { error } = await supabase
    .from('match_convocations')
    .update({
      status,
      transport_mode: transportMode,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', convocationId);

  if (error) {
    console.error("Error updating player convocation status:", error.message);
    throw error;
  }
};

// =========================================================================
// 2 & 3. CONTROL DE ELEGIBILIDAD, CADUCIDAD DE RECONOCIMIENTOS Y BAJAS MÉDICAS
// =========================================================================

export interface EligiblePlayerRow {
  playerId: string;
  playerName: string;
  category: string;
  isEligible: boolean; // ¿Puede jugar?
  reasonDisabled: string | null; // "Baja Médica", "Reconocimiento Vencido" o null
  medicalExpirationDate: string | null;
  daysToMedicalExpiration: number | null;
  activeInjuryType: string | null;
  attendanceRate: number;
}

/**
 * Cruza asistencia, lesiones activas (status = 'activa' o 'readaptación') y expiración de reconocimiento
 * médico para devolver una lista verde/roja de convocables con selección inhabilitada si procede.
 */
export const getMatchEligiblePlayers = async (
  clubId: string,
  teamId: string
): Promise<EligiblePlayerRow[]> => {
  // 1. Obtener jugadores del equipo
  const { data: teamPlayers, error: teamError } = await supabase
    .from('team_players')
    .select('player_id')
    .eq('team_id', teamId);

  if (teamError || !teamPlayers || teamPlayers.length === 0) return [];
  const playerIds = teamPlayers.map(tp => tp.player_id);

  // 2. Obtener perfiles de los jugadores
  const { data: profiles } = await supabase
    .from('users_profiles')
    .select('id, name, category')
    .in('id', playerIds);

  if (!profiles) return [];

  // 3. Obtener documentos de reconocimiento médico y su fecha de expiración
  const { data: medicalDocs } = await supabase
    .from('documents')
    .select('user_id, expiration_date, status')
    .eq('type', 'medical')
    .in('user_id', playerIds);

  // 4. Obtener lesiones activas ('activa' o 'readaptación')
  const { data: activeInjuries } = await supabase
    .from('injuries')
    .select('player_id, type, status')
    .eq('club_id', clubId)
    .in('status', ['activa', 'readaptación'])
    .in('player_id', playerIds);

  const docMap = new Map<string, any>(medicalDocs?.map(d => [d.user_id, d]) || []);
  const injuryMap = new Map<string, any>(activeInjuries?.map(i => [i.player_id, i]) || []);

  const today = new Date();

  return profiles.map(profile => {
    const doc = docMap.get(profile.id);
    const injury = injuryMap.get(profile.id);

    let isEligible = true;
    let reasonDisabled: string | null = null;
    let daysToMedicalExpiration: number | null = null;
    const medicalExpirationDate = doc?.expiration_date || null;

    // A. CONTROL DE BAJA MÉDICA (Lesiones activas o en readaptación)
    if (injury) {
      isEligible = false;
      reasonDisabled = 'Baja Médica';
    }

    // B. CONTROL DE CADUCIDAD DE DOCUMENTOS MÉDICOS
    if (isEligible && medicalExpirationDate) {
      const expDate = new Date(medicalExpirationDate);
      const diffTime = expDate.getTime() - today.getTime();
      daysToMedicalExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysToMedicalExpiration < 0) {
        isEligible = false;
        reasonDisabled = 'Reconocimiento Vencido';
      }
    } else if (isEligible && !medicalExpirationDate) {
      // Si no ha subido el reconocimiento médico obligatorio
      isEligible = false;
      reasonDisabled = 'Falta Documento Médico';
    }

    return {
      playerId: profile.id,
      playerName: profile.name || 'Jugador',
      category: profile.category || 'Sin categoría',
      isEligible,
      reasonDisabled,
      medicalExpirationDate,
      daysToMedicalExpiration,
      activeInjuryType: injury ? injury.type : null,
      attendanceRate: 90 // Simulación o cruce de sesiones
    };
  });
};
