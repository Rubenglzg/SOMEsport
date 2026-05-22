import { useState, useEffect } from 'react';
import { FileText, Bell, Loader2, CreditCard, Shield, Users, ArrowRight, CalendarDays, Mail, History, Trophy, Award, Zap, Clock, Star, Sparkles, Activity } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getPlayerDocuments, type PlayerDocument } from '../../lib/storageService';
import { getPlayerPayments } from '../../lib/paymentService';
import { getPlayerTeam, type Team } from '../../lib/teamsService';
import { Link } from 'react-router-dom';
import { getClubEvents } from '../../lib/eventsService';
import { getSeasons } from '../../lib/seasonsService';

export function PlayerDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const [clubName, setClubName] = useState<string>('Cargando...');
  const [clubSportType, setClubSportType] = useState('soccer');
  const [documents, setDocuments] = useState<PlayerDocument[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [childName, setChildName] = useState('');
  const [childStatus, setChildStatus] = useState('Pendiente');

  // season statistics state
  const [stats, setStats] = useState({
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    minutesPlayed: 0,
    avgRating: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (!profile) return;

      if (profile.clubId) {
        try {
          const clubDoc = await getDoc(doc(db, 'users', profile.clubId));
          if (clubDoc.exists()) {
            setClubName(clubDoc.data().name || 'Club Desconocido');
            setClubSportType(clubDoc.data().sportType || 'soccer');
          } else {
            setClubName('Club no encontrado');
          }
        } catch { setClubName('Error al cargar club'); }
      } else {
        setClubName('Sin club asignado');
      }

      const targetPlayerUid = profile.accountType === 'tutor' ? profile.fichaId : profile.uid;

      if (profile.accountType === 'tutor' && profile.fichaId) {
        try {
          const childDoc = await getDoc(doc(db, 'users', profile.fichaId));
          if (childDoc.exists()) {
            setChildName(childDoc.data().name || '');
            setChildStatus(childDoc.data().status || 'Pendiente');
          }
        } catch (e) {
          console.error("Error loading child profile:", e);
        }
      }

      if (targetPlayerUid) {
        try {
          const [docs, pmtRecs, teamData, seasonsData] = await Promise.all([
            getPlayerDocuments(targetPlayerUid),
            getPlayerPayments(targetPlayerUid),
            getPlayerTeam(targetPlayerUid),
            getSeasons()
          ]);
          setDocuments(docs);
          const active = seasonsData.find(s => s.isActive) || seasonsData[0] || null;
          const seasonName = active?.name || '2023-2024';
          setPaymentSuccess(pmtRecs.some(p => p.season === seasonName));
          if (teamData) setTeam(teamData);

          // Load matches stats
          if (profile.clubId) {
            const allEvs = await getClubEvents(profile.clubId);
            const matches = allEvs.filter(e => e.type === 'match' && e.playerStats && e.playerStats[targetPlayerUid]);
            
            let matchesPlayed = 0;
            let goals = 0;
            let assists = 0;
            let yellowCards = 0;
            let redCards = 0;
            let minutesPlayed = 0;
            let ratingSum = 0;
            let ratingCount = 0;

            matches.forEach(m => {
              const ps = m.playerStats![targetPlayerUid];
              if (ps) {
                matchesPlayed++;
                goals += ps.goals || 0;
                assists += ps.assists || 0;
                yellowCards += ps.yellowCards || 0;
                redCards += ps.redCards || 0;
                minutesPlayed += ps.minutesPlayed || 0;
                if (ps.rating) {
                  ratingSum += ps.rating;
                  ratingCount++;
                }
              }
            });

            setStats({
              matchesPlayed,
              goals,
              assists,
              yellowCards,
              redCards,
              minutesPlayed,
              avgRating: ratingCount > 0 ? parseFloat((ratingSum / ratingCount).toFixed(1)) : 0
            });
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
        }
      }
    };
    loadData();
  }, [profile?.uid, profile?.clubId, profile?.fichaId]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const getBannerImage = () => {
    switch (clubSportType) {
      case 'basketball': return '/images/banners/basketball.png';
      case 'futsal': return '/images/banners/futsal.png';
      default: return '/images/banners/soccer.png';
    }
  };

  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const isAdultPlayer = profile.accountType === 'tutor' ? false : profile.isAdult;
  const totalDocs = isAdultPlayer ? 2 : 3;

  const displayName = profile.accountType === 'tutor' ? `${profile.name} (Tutor de ${childName || 'Jugador'}) 👥` : profile.name;
  const displayStatus = profile.accountType === 'tutor' ? childStatus : profile.status;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Hero Card */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          <img src={getBannerImage()} alt="Sport Banner" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform duration-700">
          <Shield className="w-48 h-48" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-sm font-semibold mb-6 border border-white/10">
            <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] ${
              displayStatus === 'Aprobada' || displayStatus === 'Activo' ? 'bg-emerald-400' :
              displayStatus === 'Pendiente' ? 'bg-amber-400' : 'bg-blue-400'
            }`}></span>
            Estado de Ficha: {displayStatus || 'Pendiente'}
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold mb-2 tracking-tight">{displayName}</h2>
          <p className="text-brand-200 font-medium text-lg sm:text-xl flex items-center gap-2">
            {team ? team.category : profile.category || 'Sin categoría asignada'}
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
            <span className="capitalize">{profile.accountType || 'Jugador'}</span>
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-xs text-brand-200 uppercase tracking-wider font-semibold mb-1">Club Actual</p>
              <p className="font-bold text-lg truncate" title={clubName}>{clubName}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-xs text-brand-200 uppercase tracking-wider font-semibold mb-1">Tipo de Ficha</p>
              <p className="font-bold text-lg">{isAdultPlayer ? 'Mayor de edad' : 'Menor de edad'}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors sm:col-span-2">
              <p className="text-xs text-brand-200 uppercase tracking-wider font-semibold mb-1">Email Registrado</p>
              <p className="font-bold text-lg truncate" title={profile.email}>{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status & Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard/my-documents" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
          <div className={`p-3 rounded-xl ${approvedDocs === totalDocs ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Documentos</p>
            <p className="text-xs text-slate-500">{approvedDocs} de {totalDocs} aprobados</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>

        <Link to="/dashboard/my-payments" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
          <div className={`p-3 rounded-xl ${paymentSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Cuota</p>
            <p className="text-xs text-slate-500">{paymentSuccess ? 'Abonada' : 'Pendiente — 120€'}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>

        <Link to="/dashboard/my-team" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
          <div className={`p-3 rounded-xl ${team ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Mi Equipo</p>
            <p className="text-xs text-slate-500">{team ? team.name : 'Sin asignar'}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
      </div>

      {/* Secondary Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard/my-calendar" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-600"><CalendarDays className="w-6 h-6" /></div>
          <div className="flex-1"><p className="font-bold text-slate-900">Calendario</p><p className="text-xs text-slate-500">Próximos eventos</p></div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
        <Link to="/dashboard/my-messages" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600"><Mail className="w-6 h-6" /></div>
          <div className="flex-1"><p className="font-bold text-slate-900">Buzón</p><p className="text-xs text-slate-500">Comunicados del club</p></div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
        <Link to="/dashboard/my-history" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-600"><History className="w-6 h-6" /></div>
          <div className="flex-1"><p className="font-bold text-slate-900">Historial</p><p className="text-xs text-slate-500">Asistencia, pagos y docs</p></div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
      </div>

      {/* Premium Season Statistics Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Background Sparkles Decors */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy className="w-64 h-64" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-amber-400" />
              Estadísticas Acumuladas de la Temporada
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-amber-300 border border-white/5">
              <Sparkles className="w-3.5 h-3.5" /> Ficha Deportiva
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Matches Played */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Partidos</span>
                <span className="p-1 bg-blue-500/20 text-blue-300 rounded-md"><Activity className="w-3.5 h-3.5" /></span>
              </div>
              <h3 className="text-2xl font-black">{stats.matchesPlayed}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Disputados con ficha</p>
            </div>

            {/* Goals */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Goles</span>
                <span className="p-1 bg-emerald-500/20 text-emerald-300 rounded-md"><Trophy className="w-3.5 h-3.5" /></span>
              </div>
              <h3 className="text-2xl font-black">{stats.goals}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Anotados esta campaña</p>
            </div>

            {/* Assists */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Asistencias</span>
                <span className="p-1 bg-amber-500/20 text-amber-300 rounded-md"><Zap className="w-3.5 h-3.5" /></span>
              </div>
              <h3 className="text-2xl font-black">{stats.assists}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Pases de gol clave</p>
            </div>

            {/* Average Rating */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Calificación</span>
                <span className="p-1 bg-indigo-500/20 text-indigo-300 rounded-md"><Star className="w-3.5 h-3.5" /></span>
              </div>
              <h3 className="text-2xl font-black">{stats.avgRating > 0 ? `${stats.avgRating} / 10` : 'S/C'}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Valoración media staff</p>
            </div>
          </div>

          {/* Secondary stats row: minutes and cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-slate-800 text-slate-300 rounded-xl"><Clock className="w-5 h-5" /></span>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Minutos Jugados</span>
                  <span className="text-lg font-extrabold">{stats.minutesPlayed} min</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{stats.matchesPlayed > 0 ? `${Math.round(stats.minutesPlayed / stats.matchesPlayed)}m / partido` : ''}</span>
            </div>

            {/* Cards section */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3 sm:col-span-2 hover:bg-white/10 transition-colors">
              <span className="p-2.5 bg-slate-800 text-slate-300 rounded-xl"><Award className="w-5 h-5" /></span>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Amarillas</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-2.5 h-4 bg-amber-400 rounded-sm border border-amber-300 shadow-sm shrink-0" />
                    <span className="text-base font-extrabold">{stats.yellowCards}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rojas Directas</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-2.5 h-4 bg-red-500 rounded-sm border border-red-400 shadow-sm shrink-0" />
                    <span className="text-base font-extrabold">{stats.redCards}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notices */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Bell className="w-6 h-6 text-brand-600" />
          Avisos Recientes
        </h2>
        <div className="space-y-5">
          <div className="relative pl-5 border-l-2 border-brand-500">
            <p className="text-sm font-medium text-slate-800 mb-1">¡Bienvenido a la plataforma oficial!</p>
            <p className="text-xs text-slate-500">Por favor, sube todos los documentos necesarios lo antes posible para que el club pueda tramitar tu ficha.</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Sistema • Hace 2 días</p>
          </div>
          {!paymentSuccess && (
            <div className="relative pl-5 border-l-2 border-amber-500">
              <p className="text-sm font-medium text-slate-800 mb-1">Cuota pendiente de abono</p>
              <p className="text-xs text-slate-500">Recuerda abonar la cuota anual del club para completar tu proceso de alta.</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Tesorería • Reciente</p>
            </div>
          )}
          {approvedDocs < totalDocs && (
            <div className="relative pl-5 border-l-2 border-blue-500">
              <p className="text-sm font-medium text-slate-800 mb-1">Documentación incompleta</p>
              <p className="text-xs text-slate-500">Tienes {totalDocs - approvedDocs} documento{totalDocs - approvedDocs > 1 ? 's' : ''} pendiente{totalDocs - approvedDocs > 1 ? 's' : ''} de aprobación.</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Documentación • Reciente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

