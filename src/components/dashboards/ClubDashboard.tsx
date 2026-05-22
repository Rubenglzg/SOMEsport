import { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertCircle, CreditCard, Shield, ArrowRight, FileCheck, Building2, CalendarDays, Megaphone, ClipboardCheck, MapPin, Clock, Pin } from 'lucide-react';
import { getPlayersByClub } from '../../lib/userService';
import { getClubPendingDocuments } from '../../lib/storageService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getClubPayments, type PaymentRecord } from '../../lib/paymentService';
import { getClubEvents, type ClubEvent } from '../../lib/eventsService';
import { getClubAnnouncements, type Announcement } from '../../lib/announcementsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { Link } from 'react-router-dom';

export function ClubDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ClubEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getBannerImage = () => {
    switch (profile?.sportType) {
      case 'basketball': return '/images/banners/basketball.png';
      case 'futsal': return '/images/banners/futsal.png';
      case 'soccer':
      default: return '/images/banners/soccer.png';
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      setLoading(true);
      try {
        const [playersData, docsData, teamsData, paymentsData, eventsData, announcementsData] = await Promise.all([
          getPlayersByClub(profile.uid),
          getClubPendingDocuments(profile.uid),
          getTeamsByClub(profile.uid),
          getClubPayments(profile.uid),
          getClubEvents(profile.uid),
          getClubAnnouncements(profile.uid)
        ]);
        setPlayers(playersData);
        setPendingDocsCount(docsData.length);
        setTeams(teamsData);
        setPayments(paymentsData);

        const today = new Date().toISOString().split('T')[0];
        const upcoming = eventsData.filter(e => e.date >= today).slice(0, 5);
        setUpcomingEvents(upcoming);
        setAnnouncements(announcementsData.slice(0, 3));
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid]);

  const pendingPlayers = players.filter(p => p.status === 'Pendiente');
  const activePlayers = players.filter(p => p.status === 'Activo' || p.status === 'Aprobada');
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative h-56 rounded-3xl overflow-hidden shadow-md">
        <img src={getBannerImage()} alt="Club Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex items-end">
          <div className="p-8 w-full">
            <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">Panel de Control: {profile?.name}</h1>
            <p className="text-slate-200 mt-2 text-lg font-medium">Gestiona tu club, jugadores, equipos y finanzas.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Fichas" value={loading ? "-" : players.length.toString()} icon={<Users className="w-6 h-6 text-blue-600" />} trend="Registradas en el club" />
        <StatCard title="Pendientes" value={loading ? "-" : pendingPlayers.length.toString()} icon={<AlertCircle className="w-6 h-6 text-amber-600" />} trend="Requieren tu revisión" trendColor="text-amber-600" />
        <StatCard title="Aprobadas" value={loading ? "-" : activePlayers.length.toString()} icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} trend="Listos para jugar" trendColor="text-emerald-600" />
        <StatCard title="Recaudado" value={loading ? "-" : `${totalCollected}€`} icon={<CreditCard className="w-6 h-6 text-brand-600" />} trend={`de ${players.length * 120}€ esperados`} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLink to="/directory" icon={<Users className="w-6 h-6" />} title="Directorio" desc="Gestionar jugadores y tutores" badge={null} />
        <QuickLink to="/documents" icon={<FileCheck className="w-6 h-6" />} title="Documentos" desc="Verificar docs pendientes" badge={pendingDocsCount > 0 ? pendingDocsCount : null} />
        <QuickLink to="/teams" icon={<Shield className="w-6 h-6" />} title="Equipos" desc={`${teams.length} equipos creados`} badge={null} />
        <QuickLink to="/treasury" icon={<CreditCard className="w-6 h-6" />} title="Tesorería" desc="Control de cuotas y pagos" badge={null} />
        <QuickLink to="/my-club" icon={<Building2 className="w-6 h-6" />} title="Mi Club" desc="Configurar nombre y deporte" badge={null} />
        <QuickLink to="/calendar" icon={<CalendarDays className="w-6 h-6" />} title="Calendario" desc="Programar entrenamientos y partidos" badge={null} />
        <QuickLink to="/club-announcements" icon={<Megaphone className="w-6 h-6" />} title="Comunicados" desc="Avisos para jugadores" badge={null} />
        <QuickLink to="/attendance" icon={<ClipboardCheck className="w-6 h-6" />} title="Asistencia" desc="Pasar lista por evento" badge={null} />
      </div>

      {/* Dynamic Dashboard Sections */}
      {!loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Players & Announcements */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Players */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  Últimas Fichas
                </h2>
                <Link to="/directory" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {players.length > 0 ? (
                <div className="space-y-2">
                  {players.slice(0, 5).map(p => (
                    <div key={p.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{p.accountType || 'Jugador'}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'Activo' || p.status === 'Aprobada' ? 'text-emerald-700 bg-emerald-100' :
                        p.status === 'Pendiente' ? 'text-amber-700 bg-amber-100' : 'text-brand-700 bg-brand-100'
                      }`}>
                        {p.status || 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No hay fichas registradas aún.
                </div>
              )}
            </div>

            {/* Recent Announcements */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-brand-600" />
                  Últimos Comunicados del Club
                </h2>
                <Link to="/club-announcements" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors relative group">
                      {ann.pinned && (
                        <span className="absolute top-4 right-4 text-amber-500 flex items-center gap-1 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <Pin className="w-3 h-3 fill-current" /> Fijado
                        </span>
                      )}
                      <h3 className="font-bold text-slate-950 pr-16 text-sm group-hover:text-brand-600 transition-colors">{ann.title}</h3>
                      <p className="text-xs text-slate-650 mt-1 line-clamp-2 leading-relaxed">{ann.body}</p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50 text-[10px] text-slate-400 font-medium">
                        <span>Por {ann.authorName}</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No hay comunicados publicados.</p>
                  <Link to="/club-announcements" className="text-xs text-brand-600 font-semibold mt-2 inline-block hover:underline">
                    Publicar primer comunicado
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Upcoming Events / Agenda */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-brand-600" />
                  Próximos Eventos
                </h2>
                <Link to="/calendar" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                  Ver agenda <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {upcomingEvents.map(evt => {
                    const eventTeam = teams.find(t => t.id === evt.teamId);
                    const typeBadgeStyles = evt.type === 'match' 
                      ? 'bg-rose-100 text-rose-700 border-rose-200' 
                      : evt.type === 'training' 
                        ? 'bg-teal-100 text-teal-700 border-teal-200' 
                        : 'bg-indigo-100 text-indigo-700 border-indigo-200';
                    const typeLabel = evt.type === 'match' 
                      ? 'Partido' 
                      : evt.type === 'training' 
                        ? 'Entrenamiento' 
                        : 'Evento';

                    // Parse event date beautifully
                    const formattedDate = new Date(evt.date + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    });

                    return (
                      <div key={evt.id} className="p-4 rounded-2xl border border-slate-150 bg-white hover:border-brand-200 hover:shadow-sm transition-all group">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${typeBadgeStyles}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                            {eventTeam ? eventTeam.name : 'Club'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">{evt.title}</h3>
                        {evt.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{evt.description}</p>
                        )}
                        <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="capitalize">{formattedDate}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold">{evt.time}</span>
                          </div>
                          {evt.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{evt.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CalendarDays className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-500">No hay eventos próximos.</p>
                  <Link to="/calendar" className="text-xs text-brand-600 font-semibold mt-2 inline-block hover:underline">
                    Programar evento
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Loading skeleton standard style */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/4"></div>
              <div className="space-y-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-12 bg-slate-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse space-y-4 h-64">
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
              <div className="space-y-3">
                {[1, 2].map(n => (
                  <div key={n} className="h-20 bg-slate-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendColor = "text-slate-500" }: { title: string, value: string, icon: React.ReactNode, trend: string, trendColor?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-125 transition-transform duration-500">{icon}</div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      </div>
      <div className="relative z-10"><span className="text-4xl font-black text-slate-900 tracking-tight">{value}</span></div>
      <p className={`text-xs mt-3 font-semibold ${trendColor} relative z-10`}>{trend}</p>
    </div>
  );
}

function QuickLink({ to, icon, title, desc, badge }: { to: string, icon: React.ReactNode, title: string, desc: string, badge: number | null }) {
  return (
    <Link to={to} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group relative">
      <div className="p-3 bg-brand-100 text-brand-600 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      {badge !== null && (
        <span className="absolute top-3 right-3 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">{badge}</span>
      )}
      <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
    </Link>
  );
}
