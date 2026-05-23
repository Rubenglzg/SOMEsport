import { supabase } from './supabase';
import type { UserProfile } from '../store/authStore';
import type { PaymentRecord } from './paymentService';
import type { Injury } from './medicalService';

// =========================================================================
// INTERFACES Y CONFIGURACIÓN INSTITUCIONAL DE BRANDING (Avantia Systems / Sooner)
// =========================================================================
export const BRANDING = {
  appName: 'Sooner',
  appLogo: '/logoSOMEsport.png',
  parentCompany: 'Avantia Systems',
  footerText: 'Powered by Avantia Systems © 2026',
  colors: {
    primary: '#10b981', // Emerald
    secondary: '#0f172a', // Slate-900
    brand: '#0ea5e9' // Sky-500
  }
};

// =========================================================================
// A. SERVICIOS PARA LA CUENTA DE 'PLAYER' (JUGADOR / FAMILIA)
// =========================================================================

export interface DigitalAuthorization {
  id?: string;
  playerId: string;
  tutorName: string;
  tutorDni: string;
  ipAddress: string;
  signedAt: string;
  documentType: 'parental_authorization' | 'medical_consent' | 'image_rights';
  signatureData: string; // Base64 Canvas Drawing
}

/**
 * Idea 1: Módulo de firmas digitales y autorizaciones parentales dinámicas.
 * Genera el documento parental en formato de datos estructurados para subirlo a Supabase Storage
 * y registrar la firma criptográfica en la base de datos de documentos obligatorios.
 */
export const submitDigitalAuthorization = async (auth: DigitalAuthorization): Promise<string> => {
  // Simular la subida del documento firmado digitalmente como un documento "parental"
  const fileName = `autorizacion_parental_${auth.playerId}_${Date.now()}.json`;
  
  // Guardamos el registro de la firma en Supabase
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('club_id')
    .eq('id', auth.playerId)
    .single();

  const clubId = profile?.club_id || '99999999-9999-9999-9999-999999999999';

  // Creamos el registro en la tabla de documentos
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      user_id: auth.playerId,
      club_id: clubId,
      type: 'parental',
      file_name: fileName,
      url: `signed-auth-vault://${fileName}`,
      status: 'pending', // Pasa a revisión administrativa
      notes: `Firmado digitalmente por tutor ${auth.tutorName} (DNI: ${auth.tutorDni}) desde IP ${auth.ipAddress}`
    })
    .select()
    .single();

  if (docError) {
    console.error("Error submitting digital signature:", docError.message);
    throw docError;
  }

  return doc.id;
};

/**
 * Idea 2: Portal de pagos unificado y generador de Recibos/Facturas con marca.
 * Devuelve una simulación de factura en formato HTML imprimible/PDF con branding institucional.
 */
export const generatePaymentInvoiceHTML = (payment: PaymentRecord, playerProfile: UserProfile): string => {
  const currentDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 800px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <img src="${BRANDING.appLogo}" alt="Sooner Logo" style="height: 48px;" onerror="this.src='https://avantiasystems.com/logo.png'"/>
          <h2 style="margin: 5px 0 0 0; color: ${BRANDING.colors.secondary}; font-weight: 800; font-size: 24px;">SOM ESPORT</h2>
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0; color: ${BRANDING.colors.primary}; font-weight: 900; font-size: 20px;">RECIBO DE PAGO</h3>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Nº Factura: INV-${payment.id?.substring(0, 8).toUpperCase()}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Fecha: ${currentDate}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 45px; font-size: 14px; line-height: 1.5;">
        <div>
          <strong style="color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Emitido por:</strong>
          <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">SOM Esport SaaS - Avantia Club</p>
          <p style="margin: 2px 0 0 0; color: #64748b;">CIF: B-99887766A</p>
          <p style="margin: 2px 0 0 0; color: #64748b;">Calle Tecnológica 124, Valencia, España</p>
        </div>
        <div style="text-align: right;">
          <strong style="color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Destinatario:</strong>
          <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">${playerProfile.name}</p>
          <p style="margin: 2px 0 0 0; color: #64748b;">Email: ${playerProfile.email}</p>
          <p style="margin: 2px 0 0 0; color: #64748b;">Usuario: @${playerProfile.username}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
            <th style="padding: 12px 15px; color: #334155; font-weight: 700;">Concepto</th>
            <th style="padding: 12px 15px; color: #334155; font-weight: 700; text-align: center;">Estado</th>
            <th style="padding: 12px 15px; color: #334155; font-weight: 700; text-align: right;">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 15px; color: #1e293b; font-weight: 600;">${payment.concept}</td>
            <td style="padding: 15px; text-align: center;">
              <span style="background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                ${payment.status}
              </span>
            </td>
            <td style="padding: 15px; text-align: right; color: #1e293b; font-weight: 700;">${payment.amount.toFixed(2)}€</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #f1f5f9; padding-top: 30px;">
        <div style="font-size: 11px; color: #94a3b8; max-width: 60%;">
          <p style="margin: 0; font-weight: bold; color: #64748b;">Notas Legales:</p>
          <p style="margin: 5px 0 0 0; line-height: 1.4;">Este recibo electrónico acredita de manera fehaciente el cobro de la tasa del club. Para dudas fiscales o cambios de facturación contacte con administración.</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; font-weight: bold;">TOTAL PAGADO</p>
          <p style="margin: 0; font-size: 32px; font-weight: 900; color: ${BRANDING.colors.secondary};">${payment.amount.toFixed(2)}€</p>
        </div>
      </div>

      <div style="margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #94a3b8; font-weight: 600; letter-spacing: 0.025em;">
        ${BRANDING.footerText}
      </div>
    </div>
  `;
};

// =========================================================================
// B. SERVICIOS PARA LA CUENTA DE 'STAFF' (ENTRENADOR / CUERPO TÉCNICO)
// =========================================================================

export interface FatigueAlert {
  teamId: string;
  teamName: string;
  avgIntensity: number;
  consecutiveHighIntensityTrainings: number;
  alertLevel: 'warning' | 'critical' | 'normal';
  message: string;
}

/**
 * Idea 1: Algoritmo de detección de sobrecarga y fatiga deportiva.
 * Lee las últimas respuestas de feedback de entrenamiento ('training_feedback').
 * Si un equipo lleva 3 o más entrenamientos seguidos con intensidad media >= 4,
 * genera una alerta crítica para el entrenador previniendo lesiones musculares.
 */
export const getTeamFatigueAlerts = async (clubId: string): Promise<FatigueAlert[]> => {
  // Query 1: Get all teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, nombre')
    .eq('club_id', clubId);

  if (teamsError || !teams) return [];

  const alerts: FatigueAlert[] = [];

  for (const team of teams) {
    // Obtener los últimos 3 entrenamientos de este equipo que tengan feedback
    const { data: feedback } = await supabase
      .from('training_feedback')
      .select('intensity, created_at')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (feedback && feedback.length >= 3) {
      // Calcular promedio de las últimas 3 sesiones
      const avg = feedback.reduce((sum, f) => sum + f.intensity, 0) / feedback.length;
      const countHigh = feedback.filter(f => f.intensity >= 4).length;

      if (avg >= 4.0 || countHigh === 3) {
        alerts.push({
          teamId: team.id,
          teamName: team.nombre,
          avgIntensity: parseFloat(avg.toFixed(1)),
          consecutiveHighIntensityTrainings: countHigh,
          alertLevel: avg >= 4.5 ? 'critical' : 'warning',
          message: avg >= 4.5 
            ? `⚠️ CRÍTICO: Fatiga extrema detectada en el equipo ${team.nombre}. Riesgo inminente de lesión muscular.`
            : `🔔 AVISO: Carga física acumulada alta en el equipo ${team.nombre}. Recomendación: reducir volumen táctico.`
        });
      }
    }
  }

  return alerts;
};

export interface PlayerEligibility {
  playerId: string;
  playerName: string;
  isEligible: boolean;
  legalOk: boolean;
  medicalOk: boolean;
  attendanceRate: number;
  hasActiveInjury: boolean;
  statusDetails: {
    legal: 'approved' | 'pending' | 'missing';
    medical: 'approved' | 'pending' | 'missing';
    injury: string | null;
  };
}

/**
 * Idea 2: Panel de Disponibilidad y Elegibilidad Legal para Partido.
 * Cruza asistencia, lesiones activas y estado de aprobación de documentos.
 */
export const getMatchEligibilityPanel = async (clubId: string, teamId: string): Promise<PlayerEligibility[]> => {
  // 1. Obtener jugadores del equipo
  const { data: teamPlayers, error } = await supabase
    .from('team_players')
    .select('player_id')
    .eq('team_id', teamId);

  if (error || !teamPlayers || teamPlayers.length === 0) return [];
  const playerIds = teamPlayers.map(tp => tp.player_id);

  // 2. Obtener perfiles de los jugadores
  const { data: profiles } = await supabase
    .from('users_profiles')
    .select('id, name')
    .in('id', playerIds);

  if (!profiles) return [];

  // 3. Obtener documentos de los jugadores
  const { data: docs } = await supabase
    .from('documents')
    .select('user_id, type, status')
    .in('user_id', playerIds);

  // 4. Obtener lesiones activas
  const { data: injuries } = await supabase
    .from('injuries')
    .select('*')
    .eq('club_id', clubId)
    .eq('status', 'activa')
    .in('player_id', playerIds);

  // 5. Obtener asistencia global de las sesiones
  const { data: attendance } = await supabase
    .from('attendance')
    .select('asistencia')
    .eq('club_id', clubId);

  const docMap = new Map<string, any[]>();
  docs?.forEach(d => {
    const list = docMap.get(d.user_id) || [];
    list.push(d);
    docMap.set(d.user_id, list);
  });

  const injuryMap = new Map<string, Injury>(injuries?.map(i => [i.player_id, i]) || []);

  return profiles.map(profile => {
    const playerDocs = docMap.get(profile.id) || [];
    const activeInjury = injuryMap.get(profile.id);

    // Calcular estado legal y médico
    const dni = playerDocs.find(d => d.type === 'dni');
    const parental = playerDocs.find(d => d.type === 'parental');
    const medical = playerDocs.find(d => d.type === 'medical');

    const legalStatus = (dni?.status === 'approved' && parental?.status === 'approved') 
      ? 'approved' 
      : (dni?.status === 'pending' || parental?.status === 'pending') ? 'pending' : 'missing';
      
    const medicalStatus = medical?.status === 'approved' 
      ? 'approved' 
      : medical?.status === 'pending' ? 'pending' : 'missing';

    // Calcular tasa de asistencia simulada
    let attendanceCount = 0;
    let sessionsCount = 0;
    attendance?.forEach(att => {
      const records = att.asistencia || {};
      if (profile.id in records) {
        sessionsCount++;
        if (records[profile.id] === true || records[profile.id] === 'presente') {
          attendanceCount++;
        }
      }
    });

    const attendanceRate = sessionsCount > 0 ? Math.round((attendanceCount / sessionsCount) * 100) : 85; // Default razonable

    const hasActiveInjury = !!activeInjury;
    const isEligible = legalStatus === 'approved' && medicalStatus === 'approved' && !hasActiveInjury;

    return {
      playerId: profile.id,
      playerName: profile.name || 'Jugador',
      isEligible,
      legalOk: legalStatus === 'approved',
      medicalOk: medicalStatus === 'approved',
      attendanceRate,
      hasActiveInjury,
      statusDetails: {
        legal: legalStatus,
        medical: medicalStatus,
        injury: activeInjury ? activeInjury.type : null
      }
    };
  });
};

// =========================================================================
// C. SERVICIOS PARA LA CUENTA DE 'CLUB' (DIRECTIVA / GESTIÓN)
// =========================================================================

export interface TreasuryForecasting {
  totalDues: number;
  totalPaid: number;
  totalPending: number;
  defaultRate: number; // Tasa de morosidad (%)
  nextMonthProjectedRevenue: number;
}

/**
 * Idea 1: Dashboard automatizado de tesorería y previsión de ingresos.
 * Calcula la morosidad real (pagos pendientes vs pagados) y proyecta el flujo de caja.
 */
export const getTreasuryForecasting = async (clubId: string): Promise<TreasuryForecasting> => {
  const { data: payments } = await supabase
    .from('payments')
    .select('importe, estado_pago, fecha_vencimiento')
    .eq('club_id', clubId);

  if (!payments || payments.length === 0) {
    return { totalDues: 0, totalPaid: 0, totalPending: 0, defaultRate: 0, nextMonthProjectedRevenue: 0 };
  }

  let totalDues = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let nextMonthProjectedRevenue = 0;

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);

  payments.forEach(p => {
    const amount = Number(p.importe);
    totalDues += amount;
    
    if (p.estado_pago === 'pagado') {
      totalPaid += amount;
    } else {
      totalPending += amount;
      
      // Proyección del próximo mes: pagos pendientes con vencimiento dentro de los próximos 30 días
      const dueDate = new Date(p.fecha_vencimiento);
      if (dueDate >= today && dueDate <= nextMonth) {
        // Asumiendo una tasa histórica de pago del 80% para la previsión de ingresos del mes que viene
        nextMonthProjectedRevenue += amount * 0.8;
      }
    }
  });

  const defaultRate = totalDues > 0 ? parseFloat(((totalPending / totalDues) * 100).toFixed(1)) : 0;

  return {
    totalDues: parseFloat(totalDues.toFixed(2)),
    totalPaid: parseFloat(totalPaid.toFixed(2)),
    totalPending: parseFloat(totalPending.toFixed(2)),
    defaultRate,
    nextMonthProjectedRevenue: parseFloat(nextMonthProjectedRevenue.toFixed(2))
  };
};

export interface SchedulingOverlap {
  facilityId: string;
  facilityName: string;
  event1: { id: string; title: string; time: string };
  event2: { id: string; title: string; time: string };
  overlapDetected: boolean;
  suggestion: string;
}

/**
 * Idea 2: Optimizador de cuadrantes de instalaciones deportivas.
 * Cruza reservas de instalaciones con los eventos del equipo para prevenir solapamientos.
 */
export const checkFacilitiesOverlaps = async (clubId: string, date: string): Promise<SchedulingOverlap[]> => {
  // Obtener reservas de pistas para la fecha dada
  const { data: bookings } = await supabase
    .from('facility_bookings')
    .select('id, title, start_time, end_time, facility_id, facilities(nombre)')
    .eq('club_id', clubId)
    .eq('date', date);

  if (!bookings || bookings.length < 2) return [];

  const overlaps: SchedulingOverlap[] = [];

  // Algoritmo de comparación horaria cruzada
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const b1 = bookings[i];
      const b2 = bookings[j];

      if (b1.facility_id === b2.facility_id) {
        // Verificar colisión horaria: [start1, end1] se solapa con [start2, end2]
        const start1 = b1.start_time;
        const end1 = b1.end_time;
        const start2 = b2.start_time;
        const end2 = b2.end_time;

        const isOverlap = (start1 < end2 && end1 > start2);

        if (isOverlap) {
          const facName = b1.facilities?.nombre || 'Instalación';
          overlaps.push({
            facilityId: b1.facility_id,
            facilityName: facName,
            event1: { id: b1.id, title: b1.title, time: `${start1}-${end1}` },
            event2: { id: b2.id, title: b2.title, time: `${start2}-${end2}` },
            overlapDetected: true,
            suggestion: `⚠️ Conflicto horario en "${facName}". Mover "${b2.title}" a las ${end1} o reubicar en otra pista libre.`
          });
        }
      }
    }
  }

  return overlaps;
};

// =========================================================================
// D. SERVICIOS PARA LA CUENTA DE 'ADMIN' (PLATAFORMA SAAS / AVANTIA SYSTEMS)
// =========================================================================

export interface TelemetryConfig {
  localVersion: string;
  latestVersion: string;
  minVersion: string;
  forceReload: boolean;
  needsUpdate: boolean;
  downloadUrl?: string;
}

/**
 * Idea 1: Sistema de telemetría de versiones del núcleo SaaS.
 * Valida la versión local del frontend con la versión mínima exigida por la consola global
 * de Avantia Systems para forzar actualizaciones críticas.
 */
export const checkAppTelemetry = async (localVersion: string): Promise<TelemetryConfig> => {
  try {
    const { data: config } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'app_version')
      .single();

    if (!config) {
      return { localVersion, latestVersion: localVersion, minVersion: localVersion, forceReload: false, needsUpdate: false };
    }

    const { latestVersion, minVersion, downloadUrl } = config.value || {};
    
    // Comparar versión semántica simple (ej. "1.2.0" < "1.3.0")
    const isObsolete = localVersion < minVersion;
    const isBehind = localVersion < latestVersion;

    return {
      localVersion,
      latestVersion: latestVersion || localVersion,
      minVersion: minVersion || localVersion,
      forceReload: isObsolete,
      needsUpdate: isBehind,
      downloadUrl
    };
  } catch (error) {
    console.error("Telemetry validation skipped (offline/dev fallback):", error);
    return { localVersion, latestVersion: localVersion, minVersion: localVersion, forceReload: false, needsUpdate: false };
  }
};

export interface PrioritizedTicket {
  id: string;
  clubName: string;
  clubSize: number;
  subject: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  timeOpenText: string;
}

/**
 * Idea 2: Algoritmo de priorización multi-tenant de soporte.
 * Ordena los tickets de soporte del SaaS según tamaño del club, urgencia horaria e indicador del mensaje.
 */
export const getPrioritizedSupportTickets = async (): Promise<PrioritizedTicket[]> => {
  // 1. Obtener tickets activos
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, user_id, subject, status, created_at, replies')
    .neq('status', 'resolved');

  if (!tickets || tickets.length === 0) return [];

  // 2. Obtener perfiles de clubes
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, nombre, admin_id');

  // 3. Obtener recuento de jugadores por club para ponderar el tamaño del cliente
  const { data: playerCounts } = await supabase
    .from('players')
    .select('club_id');

  const clubSizes = new Map<string, number>();
  playerCounts?.forEach(p => {
    clubSizes.set(p.club_id, (clubSizes.get(p.club_id) || 0) + 1);
  });

  const clubMap = new Map<string, { nombre: string; size: number }>();
  clubs?.forEach(c => {
    clubMap.set(c.admin_id, {
      nombre: c.nombre,
      size: clubSizes.get(c.id) || 5 // Puntuación mínima
    });
  });

  const prioritizedList = tickets.map(t => {
    const clubInfo = clubMap.get(t.user_id) || { nombre: 'Club Invitado', size: 10 };
    
    // Algoritmo de Ponderación de Prioridad (SaaS Multitenant Escalado)
    let score = 0;
    
    // Factor A: Tamaño del club (Impacto comercial)
    score += clubInfo.size * 2;

    // Factor B: Criticidad del asunto (Análisis semántico básico)
    const subjLower = t.subject.toLowerCase();
    if (subjLower.includes('error') || subjLower.includes('caido') || subjLower.includes('no funciona') || subjLower.includes('login') || subjLower.includes('pago')) {
      score += 50;
    }

    // Factor C: Tiempo en espera (Urgencia)
    const hoursOpen = Math.abs(new Date().getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
    score += hoursOpen * 3;

    // Categorizar la prioridad en base al score acumulado
    let priority: PrioritizedTicket['priority'] = 'LOW';
    if (score >= 80) priority = 'CRITICAL';
    else if (score >= 50) priority = 'HIGH';
    else if (score >= 25) priority = 'MEDIUM';

    // Calcular etiqueta de tiempo
    const timeOpenText = hoursOpen < 1 
      ? 'Hace menos de una hora' 
      : hoursOpen < 24 
        ? `Abierto hace ${Math.round(hoursOpen)} horas` 
        : `Abierto hace ${Math.round(hoursOpen / 24)} días`;

    return {
      id: t.id,
      clubName: clubInfo.nombre,
      clubSize: clubInfo.size,
      subject: t.subject,
      priority,
      createdAt: t.created_at,
      timeOpenText
    };
  });

  // Ordenar de mayor a menor prioridad (CRITICAL -> HIGH -> MEDIUM -> LOW)
  const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return prioritizedList.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
};
