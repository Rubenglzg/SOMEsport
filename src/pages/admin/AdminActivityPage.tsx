import { useState, useEffect } from 'react';
import { Activity, Building2, Users, CheckCircle, Clock, Loader2, CreditCard, Megaphone, Filter } from 'lucide-react';
import { getClubs, getAllPlayers } from '../../lib/userService';
import { getSeasons } from '../../lib/seasonsService';
import { getAllPayments, type PaymentRecord } from '../../lib/paymentService';
import { getGlobalAnnouncements, type Announcement } from '../../lib/announcementsService';
import type { UserProfile } from '../../store/authStore';

type ActivityType = 'all' | 'club' | 'player' | 'payment' | 'announcement' | 'season';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  color: string;
  type: ActivityType;
}

export function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clubs, players, seasons, payments, announcements] = await Promise.all([
          getClubs(),
          getAllPlayers(),
          getSeasons(),
          getAllPayments(),
          getGlobalAnnouncements()
        ]);

        const feed: ActivityItem[] = [];

        // Club registrations
        clubs.forEach((club: UserProfile) => {
          if (club.createdAt) {
            feed.push({
              id: `club-${club.uid}`,
              icon: <Building2 className="w-4 h-4" />,
              title: `Club "${club.name}" registrado`,
              description: `Email: ${club.email} • @${club.username}`,
              time: club.createdAt,
              color: 'indigo',
              type: 'club'
            });
          }
        });

        // Player registrations
        players.forEach((player: UserProfile) => {
          if (player.createdAt) {
            feed.push({
              id: `player-${player.uid}`,
              icon: <Users className="w-4 h-4" />,
              title: `Ficha "${player.name}" creada`,
              description: `Tipo: ${player.accountType || 'Jugador'} • Estado: ${player.status || 'Pendiente'}`,
              time: player.createdAt,
              color: 'blue',
              type: 'player'
            });
          }
        });

        // Approved players
        players.filter(p => p.status === 'Activo' || p.status === 'Aprobada').forEach((player: UserProfile) => {
          feed.push({
            id: `approved-${player.uid}`,
            icon: <CheckCircle className="w-4 h-4" />,
            title: `Ficha de "${player.name}" aprobada`,
            description: `Ficha activa y lista para competir`,
            time: player.createdAt || new Date().toISOString(),
            color: 'emerald',
            type: 'player'
          });
        });

        // Seasons
        seasons.forEach(s => {
          feed.push({
            id: `season-${s.id}`,
            icon: <Clock className="w-4 h-4" />,
            title: `Temporada "${s.name}" creada`,
            description: `${s.startDate} — ${s.endDate} • Cuota base: ${s.fee}€${s.isActive ? ' • ACTIVA' : ''}`,
            time: s.createdAt,
            color: 'brand',
            type: 'season'
          });
        });

        // Real payment records
        payments.forEach((payment: PaymentRecord) => {
          const player = players.find(p => p.uid === payment.userId);
          const club = clubs.find(c => c.uid === payment.clubId);
          feed.push({
            id: `payment-${payment.id}`,
            icon: <CreditCard className="w-4 h-4" />,
            title: `Pago de ${payment.amount}€ recibido`,
            description: `${player?.name || 'Jugador'} → ${club?.name || 'Club'} • ${payment.season}${payment.installmentName ? ` • ${payment.installmentName}` : ''}`,
            time: payment.paidAt,
            color: 'emerald',
            type: 'payment'
          });
        });

        // Real announcements
        announcements.forEach((ann: Announcement) => {
          const targetInfo = ann.targetClubs && ann.targetClubs.length > 0
            ? `${ann.targetClubs.length} club(es)`
            : 'Todos los clubes';
          const audienceInfo = ann.targetAudience && ann.targetAudience.length > 0
            ? ann.targetAudience.join(', ')
            : 'Todos';
          feed.push({
            id: `ann-${ann.id}`,
            icon: <Megaphone className="w-4 h-4" />,
            title: `Comunicado: "${ann.title}"`,
            description: `Por ${ann.authorName} • Destino: ${targetInfo} • Audiencia: ${audienceInfo}`,
            time: ann.createdAt,
            color: 'amber',
            type: 'announcement'
          });
        });

        // Sort by time desc
        feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivities(feed);
      } catch (error) {
        console.error("Error loading activity:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Hace unos minutos';
      if (diffHours < 24) return `Hace ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Hace ${diffDays}d`;
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    brand: { bg: 'bg-brand-100', text: 'text-brand-600', border: 'border-brand-100' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  };

  const filterOptions: { id: ActivityType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'Todo', icon: Activity },
    { id: 'payment', label: 'Pagos', icon: CreditCard },
    { id: 'announcement', label: 'Comunicados', icon: Megaphone },
    { id: 'club', label: 'Clubes', icon: Building2 },
    { id: 'player', label: 'Jugadores', icon: Users },
    { id: 'season', label: 'Temporadas', icon: Clock },
  ];

  const filteredActivities = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  // Summary counters
  const paymentCount = activities.filter(a => a.type === 'payment').length;
  const announcementCount = activities.filter(a => a.type === 'announcement').length;
  const playerCount = activities.filter(a => a.type === 'player').length;
  const clubCount = activities.filter(a => a.type === 'club').length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Activity className="w-7 h-7" /></div>
          Registro de Actividad
        </h1>
        <p className="text-slate-500 mt-2 text-base">Historial completo y en tiempo real de todas las acciones en la plataforma.</p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><CreditCard className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{paymentCount}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Pagos</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Megaphone className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-amber-600">{announcementCount}</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Comunicados</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-blue-600">{playerCount}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Fichas</p>
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-indigo-600">{clubCount}</p>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Clubes</p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {filterOptions.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === opt.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          );
        })}
        <span className="text-xs text-slate-400 font-semibold ml-2">{filteredActivities.length} eventos</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center p-12 text-slate-500">No hay actividad registrada con este filtro.</div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100"></div>
            <div className="space-y-0">
              {filteredActivities.map((item) => {
                const c = colorMap[item.color] || colorMap.blue;
                return (
                  <div key={item.id} className="relative pl-12 pb-8 group">
                    <div className={`absolute left-2.5 top-1 w-5 h-5 rounded-full ${c.bg} ${c.text} flex items-center justify-center ring-4 ring-white`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${c.bg} ${c.text} rounded-lg`}>{item.icon}</div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">{formatDate(item.time)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
