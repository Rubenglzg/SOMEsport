import { useState, useEffect } from 'react';
import { Building2, Users, CheckCircle, AlertCircle, TrendingUp, ArrowRight, Activity, Megaphone, Calendar, Clock, FileText } from 'lucide-react';
import { getClubs, getAllPlayers } from '../../lib/userService';
import type { UserProfile } from '../../store/authStore';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const [clubs, setClubs] = useState<UserProfile[]>([]);
  const [allPlayers, setAllPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clubsData, playersData] = await Promise.all([getClubs(), getAllPlayers()]);
        setClubs(clubsData);
        setAllPlayers(playersData);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activePlayersCount = allPlayers.filter(p => p.status === 'Activo' || p.status === 'Aprobada').length;
  const pendingPlayersCount = allPlayers.filter(p => p.status === 'Pendiente').length;
  const pendingPlayersList = allPlayers.filter(p => p.status === 'Pendiente').slice(0, 3);
  const approvalRate = allPlayers.length > 0 ? Math.round((activePlayersCount / allPlayers.length) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative h-56 rounded-3xl overflow-hidden shadow-md">
        <img src="/images/banners/soccer.png" alt="Admin Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex items-end">
          <div className="p-8 w-full">
            <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">Panel de Administración</h1>
            <p className="text-slate-200 mt-2 text-lg font-medium">Visión global de todos los clubes, jugadores y métricas del sistema.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clubes" value={loading ? "-" : clubs.length.toString()} icon={<Building2 className="w-6 h-6 text-indigo-600" />} trend="Registrados en plataforma" />
        <StatCard title="Total Fichas" value={loading ? "-" : allPlayers.length.toString()} icon={<Users className="w-6 h-6 text-blue-600" />} trend="Jugadores y Tutores" />
        <StatCard title="Fichas Aprobadas" value={loading ? "-" : activePlayersCount.toString()} icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} trend="Listos para competir" trendColor="text-emerald-600" />
        <StatCard title="Pendientes" value={loading ? "-" : pendingPlayersCount.toString()} icon={<AlertCircle className="w-6 h-6 text-amber-600" />} trend="Requieren acción inmediata" trendColor="text-amber-600" />
      </div>

      {/* Main Grid: Pending Action Center & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Action Center */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Centro de Acción: Fichas Pendientes
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                {pendingPlayersCount} pendientes
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-sm text-slate-500">Cargando solicitudes...</span>
              </div>
            ) : pendingPlayersList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-900 text-sm">¡Al día!</p>
                <p className="text-xs text-slate-500 mt-1">No hay fichas pendientes de aprobación.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPlayersList.map(player => {
                  const playerClub = clubs.find(c => c.uid === player.clubId);
                  return (
                    <div key={player.uid} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold text-sm shrink-0">
                          {player.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">{player.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Club: <span className="font-semibold text-slate-700">{playerClub?.name || 'Desconocido'}</span> • Categoría: <span className="font-semibold text-slate-700">{player.category || '-'}</span>
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/dashboard/players?review=${player.uid}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 bg-white border border-slate-200 hover:border-brand-500 hover:text-white hover:bg-brand-600 px-3.5 py-2 rounded-xl transition-all shadow-sm shrink-0"
                      >
                        Revisar <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!loading && pendingPlayersCount > 3 && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-right">
              <Link to="/dashboard/players?status=Pendiente" className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                Ver las {pendingPlayersCount} fichas pendientes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Accesos Rápidos</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickLink to="/dashboard/clubs" icon={<Building2 className="w-5 h-5" />} title="Gestionar Clubes" desc="Crear, editar y eliminar clubes" color="indigo" />
            <QuickLink to="/dashboard/players" icon={<Users className="w-5 h-5" />} title="Ver Jugadores" desc="Directorio global de fichas" color="blue" />
            <QuickLink to="/dashboard/stats" icon={<TrendingUp className="w-5 h-5" />} title="Estadísticas" desc="Métricas y exportar datos" color="brand" />
            <QuickLink to="/dashboard/activity" icon={<Activity className="w-5 h-5" />} title="Actividad" desc="Registro de acciones" color="slate" />
            <QuickLink to="/dashboard/announcements" icon={<Megaphone className="w-5 h-5" />} title="Comunicados" desc="Avisos globales" color="amber" />
            <QuickLink to="/dashboard/seasons" icon={<Calendar className="w-5 h-5" />} title="Temporadas" desc="Gestionar temporadas" color="brand" />
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Clubs & Dynamic Approval Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clubs */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Últimos Clubes Registrados</h2>
            <Link to="/dashboard/clubs" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">Ver todos <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><span className="text-xs text-slate-500">Cargando clubes...</span></div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No hay clubes registrados.</div>
          ) : (
            <div className="space-y-2">
              {clubs.slice(0, 4).map(club => (
                <div key={club.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                      {club.photoURL ? (
                        <img src={club.photoURL} alt={club.name} className="w-full h-full object-cover" />
                      ) : (
                        club.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm leading-tight">{club.name}</p>
                      <p className="text-xs text-slate-500 mt-1">@{club.username}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{club.createdAt ? new Date(club.createdAt).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Statistics Visual Breakdown */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
            <FileText className="w-64 h-64" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-brand-400" /> Tasa de Aprobación Global
            </h3>
            <p className="text-xs text-slate-300 font-medium mb-6">Proporción de jugadores activos que cumplen todos los requisitos y están federados.</p>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2 font-semibold">
                  <span className="text-slate-300">Fichas Aprobadas / Activas</span>
                  <span className="text-brand-400">{approvalRate}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-brand-500 h-full rounded-full transition-all duration-1000" style={{ width: `${approvalRate}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Aprobadas</span>
                  <p className="text-lg font-black text-emerald-400 mt-1">{loading ? '-' : activePlayersCount}</p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pendientes</span>
                  <p className="text-lg font-black text-amber-400 mt-1">{loading ? '-' : pendingPlayersCount}</p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">En Trámite</span>
                  <p className="text-lg font-black text-blue-400 mt-1">{loading ? '-' : allPlayers.filter(p => p.status === 'En Proceso').length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-right relative z-20">
            <Link to="/dashboard/stats" className="text-xs font-bold text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 cursor-pointer">
              Ver panel de métricas completo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
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

function QuickLink({ to, icon, title, desc, color }: { to: string, icon: React.ReactNode, title: string, desc: string, color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    brand: 'bg-brand-50 text-brand-600',
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-600',
  };

  const badgeColor = colorMap[color] || 'bg-slate-100 text-slate-600';

  return (
    <Link to={to} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group">
      <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform shrink-0 ${badgeColor}`}>{icon}</div>
      <div className="overflow-hidden">
        <p className="font-bold text-slate-900 text-sm leading-snug truncate">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors shrink-0" />
    </Link>
  );
}

