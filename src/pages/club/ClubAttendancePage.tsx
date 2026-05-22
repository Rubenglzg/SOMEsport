import { useState, useEffect } from 'react';
import { ClipboardCheck, Loader2, CheckCircle, XCircle, MinusCircle, Search } from 'lucide-react';
import { getClubEvents, type ClubEvent } from '../../lib/eventsService';
import { getPlayersByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { saveAttendance, getEventAttendance, type AttendanceRecord, type AttendanceStatus } from '../../lib/attendanceService';
import { useAuthStore, type UserProfile } from '../../store/authStore';

import { normalizeSport } from '../../lib/sportUtils';

export function ClubAttendancePage() {
  const profile = useAuthStore((state) => state.profile);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const staffPerm = profile?.role === 'staff' ? profile.staffPermissions?.attendance : null;
  const canEdit = staffPerm ? staffPerm.canEdit : true;
  const accessLevel = staffPerm ? staffPerm.accessLevel : 'all';
  const targetClubId = profile?.role === 'staff' ? profile.clubId : profile?.uid;

  useEffect(() => {
    const load = async () => {
      if (!targetClubId) return;
      setLoading(true);
      try {
        const [evData, plData, tmData] = await Promise.all([
          getClubEvents(targetClubId),
          getPlayersByClub(targetClubId),
          getTeamsByClub(targetClubId)
        ]);
        
        let filteredEv = evData;
        if (profile?.role === 'staff') {
          if (accessLevel === 'assigned' && profile.teamId) {
            filteredEv = evData.filter(e => e.teamId === profile.teamId);
          } else if (profile.sportType) {
            filteredEv = evData.filter(e => {
              if (!e.teamId) return true;
              const evTeam = tmData.find(t => t.id === e.teamId);
              return evTeam && normalizeSport(evTeam.sportType) === normalizeSport(profile.sportType);
            });
          }
        }
        
        setEvents(filteredEv);
        setPlayers(plData);
        setTeams(tmData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid, profile?.clubId, targetClubId, accessLevel]);

  const handleSelectEvent = async (ev: ClubEvent) => {
    setSelectedEvent(ev);
    setShowAll(false);
    setSearchQuery('');
    const existing = await getEventAttendance(ev.id!);
    if (existing) {
      setRecords(existing.records);
    } else {
      // Initialize records only for the players of that team if teamId is present
      const initialPlayers = ev.teamId 
        ? players.filter(p => p.teamId === ev.teamId)
        : players;
      setRecords(initialPlayers.map(p => ({ playerId: p.uid!, status: 'absent' as AttendanceStatus })));
    }
  };

  const toggleStatus = (playerId: string) => {
    setRecords(prev => {
      const exists = prev.find(r => r.playerId === playerId);
      if (exists) {
        return prev.map(r => {
          if (r.playerId !== playerId) return r;
          const next: AttendanceStatus = r.status === 'present' ? 'absent' : r.status === 'absent' ? 'justified' : 'present';
          return { ...r, status: next };
        });
      } else {
        // Guest player clicked, default to present
        return [...prev, { playerId, status: 'present' as AttendanceStatus }];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedEvent || !targetClubId) return;
    setSaving(true);
    try {
      // Keep only records of players currently in our players list to prevent orphaned data
      const cleanRecords = records.filter(r => players.some(p => p.uid === r.playerId));
      await saveAttendance({
        eventId: selectedEvent.id!,
        eventTitle: selectedEvent.title,
        clubId: targetClubId,
        date: selectedEvent.date,
        records: cleanRecords
      });
      alert('Asistencia guardada correctamente.');
    } catch (e) {
      console.error(e);
      alert('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (s: AttendanceStatus) => {
    if (s === 'present') return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (s === 'justified') return <MinusCircle className="w-5 h-5 text-amber-600" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const statusLabel = (s: AttendanceStatus) => {
    if (s === 'present') return 'Presente';
    if (s === 'justified') return 'Justificado';
    return 'Ausente';
  };

  const visiblePlayers = players.filter(p => {
    const matchesTeam = showAll || !selectedEvent?.teamId || p.teamId === selectedEvent.teamId;
    const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><ClipboardCheck className="w-7 h-7" /></div>
          Control de Asistencia
        </h1>
        <p className="text-slate-500 mt-2 text-base">Selecciona un evento y gestiona la asistencia de tu plantel de forma segmentada.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Events List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">Eventos del Club</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-2xl border border-slate-150">No hay eventos creados.</p>
            ) : (
              events.map(ev => {
                const evTeam = teams.find(t => t.id === ev.teamId);
                return (
                  <div 
                    key={ev.id} 
                    onClick={() => handleSelectEvent(ev)} 
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedEvent?.id === ev.id 
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-slate-900 text-sm line-clamp-1">{ev.title}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${
                        ev.type === 'match' 
                          ? 'bg-rose-100 text-rose-700 border-rose-200' 
                          : ev.type === 'training' 
                            ? 'bg-teal-100 text-teal-700 border-teal-200' 
                            : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        {ev.type === 'match' ? 'Partido' : ev.type === 'training' ? 'Entreno' : 'Evento'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/50 text-[11px]">
                      <p className="text-slate-500">{ev.date} • {ev.time}</p>
                      <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {evTeam ? evTeam.name : 'Club'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Attendance Roster */}
          <div className="lg:col-span-2">
            {selectedEvent ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Event Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{selectedEvent.title}</h3>
                      <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border">
                        {teams.find(t => t.id === selectedEvent.teamId)?.name || 'Todo el Club'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedEvent.date} a las {selectedEvent.time}</p>
                  </div>
                  {canEdit && (
                    <button 
                      onClick={handleSave} 
                      disabled={saving} 
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Guardar
                    </button>
                  )}
                </div>

                {/* Filters Panel */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-100">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar jugador por nombre..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-400"
                    />
                  </div>

                  {/* Team Filter Toggle */}
                  {selectedEvent.teamId && (
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-600">Invitados de otros equipos</span>
                      <button 
                        onClick={() => setShowAll(!showAll)} 
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          showAll ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      >
                        <span 
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            showAll ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Player List */}
                <div className="p-6 space-y-2 max-h-[500px] overflow-y-auto">
                  {visiblePlayers.map(p => {
                    const rec = records.find(r => r.playerId === p.uid);
                    const status = rec?.status || 'absent';
                    const playerTeam = teams.find(t => t.id === p.teamId)?.name;

                    return (
                      <div 
                        key={p.uid} 
                        onClick={() => canEdit && toggleStatus(p.uid!)} 
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          canEdit ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
                        } ${
                          status === 'present' 
                            ? 'border-emerald-100 bg-emerald-50/30' 
                            : status === 'justified'
                              ? 'border-amber-100 bg-amber-50/20'
                              : 'border-slate-100 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {p.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                            {playerTeam && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold self-start sm:self-auto">
                                {playerTeam}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${
                            status === 'present' 
                              ? 'text-emerald-700' 
                              : status === 'justified' 
                                ? 'text-amber-700' 
                                : 'text-slate-400'
                          }`}>
                            {statusLabel(status)}
                          </span>
                          {statusIcon(status)}
                        </div>
                      </div>
                    );
                  })}
                  {visiblePlayers.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm font-semibold">No se encontraron jugadores</p>
                      <p className="text-xs mt-1">Prueba a desactivar filtros o cambia tu búsqueda.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full bg-white rounded-3xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <ClipboardCheck className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-semibold">Selecciona un evento de la agenda</p>
                <p className="text-sm">Haz clic en un evento de la lista izquierda para visualizar su plantilla y pasar lista de forma instantánea.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
