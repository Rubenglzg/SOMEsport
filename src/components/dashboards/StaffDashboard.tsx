import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Shield, 
  ArrowRight, 
  CalendarDays, 
  ClipboardCheck, 
  MessageSquare,
  AlertTriangle,
  Clock,
  Activity,
  Package,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  CheckCircle2,
  HeartPulse,
  Info,
  Check,
  X,
  FileText,
  Sparkles,
  TrendingUp,
  Printer
} from 'lucide-react';
import { getPlayersByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getClubEvents, type ClubEvent, updateEvent } from '../../lib/eventsService';
import { getInjuriesByClub, type Injury } from '../../lib/medicalService';
import { getInventoryItems, getLoansByClub, approveLoan, rejectLoan, type InventoryItem, type InventoryLoan } from '../../lib/inventoryService';
import { getClubAttendanceHistory, type AttendanceSheet } from '../../lib/attendanceService';
import { getBookingsByClub, updateBookingStatus, type FacilityBooking } from '../../lib/facilitiesService';
import { createTrainingFeedback, getFeedbackByTeam, getFeedbackByClub, type TrainingFeedback } from '../../lib/feedbackService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { normalizeSport } from '../../lib/sportUtils';

export function StaffDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<InventoryLoan[]>([]);
  const [attendanceSheets, setAttendanceSheets] = useState<AttendanceSheet[]>([]);
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Formulario de Feedback (Bitácora)
  const [feedbackCategory, setFeedbackCategory] = useState<'Táctica' | 'Físico' | 'Mental' | 'General'>('General');
  const [feedbackIntensity, setFeedbackIntensity] = useState<number>(3);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [feedbackSaving, setFeedbackSaving] = useState<boolean>(false);

  // Convocatoria Rápida
  const [squadEditingEventId, setSquadEditingEventId] = useState<string | null>(null);
  const [squadSelectedPlayerIds, setSquadSelectedPlayerIds] = useState<string[]>([]);

  // Consola de Aprobación
  const [approvalsTab, setApprovalsTab] = useState<'reservas' | 'materiales'>('reservas');

  // Informe Ejecutivo Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Determinar la fecha/hora en español
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '¡Buenos días' : hour < 20 ? '¡Buenas tardes' : '¡Buenas noches';
  const formattedToday = new Intl.DateTimeFormat('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(new Date());

  const getBannerImage = () => {
    const primarySport = normalizeSport(profile?.sportType || 'Fútbol');
    switch (primarySport.toLowerCase()) {
      case 'baloncesto':
        return '/images/banners/basketball.png';
      case 'fútbol sala':
        return '/images/banners/futsal.png';
      case 'fútbol':
      default:
        return '/images/banners/soccer.png';
    }
  };

  const loadAllData = async () => {
    if (!profile?.clubId) return;
    try {
      const [
        playersData,
        teamsData,
        eventsData,
        injuriesData,
        inventoryData,
        loansData,
        attendanceData,
        bookingsData
      ] = await Promise.all([
        getPlayersByClub(profile.clubId),
        getTeamsByClub(profile.clubId),
        getClubEvents(profile.clubId),
        getInjuriesByClub(profile.clubId),
        getInventoryItems(profile.clubId),
        getLoansByClub(profile.clubId),
        getClubAttendanceHistory(profile.clubId),
        getBookingsByClub(profile.clubId)
      ]);

      setPlayers(playersData.filter(p => p.accountType === 'jugador'));
      setTeams(teamsData);
      setEvents(eventsData);
      setInjuries(injuriesData);
      setInventoryItems(inventoryData);
      setLoans(loansData);
      setAttendanceSheets(attendanceData);
      setBookings(bookingsData);
    } catch (error) {
      console.error("Error loading staff dashboard data:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadAllData();
      setLoading(false);
    };
    load();
  }, [profile?.clubId]);

  // Identificar el rol (Entrenador vs Directivo)
  const isDirector = profile?.accountType === 'directivo';
  const directorSpecialization = profile?.directorSpecialization || 'general';

  // Cargar bitácoras tácticas del equipo seleccionado
  useEffect(() => {
    const loadFeedback = async () => {
      if (isDirector) return; // Se delega al cargador del club para directivos
      if (!selectedTeamId) return;
      try {
        const feed = await getFeedbackByTeam(selectedTeamId);
        setFeedbacks(feed);
      } catch (error) {
        console.error("Error loading team feedback:", error);
      }
    };
    loadFeedback();
  }, [selectedTeamId, isDirector]);

  // Cargar todas las bitácoras tácticas para directores tácticos o generales
  useEffect(() => {
    const loadClubFeedbacks = async () => {
      if (!profile?.clubId || !isDirector) return;
      if (directorSpecialization === 'tactico' || directorSpecialization === 'general') {
        try {
          const feed = await getFeedbackByClub(profile.clubId);
          setFeedbacks(feed);
        } catch (error) {
          console.error("Error loading club feedbacks:", error);
        }
      }
    };
    loadClubFeedbacks();
  }, [profile?.clubId, isDirector, directorSpecialization]);

  const assignedSport = normalizeSport(profile?.sportType);
  const managedTeams = teams.filter(t => !assignedSport || normalizeSport(t.sportType) === normalizeSport(assignedSport));
  const teamIds = managedTeams.map(t => t.id);
  const managedPlayers = players.filter(p => p.teamId && teamIds.includes(p.teamId));

  const today = new Date().toISOString().split('T')[0];

  // -------------------------------------------------------------
  // LÓGICA DE CONFIGURACIÓN Y ENFOQUE DEL DIRECTIVO
  // -------------------------------------------------------------
  const staffPermissions = profile?.staffPermissions;
  
  // Si es Directivo, adaptamos la visualización conforme a sus permisos asignados por el club
  const hasInventoryPermission = isDirector ? (staffPermissions?.inventory?.enabled !== false) : true;
  const hasInjuriesPermission = isDirector ? (staffPermissions?.injuries?.enabled !== false) : true;
  const hasFacilitiesPermission = isDirector ? (staffPermissions?.facilities?.enabled !== false) : true;
  const hasTeamsPermission = isDirector ? (staffPermissions?.teams?.enabled !== false) : true;
  const hasCalendarPermission = isDirector ? (staffPermissions?.calendar?.enabled !== false) : true;

  // Autoconfigurar pestaña de la consola de aprobación en base a sus accesos activos
  useEffect(() => {
    if (isDirector) {
      if (hasFacilitiesPermission && !hasInventoryPermission) {
        setApprovalsTab('reservas');
      } else if (!hasFacilitiesPermission && hasInventoryPermission) {
        setApprovalsTab('materiales');
      }
    }
  }, [hasFacilitiesPermission, hasInventoryPermission, isDirector]);

  // -------------------------------------------------------------
  // LÓGICA ESPECÍFICA DE ENTRENADOR
  // -------------------------------------------------------------
  
  // Equipos asignados específicamente (por teamIds o teamId heredado)
  const assignedTeamIds = profile?.teamIds?.length 
    ? profile.teamIds 
    : (profile?.teamId ? [profile.teamId] : []);

  // Equipos que gestiona: si tiene asignados específicos usa esos, sino todos los de su deporte
  const coachManagedTeams = assignedTeamIds.length > 0
    ? teams.filter(t => assignedTeamIds.includes(t.id!))
    : managedTeams;

  // Inicializar selección de equipo activo
  useEffect(() => {
    if (!selectedTeamId && coachManagedTeams.length > 0) {
      setSelectedTeamId(coachManagedTeams[0].id!);
    }
  }, [coachManagedTeams, selectedTeamId]);

  const activeTeam = coachManagedTeams.find(t => t.id === selectedTeamId) || coachManagedTeams[0];
  const activeTeamId = activeTeam?.id;

  const teamPlayers = activeTeamId 
    ? players.filter(p => p.teamId === activeTeamId) 
    : managedPlayers;

  // Filtrar eventos del equipo/s asignado/s
  const coachEvents = events.filter(e => !e.teamId || (activeTeamId ? e.teamId === activeTeamId : teamIds.includes(e.teamId)));
  const upcomingCoachEvents = coachEvents.filter(e => e.date >= today);

  // Calcular Tasa de Asistencia del Equipo Activo
  let totalRecordsCount = 0;
  let presentCount = 0;
  const coachEventIds = coachEvents.map(e => e.id);
  
  attendanceSheets.forEach(sheet => {
    if (coachEventIds.includes(sheet.eventId)) {
      sheet.records.forEach(r => {
        totalRecordsCount++;
        if (r.status === 'present') {
          presentCount++;
        }
      });
    }
  });
  
  const teamAttendanceRate = totalRecordsCount > 0 
    ? Math.round((presentCount / totalRecordsCount) * 100) 
    : null;

  // Próximo Partido del Equipo Asignado
  const nextMatch = coachEvents
    .filter(e => e.type === 'match' && e.date >= today)
    .sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    })[0];

  let nextMatchCountdown = '';
  if (nextMatch) {
    const matchDate = new Date(nextMatch.date + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffTime = matchDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      nextMatchCountdown = `¡Hoy a las ${nextMatch.time}!`;
    } else if (diffDays === 1) {
      nextMatchCountdown = `Mañana a las ${nextMatch.time}`;
    } else {
      nextMatchCountdown = `En ${diffDays} días`;
    }
  }

  // Desplazamiento del Carrusel de Jugadores
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Generar Avatar con Iniciales e HSL coherente
  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarStyle = (name?: string) => {
    if (!name) return { backgroundColor: '#64748b' };
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hues = [200, 220, 240, 260, 280, 300, 320, 340, 15, 45, 140, 165];
    const hue = hues[Math.abs(hash) % hues.length];
    return {
      background: `linear-gradient(135deg, hsl(${hue}, 75%, 60%) 0%, hsl(${hue}, 75%, 45%) 100%)`
    };
  };

  // Calcular Tasa de Asistencia Individual
  const getPlayerAttendanceRate = (playerId: string) => {
    let total = 0;
    let present = 0;
    attendanceSheets.forEach(sheet => {
      if (coachEventIds.includes(sheet.eventId)) {
        const record = sheet.records.find(r => r.playerId === playerId);
        if (record) {
          total++;
          if (record.status === 'present') present++;
        }
      }
    });
    return total > 0 ? Math.round((present / total) * 100) : null;
  };

  // Guardar Feedback Táctico en Firestore
  const handleSaveFeedback = async () => {
    if (!selectedTeamId || !feedbackNotes.trim() || !profile) return;
    setFeedbackSaving(true);
    try {
      await createTrainingFeedback({
        clubId: profile.clubId || profile.uid || '',
        teamId: selectedTeamId,
        teamName: activeTeam?.name || 'Mi Equipo',
        coachId: profile.uid || 'Desconocido',
        coachName: profile.name || 'Entrenador',
        date: new Date().toISOString().split('T')[0],
        category: feedbackCategory,
        intensity: feedbackIntensity,
        notes: feedbackNotes.trim()
      });
      setFeedbackNotes('');
      setFeedbackIntensity(3);
      setFeedbackCategory('General');
      // Recargar bitácoras de este equipo
      const feed = await getFeedbackByTeam(selectedTeamId);
      setFeedbacks(feed);
    } catch (error) {
      console.error("Error saving training feedback:", error);
    } finally {
      setFeedbackSaving(false);
    }
  };

  // Guardar lista de convocados para un partido
  const handleSaveSquad = async (eventId: string) => {
    try {
      await updateEvent(eventId, { squadIds: squadSelectedPlayerIds });
      await loadAllData();
      setSquadEditingEventId(null);
    } catch (error) {
      console.error("Error saving match convocados:", error);
    }
  };

  // -------------------------------------------------------------
  // LÓGICA ESPECÍFICA DE DIRECTIVO
  // -------------------------------------------------------------
  const activeInjuries = injuries.filter(i => i.status === 'activa');
  const graveCount = activeInjuries.filter(i => i.severity === 'grave').length;
  const moderadaCount = activeInjuries.filter(i => i.severity === 'moderada').length;
  const leveCount = activeInjuries.filter(i => i.severity === 'leve').length;

  const lowStockItems = inventoryItems.filter(item => item.availableQuantity <= item.minThreshold);
  const activeLoans = loans.filter(l => l.status === 'prestado');

  const oneWeekLater = new Date();
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  const oneWeekLaterStr = oneWeekLater.toISOString().split('T')[0];
  const upcomingGlobalEvents = events.filter(e => e.date >= today && e.date <= oneWeekLaterStr);

  const formatSpanishDate = (dateStr: string) => {
    try {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const month = months[parseInt(parts[1], 10) - 1];
        return `${day} ${month}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Lógica para detectar reservas de instalaciones solapadas (mismo día, misma instalación, horas coincidentes)
  const findBookingConflicts = () => {
    if (!hasFacilitiesPermission) return [];
    const conflictsList: { b1: FacilityBooking; b2: FacilityBooking }[] = [];
    const approvedOrPending = bookings.filter(b => b.status === 'approved' || b.status === 'pending');
    for (let i = 0; i < approvedOrPending.length; i++) {
      for (let j = i + 1; j < approvedOrPending.length; j++) {
        const b1 = approvedOrPending[i];
        const b2 = approvedOrPending[j];
        if (b1.facilityId === b2.facilityId && b1.date === b2.date) {
          const s1 = b1.startTime;
          const e1 = b1.endTime;
          const s2 = b2.startTime;
          const e2 = b2.endTime;
          if (s1 < e2 && s2 < e1) {
            conflictsList.push({ b1, b2 });
          }
        }
      }
    }
    return conflictsList;
  };

  const conflicts = findBookingConflicts();

  // Handlers para Aprobaciones de Directivo
  const handleBookingApproval = async (bookingId: string, status: 'approved' | 'rejected') => {
    try {
      await updateBookingStatus(bookingId, status);
      await loadAllData();
    } catch (error) {
      console.error("Error updating booking approval:", error);
    }
  };

  const handleLoanApproval = async (loanId: string, approve: boolean) => {
    try {
      if (approve) {
        await approveLoan(loanId);
      } else {
        await rejectLoan(loanId);
      }
      await loadAllData();
    } catch (error) {
      console.error("Error updating loan approval:", error);
    }
  };

  // Calcular tendencia del equipo seleccionado (Entrenador)
  const teamSheets = attendanceSheets
    .map(sheet => {
      const event = events.find(e => e.id === sheet.eventId);
      return { sheet, event };
    })
    .filter(x => x.event && x.event.teamId === selectedTeamId)
    .map(x => {
      const total = x.sheet.records.length;
      const present = x.sheet.records.filter(r => r.status === 'present').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        date: x.event!.date,
        title: x.event!.title,
        rate
      };
    });

  const attendanceTrendData = teamSheets
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);

  const hasRealTrend = attendanceTrendData.length > 0;
  const displayTrendData = hasRealTrend 
    ? attendanceTrendData 
    : [
        { date: '2026-05-10', title: 'Sesión A', rate: 90 },
        { date: '2026-05-12', title: 'Sesión B', rate: 85 },
        { date: '2026-05-15', title: 'Sesión C', rate: 95 },
        { date: '2026-05-17', title: 'Sesión D', rate: 80 },
        { date: '2026-05-20', title: 'Sesión E', rate: 100 }
      ];

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const pendingLoans = loans.filter(l => l.status === 'pendiente');

  // Lógica de visualización dinámica de la consola de aprobación
  const showApprovalsConsole = isDirector && (hasFacilitiesPermission || hasInventoryPermission);

  // Contar cuántos paneles de Directivo están activos e inicializar sus tarjetas
  const activeDirectorCards = [];
  if (isDirector) {
    if (directorSpecialization === 'financiero') {
      const estimatedValue = inventoryItems.reduce((sum, item) => sum + (item.totalQuantity * 25), 0) || 12450;
      const rentalVal = bookings.filter(b => b.status === 'approved').length * 45 || 360;
      const lowStockCost = lowStockItems.length * 120 || 0;
      
      activeDirectorCards.push({
        title: "Valor Activos Inventario",
        value: loading ? '-' : `€${estimatedValue.toLocaleString('es-ES')}`,
        icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
        trend: "Valoración estimada del material disponible",
        bgColor: "bg-emerald-50/50"
      });
      activeDirectorCards.push({
        title: "Retorno Uso Pistas",
        value: loading ? '-' : `€${rentalVal.toLocaleString('es-ES')}`,
        icon: <CalendarDays className="w-6 h-6 text-indigo-600" />,
        trend: "Valor de uso estimado para pistas aprobadas",
        bgColor: "bg-indigo-50/50"
      });
      activeDirectorCards.push({
        title: "Coste Reposición Estimado",
        value: loading ? '-' : `€${lowStockCost.toLocaleString('es-ES')}`,
        icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
        trend: lowStockCost > 0 ? "Presupuesto requerido para reabastecer" : "Sin costes de reposición inmediatos",
        bgColor: "bg-amber-50/50"
      });
      activeDirectorCards.push({
        title: "Préstamos Activos",
        value: loading ? '-' : activeLoans.length.toString(),
        icon: <Package className="w-6 h-6 text-blue-600" />,
        trend: "Bienes en posesión del cuerpo técnico",
        bgColor: "bg-blue-50/50"
      });
    } 
    else if (directorSpecialization === 'tactico') {
      activeDirectorCards.push({
        title: "Plantilla del Club",
        value: loading ? '-' : players.length.toString(),
        icon: <Users className="w-6 h-6 text-indigo-600" />,
        trend: "Jugadores federados activos",
        bgColor: "bg-indigo-50/50"
      });
      activeDirectorCards.push({
        title: "Lesiones Activas",
        value: loading ? '-' : activeInjuries.length.toString(),
        icon: <HeartPulse className="w-6 h-6 text-rose-600" />,
        trend: activeInjuries.length > 0 ? `${graveCount} Graves, ${moderadaCount} Mod` : 'Sin lesionados en el club',
        bgColor: "bg-rose-50/50"
      });
      activeDirectorCards.push({
        title: "Agenda de Encuentros",
        value: loading ? '-' : upcomingGlobalEvents.length.toString(),
        icon: <CalendarDays className="w-6 h-6 text-emerald-600" />,
        trend: "Partidos y sesiones semanales",
        bgColor: "bg-emerald-50/50"
      });
      activeDirectorCards.push({
        title: "Equipos Federados",
        value: loading ? '-' : teams.length.toString(),
        icon: <Shield className="w-6 h-6 text-blue-600" />,
        trend: "Categorías competitivas activas",
        bgColor: "bg-blue-50/50"
      });
    } 
    else if (directorSpecialization === 'material') {
      activeDirectorCards.push({
        title: "Bajo Stock Almacén",
        value: loading ? '-' : lowStockItems.length.toString(),
        icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
        trend: lowStockItems.length > 0 ? 'Artículos en estado crítico' : 'Nivel de stock óptimo',
        bgColor: "bg-rose-50/50"
      });
      activeDirectorCards.push({
        title: "Autorizaciones Pendientes",
        value: loading ? '-' : (pendingBookings.length + pendingLoans.length).toString(),
        icon: <Shield className="w-6 h-6 text-amber-600" />,
        trend: "Solicitudes esperando tu aprobación",
        bgColor: "bg-amber-50/50"
      });
      activeDirectorCards.push({
        title: "Préstamos Activos",
        value: loading ? '-' : activeLoans.length.toString(),
        icon: <Package className="w-6 h-6 text-blue-600" />,
        trend: "Material asignado a técnicos",
        bgColor: "bg-blue-50/50"
      });
      activeDirectorCards.push({
        title: "Pistas Ocupadas Hoy",
        value: loading ? '-' : bookings.filter(b => b.status === 'approved' && b.date === today).length.toString(),
        icon: <CalendarDays className="w-6 h-6 text-emerald-600" />,
        trend: "Reservas aprobadas para el día de hoy",
        bgColor: "bg-emerald-50/50"
      });
    } 
    else {
      // General
      if (hasInjuriesPermission) {
        activeDirectorCards.push({
          title: "Lesiones Activas",
          value: loading ? '-' : activeInjuries.length.toString(),
          icon: <Activity className="w-6 h-6 text-rose-600" />,
          trend: activeInjuries.length > 0 ? `${graveCount} Graves, ${moderadaCount} Mod` : 'Sin lesionados en el club',
          bgColor: "bg-rose-50/50"
        });
      }
      if (hasInventoryPermission) {
        activeDirectorCards.push({
          title: "Bajo Stock en Almacén",
          value: loading ? '-' : lowStockItems.length.toString(),
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          trend: lowStockItems.length > 0 ? 'Requiere reabastecimiento' : 'Stock en niveles óptimos',
          bgColor: "bg-amber-50/50"
        });
        activeDirectorCards.push({
          title: "Préstamos Activos",
          value: loading ? '-' : activeLoans.length.toString(),
          icon: <Package className="w-6 h-6 text-blue-600" />,
          trend: "Material cedido a técnicos",
          bgColor: "bg-blue-50/50"
        });
      }
      if (hasFacilitiesPermission) {
        activeDirectorCards.push({
          title: "Reservas de Pistas",
          value: loading ? '-' : bookings.filter(b => b.status === 'approved').length.toString(),
          icon: <CalendarDays className="w-6 h-6 text-emerald-600" />,
          trend: "Reservas activas en instalaciones",
          bgColor: "bg-emerald-50/50"
        });
      } else if (hasCalendarPermission || hasTeamsPermission) {
        activeDirectorCards.push({
          title: "Eventos Semanales",
          value: loading ? '-' : upcomingGlobalEvents.length.toString(),
          icon: <CalendarDays className="w-6 h-6 text-emerald-600" />,
          trend: "Actividad de todos los deportes",
          bgColor: "bg-emerald-50/50"
        });
      }
    }
  }

  // Generar enlaces rápidos dinámicos según permisos del Directivo
  const activeQuickLinks = [];
  if (isDirector) {
    if (directorSpecialization === 'financiero') {
      activeQuickLinks.push({ to: "/dashboard/inventory", icon: <Package className="w-5 h-5" />, title: "Auditoría de Inventario", desc: "Monitoreo financiero del material", theme: "emerald" as const });
      activeQuickLinks.push({ to: "/dashboard/treasury", icon: <TrendingUp className="w-5 h-5" />, title: "Contabilidad y Cuotas", desc: "Control de ingresos y facturación", theme: "indigo" as const });
      activeQuickLinks.push({ to: "/dashboard/calendar", icon: <CalendarDays className="w-5 h-5" />, title: "Uso de Instalaciones", desc: "Retorno y costes de pistas", theme: "blue" as const });
    }
    else if (directorSpecialization === 'tactico') {
      activeQuickLinks.push({ to: "/dashboard/teams", icon: <Shield className="w-5 h-5" />, title: "Gestión de Equipos", desc: "Rendimiento y plantillas", theme: "indigo" as const });
      activeQuickLinks.push({ to: "/dashboard/injuries", icon: <HeartPulse className="w-5 h-5" />, title: "Estado Físico / Médico", desc: "Incidencias médicas del club", theme: "rose" as const });
      activeQuickLinks.push({ to: "/dashboard/calendar", icon: <CalendarDays className="w-5 h-5" />, title: "Planificación General", desc: "Entrenamientos y encuentros", theme: "emerald" as const });
      activeQuickLinks.push({ to: "/dashboard/directory", icon: <Users className="w-5 h-5" />, title: "Directorio de Socios", desc: "Fichas técnicas y cargos", theme: "blue" as const });
    }
    else if (directorSpecialization === 'material') {
      activeQuickLinks.push({ to: "/dashboard/inventory", icon: <Package className="w-5 h-5" />, title: "Control de Almacén", desc: "Entradas, salidas y alertas", theme: "amber" as const });
      activeQuickLinks.push({ to: "/dashboard/calendar", icon: <CalendarDays className="w-5 h-5" />, title: "Reserva de Instalaciones", desc: "Aprobación de uso de pistas", theme: "emerald" as const });
    }
    else {
      // General
      if (hasInventoryPermission) {
        activeQuickLinks.push({ to: "/dashboard/inventory", icon: <Package className="w-5 h-5" />, title: "Control Almacén", desc: "Stock y préstamos de material", theme: "amber" as const });
      }
      if (hasInjuriesPermission) {
        activeQuickLinks.push({ to: "/dashboard/injuries", icon: <Activity className="w-5 h-5" />, title: "Gestión Médica", desc: "Parte de lesionados general", theme: "rose" as const });
      }
      if (hasFacilitiesPermission || hasCalendarPermission || hasTeamsPermission) {
        activeQuickLinks.push({ to: "/dashboard/calendar", icon: <CalendarDays className="w-5 h-5" />, title: "Calendario del Club", desc: "Sesiones de todos los equipos", theme: "emerald" as const });
      }
      if (hasTeamsPermission) {
        activeQuickLinks.push({ to: "/dashboard/directory", icon: <Users className="w-5 h-5" />, title: "Directorio de Socios", desc: "Fichas de socios y cargos", theme: "indigo" as const });
      }
    }
  }

  // =========================================================================
  // HELPER FUNCTIONS FOR DIRECTIVO SPECIALIZED LAYOUTS
  // =========================================================================

  const getFinanceBreakdown = () => {
    let balonesVal = 0, balonesQty = 0;
    let textilVal = 0, textilQty = 0;
    let entrenoVal = 0, entrenoQty = 0;
    let porteriaVal = 0, porteriaQty = 0;
    let otrosVal = 0, otrosQty = 0;

    inventoryItems.forEach(item => {
      const name = item.name.toLowerCase();
      const qty = item.totalQuantity;
      if (name.includes('balón') || name.includes('balon') || name.includes('ball')) {
        balonesQty += qty;
        balonesVal += qty * 35;
      } else if (name.includes('camiseta') || name.includes('pantalon') || name.includes('pantalón') || name.includes('peto') || name.includes('ropa') || name.includes('medias') || name.includes('chaleco')) {
        textilQty += qty;
        textilVal += qty * 15;
      } else if (name.includes('cono') || name.includes('valla') || name.includes('pica') || name.includes('escalera') || name.includes('aro') || name.includes('chapa') || name.includes('plato')) {
        entrenoQty += qty;
        entrenoVal += qty * 8;
      } else if (name.includes('porter') || name.includes('canasta') || name.includes('red') || name.includes('poste') || name.includes('banquillo') || name.includes('marcador')) {
        porteriaQty += qty;
        porteriaVal += qty * 250;
      } else {
        otrosQty += qty;
        otrosVal += qty * 20;
      }
    });

    if (inventoryItems.length === 0) {
      return [
        { name: "Balones", val: 2450, qty: 70, color: "#4f46e5", gradient: "url(#grad-balones)" },
        { name: "Equipación/Textil", val: 3200, qty: 213, color: "#10b981", gradient: "url(#grad-textil)" },
        { name: "Entrenamiento", val: 1120, qty: 140, color: "#f59e0b", gradient: "url(#grad-entreno)" },
        { name: "Instalación", val: 4500, qty: 18, color: "#3b82f6", gradient: "url(#grad-instala)" },
        { name: "Otros/Varios", val: 1180, qty: 59, color: "#ec4899", gradient: "url(#grad-otros)" }
      ];
    }

    return [
      { name: "Balones", val: balonesVal, qty: balonesQty, color: "#4f46e5", gradient: "url(#grad-balones)" },
      { name: "Equipación/Textil", val: textilVal, qty: textilQty, color: "#10b981", gradient: "url(#grad-textil)" },
      { name: "Entrenamiento", val: entrenoVal, qty: entrenoQty, color: "#f59e0b", gradient: "url(#grad-entreno)" },
      { name: "Instalación", val: porteriaVal, qty: porteriaQty, color: "#3b82f6", gradient: "url(#grad-instala)" },
      { name: "Otros/Varios", val: otrosVal, qty: otrosQty, color: "#ec4899", gradient: "url(#grad-otros)" }
    ];
  };

  // 1. Consola de autorizaciones y aprobación de peticiones de pistas/material
  const renderApprovalsConsole = () => {
    if (!showApprovalsConsole) return null;
    return (
      <div id="seccion-aprobaciones" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mt-8 transition-all hover:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" /> Consola de Control y Autorizaciones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Aprueba o rechaza reservas de instalaciones y préstamos de material del cuerpo técnico en tiempo real</p>
          </div>
          
          {/* Mostrar pestañas selectores únicamente si el directivo tiene ambos módulos permitidos */}
          {hasFacilitiesPermission && hasInventoryPermission && (
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setApprovalsTab('reservas')}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  approvalsTab === 'reservas'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Reservas Pistas ({pendingBookings.length})
              </button>
              <button
                onClick={() => setApprovalsTab('materiales')}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  approvalsTab === 'materiales'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Préstamo Material ({pendingLoans.length})
              </button>
            </div>
          )}
        </div>

        {approvalsTab === 'reservas' ? (
          // Lógica de reservas
          hasFacilitiesPermission ? (
            pendingBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200 bg-slate-50/30">
                No hay solicitudes de pistas pendientes de aprobación.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingBookings.map(b => (
                  <div key={b.id} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:shadow transition-shadow">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50">
                          Pista Solicitada
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{formatSpanishDate(b.date)}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-950 text-sm mt-2">{b.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 font-semibold">Instalación: {b.facilityName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Entrenador: {b.coachName || 'Desconocido'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Horario: {b.startTime} - {b.endTime}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBookingApproval(b.id!, 'approved')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleBookingApproval(b.id!, 'rejected')}
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Denegar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="py-12 text-center text-slate-400 italic">Acceso no autorizado a este módulo.</div>
          )
        ) : (
          // Lógica de préstamos de materiales
          hasInventoryPermission ? (
            pendingLoans.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200 bg-slate-50/30">
                No hay solicitudes de préstamo de material pendientes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingLoans.map(l => (
                  <div key={l.id} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:shadow transition-shadow">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/50">
                          Material Solicitado
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{formatSpanishDate(l.dateBorrowed)}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-950 text-sm mt-2">{l.itemName}</h4>
                      <p className="text-xs text-slate-600 mt-1 font-semibold">Cantidad: {l.quantity} unidades</p>
                      <p className="text-xs text-slate-500 mt-0.5">Técnico: {l.coachName || 'Desconocido'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Disponibilidad actual: {inventoryItems.find(item => item.id === l.itemId)?.availableQuantity || 0} ud</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoanApproval(l.id!, true)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Autorizar
                      </button>
                      <button
                        onClick={() => handleLoanApproval(l.id!, false)}
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="py-12 text-center text-slate-400 italic">Acceso no autorizado a este módulo.</div>
          )
        )}
      </div>
    );
  };

  // 2. Panel médico de lesiones activas y su severidad
  const renderMedicalAlertDesk = () => {
    if (!hasInjuriesPermission) return null;
    return (
      <div id="seccion-medica" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between transition-all hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500 animate-pulse" /> Panel de Control Médico
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Alertas y severidad de incidentes clínicos vigentes</p>
            </div>
            <Link to="/dashboard/injuries" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando registros médicos...</div>
          ) : activeInjuries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-sm text-slate-700">¡Todo despejado!</p>
              <p className="text-xs text-slate-500">No hay lesiones activas reportadas en este momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Severity bar breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-around gap-2 text-center shadow-inner">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Grave</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{graveCount}</div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 font-medium">Moderada</span>
                  <div className="text-2xl font-black text-amber-500 mt-1">{moderadaCount}</div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 font-medium">Leve</span>
                  <div className="text-2xl font-black text-blue-500 mt-1">{leveCount}</div>
                </div>
              </div>

              {/* Short list of patients */}
              <div className="space-y-2">
                {activeInjuries.slice(0, 3).map(injury => (
                  <div key={injury.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-rose-100 rounded-xl flex items-center justify-between gap-3 transition-all duration-300">
                    <div className="overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block leading-none truncate">
                        {injury.category || 'General'}
                      </span>
                      <span className="font-extrabold text-slate-800 text-sm mt-1 block truncate">
                        {injury.playerName}
                      </span>
                      <span className="text-xs text-slate-500 font-medium capitalize mt-0.5 block leading-none">
                        Tipo: {injury.type}
                      </span>
                    </div>
                    
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize leading-tight ${
                        injury.severity === 'grave' 
                          ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                          : injury.severity === 'moderada' 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {injury.severity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Desde: {formatSpanishDate(injury.injuryDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeInjuries.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200/60 bg-rose-50/30 p-3 rounded-2xl border border-rose-100/30 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Haz seguimiento de los periodos de readaptación clínica de los jugadores. Puedes registrar visitas de progreso y autorizar altas desde el panel médico.
            </p>
          </div>
        )}
      </div>
    );
  };

  // 3. Alertas de bajo stock de almacén
  const renderInventoryAlertsWatch = () => {
    if (!hasInventoryPermission) return null;
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between transition-all hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Control Alertas de Almacén
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Productos con unidades por debajo del stock mínimo</p>
            </div>
            <Link to="/dashboard/inventory" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Ver almacén <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando inventario...</div>
          ) : lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200 flex flex-col items-center justify-center gap-2 bg-emerald-50/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-sm text-slate-700">¡Almacén Surtido!</p>
              <p className="text-xs text-slate-500">Todos los artículos disponen de existencias suficientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 4).map(item => {
                const percentage = Math.min(100, Math.round((item.availableQuantity / item.totalQuantity) * 100)) || 0;
                const isOutOfStock = item.availableQuantity === 0;

                return (
                  <div key={item.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-amber-100 rounded-xl transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="overflow-hidden">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">Ubicación: {item.location || 'Almacén general'}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {isOutOfStock ? 'AGOTADO' : 'STOCK BAJO'}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {item.availableQuantity} / {item.totalQuantity} ud
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Stock availability */}
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOutOfStock ? 'bg-rose-500' : 'bg-amber-500'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {lowStockItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Se detectaron {lowStockItems.length} artículos con desabastecimiento.
            </span>
            <Link 
              to="/dashboard/inventory" 
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              Reponer Material
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    );
  };

  // 4. Calendario y agenda del club de los próximos 7 días
  const renderGlobalAgenda = () => {
    if (!hasCalendarPermission && !hasTeamsPermission) return null;
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mt-8 transition-all hover:border-slate-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-500" /> Agenda General del Club (Próximos 7 días)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Control global de entrenamientos y partidos agendados en todas las categorías</p>
          </div>
          <Link to="/dashboard/calendar" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Ver completo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center text-slate-400">Cargando eventos...</div>
        ) : upcomingGlobalEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200 bg-slate-50/10">
            No hay entrenamientos ni partidos registrados en el club para los próximos 7 días.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGlobalEvents.slice(0, 6).map(ev => {
              const evTeam = teams.find(t => t.id === ev.teamId);

              return (
                <div key={ev.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white flex flex-col justify-between gap-3 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ev.type === 'match' 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' 
                        : ev.type === 'training' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200/50' 
                          : 'bg-amber-100 text-amber-700 border border-amber-200/50'
                    }`}>
                      {ev.type === 'match' ? 'Partido' : ev.type === 'training' ? 'Entrenamiento' : 'Evento'}
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-400">
                      {formatSpanishDate(ev.date)}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-0.5 line-clamp-1">{ev.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Hora: {ev.time} • {ev.location || 'Instalaciones del Club'}
                    </p>
                  </div>

                  {evTeam && (
                    <div className="pt-3 border-t border-slate-200/60 mt-1 flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded bg-indigo-50/20 text-indigo-600 border border-indigo-500/30 flex items-center justify-center">
                        <Shield className="w-1.5 h-1.5" />
                      </span>
                      <span className="text-xs font-bold text-slate-600">{evTeam.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 5. Consola Financiera y de Costes Avanzada con Gráfico SVG de Categorías e HSL premium
  const renderFinancialSection = () => {
    const breakdown = getFinanceBreakdown();
    const totalAssetsVal = breakdown.reduce((sum, item) => sum + item.val, 0);
    const totalQty = breakdown.reduce((sum, item) => sum + item.qty, 0);
    const annualAmortization = Math.round(totalAssetsVal * 0.25);
    const insuranceValue = Math.round(totalAssetsVal * 0.85);

    // Encontrar el valor máximo para escalar las barras del gráfico SVG
    const maxVal = Math.max(...breakdown.map(b => b.val)) || 1;

    return (
      <div id="seccion-financiera" className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-indigo-500/40">
        {/* Background decorative glowing circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                  Auditoría Financiera Activa
                </span>
                <span className="text-slate-400 text-xs font-semibold">
                  Métricas de Capital y Amortización
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2 font-sans text-white">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
                Auditoría Operativa y Control de Costes
              </h2>
            </div>
            
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
              >
                <FileText className="w-4 h-4" /> Generar Informe Impreso
              </button>
              <Link
                to="/dashboard/treasury"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                Acceso Contabilidad
              </Link>
            </div>
          </div>

          {/* Sub-tarjetas de Finanzas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-inner">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Valor Capitalizado Inventario</p>
              <p className="text-2xl font-black text-white mt-1.5">€{totalAssetsVal.toLocaleString('es-ES')}</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Cálculo de reposición de {totalQty} unidades activas</p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-inner">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Amortización Lineal Anual (25%)</p>
              <p className="text-2xl font-black text-indigo-400 mt-1.5">€{annualAmortization.toLocaleString('es-ES')}</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Desgaste y depreciación del material anual</p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-inner">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Valoración para Seguro (85%)</p>
              <p className="text-2xl font-black text-emerald-400 mt-1.5">€{insuranceValue.toLocaleString('es-ES')}</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Cobertura patrimonial estimada de activos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Gráfico SVG de Barras con gradientes */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Distribución Presupuestaria por Categoría</h4>
              
              <svg width="100%" height="240" viewBox="0 0 500 240" className="w-full h-auto">
                <defs>
                  <linearGradient id="grad-balones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="grad-textil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="grad-entreno" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="grad-instala" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <linearGradient id="grad-otros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#db2777" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="90" x2="480" y2="90" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="150" x2="480" y2="150" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="210" x2="480" y2="210" stroke="#334155" strokeWidth="1.5" />

                {/* Y-Axis Label */}
                <text x="35" y="34" fill="#64748b" fontSize="9" textAnchor="end">€{(maxVal).toLocaleString()}</text>
                <text x="35" y="124" fill="#64748b" fontSize="9" textAnchor="end">€{(maxVal / 2).toLocaleString()}</text>
                <text x="35" y="214" fill="#64748b" fontSize="9" textAnchor="end">€0</text>

                {/* Rendering Bars */}
                {breakdown.map((item, idx) => {
                  const barWidth = 44;
                  const x = 70 + idx * 85;
                  const barHeight = (item.val / maxVal) * 165 || 5;
                  const y = 210 - barHeight;

                  return (
                    <g key={idx} className="group cursor-pointer">
                      {/* Tooltip background on hover */}
                      <rect 
                        x={x - 10} 
                        y={y - 25} 
                        width={barWidth + 20} 
                        height="20" 
                        rx="4" 
                        fill="#0f172a" 
                        stroke="#334155"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                      />
                      <text 
                        x={x + barWidth / 2} 
                        y={y - 12} 
                        fill="#ffffff" 
                        fontSize="9" 
                        fontWeight="black" 
                        textAnchor="middle" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        €{item.val.toLocaleString()}
                      </text>

                      {/* Bar Rect */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        rx="6" 
                        fill={item.gradient} 
                        className="hover:brightness-110 transition-all duration-300" 
                      />

                      {/* X-Axis labels */}
                      <text 
                        x={x + barWidth / 2} 
                        y="228" 
                        fill="#94a3b8" 
                        fontSize="8.5" 
                        fontWeight="bold" 
                        textAnchor="middle"
                      >
                        {item.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* List breakdown with metrics */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Desglose de Auditoría Detallado</h4>
              
              {breakdown.map((item, idx) => {
                const percentage = totalAssetsVal > 0 ? Math.round((item.val / totalAssetsVal) * 100) : 0;
                return (
                  <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-4 transition-all hover:bg-slate-900">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-white block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold block">{item.qty} unidades inventariadas</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-xs font-black text-white block">€{item.val.toLocaleString('es-ES')}</span>
                      <span className="text-[10px] text-indigo-400 font-bold block">{percentage}% del total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 6. Panel del Directivo Táctico con feedbacks agrupados e intensidades promedio
  const renderTacticalAudits = () => {
    if (!hasInjuriesPermission && !hasTeamsPermission) return null;

    const totalLogs = feedbacks.length;
    const avgIntensity = totalLogs > 0 
      ? (feedbacks.reduce((sum, f) => sum + f.intensity, 0) / totalLogs).toFixed(1) 
      : '0.0';
    
    const catCounts = { Táctica: 0, Físico: 0, Mental: 0, General: 0 };
    feedbacks.forEach(f => {
      if (f.category in catCounts) {
        catCounts[f.category as keyof typeof catCounts]++;
      }
    });

    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mt-8 transition-all hover:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 animate-pulse" /> Auditoría del Trabajo de Campo y Bitácoras
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Control táctico del trabajo diario del cuerpo técnico y bitácoras de entrenamiento en tiempo real</p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-black text-indigo-600 flex items-center gap-1.5">
              <span>Intensidad Promedio:</span>
              <span className="text-sm text-indigo-700">{avgIntensity} / 5.0</span>
            </span>
          </div>
        </div>

        {/* Categories Pills statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(Object.keys(catCounts) as Array<keyof typeof catCounts>).map(cat => {
            const colors = {
              Táctica: 'bg-indigo-50 border-indigo-100 text-indigo-600',
              Físico: 'bg-rose-50 border-rose-100 text-rose-600',
              Mental: 'bg-blue-50 border-blue-100 text-blue-600',
              General: 'bg-amber-50 border-amber-100 text-amber-600'
            };
            return (
              <div key={cat} className={`p-3 rounded-xl border text-center ${colors[cat] || 'bg-slate-50'}`}>
                <span className="text-[10px] font-black uppercase tracking-wider block">{cat}</span>
                <span className="text-lg font-black mt-1 block">{catCounts[cat]} anotaciones</span>
              </div>
            );
          })}
        </div>

        {/* Feedbacks feed list */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 shadow-inner">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Feedbacks Recientes del Cuerpo Técnico</h4>
          {feedbacks.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No hay feedbacks o bitácoras escritas por los entrenadores del club recientemente.</p>
          ) : (
            <div className="space-y-3">
              {feedbacks.slice(0, 4).map((f, i) => {
                const categoryBadgeColor = 
                  f.category === 'Táctica' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                  f.category === 'Físico' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                  f.category === 'Mental' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-amber-100 text-amber-700 border-amber-200';

                return (
                  <div key={f.id || i} className="bg-white p-4.5 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${categoryBadgeColor}`}>
                          {f.category}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{f.teamName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">• Entrenador: {f.coachName}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-normal">{f.notes}</p>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold">{formatSpanishDate(f.date)}</span>
                      <div className="flex items-center gap-0.5 text-amber-500 font-black text-xs">
                        <span>Intensidad:</span>
                        <span>{'★'.repeat(f.intensity)}{'☆'.repeat(5 - f.intensity)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Hero Banner */}
      <div className="relative h-60 rounded-3xl overflow-hidden shadow-xl border border-slate-200/50 group">
        <img 
          src={getBannerImage()} 
          alt="Staff Banner" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent flex items-end">
          <div className="p-8 md:p-10 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-1.5 ${
                  isDirector 
                    ? 'bg-amber-500 text-slate-950 border border-amber-400' 
                    : 'bg-indigo-600 text-white border border-indigo-400'
                }`}>
                  <Shield className="w-3.5 h-3.5" />
                  {isDirector ? 'Directivo / Coordinador' : 'Entrenador'}
                </span>
                <span className="text-slate-300 text-sm font-medium border-l border-slate-700 pl-3">
                  {assignedSport || 'Multideporte'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight drop-shadow-md">
                {greeting}, {profile?.name}
              </h1>
              <p className="text-slate-300 mt-1.5 text-sm sm:text-base font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                {formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1)}
              </p>
            </div>
            
            {/* Quick action buttons adaptables */}
            <div className="shrink-0 flex gap-2">
              {!isDirector ? (
                <Link 
                  to="/dashboard/attendance" 
                  className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] text-sm"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Pasar Lista Rápido
                </Link>
              ) : (
                <>
                  {directorSpecialization === 'financiero' && (
                    <>
                      <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] text-sm border border-indigo-400/30"
                      >
                        <FileText className="w-4 h-4 text-amber-300" />
                        Generar Informe Ejecutivo
                      </button>
                      <button 
                        onClick={() => {
                          const el = document.getElementById('seccion-financiera');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-lg border border-slate-700 transition-all hover:scale-[1.02] text-sm"
                      >
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Auditoría de Costes
                      </button>
                    </>
                  )}

                  {directorSpecialization === 'tactico' && (
                    <>
                      {hasCalendarPermission && (
                        <Link 
                          to="/dashboard/calendar" 
                          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] text-sm"
                        >
                          <CalendarDays className="w-4 h-4 text-white" />
                          Planificación Deportiva
                        </Link>
                      )}
                      {hasInjuriesPermission && (
                        <button 
                          onClick={() => {
                            const el = document.getElementById('seccion-medica');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-lg border border-slate-700 transition-all hover:scale-[1.02] text-sm"
                        >
                          <HeartPulse className="w-4 h-4 text-rose-500" />
                          Censo Clínico
                        </button>
                      )}
                    </>
                  )}

                  {directorSpecialization === 'material' && (
                    <>
                      {hasInventoryPermission && (
                        <Link 
                          to="/dashboard/inventory" 
                          className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] text-sm border border-amber-400"
                        >
                          <Package className="w-4 h-4 text-slate-950" />
                          Control de Almacén
                        </Link>
                      )}
                      {showApprovalsConsole && (
                        <button 
                          onClick={() => {
                            const el = document.getElementById('seccion-aprobaciones');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-lg border border-slate-700 transition-all hover:scale-[1.02] text-sm"
                        >
                          <Shield className="w-4 h-4 text-indigo-400" />
                          Autorizaciones
                        </button>
                      )}
                    </>
                  )}

                  {directorSpecialization === 'general' && (
                    <>
                      {(hasInjuriesPermission || hasInventoryPermission) && (
                        <button 
                          onClick={() => setIsReportModalOpen(true)}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold rounded-2xl shadow-lg border border-slate-700 transition-all hover:scale-[1.02] text-sm"
                        >
                          <FileText className="w-4 h-4 text-indigo-400" />
                          Generar Informe
                        </button>
                      )}
                      {hasInventoryPermission && (
                        <Link 
                          to="/dashboard/inventory" 
                          className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] text-sm"
                        >
                          <Package className="w-4 h-4" />
                          Control de Almacén
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* VISTA DE ENTRENADOR                                           */}
      {/* ============================================================= */}
      {!isDirector && (
        <>
          {/* Coach Team Selector (if managing multiple) */}
          {!loading && coachManagedTeams.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
              <span className="text-sm font-bold text-slate-500 mr-2 shrink-0">Seleccionar Equipo:</span>
              {coachManagedTeams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id!)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
                    selectedTeamId === t.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-indigo-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Equipo Asignado" 
              value={activeTeam ? activeTeam.name : 'Sin Asignar'} 
              icon={<Shield className="w-6 h-6 text-indigo-500" />} 
              trend={activeTeam ? `Deporte: ${activeTeam.sportType}` : 'Consulta con dirección'}
              bgColor="bg-indigo-50/50"
            />
            <StatCard 
              title="Plantilla Activa" 
              value={loading ? '-' : teamPlayers.length.toString()} 
              icon={<Users className="w-6 h-6 text-blue-500" />} 
              trend="Fichas federadas activas"
              bgColor="bg-blue-50/50"
            />
            <StatCard 
              title="Tasa de Asistencia" 
              value={loading ? '-' : teamAttendanceRate !== null ? `${teamAttendanceRate}%` : 'N/A'} 
              icon={<UserCheck className="w-6 h-6 text-emerald-500" />} 
              trend={
                teamAttendanceRate !== null 
                  ? teamAttendanceRate >= 90 ? 'Excelente rendimiento' : teamAttendanceRate >= 75 ? 'Rendimiento aceptable' : 'Requiere atención' 
                  : 'Sin registros de lista'
              }
              bgColor="bg-emerald-50/50"
            />
            <StatCard 
              title="Próximo Partido" 
              value={loading ? '-' : nextMatch ? nextMatchCountdown : 'Ninguno'} 
              icon={<Clock className="w-6 h-6 text-amber-500" />} 
              trend={nextMatch ? nextMatch.title : 'Sin partidos agendados'}
              bgColor="bg-amber-50/50"
            />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickLink to="/dashboard/teams" icon={<Shield className="w-5 h-5" />} title="Gestión de Equipos" desc="Plantillas, tácticas y fichas" theme="indigo" />
            <QuickLink to="/dashboard/calendar" icon={<CalendarDays className="w-5 h-5" />} title="Calendario y Sesiones" desc="Entrenamientos y partidos" theme="blue" />
            <QuickLink to="/dashboard/attendance" icon={<ClipboardCheck className="w-5 h-5" />} title="Control de Asistencia" desc="Pasar lista e historial" theme="emerald" />
            <QuickLink to="/dashboard/injuries" icon={<HeartPulse className="w-5 h-5" />} title="Parte e Historial Médico" desc="Lesiones y recuperación" theme="rose" />
          </div>

          {/* Roster Carousel Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> Plantilla de {activeTeam?.name || 'mi equipo'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Vista rápida del estado y asistencia física de los jugadores asignados</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => scrollCarousel('left')}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button 
                  onClick={() => scrollCarousel('right')}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">Cargando plantilla...</div>
            ) : teamPlayers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200 flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-slate-300" />
                <p className="font-semibold text-sm">No hay jugadores asignados a este equipo todavía.</p>
              </div>
            ) : (
              <div 
                ref={carouselRef}
                className="flex gap-5 overflow-x-auto scrollbar-hide py-2 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {teamPlayers.map(player => {
                  const isInjured = injuries.some(i => i.playerId === player.uid && i.status === 'activa');
                  const playerAttendance = getPlayerAttendanceRate(player.uid || '');

                  return (
                    <div 
                      key={player.uid} 
                      className="flex-shrink-0 w-64 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-inner shrink-0"
                          style={getAvatarStyle(player.name)}
                        >
                          {getInitials(player.name)}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                            {player.name}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium truncate">{player.category || 'Categoría General'}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Estado de Salud:</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isInjured 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200/50' 
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isInjured ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {isInjured ? 'Lesionado' : 'Disponible'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Asistencia Física:</span>
                          <span className={`font-bold ${
                            playerAttendance !== null 
                              ? playerAttendance >= 90 ? 'text-emerald-600' : playerAttendance >= 75 ? 'text-blue-600' : 'text-amber-600'
                              : 'text-slate-400'
                          }`}>
                            {playerAttendance !== null ? `${playerAttendance}%` : 'Sin datos'}
                          </span>
                        </div>
                        
                        {/* Attendance visual mini progress bar */}
                        {playerAttendance !== null && (
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                playerAttendance >= 90 ? 'bg-emerald-500' : playerAttendance >= 75 ? 'bg-blue-500' : 'bg-amber-500'
                              }`} 
                              style={{ width: `${playerAttendance}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RENDIMIENTO Y BITÁCORA TÉCNICA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Tendencia de Compromiso */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Rendimiento de Compromiso
                </h3>
                <p className="text-xs text-slate-500 mb-4">Tasa de asistencia de las últimas 5 sesiones (partidos o entrenamientos).</p>
                
                <div className="relative h-44 w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center">
                  <svg className="w-full h-40 overflow-visible mt-2" viewBox="0 0 480 160">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines horizontal */}
                    {[0, 25, 50, 75, 100].map((val, i) => {
                      const lineY = 120 - (val / 100) * 90;
                      return (
                        <g key={i}>
                          <line 
                            x1="30" 
                            y1={lineY} 
                            x2="450" 
                            y2={lineY} 
                            stroke="#e2e8f0" 
                            strokeWidth="1" 
                            strokeDasharray="4 4"
                          />
                          <text 
                            x="20" 
                            y={lineY + 3} 
                            textAnchor="end" 
                            className="text-[9px] font-bold fill-slate-400"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Las barras */}
                    {displayTrendData.map((item, idx) => {
                      const barWidth = 35;
                      const x = 50 + idx * 80;
                      const barHeight = (item.rate / 100) * 90;
                      const y = 120 - barHeight;

                      return (
                        <g key={idx} className="group cursor-pointer">
                          {/* Track */}
                          <rect 
                            x={x} 
                            y={30} 
                            width={barWidth} 
                            height={90} 
                            fill="#f8fafc" 
                            rx={4} 
                          />
                          {/* Fill */}
                          <rect 
                            x={x} 
                            y={y} 
                            width={barWidth} 
                            height={barHeight} 
                            fill="url(#barGrad)" 
                            rx={4} 
                            className="transition-all duration-700 ease-out hover:fill-indigo-400"
                          />
                          {/* Hover rate text */}
                          <text 
                            x={x + barWidth / 2} 
                            y={y - 6} 
                            textAnchor="middle" 
                            className="text-[10px] font-extrabold fill-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            {item.rate}%
                          </text>
                          {/* Label Date */}
                          <text 
                            x={x + barWidth / 2} 
                            y={136} 
                            textAnchor="middle" 
                            className="text-[10px] font-bold fill-slate-500"
                          >
                            {formatSpanishDate(item.date)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {!hasRealTrend && (
                <div className="mt-4 p-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <p className="text-[10px] text-indigo-700 font-semibold leading-snug">
                    Ejemplo visual: Registra asistencia en tus sesiones para ver la tendencia real del equipo.
                  </p>
                </div>
              )}
            </div>

            {/* Widget de Feedback Técnico Rápido */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <MessageSquare className="w-5 h-5 text-indigo-500" /> Bitácora de Campo
                </h3>
                <p className="text-xs text-slate-500 mb-4">Registra anotaciones técnicas, rendimiento táctico e intensidad del entrenamiento.</p>
                
                <div className="space-y-4">
                  {/* Categoría */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Categoría Técnica</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Táctica', 'Físico', 'Mental', 'General'] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFeedbackCategory(cat)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                            feedbackCategory === cat
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/10'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Intensidad */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Intensidad del Trabajo (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFeedbackIntensity(num)}
                          className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                            feedbackIntensity === num
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campo de notas */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Balance del Entrenamiento</label>
                    <textarea
                      rows={2}
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      placeholder="Ej: Gran trabajo de transiciones ofensivas. Falta afinar la presión alta..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveFeedback}
                  disabled={feedbackSaving || !feedbackNotes.trim()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                >
                  {feedbackSaving ? 'Guardando...' : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Guardar Anotación
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Historial de Bitácoras Tácticas de este equipo */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3">Últimas Bitácoras del Equipo Activo</h4>
            {feedbacks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay anotaciones previas escritas para este equipo.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {feedbacks.slice(0, 3).map((f, i) => (
                  <div key={f.id || i} className="bg-white p-4 rounded-2xl border border-slate-100 text-xs space-y-2 shadow-sm">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-indigo-600 uppercase text-[9px] tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50">
                        {f.category}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {formatSpanishDate(f.date)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-normal font-semibold mt-1">{f.notes}</p>
                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-extrabold pt-1">
                      <span>Intensidad:</span>
                      <span>{'★'.repeat(f.intensity)}{'☆'.repeat(5 - f.intensity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Próximos Entrenamientos / Partidos con Convocatoria */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-slate-500" /> Próxima Agenda de Campo
                </h2>
                <Link to="/dashboard/calendar" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  Ver calendario completo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {loading ? (
                <div className="py-8 text-center text-slate-400">Cargando agenda...</div>
              ) : upcomingCoachEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200">
                  No tienes entrenamientos ni partidos agendados próximamente.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {upcomingCoachEvents.slice(0, 3).map(ev => {
                    const isMatch = ev.type === 'match';
                    const isEditingSquad = squadEditingEventId === ev.id;
                    const squadCount = ev.squadIds?.length || 0;

                    return (
                      <div key={ev.id} className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-white flex flex-col gap-4 transition-all shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                              ev.type === 'match' 
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' 
                                : ev.type === 'training' 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200/50' 
                                  : 'bg-amber-100 text-amber-700 border border-amber-200/50'
                            }`}>
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                {ev.type === 'match' ? 'PART' : ev.type === 'training' ? 'ENTR' : 'EV'}
                              </span>
                              <span className="text-xs font-black">{formatSpanishDate(ev.date).split(' ')[0]}</span>
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{ev.title}</h4>
                              <p className="text-xs text-slate-500 font-medium">
                                {formatSpanishDate(ev.date)} • {ev.time} • {ev.location || 'Instalación del Club'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {isMatch && (
                              <button
                                onClick={() => {
                                  if (isEditingSquad) {
                                    setSquadEditingEventId(null);
                                  } else {
                                    setSquadEditingEventId(ev.id!);
                                    setSquadSelectedPlayerIds(ev.squadIds || []);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  isEditingSquad
                                    ? 'bg-rose-500 text-white border-rose-500'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <Users className="w-3.5 h-3.5" />
                                {isEditingSquad ? 'Cerrar' : `Convocatoria (${squadCount})`}
                              </button>
                            )}

                            <Link 
                              to="/dashboard/attendance" 
                              className="p-2 bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"
                              title="Pasar Lista"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>

                        {/* Panel de edición de convocatoria */}
                        {isMatch && isEditingSquad && (
                          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Convocatoria del Partido</h5>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg shadow-sm">
                                {squadSelectedPlayerIds.length} Seleccionados
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                              {teamPlayers.length === 0 ? (
                                <p className="text-xs text-slate-400 italic col-span-2">No hay jugadores disponibles en la plantilla.</p>
                              ) : (
                                teamPlayers.map(player => {
                                  const isSelected = squadSelectedPlayerIds.includes(player.uid!);
                                  return (
                                    <button
                                      key={player.uid}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSquadSelectedPlayerIds(squadSelectedPlayerIds.filter(id => id !== player.uid));
                                        } else {
                                          setSquadSelectedPlayerIds([...squadSelectedPlayerIds, player.uid!]);
                                        }
                                      }}
                                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                        isSelected
                                          ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                          : 'bg-white border-slate-100 hover:border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                                        <div 
                                          className="w-6.5 h-6.5 rounded-lg flex items-center justify-center text-white font-extrabold text-[9px] shrink-0"
                                          style={getAvatarStyle(player.name)}
                                        >
                                          {getInitials(player.name)}
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 truncate">{player.name}</span>
                                      </div>
                                      
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                        isSelected 
                                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                                          : 'border-slate-300'
                                      }`}>
                                        {isSelected && <Check className="w-2.5 h-2.5" />}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => setSquadSelectedPlayerIds(teamPlayers.map(p => p.uid!))}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[9px] transition-colors"
                              >
                                Seleccionar Todos
                              </button>
                              <button
                                onClick={() => setSquadSelectedPlayerIds([])}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[9px] transition-colors"
                              >
                                Limpiar
                              </button>
                              <button
                                onClick={() => handleSaveSquad(ev.id!)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[9px] transition-colors ml-auto shadow-md"
                              >
                                Confirmar Convocatoria
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notices Panel */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-700" />
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 border border-white/10 shadow-inner">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2 flex items-center gap-2">
                  Gestión Asistencial Premium
                </h3>
                <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                  Recuerda pasar lista al finalizar o durante cada sesión deportiva. El sistema computa de manera inmediata las tasas de presencialidad y alertas de inasistencia para los familiares y la dirección del club.
                </p>
              </div>
              <div className="pt-8">
                <Link 
                  to="/dashboard/attendance" 
                  className="w-full py-3 bg-white text-indigo-700 hover:bg-indigo-50 transition-all rounded-xl font-extrabold text-sm inline-flex justify-center items-center gap-2 shadow-lg"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Pasar Lista Rápido
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================= */}
      {/* VISTA DE DIRECTIVO / COORDINADOR (ADAPTABLE POR DEPARTAMENTO) */}
      {/* ============================================================= */}
      {isDirector && (
        <>
          {/* Alertas Críticas (Centro de Control) - Adaptado a sus permisos de visualización */}
          {((hasInjuriesPermission && activeInjuries.filter(i => i.severity === 'grave').length > 0) || 
            (hasInventoryPermission && inventoryItems.filter(item => item.availableQuantity === 0).length > 0) || 
            (hasFacilitiesPermission && conflicts.length > 0)) && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-sm mb-6 animate-pulse-slow">
              <h3 className="text-sm font-black text-rose-800 flex items-center gap-2 mb-3 tracking-wider uppercase">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Centro de Control: Alertas de Operación Críticas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lesiones Graves (Sólo si tiene permiso médico) */}
                {hasInjuriesPermission && activeInjuries.filter(i => i.severity === 'grave').map(injury => (
                  <div key={injury.id} className="bg-white/80 backdrop-blur-sm border border-rose-100 p-3.5 rounded-2xl flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 mt-1.5 animate-ping" />
                    <div>
                      <h4 className="text-[10px] font-bold text-rose-800 uppercase tracking-wide">Médico: Urgencia Grave</h4>
                      <p className="text-xs text-slate-800 font-extrabold mt-1">{injury.playerName}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{injury.type} - Incidente: {formatSpanishDate(injury.injuryDate)}</p>
                    </div>
                  </div>
                ))}

                {/* Roturas Stock (Sólo si tiene permiso de inventario) */}
                {hasInventoryPermission && inventoryItems.filter(item => item.availableQuantity === 0).map(item => (
                  <div key={item.id} className="bg-white/80 backdrop-blur-sm border border-rose-100 p-3.5 rounded-2xl flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Inventario: Stock Agotado</h4>
                      <p className="text-xs text-slate-800 font-extrabold mt-1">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">Ubicación: {item.location || 'Almacén principal'}</p>
                    </div>
                  </div>
                ))}

                {/* Conflicto Pistas (Sólo si tiene permiso de instalaciones) */}
                {hasFacilitiesPermission && conflicts.slice(0, 2).map((conflict, idx) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-sm border border-rose-100 p-3.5 rounded-2xl flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <div>
                      <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Pistas: Conflicto de Horarios</h4>
                      <p className="text-xs text-slate-800 font-extrabold mt-1">Día: {formatSpanishDate(conflict.b1.date)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold leading-tight mt-0.5">
                        "{conflict.b1.title}" y "{conflict.b2.title}" coinciden en {conflict.b1.facilityName || 'Instalación'} ({conflict.b1.startTime}-{conflict.b1.endTime}).
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid - Columnas dinámicas según los módulos activos del Directivo */}
          {activeDirectorCards.length > 0 && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${activeDirectorCards.length} gap-6`}>
              {activeDirectorCards.map((card) => (
                <StatCard 
                  key={card.title}
                  title={card.title} 
                  value={card.value} 
                  icon={card.icon} 
                  trend={card.trend}
                  bgColor={card.bgColor}
                />
              ))}
            </div>
          )}

          {/* Enlaces Rápidos Dinámicos */}
          {activeQuickLinks.length > 0 && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${activeQuickLinks.length} gap-4`}>
              {activeQuickLinks.map((link, idx) => (
                <QuickLink 
                  key={idx}
                  to={link.to} 
                  icon={link.icon} 
                  title={link.title} 
                  desc={link.desc} 
                  theme={link.theme} 
                />
              ))}
            </div>
          )}

          {/* ============================================================= */}
          {/* DISTRIBUCIÓN DE MÓDULOS DE ACUERDO A LA ESPECIALIZACIÓN        */}
          {/* ============================================================= */}
          <div className="space-y-8 mt-4">
            {directorSpecialization === 'financiero' && (
              <>
                {renderFinancialSection()}
                {renderInventoryAlertsWatch()}
              </>
            )}

            {directorSpecialization === 'tactico' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderMedicalAlertDesk()}
                  {renderTacticalAudits()}
                </div>
                {renderGlobalAgenda()}
              </>
            )}

            {directorSpecialization === 'material' && (
              <>
                {renderApprovalsConsole()}
                {renderInventoryAlertsWatch()}
                {renderGlobalAgenda()}
              </>
            )}

            {directorSpecialization === 'general' && (
              <>
                {renderApprovalsConsole()}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderMedicalAlertDesk()}
                  {renderInventoryAlertsWatch()}
                </div>
                {renderGlobalAgenda()}
              </>
            )}
          </div>
        </>
      )}

      {/* ============================================================= */}
      {/* MODAL INFORME EJECUTIVO IMPRIMIBLE (ADAPTADO POR PERMISOS)     */}
      {/* ============================================================= */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:relative print:z-0">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-area, #print-area * {
                visibility: visible;
              }
              #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          
          <div id="print-area" className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 max-h-[90vh] flex flex-col justify-between print:max-h-full print:rounded-none print:shadow-none print:border-none">
            {/* Header Modal */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-base tracking-tight font-sans">Informe de Gestión Ejecutiva - AvantiaEsport</h3>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del Reporte */}
            <div className="p-8 overflow-y-auto space-y-8 print:p-0 print:overflow-visible">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">REPORTE AUDITORÍA INTERNA</h1>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Club: {profile?.name || 'Club AvantiaEsport'} • Identificador: {profile?.clubId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-600">Fecha de Generación</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{formattedToday}</p>
                </div>
              </div>

              {/* Seccion 1: Censo Clinico (Sólo si tiene permiso de lesiones) */}
              {hasInjuriesPermission && (
                <div className="space-y-4">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest border-l-4 border-rose-500 pl-2">
                    I. Censo Clínico y Estado de Lesionados
                  </h2>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Graves</span>
                      <p className="text-2xl font-black text-rose-600 mt-1">{graveCount}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moderadas</span>
                      <p className="text-2xl font-black text-amber-500 mt-1">{moderadaCount}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leves</span>
                      <p className="text-2xl font-black text-blue-500 mt-1">{leveCount}</p>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 font-bold">Jugador</th>
                        <th className="py-2.5 font-bold">Gravedad</th>
                        <th className="py-2.5 font-bold">Diagnóstico / Zona</th>
                        <th className="py-2.5 font-bold">Fecha del Incidente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeInjuries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">No hay lesiones activas reportadas en este momento.</td>
                        </tr>
                      ) : (
                        activeInjuries.map(injury => (
                          <tr key={injury.id}>
                            <td className="py-3 font-extrabold text-slate-800">{injury.playerName}</td>
                            <td className="py-3 capitalize">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                injury.severity === 'grave' 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : injury.severity === 'moderada' 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {injury.severity}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600 font-semibold">{injury.type}</td>
                            <td className="py-3 text-slate-500 font-semibold">{formatSpanishDate(injury.injuryDate)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Seccion 2: Auditoria Almacen (Sólo si tiene permiso de inventario) */}
              {hasInventoryPermission && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest border-l-4 border-indigo-500 pl-2">
                    II. Auditoría del Almacén y Control de Stock
                  </h2>
                  
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 font-bold">Artículo de Inventario</th>
                        <th className="py-2.5 font-bold">Existencias Disponibles</th>
                        <th className="py-2.5 font-bold">Umbral de Alerta</th>
                        <th className="py-2.5 font-bold">Ubicación</th>
                        <th className="py-2.5 font-bold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">No hay existencias configuradas en el almacén.</td>
                        </tr>
                      ) : (
                        inventoryItems.map(item => {
                          const low = item.availableQuantity <= item.minThreshold;
                          const out = item.availableQuantity === 0;
                          return (
                            <tr key={item.id}>
                              <td className="py-3 font-extrabold text-slate-800">{item.name}</td>
                              <td className="py-3 font-black text-slate-900">{item.availableQuantity} / {item.totalQuantity} ud</td>
                              <td className="py-3 text-slate-500 font-semibold">{item.minThreshold} ud</td>
                              <td className="py-3 text-slate-500 font-semibold">{item.location || 'Almacén general'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                  out 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : low 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {out ? 'Agotado' : low ? 'Stock Bajo' : 'Correcto'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Seccion 3: Prestamos activos (Sólo si tiene de inventario) */}
              {hasInventoryPermission && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest border-l-4 border-amber-500 pl-2">
                    III. Material Cedido y Préstamos Activos
                  </h2>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 font-bold">Artículo Prestado</th>
                        <th className="py-2.5 font-bold">Cantidad</th>
                        <th className="py-2.5 font-bold">Entrenador Responsable</th>
                        <th className="py-2.5 font-bold">Fecha del Préstamo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeLoans.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">No hay préstamos de material activos.</td>
                        </tr>
                      ) : (
                        activeLoans.map(loan => (
                          <tr key={loan.id}>
                            <td className="py-3 font-extrabold text-slate-800">{loan.itemName}</td>
                            <td className="py-3 font-black text-slate-900">{loan.quantity} ud</td>
                            <td className="py-3 text-slate-600 font-semibold">{loan.coachName}</td>
                            <td className="py-3 text-slate-500 font-semibold">{formatSpanishDate(loan.dateBorrowed)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center no-print">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                AvantiaEsport Business Analytics Suite
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir / PDF
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  bgColor = 'bg-slate-50/50' 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string;
  bgColor?: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-125 transition-transform duration-500">{icon}</div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
        <div className={`p-3 rounded-2xl ${bgColor}`}>{icon}</div>
      </div>
      <div className="relative z-10">
        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block truncate">
          {value}
        </span>
      </div>
      <p className="text-xs mt-3 font-semibold text-slate-500 relative z-10 leading-tight">
        {trend}
      </p>
    </div>
  );
}

function QuickLink({ 
  to, 
  icon, 
  title, 
  desc, 
  theme = 'indigo' 
}: { 
  to: string; 
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  theme?: 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';
}) {
  const getThemeClasses = () => {
    switch (theme) {
      case 'blue':
        return 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 hover:scale-105';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 hover:scale-105';
      case 'rose':
        return 'bg-rose-50 text-rose-600 group-hover:bg-rose-100 hover:scale-105';
      case 'amber':
        return 'bg-amber-50 text-amber-600 group-hover:bg-amber-100 hover:scale-105';
      case 'indigo':
      default:
        return 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 hover:scale-105';
    }
  };

  return (
    <Link to={to} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-4 group">
      <div className={`p-3 rounded-xl transition-all duration-300 shrink-0 ${getThemeClasses()}`}>
        {icon}
      </div>
      <div className="overflow-hidden">
        <p className="font-bold text-slate-900 text-sm truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto shrink-0 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
