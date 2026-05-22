import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Loader2, Plus, Clock, DollarSign } from 'lucide-react';
import { getPlayersByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getClubPayments, recordPayment, type PaymentRecord } from '../../lib/paymentService';
import { getClubSeasons, getSeasons, type Season } from '../../lib/seasonsService';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      setLoading(true);
      try {
        const [playersData, teamsData, paymentsData, clubSeasonsData, globalSeasonsData] = await Promise.all([
          getPlayersByClub(profile.uid),
          getTeamsByClub(profile.uid),
          getClubPayments(profile.uid),
          getClubSeasons(profile.uid),
          getSeasons()
        ]);
        setPlayers(playersData.filter(p => p.accountType === 'jugador'));
        setTeams(teamsData);
        setPayments(paymentsData);

        // Prefer club-specific seasons, fallback to global
        const allSeasons = clubSeasonsData.length > 0 ? clubSeasonsData : globalSeasonsData;
        setSeasons(allSeasons);

        const activeSeason = allSeasons.find(s => s.isActive);
        if (activeSeason) setSelectedSeasonId(activeSeason.id!);
        else if (allSeasons.length > 0) setSelectedSeasonId(allSeasons[0].id!);
      } catch (error) {
        console.error("Error loading treasury:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid]);

  const currentSeason = seasons.find(s => s.id === selectedSeasonId);
  const seasonName = currentSeason?.name || 'Temporada Actual';
  const hasFeesByCategory = currentSeason?.feesByCategory && Object.keys(currentSeason.feesByCategory).length > 0;
  const hasInstallments = currentSeason?.paymentInstallments?.enabled && (currentSeason.paymentInstallments.installments?.length || 0) > 0;

  // Get fee for a specific player based on their category
  const getPlayerFee = (player: UserProfile): number => {
    if (hasFeesByCategory && player.category && currentSeason!.feesByCategory![player.category]) {
      return currentSeason!.feesByCategory![player.category];
    }
    return 0; // Por defecto a 0 si no hay cuota de categoría
  };

  // Get installment breakdown for a player
  const getPlayerInstallments = (player: UserProfile) => {
    if (!hasInstallments) return [];
    const fee = getPlayerFee(player);
    return currentSeason!.paymentInstallments!.installments.map(inst => ({
      name: inst.name,
      amount: Math.round((fee * inst.percentage) / 100),
      percentage: inst.percentage,
      dueDate: inst.dueDate,
    }));
  };

  // Season payments
  const seasonPayments = payments.filter(p => p.season === seasonName);

  // Check which installments a player has paid
  const getPlayerPaidInstallments = (playerId: string): string[] => {
    return seasonPayments
      .filter(p => p.userId === playerId)
      .map(p => p.installmentName || 'Pago Completo');
  };

  const getPlayerTotalPaid = (playerId: string): number => {
    return seasonPayments
      .filter(p => p.userId === playerId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Totals
  const totalExpectedRevenue = players.reduce((sum, p) => sum + getPlayerFee(p), 0);
  const totalCollected = seasonPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = players.filter(p => {
    const fee = getPlayerFee(p);
    const paid = getPlayerTotalPaid(p.uid!);
    return paid >= fee;
  }).length;

  const handleManualPayment = async (playerId: string, installmentName?: string, amount?: number) => {
    if (!profile?.uid || !currentSeason) return;
    const player = players.find(p => p.uid === playerId);
    if (!player) return;

    const payAmount = amount || getPlayerFee(player);
    const label = installmentName || 'Pago Completo';
    if (!window.confirm(`¿Confirmas el pago manual de ${payAmount}€ (${label})?`)) return;

    setLoading(true);
    try {
      await recordPayment(playerId, profile.uid, payAmount, seasonName, installmentName);
      const paymentsData = await getClubPayments(profile.uid);
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error recording manual payment:", error);
      alert("Hubo un error al registrar el pago manual.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    const fee = getPlayerFee(p);
    const totalPaid = getPlayerTotalPaid(p.uid!);
    const fullyPaid = totalPaid >= fee;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'paid' ? fullyPaid : !fullyPaid);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center p-24"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><CreditCard className="w-7 h-7" /></div>
          Tesorería del Club
        </h1>
        <p className="text-slate-500 mt-2 text-base">Control de cuotas, plazos y pagos de los jugadores.</p>
      </div>

      {/* Season Selector */}
      {seasons.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <label className="font-bold text-slate-700">Temporada:</label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all font-semibold text-brand-700"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Actual)' : ''}</option>)}
          </select>
          {hasFeesByCategory && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
              <DollarSign className="inline w-3 h-3 mr-1" />Cuotas por categoría activas
            </span>
          )}
          {hasInstallments && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
              <Clock className="inline w-3 h-3 mr-1" />Plazos habilitados
            </span>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-32 h-32" /></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Ingresos Esperados</p>
            <h3 className="text-4xl font-black mb-1">{totalExpectedRevenue.toLocaleString('es-ES')}€</h3>
            <p className="text-sm text-slate-300">{seasonName}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Recaudado</p>
          <h3 className="text-4xl font-black text-emerald-600 mb-1">{totalCollected.toLocaleString('es-ES')}€</h3>
          <p className="text-sm text-slate-500">{paidCount} de {players.length} jugadores al corriente</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Pendiente</p>
          <h3 className="text-4xl font-black text-amber-600 mb-1">{(totalExpectedRevenue - totalCollected).toLocaleString('es-ES')}€</h3>
          <p className="text-sm text-slate-500">{players.length - paidCount} jugadores con saldo pendiente</p>
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
              <option value="paid">Al corriente</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredPlayers.map(p => {
            const fee = getPlayerFee(p);
            const totalPaid = getPlayerTotalPaid(p.uid!);
            const fullyPaid = totalPaid >= fee;
            const paidInstallmentNames = getPlayerPaidInstallments(p.uid!);
            const playerInstallments = getPlayerInstallments(p);
            const team = teams.find(t => t.id === p.teamId);

            return (
              <div key={p.uid} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 overflow-hidden shrink-0">
                      {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : p.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{team?.name || 'Sin equipo'} • {p.category || 'Sin categoría'} • Cuota: {fee}€</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {fullyPaid ? (
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Al Corriente
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded-lg uppercase tracking-wider">
                        {totalPaid > 0 ? `${totalPaid}€ / ${fee}€` : 'Pendiente'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Installment Details */}
                {hasInstallments && playerInstallments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {playerInstallments.map((inst, i) => {
                      const isPaid = paidInstallmentNames.includes(inst.name);
                      // Can only pay sequentially: must have paid all previous installments
                      const canPay = !isPaid && playerInstallments.slice(0, i).every(prev => paidInstallmentNames.includes(prev.name));
                      return (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                          {isPaid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{inst.name} ({inst.amount}€)</span>
                          {canPay && !fullyPaid && (
                            <button
                              onClick={() => handleManualPayment(p.uid!, inst.name, inst.amount)}
                              className="ml-1 p-1 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-lg transition-colors border border-brand-200"
                              title={`Registrar ${inst.name}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Simple pay button if no installments */}
                {!hasInstallments && !fullyPaid && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleManualPayment(p.uid!)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-lg transition-colors border border-brand-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar Pago Manual ({fee}€)
                    </button>
                  </div>
                )}
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
