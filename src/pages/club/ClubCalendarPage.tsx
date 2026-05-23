import { useState, useEffect } from 'react';
import { CalendarDays, Plus, X, Loader2, Trash2, MapPin, Clock, ClipboardList, Trophy, ShieldAlert, BarChart3, Star, FileText } from 'lucide-react';
import { createEvent, getClubEvents, deleteEvent, updateEvent, type ClubEvent, type EventType, type MatchPlayerStats } from '../../lib/eventsService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { getPlayersByClub } from '../../lib/userService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { normalizeSport } from '../../lib/sportUtils';

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

  // Match Stats State
  const [selectedEventForResult, setSelectedEventForResult] = useState<ClubEvent | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [statsRivalName, setStatsRivalName] = useState('');
  const [statsGoalsFor, setStatsGoalsFor] = useState(0);
  const [statsGoalsAgainst, setStatsGoalsAgainst] = useState(0);
  const [statsMatchReport, setStatsMatchReport] = useState('');
  const [statsPlayerStats, setStatsPlayerStats] = useState<Record<string, MatchPlayerStats>>({});
  const [statsTeamNotes, setStatsTeamNotes] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const isStaff = profile?.role === 'staff';
  const targetClubId = profile?.clubId || profile?.uid;

  // --- Helpers de Autorización ---
  // --- Helpers de Autorización ---
  const calendarPerm = profile?.role === 'staff' ? profile.staffPermissions?.calendar : null;
  const calendarCanEdit = calendarPerm ? calendarPerm.canEdit : true;
  const calendarAccessLevel = calendarPerm ? calendarPerm.accessLevel : 'all';

  const isAuthorizedToEdit = (event: ClubEvent) => {
    if (profile?.role === 'club') return true;
    if (isStaff) {
      if (!calendarCanEdit) return false;
      if (!event.teamId) return false; // El staff no puede gestionar eventos globales
      
      if (calendarAccessLevel === 'assigned') {
        return profile.teamId && event.teamId === profile.teamId;
      } else {
        if (profile.sportType) {
          const eventTeam = teams.find(t => t.id === event.teamId);
          if (eventTeam && normalizeSport(eventTeam.sportType) === normalizeSport(profile.sportType)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Obtener equipos autorizados para el creador
  const getAuthorizedTeams = () => {
    if (!isStaff) return teams;
    if (!calendarCanEdit) return [];
    return teams.filter(t => {
      if (calendarAccessLevel === 'assigned') {
        return profile.teamId && t.id === profile.teamId;
      } else {
        if (profile.sportType && normalizeSport(t.sportType) === normalizeSport(profile.sportType)) return true;
      }
      return false;
    });
  };

  const authorizedTeams = getAuthorizedTeams();

  // Inicializar teamId por defecto cuando el modal se abre si el usuario es staff
  useEffect(() => {
    if (showModal && isStaff && authorizedTeams.length > 0) {
      setTeamId(authorizedTeams[0].id!);
    } else if (showModal && !isStaff) {
      setTeamId('');
    }
  }, [showModal, isStaff, teams]);

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

  useEffect(() => { loadData(); }, [profile?.uid, profile?.clubId, targetClubId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClubId) return;
    
    // Si es staff y no tiene equipos autorizados o intenta crear sin equipo
    if (isStaff && !teamId) {
      alert("Debes seleccionar un equipo autorizado.");
      return;
    }

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
    if (!isAuthorizedToEdit(selectedEventForSquad)) {
      alert("No tienes autorización para editar la convocatoria de este evento.");
      return;
    }
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

  const openStatsModal = (ev: ClubEvent) => {
    setSelectedEventForResult(ev);
    setStatsRivalName(ev.rivalName || '');
    setStatsGoalsFor(ev.goalsFor ?? 0);
    setStatsGoalsAgainst(ev.goalsAgainst ?? 0);
    setStatsMatchReport(ev.matchReport || '');
    setStatsTeamNotes(ev.teamNotes || '');
    // Initialise per-player stats from existing data or fresh defaults
    const existing = ev.playerStats || {};
    const init: Record<string, MatchPlayerStats> = {};
    (ev.squadIds || []).forEach(pid => {
      if (existing[pid]) {
        init[pid] = {
          ...existing[pid],
          privateNotes: existing[pid].privateNotes || ''
        };
      } else {
        const player = allPlayers.find(p => p.uid === pid);
        init[pid] = {
          playerId: pid,
          playerName: player?.name || 'Jugador',
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          minutesPlayed: 0,
          rating: 5,
          privateNotes: ''
        };
      }
    });
    setStatsPlayerStats(init);
    setShowResultModal(true);
  };

  const updatePlayerStat = (pid: string, field: keyof MatchPlayerStats, value: number | string) => {
    setStatsPlayerStats(prev => ({
      ...prev,
      [pid]: { ...prev[pid], [field]: value }
    }));
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForResult?.id) return;
    if (!isAuthorizedToEdit(selectedEventForResult)) {
      alert("No tienes autorización para editar el resultado de este evento.");
      return;
    }
    setFormLoading(true);
    try {
      const autoResult = statsRivalName
        ? `${statsGoalsFor} - ${statsGoalsAgainst} vs ${statsRivalName}`
        : `${statsGoalsFor} - ${statsGoalsAgainst}`;
      await updateEvent(selectedEventForResult.id, {
        result: autoResult,
        rivalName: statsRivalName,
        goalsFor: statsGoalsFor,
        goalsAgainst: statsGoalsAgainst,
        matchReport: statsMatchReport,
        teamNotes: statsTeamNotes,
        playerStats: Object.keys(statsPlayerStats).length > 0 ? statsPlayerStats : undefined,
      });
      setShowResultModal(false);
      await loadData();
    } catch (error) {
      console.error("Error saving result:", error);
      alert("Error al guardar las estadísticas.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (ev: ClubEvent) => {
    if (!isAuthorizedToEdit(ev)) {
      alert("No tienes autorización para eliminar este evento.");
      return;
    }
    if (!window.confirm('¿Eliminar este evento?')) return;
    try { await deleteEvent(ev.id!); await loadData(); }
    catch (error) { console.error("Error deleting event:", error); }
  };

  const mvpVotes = selectedEventForResult?.mvpVotes || {};
  const voteCounts: Record<string, number> = {};
  let totalVotes = 0;
  Object.values(mvpVotes).forEach(votedId => {
    voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    totalVotes++;
  });

  const convocatedMvpList = selectedEventForResult
    ? (selectedEventForResult.squadIds || []).map(pid => {
        const player = allPlayers.find(p => p.uid === pid);
        return {
          uid: pid,
          name: player?.name || 'Jugador',
          votes: voteCounts[pid] || 0,
        };
      }).sort((a, b) => b.votes - a.votes)
    : [];

  const maxVotes = convocatedMvpList.length > 0 ? convocatedMvpList[0].votes : 0;
  const mvpWinners = convocatedMvpList.filter(p => p.votes > 0 && p.votes === maxVotes);

  const today = new Date().toISOString().split('T')[0];

  const staffFilteredEvents = events.filter(e => {
    if (!isStaff) return true;
    if (calendarAccessLevel === 'assigned') {
      return e.teamId === profile?.teamId;
    } else {
      if (!e.teamId) return true; // Mostrar globales del club
      const eventTeam = teams.find(t => t.id === e.teamId);
      return eventTeam && (!profile?.sportType || normalizeSport(eventTeam.sportType) === normalizeSport(profile.sportType));
    }
  });

  const upcomingEvents = staffFilteredEvents.filter(e => e.date >= today);
  const pastEvents = staffFilteredEvents.filter(e => e.date < today);

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
          <p className="text-slate-500 mt-2 text-base">
            {isStaff 
              ? 'Gestiona convocatorias, entrenamientos y partidos de tus equipos.' 
              : 'Programa entrenamientos, partidos y eventos del club.'}
          </p>
        </div>
        {(!isStaff || authorizedTeams.length > 0) && (
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30">
            <Plus className="w-5 h-5" /> Nuevo Evento
          </button>
        )}
      </div>

      {isStaff && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium">
            Como miembro del cuerpo técnico, solo puedes crear y editar eventos (entrenamientos, partidos, resultados y convocatorias) para los equipos que tienes asignados.
          </p>
        </div>
      )}

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
                  const canEdit = isAuthorizedToEdit(ev);
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

                          {ev.type === 'match' && canEdit && (
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
                                onClick={() => openStatsModal(ev)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-300"
                              >
                                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                                Estadísticas
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDelete(ev)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100 self-start sm:self-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipo {isStaff ? '(obligatorio)' : '(opcional)'}</label>
                <select required={isStaff} value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-semibold text-slate-700">
                  {!isStaff && <option value="">Todos los equipos</option>}
                  {authorizedTeams.map(t => (
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

      {/* Match Stats Modal */}
      {showResultModal && selectedEventForResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl"><BarChart3 className="w-5 h-5 text-amber-700" /></div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Estadísticas del Partido</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedEventForResult.title}</p>
                </div>
              </div>
              <button onClick={() => setShowResultModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/60 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveResult} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Score Section */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">Marcador</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center flex-1">
                    <p className="text-[11px] font-semibold text-slate-400 mb-2">Tu equipo</p>
                    <input type="number" min={0} value={statsGoalsFor} onChange={e => setStatsGoalsFor(parseInt(e.target.value) || 0)} className="w-20 mx-auto block text-center text-4xl font-black bg-white/10 border border-white/20 rounded-xl py-2 text-white outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
                  </div>
                  <span className="text-3xl font-black text-slate-500 pt-5">—</span>
                  <div className="text-center flex-1">
                    <p className="text-[11px] font-semibold text-slate-400 mb-2">Rival</p>
                    <input type="number" min={0} value={statsGoalsAgainst} onChange={e => setStatsGoalsAgainst(parseInt(e.target.value) || 0)} className="w-20 mx-auto block text-center text-4xl font-black bg-white/10 border border-white/20 rounded-xl py-2 text-white outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
                  </div>
                </div>
                <div className="mt-4">
                  <input type="text" placeholder="Nombre del rival (ej: Real Madrid CF)" value={statsRivalName} onChange={e => setStatsRivalName(e.target.value)} className="w-full text-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
                </div>
              </div>

              {/* MVP Leaderboard (Plantilla) */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-amber-600 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-800">Resultado MVP (Votos de la plantilla)</h4>
                </div>
                {totalVotes === 0 ? (
                  <p className="text-xs text-slate-500 italic">Aún no hay votos registrados por los jugadores convocados.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {mvpWinners.map(winner => (
                        <span key={winner.uid} className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-md shadow-amber-500/20">
                          👑 MVP: {winner.name} ({winner.votes} {winner.votes === 1 ? 'voto' : 'votos'})
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {convocatedMvpList.slice(0, 4).filter(p => p.votes > 0).map(p => {
                        const pct = totalVotes > 0 ? Math.round((p.votes / totalVotes) * 100) : 0;
                        return (
                          <div key={p.uid} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between text-xs">
                            <div className="flex justify-between font-semibold text-slate-700 mb-1">
                              <span className="truncate">{p.name}</span>
                              <span className="shrink-0 text-amber-700 font-bold">{p.votes} {p.votes === 1 ? 'voto' : 'votos'} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Match Report & Team Notes */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Crónica del Partido
                  </label>
                  <textarea value={statsMatchReport} onChange={e => setStatsMatchReport(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none text-sm" placeholder="Resumen del encuentro, análisis táctico, aspectos a mejorar..." />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    💬 Indicaciones Colectivas (Notas generales del equipo)
                  </label>
                  <textarea value={statsTeamNotes} onChange={e => setStatsTeamNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none text-sm" placeholder="Mensaje general para la plantilla: felicitaciones, pautas para el próximo entrenamiento..." />
                </div>
              </div>

              {/* Player Stats Table */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Star className="w-4 h-4 text-amber-500" /> Estadísticas Individuales y Feedback 🔒
                </label>
                {(!selectedEventForResult.squadIds || selectedEventForResult.squadIds.length === 0) ? (
                  <div className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-200 border-dashed">
                    <ClipboardList className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-amber-800">Sin convocatoria definida</p>
                    <p className="text-xs text-amber-600 mt-1">Primero gestiona la convocatoria del partido para registrar estadísticas individuales.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(statsPlayerStats).map(([pid, ps]) => {
                      const isExpanded = !!expandedNotes[pid];
                      return (
                        <div key={pid} className="bg-slate-50 rounded-xl border border-slate-200 p-4 transition-all">
                          <div className="flex items-center justify-between mb-3 gap-2">
                            <p className="font-bold text-slate-800 text-sm">{ps.playerName}</p>
                            <button
                              type="button"
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [pid]: !prev[pid] }))}
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${isExpanded ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            >
                              <span>Feedback Personal 💬</span>
                              {ps.privateNotes?.trim() ? <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> : null}
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Goles</label>
                              <input type="number" min={0} value={ps.goals} onChange={e => updatePlayerStat(pid, 'goals', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-1 focus:ring-amber-400" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Asist.</label>
                              <input type="number" min={0} value={ps.assists} onChange={e => updatePlayerStat(pid, 'assists', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-1 focus:ring-amber-400" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Min.</label>
                              <input type="number" min={0} max={120} value={ps.minutesPlayed} onChange={e => updatePlayerStat(pid, 'minutesPlayed', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-1 focus:ring-amber-400" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-amber-600 uppercase block mb-1">🟡 T.A.</label>
                              <select value={ps.yellowCards} onChange={e => updatePlayerStat(pid, 'yellowCards', parseInt(e.target.value))} className="w-full px-1 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-1 focus:ring-amber-400">
                                <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-red-600 uppercase block mb-1">🔴 T.R.</label>
                              <select value={ps.redCards} onChange={e => updatePlayerStat(pid, 'redCards', parseInt(e.target.value))} className="w-full px-1 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-1 focus:ring-amber-400">
                                <option value={0}>0</option><option value={1}>1</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-amber-500 uppercase block mb-1">⭐ Nota</label>
                              <select value={ps.rating} onChange={e => updatePlayerStat(pid, 'rating', parseInt(e.target.value))} className="w-full px-1 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-1 focus:ring-amber-400">
                                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Collapsible privateNotes Area */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 bg-amber-50/50 p-2.5 rounded-lg">
                              <label className="block text-[10px] font-bold text-amber-800 mb-1.5 flex items-center gap-1">
                                🔒 Nota Privada para el Jugador y Tutor
                              </label>
                              <textarea
                                value={ps.privateNotes || ''}
                                onChange={e => updatePlayerStat(pid, 'privateNotes', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-400 text-xs resize-none placeholder-slate-400 font-semibold"
                                placeholder="Escribe feedback discreto sobre lo que hizo bien y aspectos a mejorar. Solo visible para él."
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowResultModal(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 shadow-lg shadow-amber-500/25 transition-all">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾 Guardar Estadísticas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
