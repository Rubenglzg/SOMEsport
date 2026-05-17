import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Loader2, Download } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { recordPayment, getPlayerPayments } from '../../lib/paymentService';
import { getSeasons, type Season } from '../../lib/seasonsService';

export function PlayerPaymentsPage() {
  const profile = useAuthStore((state) => state.profile);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      setLoading(true);
      try {
        const [seasonsData, pmtRecs] = await Promise.all([
          getSeasons(),
          getPlayerPayments(profile.uid)
        ]);
        const active = seasonsData.find(s => s.isActive) || seasonsData[0] || null;
        setActiveSeason(active);
        
        if (active) {
          const hasPaid = pmtRecs.some(p => p.season === active.name);
          setPaymentSuccess(hasPaid);
        }
      } catch (error) {
        console.error("Error loading payments:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid]);

  const seasonName = activeSeason?.name || 'Temporada Actual';
  const fee = activeSeason?.fee || 120;

  const handlePayment = async () => {
    if (!profile?.uid || !profile?.clubId) return;
    setIsPaying(true);
    setTimeout(async () => {
      try {
        await recordPayment(profile.uid!, profile.clubId!, fee, seasonName);
        setPaymentSuccess(true);
      } catch (error) {
        console.error("Error recording payment:", error);
        alert("Hubo un error al procesar el pago.");
      } finally {
        setIsPaying(false);
        setTimeout(() => setShowPaymentModal(false), 2000);
      }
    }, 2000);
  };

  const handleDownloadReceipt = () => {
    // Para simplificar, abrimos el cuadro de impresión nativo del navegador
    // En un entorno real se generaría un PDF con pdfmake o similar
    window.print();
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
            <CreditCard className="w-7 h-7" />
          </div>
          Mis Pagos
        </h1>
        <p className="text-slate-500 mt-2 text-base">Gestiona las cuotas del club asociadas a tu ficha.</p>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <CreditCard className="w-6 h-6 text-brand-600" />
          Tesorería y Pagos
        </h2>

        {paymentSuccess ? (
          <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Cuota Abonada con Éxito</h3>
            <p className="text-sm text-emerald-700 mt-1 mb-6">El club ha recibido el pago correspondiente a la temporada actual.</p>
            <button onClick={handleDownloadReceipt} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              <Download className="w-4 h-4" /> Descargar Recibo (PDF)
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-slate-200 bg-slate-50 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="p-3 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Cuota Anual de Club</p>
                <p className="text-sm text-slate-500 mt-0.5">{seasonName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900">{fee}€</p>
                <p className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">Pendiente</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                Pagar Ahora
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
              <h3 className="text-xl font-black text-slate-900">Pasarela de Pago Segura</h3>
              <p className="text-sm text-slate-500 mt-1">Abono de cuota de club ({seasonName})</p>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                <span className="font-semibold text-slate-600">Total a pagar:</span>
                <span className="text-3xl font-black text-slate-900">{fee},00 €</span>
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
                onClick={handlePayment}
                disabled={isPaying}
                className="w-full bg-brand-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-brand-500/30"
              >
                {isPaying ? (<><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>) : `Pagar ${fee}€ de forma segura`}
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
