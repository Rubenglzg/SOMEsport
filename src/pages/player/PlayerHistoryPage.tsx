import { useState, useEffect } from 'react';
import { History, Loader2, CheckCircle, XCircle, MinusCircle, CreditCard, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getPlayerAttendanceHistory } from '../../lib/attendanceService';
import { getPlayerPayments } from '../../lib/paymentService';
import { getPlayerDocuments } from '../../lib/storageService';

export function PlayerHistoryPage() {
  const profile = useAuthStore((s) => s.profile);
  const [attendance, setAttendance] = useState<{ date: string; eventTitle: string; status: string }[]>([]);
  const [payments, setPayments] = useState<{ date: string; amount: number; season: string }[]>([]);
  const [documents, setDocuments] = useState<{ type: string; status: string; uploadedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const targetPlayerUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;
      if (!targetPlayerUid || !profile?.clubId) return;
      setLoading(true);
      try {
        const [att, pmt, docs] = await Promise.all([
          getPlayerAttendanceHistory(profile.clubId, targetPlayerUid),
          getPlayerPayments(targetPlayerUid),
          getPlayerDocuments(targetPlayerUid)
        ]);
        setAttendance(att);
        setPayments(pmt.map(p => ({ date: p.paidAt, amount: p.amount, season: p.season })));
        setDocuments(docs.map(d => ({ type: d.type, status: d.status, uploadedAt: d.uploadedAt?.toDate?.() ? d.uploadedAt.toDate().toISOString() : '' })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [profile?.uid, profile?.clubId, profile?.fichaId]);

  const statusIcon = (s: string) => {
    if (s === 'present') return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (s === 'justified') return <MinusCircle className="w-4 h-4 text-amber-600" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso || '-'; }
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><History className="w-7 h-7" /></div>
          Mi Historial
        </h1>
        <p className="text-slate-500 mt-2">Registro histórico de asistencia, pagos y documentos.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {/* Attendance */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Asistencia
            </h2>
            {attendance.length === 0 ? (
              <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl">Sin registros de asistencia.</p>
            ) : (
              <div className="space-y-2">
                {attendance.slice(0, 20).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      {statusIcon(a.status)}
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{a.eventTitle}</p>
                        <p className="text-xs text-slate-500">{formatDate(a.date)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 capitalize">{a.status === 'present' ? 'Presente' : a.status === 'justified' ? 'Justificado' : 'Ausente'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-600" /> Pagos
            </h2>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl">Sin pagos registrados.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CreditCard className="w-4 h-4" /></div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">Cuota Temporada {p.season}</p>
                        <p className="text-xs text-slate-500">{formatDate(p.date)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600">{p.amount}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Documentos
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl">Sin documentos subidos.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText className="w-4 h-4" /></div>
                      <span className="font-semibold text-slate-900 text-sm uppercase">{d.type}</span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : d.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {d.status === 'approved' ? 'Aprobado' : d.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
