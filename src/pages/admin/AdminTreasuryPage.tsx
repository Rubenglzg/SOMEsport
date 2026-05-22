import { useState, useEffect } from 'react';
import { Wallet, Loader2, Search, Building2, CreditCard, TrendingUp, ArrowDownRight } from 'lucide-react';
import { getAllPayments, type PaymentRecord } from '../../lib/paymentService';
import { getClubs } from '../../lib/userService';
import type { UserProfile } from '../../store/authStore';

export function AdminTreasuryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [clubs, setClubs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClubId, setFilterClubId] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [paymentsData, clubsData] = await Promise.all([
          getAllPayments(),
          getClubs()
        ]);
        setPayments(paymentsData.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()));
        setClubs(clubsData);
      } catch (error) {
        console.error('Error loading treasury:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalTransactions = payments.length;
  const avgPayment = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Revenue per club
  const revenueByClub: Record<string, { total: number; count: number; name: string }> = {};
  payments.forEach(p => {
    if (!revenueByClub[p.clubId]) {
      const club = clubs.find(c => c.uid === p.clubId);
      revenueByClub[p.clubId] = { total: 0, count: 0, name: club?.name || 'Club Desconocido' };
    }
    revenueByClub[p.clubId].total += p.amount;
    revenueByClub[p.clubId].count++;
  });

  const clubRevenueList = Object.entries(revenueByClub)
    .map(([clubId, data]) => ({ clubId, ...data }))
    .sort((a, b) => b.total - a.total);

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    const matchesClub = filterClubId === 'all' || p.clubId === filterClubId;
    const matchesSearch = searchQuery === '' ||
      p.season.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.installmentName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClub && matchesSearch;
  });

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

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
            <Wallet className="w-7 h-7" />
          </div>
          Caja Global — Control Financiero
        </h1>
        <p className="text-slate-500 mt-2 text-base">Vista general de todos los ingresos y transacciones de la plataforma.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-10"><Wallet className="w-32 h-32" /></div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-semibold uppercase tracking-wider mb-2">Ingresos Totales</p>
            <h3 className="text-4xl font-black mb-1">{totalRevenue.toLocaleString('es-ES')}€</h3>
            <p className="text-sm text-emerald-200">Acumulado global de la plataforma</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><CreditCard className="w-5 h-5" /></div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Transacciones</p>
          </div>
          <h3 className="text-4xl font-black text-slate-900 mb-1">{totalTransactions}</h3>
          <p className="text-sm text-slate-500">Pagos registrados en total</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Promedio por Pago</p>
          </div>
          <h3 className="text-4xl font-black text-slate-900 mb-1">{avgPayment}€</h3>
          <p className="text-sm text-slate-500">Media de cobros individuales</p>
        </div>
      </div>

      {/* Revenue by Club */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
          <Building2 className="w-5 h-5 text-indigo-600" />
          Desglose de Recaudación por Club
        </h2>
        {clubRevenueList.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No hay transacciones registradas aún.</p>
        ) : (
          <div className="space-y-3">
            {clubRevenueList.map(cr => {
              const pct = totalRevenue > 0 ? Math.round((cr.total / totalRevenue) * 100) : 0;
              return (
                <div key={cr.clubId} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {cr.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-bold text-slate-900 text-sm truncate">{cr.name}</p>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-semibold text-slate-500">{cr.count} pagos</span>
                        <span className="text-sm font-black text-emerald-600">{cr.total.toLocaleString('es-ES')}€</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            Historial Global de Transacciones
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm w-full sm:w-48"
              />
            </div>
            <select
              value={filterClubId}
              onChange={e => setFilterClubId(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-semibold text-slate-700"
            >
              <option value="all">Todos los clubes</option>
              {clubs.map(c => <option key={c.uid} value={c.uid}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No hay transacciones que coincidan con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-xl">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold rounded-l-xl">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">Club</th>
                  <th className="px-4 py-3 text-left font-semibold">Temporada</th>
                  <th className="px-4 py-3 text-left font-semibold">Concepto</th>
                  <th className="px-4 py-3 text-right font-semibold rounded-r-xl">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(p => {
                  const club = clubs.find(c => c.uid === p.clubId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{club?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.season}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {p.installmentName || 'Pago Completo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600">{p.amount}€</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
