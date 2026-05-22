import { useState, useEffect } from 'react';
import { Heart, Clock, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { getInjuriesByPlayer, type Injury } from '../../lib/medicalService';
import { useAuthStore } from '../../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function PlayerMedicalPage() {
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        // Determine player target UID (account for tutor mode representation)
        let targetPlayerId = profile.uid;
        let name = profile.name || 'Tú';

        if (profile.accountType === 'tutor' && profile.fichaId) {
          targetPlayerId = profile.fichaId;
          const childDoc = await getDoc(doc(db, 'users', profile.fichaId));
          if (childDoc.exists()) {
            const data = childDoc.data();
            name = data.name || data.username || 'Ficha representada';
          }
        }
        setPlayerName(name);

        const list = await getInjuriesByPlayer(targetPlayerId || '');
        setInjuries(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No definida';
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Find the active injury if any (or the most recent one)
  const activeInjury = injuries.find(i => i.status === 'activa');
  const pastInjuries = injuries.filter(i => i.status === 'recuperado');

  // Days left calculation
  let daysLeft: number | null = null;
  let percentProgress = 0;
  if (activeInjury && activeInjury.estimatedRecoveryDate) {
    const injuryTimestamp = new Date(activeInjury.injuryDate).getTime();
    const targetTimestamp = new Date(activeInjury.estimatedRecoveryDate).getTime();
    const nowTimestamp = new Date().getTime();

    const totalDays = Math.ceil((targetTimestamp - injuryTimestamp) / (1000 * 60 * 60 * 24));
    daysLeft = Math.ceil((targetTimestamp - nowTimestamp) / (1000 * 60 * 60 * 24));
    
    if (totalDays > 0) {
      const elapsedDays = Math.max(0, Math.ceil((nowTimestamp - injuryTimestamp) / (1000 * 60 * 60 * 24)));
      percentProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl border border-red-100"><Heart className="w-7 h-7 fill-red-500 text-red-500 animate-pulse" /></div>
          Ficha Médica e Historial
        </h1>
        <p className="text-slate-500 mt-2">
          {profile?.accountType === 'tutor' 
            ? `Estado de salud y ficha médica de tu representado: ${playerName}` 
            : `Consulta tu ficha de salud, recomendaciones del club y tu evolución física.`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {/* Active Injury Countdown Widget (If Active Injury exists) */}
          {activeInjury ? (
            <div className="bg-gradient-to-br from-red-500 to-red-650 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-red-500/10 border border-red-500 relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 opacity-10 text-white select-none shrink-0 pointer-events-none">
                <Heart className="w-64 h-64 fill-white text-white" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="space-y-4 text-center md:text-left flex-1">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-white/90">
                      Lesión en Curso: {activeInjury.type}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black mt-2">Proceso de Recuperación</h2>
                    <p className="text-red-100/90 text-sm mt-1">Estimada de gravedad <span className="font-bold underline capitalize">{activeInjury.severity}</span></p>
                  </div>

                  {activeInjury.recommendations && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 p-4 rounded-2xl">
                      <h4 className="text-xs font-black uppercase text-white/70 tracking-wider flex items-center gap-1.5 justify-center md:justify-start">
                        <FileText className="w-3.5 h-3.5" /> Recomendaciones del Club
                      </h4>
                      <p className="text-xs mt-1.5 leading-relaxed text-red-50 italic">
                        "{activeInjury.recommendations}"
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-1 max-w-sm mx-auto md:mx-0 text-left text-xs font-bold text-red-100/80">
                    <div>
                      <span className="text-[10px] block opacity-60 font-semibold uppercase tracking-wider">De baja desde</span>
                      <span className="text-white">{formatDate(activeInjury.injuryDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block opacity-60 font-semibold uppercase tracking-wider">Fecha Prevista Alta</span>
                      <span className="text-white">{formatDate(activeInjury.estimatedRecoveryDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Graphical Countdown Circle/Gauge */}
                <div className="w-44 h-44 flex flex-col items-center justify-center bg-white/10 border border-white/20 rounded-full shrink-0 relative p-4 backdrop-blur-md">
                  <span className="text-4xl font-black tracking-tight">{daysLeft !== null ? (daysLeft < 0 ? 'Excedida' : daysLeft) : '--'}</span>
                  <span className="text-[10px] font-bold text-red-100/90 uppercase tracking-widest mt-1">
                    {daysLeft !== null && daysLeft < 0 
                      ? 'Fecha rebasada' 
                      : daysLeft === 1 
                        ? 'Día Restante' 
                        : 'Días Restantes'}
                  </span>

                  {/* Visual linear progress inside circle */}
                  <div className="w-24 h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
                    <div className="bg-white h-full transition-all duration-700" style={{ width: `${percentProgress}%` }} />
                  </div>
                  <span className="text-[9px] opacity-75 font-semibold mt-1">Evolución: {percentProgress}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border border-emerald-100 text-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 justify-between">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-md shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Estado: Apto para el Deporte</h3>
                  <p className="text-xs text-slate-500 mt-0.5">No tienes ninguna lesión activa registrada en tu ficha médica del club.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 px-3 py-1 bg-emerald-100/80 rounded-full border border-emerald-200/50 uppercase tracking-wider">
                Ficha Médica Limpia
              </span>
            </div>
          )}

          {/* Active Injury Notes Timeline */}
          {activeInjury && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Clock className="w-4 h-4 text-brand-600" /> Línea de Tiempo de Recuperación e Historial de Notas
              </h3>
              
              {!activeInjury.progressNotes || activeInjury.progressNotes.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  El club aún no ha registrado notas de progreso. Estarán disponibles aquí a medida que evoluciones.
                </p>
              ) : (
                <div className="relative border-l border-slate-200 pl-5 ml-3 space-y-4 pt-1 pb-2">
                  {activeInjury.progressNotes.map((note, index) => {
                    const regex = /^\[(.*?)\]\s*(.*)$/;
                    const match = note.match(regex);
                    const timeStr = match ? match[1] : '';
                    const contentStr = match ? match[2] : note;

                    return (
                      <div key={index} className="relative group">
                        {/* Dot badge */}
                        <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 bg-brand-500 rounded-full border border-white shadow-sm shrink-0" />
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">{timeStr || 'Evolución'}</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-0.5">{contentStr}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Past Injuries / Medical History section */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" /> Historial de Lesiones Recuperadas ({pastInjuries.length})
            </h3>

            {pastInjuries.length === 0 ? (
              <div className="text-center p-8 bg-white border border-slate-200 border-dashed rounded-2xl text-slate-400 text-xs">
                No hay antecedentes de lesiones pasadas registradas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pastInjuries.map(past => (
                  <div key={past.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 uppercase tracking-wider">
                        {past.type}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Recuperado
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-sm">{playerName}</h4>
                    <p className="text-xs text-slate-400 font-semibold mb-3">{formatDate(past.injuryDate)} • {formatDate(past.estimatedRecoveryDate)}</p>

                    {past.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 border border-slate-100/80 rounded-xl italic">
                        "{past.notes}"
                      </p>
                    )}
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
