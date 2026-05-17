import { useState, useEffect } from 'react';
import { Users, CheckCircle, Shield, ArrowRight, CalendarDays, ClipboardCheck, MessageSquare } from 'lucide-react';
import { getPlayersByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getClubEvents, type ClubEvent } from '../../lib/eventsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { Link } from 'react-router-dom';

export const normalizeSport = (sport: string | undefined | null): string => {
  if (!sport) return '';
  const s = sport.toLowerCase().trim();
  if (s === 'soccer' || s === 'fútbol' || s === 'futbol') return 'Fútbol';
  if (s === 'basketball' || s === 'baloncesto') return 'Baloncesto';
  if (s === 'futsal' || s === 'futbol-sala' || s === 'fútbol sala' || s === 'futbol sala') return 'Fútbol Sala';
  if (s === 'esports' || s === 'electronic sports') return 'eSports';
  if (s === 'voleibol' || s === 'volleyball') return 'Voleibol';
  if (s === 'padel' || s === 'pádel') return 'Pádel';
  if (s === 'tennis' || s === 'tenis') return 'Tenis';
  if (s === 'natación' || s === 'swimming') return 'Natación';
  return sport;
};

export function StaffDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const getBannerImage = () => {
    // Si el staff tiene algún deporte asignado, mostramos ese banner
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

  useEffect(() => {
    const load = async () => {
      if (!profile?.clubId) return;
      setLoading(true);
      try {
        const [playersData, teamsData, eventsData] = await Promise.all([
          getPlayersByClub(profile.clubId),
          getTeamsByClub(profile.clubId),
          getClubEvents(profile.clubId)
        ]);
        setPlayers(playersData.filter(p => p.accountType === 'jugador'));
        setTeams(teamsData);
        setEvents(eventsData);
      } catch (error) {
        console.error("Error loading staff dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.clubId]);

  const assignedSport = normalizeSport(profile?.sportType);
  const managedTeams = teams.filter(t => !assignedSport || normalizeSport(t.sportType) === normalizeSport(assignedSport));
  const teamIds = managedTeams.map(t => t.id);
  const managedPlayers = players.filter(p => p.teamId && teamIds.includes(p.teamId));

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.date >= today && (!e.teamId || teamIds.includes(e.teamId)));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative h-56 rounded-3xl overflow-hidden shadow-md">
        <img src={getBannerImage()} alt="Staff Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex items-end">
          <div className="p-8 w-full">
            <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">¡Hola, {profile?.name}!</h1>
            <p className="text-slate-200 mt-2 text-lg font-medium">Panel Técnico • Deporte asignado: {assignedSport || 'Todos'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Mis Equipos" value={loading ? "-" : managedTeams.length.toString()} icon={<Shield className="w-6 h-6 text-brand-600" />} trend="Equipos bajo tu tutela" />
        <StatCard title="Mis Jugadores" value={loading ? "-" : managedPlayers.length.toString()} icon={<Users className="w-6 h-6 text-blue-600" />} trend="Fichas activas asignadas" />
        <StatCard title="Próximos Eventos" value={loading ? "-" : upcomingEvents.length.toString()} icon={<CalendarDays className="w-6 h-6 text-emerald-600" />} trend="Sesiones y partidos agendados" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink to="/dashboard/teams" icon={<Shield className="w-6 h-6" />} title="Gestión Equipos" desc="Organiza plantillas y tácticas" />
        <QuickLink to="/dashboard/calendar" icon={<CalendarDays className="w-6 h-6" />} title="Calendario" desc="Crea partidos y entrenamientos" />
        <QuickLink to="/dashboard/attendance" icon={<ClipboardCheck className="w-6 h-6" />} title="Control Asistencia" desc="Pasa lista de forma interactiva" />
        <QuickLink to="/dashboard/facilities" icon={<CalendarDays className="w-6 h-6" />} title="Instalaciones" desc="Consulta y reserva pistas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Trainings/Matches */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-500" /> Próxima Agenda Técnica
            </h2>
            <Link to="/dashboard/calendar" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">Ver completo <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400">Cargando eventos...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed rounded-2xl border-slate-200">No tienes entrenamientos ni partidos agendados próximamente.</div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ev.type === 'match' ? 'bg-emerald-100 text-emerald-700' : ev.type === 'training' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ev.type === 'match' ? 'Partido' : ev.type === 'training' ? 'Entrenamiento' : 'Evento'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{ev.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{ev.date} a las {ev.time} • {ev.location || 'Sin ubicación'}</p>
                  </div>
                  {ev.teamId && (
                    <span className="text-xs font-bold text-slate-600 bg-white border px-2.5 py-1 rounded-lg">
                      {teams.find(t => t.id === ev.teamId)?.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notices */}
        <div className="bg-gradient-to-b from-brand-600 to-brand-700 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 border border-white/10"><MessageSquare className="w-6 h-6" /></div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Comunícate con tus Fichas</h3>
            <p className="text-brand-100 text-sm leading-relaxed">Pasa asistencia en cada entrenamiento o partido para llevar un histórico robusto. Los jugadores y tutores podrán ver su historial de asistencia desde su portal personal en tiempo real.</p>
          </div>
          <div className="pt-8">
            <Link to="/dashboard/attendance" className="w-full py-3 bg-white text-brand-700 hover:bg-brand-50 transition-colors rounded-xl font-bold text-sm inline-flex justify-center items-center gap-2 shadow-sm">
              <ClipboardCheck className="w-4 h-4" /> Pasar Lista Ahora
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-125 transition-transform duration-500">{icon}</div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      </div>
      <div className="relative z-10"><span className="text-4xl font-black text-slate-900 tracking-tight">{value}</span></div>
      <p className="text-xs mt-3 font-semibold text-slate-500 relative z-10">{trend}</p>
    </div>
  );
}

function QuickLink({ to, icon, title, desc }: { to: string, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Link to={to} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
      <div className="p-3 bg-brand-100 text-brand-600 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
    </Link>
  );
}
