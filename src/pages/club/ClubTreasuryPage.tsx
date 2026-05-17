import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Loader2, Plus } from 'lucide-react';
import { getPlayersByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getClubPayments, recordPayment, type PaymentRecord } from '../../lib/paymentService';
import { getSeasons, type Season } from '../../lib/seasonsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';

export function ClubTreasuryPage() {
  const profile = useAuthStore((state) => state.profile);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'pending'
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      setLoading(true);
      try {
        const [playersData, teamsData, paymentsData, seasonsData] = await Promise.all([
          getPlayersByClub(profile.uid),
          getTeamsByClub(profile.uid),
          getClubPayments(profile.uid),
          getSeasons() // Las temporadas son globales actualmente
        ]);
        // Solo mostramos 'jugadores' como fichas que pagan
        setPlayers(playersData.filter(p => p.accountType === 'jugador'));
        setTeams(teamsData);
        setPayments(paymentsData);
        setSeasons(seasonsData);
        
        const activeSeason = seasonsData.find(s => s.isActive);
        if (activeSeason) setSelectedSeasonId(activeSeason.id!);
        else if (seasonsData.length > 0) setSelectedSeasonId(seasonsData[0].id!);
      } catch (error) {
        console.error("Error loading treasury:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid]);

  const handleManualPayment = async (playerId: string) => {
    if (!profile?.uid) return;
    if (!window.confirm('¿Confirmas que has recibido el pago de este jugador de forma manual?')) return;
    
    setLoading(true);
    try {
      const activeSeason = seasons.find(s => s.id === selectedSeasonId);
      if (!activeSeason) return;
      await recordPayment(playerId, profile.uid, activeSeason.fee, activeSeason.name);
      const paymentsData = await getClubPayments(profile.uid);
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error recording manual payment:", error);
      alert("Hubo un error al registrar el pago manual.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  };

  const currentSeason = seasons.find(s => s.id === selectedSeasonId);
  const fee = currentSeason?.fee || 0;
  const seasonName = currentSeason?.name || 'Temporada Actual';

  // Solo contamos pagos de la temporada seleccionada
  const seasonPayments = payments.filter(p => p.season === seasonName);

  const totalExpectedRevenue = players.length * fee;
  const totalCollected = seasonPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = players.filter(p => seasonPayments.some(payment => payment.userId === p.uid)).length;

  const filteredPlayers = players.filter(p => {
    const hasPaid = seasonPayments.some(payment => payment.userId === p.uid);
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'paid' ? hasPaid : !hasPaid);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center p-24">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
            <CreditCard className="w-7 h-7" />
          </div>
          Tesorería del Club
        </h1>
        <p className="text-slate-500 mt-2 text-base">Control de cuotas y pagos de los jugadores.</p>
      </div>

      {/* Season Selector */}
      {seasons.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <label className="font-bold text-slate-700">Temporada:</label>
          <select 
            value={selectedSeasonId} 
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all font-semibold text-brand-700"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Actual)' : ''}</option>)}
          </select>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-32 h-32" /></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Ingresos Esperados</p>
            <h3 className="text-4xl font-black mb-1">{totalExpectedRevenue}€</h3>
            <p className="text-sm text-slate-300">{seasonName} ({fee}€/jugador)</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Recaudado</p>
          <h3 className="text-4xl font-black text-emerald-600 mb-1">{totalCollected}€</h3>
          <p className="text-sm text-slate-500">{paidCount} de {players.length} jugadores han pagado</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Pendiente</p>
          <h3 className="text-4xl font-black text-amber-600 mb-1">{totalExpectedRevenue - totalCollected}€</h3>
          <p className="text-sm text-slate-500">{players.length - paidCount} jugadores sin abonar</p>
        </div>
      </div>

      {/* Player Payment Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-900">Estado de Cuotas</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Buscar jugador..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
            />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-semibold text-slate-700"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagados</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-3">
          {filteredPlayers.map(p => {
            const paymentRecord = seasonPayments.find(payment => payment.userId === p.uid);
            const hasPaid = !!paymentRecord;
            return (
              <div key={p.uid} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{teams.find(t => t.id === p.teamId)?.name || 'Sin equipo'}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <p className="font-bold text-slate-900 hidden sm:block">{fee}€</p>
                  {hasPaid ? (
                    <div className="flex flex-col items-end">
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Pagado
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">{formatDate(paymentRecord!.paidAt)}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded-lg uppercase tracking-wider">
                        Pendiente
                      </p>
                      <button onClick={() => handleManualPayment(p.uid!)} title="Registrar Pago Manual" className="p-1.5 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-lg transition-colors border border-brand-200 shadow-sm">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredPlayers.length === 0 && (
            <p className="text-center text-slate-500 py-4">No hay jugadores registrados que coincidan con los filtros.</p>
          )}
        </div>
      </div>
    </div>
  );
}
