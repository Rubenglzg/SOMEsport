import { useState, useEffect } from 'react';
import { CalendarDays, Loader2, MapPin, Clock, Trophy } from 'lucide-react';
import { getPlayerEvents, type ClubEvent, type EventType } from '../../lib/eventsService';
import { useAuthStore } from '../../store/authStore';

const typeLabels: Record<EventType, { label: string; color: string; bg: string }> = {
  training: { label: 'Entrenamiento', color: 'text-blue-700', bg: 'bg-blue-100' },
  match: { label: 'Partido', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  event: { label: 'Evento', color: 'text-amber-700', bg: 'bg-amber-100' },
};

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function PlayerCalendarPage() {
  const profile = useAuthStore((s) => s.profile);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [childTeamId, setChildTeamId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadChildTeam = async () => {
      if (profile?.accountType === 'tutor' && profile.fichaId) {
        try {
          const childDoc = await getDoc(doc(db, 'users', profile.fichaId));
          if (childDoc.exists()) {
            setChildTeamId(childDoc.data().teamId);
          }
        } catch (e) {
          console.error("Error loading child teamId:", e);
        }
      }
    };
    loadChildTeam();
  }, [profile?.fichaId, profile?.accountType]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.clubId) return;
      const targetTeamId = profile.accountType === 'tutor' ? childTeamId : profile.teamId;
      setLoading(true);
      try {
        setEvents(await getPlayerEvents(profile.clubId, targetTeamId));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [profile?.clubId, profile?.teamId, profile?.accountType, childTeamId]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><CalendarDays className="w-7 h-7" /></div>
          Mi Calendario
        </h1>
        <p className="text-slate-500 mt-2">Próximos entrenamientos, partidos y eventos de tu equipo.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : upcoming.length === 0 ? (
        <div className="text-center p-12 bg-white border border-slate-200 border-dashed rounded-2xl text-slate-500">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">No hay eventos próximos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map(ev => {
            const t = typeLabels[ev.type];
            const targetPlayerUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;
            const hasSquadPosted = !!ev.squadIds;
            const isConvoked = ev.squadIds?.includes(targetPlayerUid || '');

            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all flex gap-4">
                <div className="text-center shrink-0 w-14">
                  <p className="text-2xl font-black text-slate-900">{new Date(ev.date + 'T00:00:00').getDate()}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{new Date(ev.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${t.bg} ${t.color}`}>{t.label}</span>
                    
                    {ev.type === 'match' && hasSquadPosted && (
                      isConvoked ? (
                        <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 animate-pulse">
                          ¡Convocado! 🌟
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md border border-slate-200">
                          No convocado
                        </span>
                      )
                    )}

                    {ev.type === 'match' && ev.result && (
                      <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Resultado: {ev.result}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 mt-1">{ev.title}</h3>
                  {ev.description && <p className="text-sm text-slate-500 mt-0.5">{ev.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.time}</span>
                    {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
