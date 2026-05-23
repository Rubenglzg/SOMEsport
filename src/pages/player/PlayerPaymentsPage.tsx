import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Loader2, Download, Clock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { recordPayment, getPlayerPayments, type PaymentRecord } from '../../lib/paymentService';
import { getActiveClubSeason, getActiveSeason, type Season } from '../../lib/seasonsService';
import { supabase } from '../../lib/supabase';

export function PlayerPaymentsPage() {
  const profile = useAuthStore((state) => state.profile);
  const [playerPayments, setPlayerPayments] = useState<PaymentRecord[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<{ name: string; amount: number } | null>(null);
  const [childProfile, setChildProfile] = useState<any>(null);

  const targetPlayerUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const targetUid = profile.accountType === 'tutor' ? profile.fichaId : profile.uid;
      if (!targetUid) return;

      setLoading(true);
      try {
        if (profile.accountType === 'tutor' && profile.fichaId) {
          const { data: profileData } = await supabase
            .from('users_profiles')
            .select('*')
            .eq('id', profile.fichaId)
            .maybeSingle();

          const { data: playerData } = await supabase
            .from('players')
            .select('*')
            .eq('id', profile.fichaId)
            .maybeSingle();

          if (profileData) {
            setChildProfile({
              uid: profileData.id,
              role: profileData.role,
              clubId: profileData.club_id,
              name: profileData.name || (playerData ? `${playerData.nombre} ${playerData.apellidos}`.trim() : ''),
              username: profileData.username,
              email: profileData.email,
              accountType: profileData.account_type,
              isAdult: profileData.is_adult,
              status: 'Activo',
              dni: playerData?.dni || '',
              birthDate: playerData?.fecha_nacimiento || '',
              tutorName: playerData?.datos_tutor?.tutorName || '',
              tutorPhone: playerData?.datos_tutor?.tutorPhone || '',
              tutorEmail: playerData?.datos_tutor?.tutorEmail || ''
            });
          }
        }

        const [pmtRecs, clubSeason, globalSeason] = await Promise.all([
          getPlayerPayments(targetUid),
          profile.clubId ? getActiveClubSeason(profile.clubId) : Promise.resolve(null),
          getActiveSeason()
        ]);
        setPlayerPayments(pmtRecs);
        // Prefer club season over global
        setActiveSeason(clubSeason || globalSeason);
      } catch (error) {
        console.error("Error loading payments:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid, profile?.clubId, profile?.fichaId]);

  if (!profile) return null;

  const seasonName = activeSeason?.name || 'Temporada Actual';
  // Calculate fee based on player's category
  const playerCategory = profile.accountType === 'tutor' ? (childProfile?.category || '') : (profile.category || '');
  const categoryFee = activeSeason?.feesByCategory && playerCategory && activeSeason.feesByCategory[playerCategory]
    ? activeSeason.feesByCategory[playerCategory]
    : 0;

  // Installments
  const hasInstallments = activeSeason?.paymentInstallments?.enabled && (activeSeason.paymentInstallments.installments?.length || 0) > 0;
  const installments = hasInstallments
    ? activeSeason!.paymentInstallments!.installments.map(inst => ({
        name: inst.name,
        amount: Math.round((categoryFee * inst.percentage) / 100),
        percentage: inst.percentage,
        dueDate: inst.dueDate,
      }))
    : [];

  // What has been paid?
  const seasonPayments = playerPayments.filter(p => p.season === seasonName);
  const totalPaid = seasonPayments.reduce((sum, p) => sum + p.amount, 0);
  const fullyPaid = totalPaid >= categoryFee;
  const paidInstallmentNames = seasonPayments.map(p => p.installmentName || 'Pago Completo');

  const handlePay = async (installmentName?: string, amount?: number) => {
    if (!targetPlayerUid || !profile?.clubId) return;
    setIsPaying(true);
    const payAmount = amount || categoryFee;
    
    // Simulate a short payment processing delay
    setTimeout(async () => {
      try {
        await recordPayment(targetPlayerUid, profile.clubId!, payAmount, seasonName, installmentName);
        const pmtRecs = await getPlayerPayments(targetPlayerUid);
        setPlayerPayments(pmtRecs);
      } catch (error) {
        console.error("Error recording payment:", error);
        alert("Hubo un error al procesar el pago.");
      } finally {
        setIsPaying(false);
        setTimeout(() => setShowPaymentModal(false), 1500);
        setPayingInstallment(null);
      }
    }, 2000);
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  const openPayModal = (installmentName?: string, amount?: number) => {
    if (installmentName && amount) {
      setPayingInstallment({ name: installmentName, amount });
    } else {
      setPayingInstallment(null);
    }
    setShowPaymentModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center p-24"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><CreditCard className="w-7 h-7" /></div>
          {profile.accountType === 'tutor' ? 'Pagos de mi Hijo/a' : 'Mis Pagos'}
        </h1>
        <p className="text-slate-500 mt-2 text-base">
          {profile.accountType === 'tutor' 
            ? `Gestiona las cuotas del club asociadas a la ficha de ${childProfile?.name || 'tu hijo/a'}.`
            : 'Gestiona las cuotas del club asociadas a tu ficha.'}
        </p>
      </div>

      {/* Season & Category Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Temporada</p>
          <p className="font-bold text-slate-900">{seasonName}</p>
        </div>
        {playerCategory && (
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {profile.accountType === 'tutor' ? 'Categoría del Jugador' : 'Tu Categoría'}
            </p>
            <p className="font-bold text-slate-900">{playerCategory}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cuota Asignada</p>
          <p className="text-2xl font-black text-slate-900">{categoryFee}€</p>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <CreditCard className="w-6 h-6 text-brand-600" />
          Estado de Pago
        </h2>

        {fullyPaid ? (
          <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Cuota Abonada en su Totalidad</h3>
            <p className="text-sm text-emerald-700 mt-1 mb-6">El club ha recibido tu pago completo de {categoryFee}€ para la {seasonName}.</p>
            <button onClick={handleDownloadReceipt} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              <Download className="w-4 h-4" /> Descargar Recibo (PDF)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">Progreso de pago</span>
                <span className="text-sm font-black text-slate-900">{totalPaid}€ / {categoryFee}€</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalPaid / categoryFee) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* If installments are available */}
            {hasInstallments && installments.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Plazos de Pago Disponibles</p>
                {installments.map((inst, i) => {
                  const isPaid = paidInstallmentNames.includes(inst.name);
                  const canPay = !isPaid && installments.slice(0, i).every(prev => paidInstallmentNames.includes(prev.name));
                  return (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isPaid
                        ? 'bg-emerald-50 border-emerald-200'
                        : canPay
                          ? 'bg-white border-brand-200 ring-1 ring-brand-100'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{inst.name} ({inst.percentage}%)</p>
                          <p className="text-xs text-slate-500">
                            {inst.dueDate ? `Vence: ${new Date(inst.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Sin fecha límite'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-900">{inst.amount}€</span>
                        {isPaid ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">Pagado ✓</span>
                        ) : canPay ? (
                          <button
                            onClick={() => openPayModal(inst.name, inst.amount)}
                            className="inline-flex items-center gap-1.5 bg-brand-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-brand-500 transition-all shadow-md"
                          >
                            Pagar <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Bloqueado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Single full payment */
              <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-slate-200 bg-slate-50 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="p-3 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Cuota Anual de Club</p>
                    <p className="text-sm text-slate-500 mt-0.5">{seasonName}{playerCategory ? ` • ${playerCategory}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{categoryFee}€</p>
                    <p className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">Pendiente</p>
                  </div>
                  <button
                    onClick={() => openPayModal()}
                    className="bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    Pagar Ahora
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      {seasonPayments.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Historial de Pagos</h2>
          <div className="space-y-2">
            {seasonPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{p.installmentName || 'Pago Completo'}</p>
                    <p className="text-xs text-slate-500">{new Date(p.paidAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className="font-bold text-emerald-600">{p.amount}€</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
              <h3 className="text-xl font-black text-slate-900">Pasarela de Pago Segura</h3>
              <p className="text-sm text-slate-500 mt-1">
                {payingInstallment ? `${payingInstallment.name} — ${seasonName}` : `Abono de cuota de club (${seasonName})`}
              </p>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                <span className="font-semibold text-slate-600">Total a pagar:</span>
                <span className="text-3xl font-black text-slate-900">
                  {payingInstallment ? payingInstallment.amount : categoryFee},00 €
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 border-2 border-brand-500 bg-brand-50 rounded-xl flex items-center gap-3 cursor-pointer">
                  <div className="w-5 h-5 rounded-full border-4 border-brand-600 bg-white"></div>
                  <span className="font-bold text-brand-900">Tarjeta de Crédito / Débito</span>
                </div>
                <div className="p-4 border-2 border-slate-200 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                  <span className="font-bold text-slate-600">Transferencia Bancaria</span>
                </div>
              </div>

              <button
                onClick={() => handlePay(payingInstallment?.name, payingInstallment?.amount)}
                disabled={isPaying}
                className="w-full bg-brand-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-brand-500/30"
              >
                {isPaying ? (<><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>) : `Pagar ${payingInstallment ? payingInstallment.amount : categoryFee}€ de forma segura`}
              </button>
              <button onClick={() => setShowPaymentModal(false)} disabled={isPaying} className="w-full mt-4 text-sm font-semibold text-slate-500 hover:text-slate-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
