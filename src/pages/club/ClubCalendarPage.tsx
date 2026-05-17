import { useState, useEffect } from 'react';
import { CalendarDays, Plus, X, Loader2, Trash2, MapPin, Clock, Check, ClipboardList, Trophy } from 'lucide-react';
import { createEvent, getClubEvents, deleteEvent, updateEvent, type ClubEvent, type EventType } from '../../lib/eventsService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getPlayersByClub } from '../../lib/userService';
import { useAuthStore, type UserProfile } from '../../store/authStore';

export const normalizeSport = (sport: string | undefined | null): string => {
  if (!sport) return '';
  const s = sport.toLowerCase().trim();
  if (s === 'soccer' || s === 'fútbol' || s === 'futbol') return 'Fútbol';
  if (s === 'basketball' || s === 'baloncesto') return 'Baloncesto';
  if (s === 'futsal' || s === 'futbol-sala' || s === 'fútbol sala' || s === 'futbol sala') return 'Fútbol Sala';
  if (s === 'esports' || s === 'electronic sports') return 'eSports';
  if (s === 'voleibol' || s === 'volleyball') return 'Voleibol';
  if (s === 'padel' || s === 'pádel') return 'Pádel';
  if (s === 'tennis' || s === 'tenis') return 'Tenis';
  if (s === 'natación' || s === 'swimming') return 'Natación';
  return sport;
};

const eventTypeLabels: Record<EventType, { label: string; color: string; bg: string }> = {
  training: { label: 'Entrenamiento', color: 'text-blue-700', bg: 'bg-blue-100' },
  match: { label: 'Partido', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  event: { label: 'Evento', color: 'text-amber-700', bg: 'bg-amber-100' },
};

export function ClubCalendarPage() {
  const profile = useAuthStore((state) => state.profile);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('training');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [teamId, setTeamId] = useState('');

  // Convocatoria State
  const [selectedEventForSquad, setSelectedEventForSquad] = useState<ClubEvent | null>(null);
  const [convokedPlayerIds, setConvokedPlayerIds] = useState<string[]>([]);
  const [showSquadModal, setShowSquadModal] = useState(false);

  // Result State
  const [selectedEventForResult, setSelectedEventForResult] = useState<ClubEvent | null>(null);
  const [matchResultText, setMatchResultText] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);

  const targetClubId = profile?.role === 'club' ? profile.uid : profile?.clubId;

  const loadData = async () => {
    if (!targetClubId) return;
    setLoading(true);
    try {
      const [eventsData, teamsData, playersData] = await Promise.all([
        getClubEvents(targetClubId),
        getTeamsByClub(targetClubId),
        getPlayersByClub(targetClubId)
      ]);
      setEvents(eventsData);
      setTeams(teamsData);
      setAllPlayers(playersData.filter(p => p.accountType === 'jugador'));
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [profile?.uid, profile?.clubId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClubId) return;
    setFormLoading(true);
    try {
      await createEvent({
        clubId: targetClubId, teamId: teamId || undefined,
        title, description, type, date, time, location,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setTitle(''); setDescription(''); setType('training'); setDate(''); setTime(''); setLocation(''); setTeamId('');
      await loadData();
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Error al crear evento.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForSquad?.id) return;
    setFormLoading(true);
    try {
      await updateEvent(selectedEventForSquad.id, {
        squadIds: convokedPlayerIds
      });
      setShowSquadModal(false);
      await loadData();
    } catch (error) {
      console.error("Error saving squad:", error);
      alert("Error al guardar la convocatoria.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForResult?.id) return;
    setFormLoading(true);
    try {
      await updateEvent(selectedEventForResult.id, {
        result: matchResultText
      });
      setShowResultModal(false);
      await loadData();
    } catch (error) {
      console.error("Error saving result:", error);
      alert("Error al guardar el resultado.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    try { await deleteEvent(id); await loadData(); }
    catch (error) { console.error("Error deleting event:", error); }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.date >= today);
  const pastEvents = events.filter(e => e.date < today);

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch { return d; }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><CalendarDays className="w-7 h-7" /></div>
            Calendario de Eventos
          </h1>
          <p className="text-slate-500 mt-2 text-base">Programa entrenamientos, partidos y eventos del club.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30">
          <Plus className="w-5 h-5" /> Nuevo Evento
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : (
        <>
          {/* Upcoming */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Próximos Eventos ({upcomingEvents.length})</h2>
            {upcomingEvents.length === 0 ? (
              <div className="text-center p-8 bg-white border border-slate-200 border-dashed rounded-2xl text-slate-500">No hay eventos próximos.</div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(ev => {
                  const typeInfo = eventTypeLabels[ev.type];
                  return (
                    <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group">
                      <div className="flex gap-4 flex-1">
                        <div className="text-center shrink-0 w-14">
                          <p className="text-2xl font-black text-slate-900">{new Date(ev.date + 'T00:00:00').getDate()}</p>
                          <p className="text-xs font-semibold text-slate-500 uppercase">{new Date(ev.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })}</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${typeInfo.bg} ${typeInfo.color}`}>{typeInfo.label}</span>
                            {ev.teamId && <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{teams.find(t => t.id === ev.teamId)?.name}</span>}
                            {ev.type === 'match' && ev.result && (
                              <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> {ev.result}
                              </span>
                            )}
                            {ev.type === 'match' && ev.squadIds && ev.squadIds.length > 0 && (
                              <span className="text-[11px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md border border-brand-200 flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" /> {ev.squadIds.length} Convocados
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg leading-tight">{ev.title}</h3>
                          {ev.description && <p className="text-sm text-slate-500 mt-1">{ev.description}</p>}
                          <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {ev.time}</span>
                            {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {ev.location}</span>}
                          </div>

                          {ev.type === 'match' && (
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  setSelectedEventForSquad(ev);
                                  setConvokedPlayerIds(ev.squadIds || []);
                                  setShowSquadModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-slate-300"
                              >
                                <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                                Convocatoria
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedEventForResult(ev);
                                  setMatchResultText(ev.result || '');
                                  setShowResultModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-slate-300"
                              >
                                <Trophy className="w-3.5 h-3.5 text-slate-500" />
                                Resultado
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(ev.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100 self-start sm:self-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-500 mb-4">Eventos Pasados ({pastEvents.length})</h2>
              <div className="space-y-2 opacity-60">
                {pastEvents.slice(0, 10).map(ev => {
                  const typeInfo = eventTypeLabels[ev.type];
                  return (
                    <div key={ev.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${typeInfo.bg} ${typeInfo.color}`}>{typeInfo.label}</span>
                        <span className="font-semibold text-slate-700 text-sm">{ev.title}</span>
                        <span className="text-xs text-slate-400">{formatDate(ev.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Evento</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ej. Entrenamiento semanal" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Evento</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['training', 'match', 'event'] as EventType[]).map(t => (
                    <label key={t} className={`border-2 rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all text-sm font-bold ${type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <input type="radio" name="type" className="sr-only" checked={type === t} onChange={() => setType(t)} />
                      {eventTypeLabels[t].label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hora</label>
                  <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ubicación</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ej. Polideportivo Municipal" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipo (opcional)</label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all">
                  <option value="">Todos los equipos</option>
                  {(profile?.role === 'staff' && profile.teamId
                    ? teams.filter(t => t.id === profile.teamId)
                    : profile?.role === 'staff' && profile.sportType
                    ? teams.filter(t => normalizeSport(t.sportType) === normalizeSport(profile.sportType))
                    : teams
                  ).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Notas adicionales..." />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convocatoria Modal */}
      {showSquadModal && selectedEventForSquad && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Gestionar Convocatoria</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedEventForSquad.title}</p>
              </div>
              <button onClick={() => setShowSquadModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveSquad} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-sm font-semibold text-slate-500 mb-2">
                Jugadores del equipo: {teams.find(t => t.id === selectedEventForSquad.teamId)?.name || 'Sin equipo'}
              </div>
              
              {allPlayers.filter(p => p.teamId === selectedEventForSquad.teamId).length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-slate-500 text-sm">
                  No hay jugadores asignados a este equipo.
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {allPlayers
                    .filter(p => p.teamId === selectedEventForSquad.teamId)
                    .map(p => {
                      const isChecked = convokedPlayerIds.includes(p.uid!);
                      return (
                        <label key={p.uid} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConvokedPlayerIds([...convokedPlayerIds, p.uid!]);
                              } else {
                                setConvokedPlayerIds(convokedPlayerIds.filter(id => id !== p.uid!));
                              }
                            }}
                            className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                            <p className="text-[11px] text-slate-400">@{p.username}</p>
                          </div>
                        </label>
                      );
                    })
                  }
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowSquadModal(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && selectedEventForResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registrar Resultado</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedEventForResult.title}</p>
              </div>
              <button onClick={() => setShowResultModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveResult} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resultado del Encuentro</label>
                <input
                  type="text"
                  required
                  value={matchResultText}
                  onChange={e => setMatchResultText(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold text-slate-800 text-center text-lg animate-pulse"
                  placeholder="Ej: 3 - 1 o Ganado"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowResultModal(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Resultado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
