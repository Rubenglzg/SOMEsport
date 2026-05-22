import { useState, useEffect, useMemo } from 'react';
import { Activity, Plus, Search, Filter, Loader2, CheckCircle2, Trash2, AlertTriangle, FileText, Clock, Heart, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { getPlayersByClub } from '../../lib/userService';
import { createInjury, updateInjury, deleteInjury, getInjuriesByClub, type Injury } from '../../lib/medicalService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { normalizeSport } from '../../lib/sportUtils';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

export function ClubInjuriesPage() {
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.showToast);
  const clubId = profile?.role === 'staff' ? profile?.clubId : profile?.uid;

  const [loading, setLoading] = useState(true);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Search/Filter state
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedInjury, setSelectedInjury] = useState<Injury | null>(null);

  // Form State
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [injuryType, setInjuryType] = useState<Injury['type']>('muscular');
  const [severity, setSeverity] = useState<Injury['severity']>('leve');
  const [injuryDate, setInjuryDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedRecoveryDate, setEstimatedRecoveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [newProgressNote, setNewProgressNote] = useState('');

  // --- Permisos del Personal (Staff) ---
  const staffPerm = profile?.role === 'staff' ? profile.staffPermissions?.injuries : null;
  const canEdit = staffPerm ? staffPerm.canEdit : true;
  const accessLevel = staffPerm ? staffPerm.accessLevel : 'all';

  const INJURY_TYPES: { value: Injury['type']; label: string }[] = [
    { value: 'muscular', label: 'Muscular' },
    { value: 'osea', label: 'Ósea' },
    { value: 'articular', label: 'Articular' },
    { value: 'ligamentosa', label: 'Ligamentosa' },
    { value: 'tendinosa', label: 'Tendinosa' },
    { value: 'otra', label: 'Otra' },
  ];

  const SEVERITY_TYPES: { value: Injury['severity']; label: string }[] = [
    { value: 'leve', label: 'Leve' },
    { value: 'moderada', label: 'Moderada' },
    { value: 'grave', label: 'Grave' },
  ];

  const loadData = async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const [injList, playersList, teamsList] = await Promise.all([
        getInjuriesByClub(clubId),
        getPlayersByClub(clubId),
        getTeamsByClub(clubId)
      ]);
      setInjuries(injList);
      setPlayers(playersList);
      setTeams(teamsList);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar datos médicos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clubId]);

  // --- Lógica de Filtrado por Permisos de Acceso ---
  const allowedTeams = useMemo(() => {
    if (profile?.role !== 'staff') return teams;
    return teams.filter(t => {
      if (accessLevel === 'assigned') {
        return profile.teamId && t.id === profile.teamId;
      } else {
        if (profile.sportType && normalizeSport(t.sportType) === normalizeSport(profile.sportType)) return true;
      }
      return false;
    });
  }, [teams, profile, accessLevel]);

  const allowedTeamIds = useMemo(() => new Set(allowedTeams.map(t => t.id)), [allowedTeams]);

  const allowedPlayers = useMemo(() => {
    if (!profile) return [];
    if (profile.role !== 'staff') return players.filter(p => p.accountType === 'jugador');
    return players.filter(p => {
      if (p.accountType !== 'jugador') return false;
      if (accessLevel === 'assigned') {
        return profile.teamId && p.teamId === profile.teamId;
      } else {
        const matchesSport = p.sportType && profile.sportType && normalizeSport(p.sportType) === normalizeSport(profile.sportType);
        return p.teamId ? allowedTeamIds.has(p.teamId) : matchesSport;
      }
    });
  }, [players, profile, accessLevel, allowedTeamIds]);

  const allowedPlayerIds = useMemo(() => new Set(allowedPlayers.map(p => p.uid)), [allowedPlayers]);

  const filteredInjuries = useMemo(() => {
    return injuries.filter(inj => {
      if (profile?.role === 'staff' && !allowedPlayerIds.has(inj.playerId)) {
        return false;
      }
      const matchesSearch = inj.playerName.toLowerCase().includes(search.toLowerCase()) || 
                            (inj.category && inj.category.toLowerCase().includes(search.toLowerCase()));
      const matchesSeverity = filterSeverity === 'all' ? true : inj.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' ? true : inj.status === filterStatus;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [injuries, search, filterSeverity, filterStatus, profile, allowedPlayerIds]);

  const activeCount = useMemo(() => injuries.filter(i => {
    if (profile?.role === 'staff' && !allowedPlayerIds.has(i.playerId)) return false;
    return i.status === 'activa';
  }).length, [injuries, allowedPlayerIds, profile]);

  const recoveredCount = useMemo(() => injuries.filter(i => {
    if (profile?.role === 'staff' && !allowedPlayerIds.has(i.playerId)) return false;
    return i.status === 'recuperado';
  }).length, [injuries, allowedPlayerIds, profile]);

  const graveCount = useMemo(() => injuries.filter(i => {
    if (profile?.role === 'staff' && !allowedPlayerIds.has(i.playerId)) return false;
    return i.status === 'activa' && i.severity === 'grave';
  }).length, [injuries, allowedPlayerIds, profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !selectedPlayerId || !canEdit) return;

    const chosenPlayer = allowedPlayers.find(p => p.uid === selectedPlayerId);
    if (!chosenPlayer) {
      showToast('Selecciona un jugador válido', 'error');
      return;
    }

    setFormLoading(true);
    try {
      await createInjury({
        clubId: clubId,
        playerId: selectedPlayerId,
        playerName: chosenPlayer.name || chosenPlayer.username || 'Jugador',
        category: chosenPlayer.category || 'Sin categoría',
        type: injuryType,
        severity,
        status: 'activa',
        injuryDate,
        estimatedRecoveryDate: estimatedRecoveryDate || undefined,
        notes: notes || undefined,
        recommendations: recommendations || undefined,
        progressNotes: [],
        updatedAt: new Date().toISOString()
      });

      showToast('Lesión registrada con éxito', 'success');
      setShowAddModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al registrar lesión', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditOpen = (injury: Injury) => {
    setSelectedInjury(injury);
    setInjuryType(injury.type);
    setSeverity(injury.severity);
    setInjuryDate(injury.injuryDate);
    setEstimatedRecoveryDate(injury.estimatedRecoveryDate || '');
    setNotes(injury.notes || '');
    setRecommendations(injury.recommendations || '');
    setNewProgressNote('');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInjury?.id) return;

    setFormLoading(true);
    try {
      const updatedData: Partial<Injury> = {
        type: injuryType,
        severity,
        injuryDate,
        estimatedRecoveryDate: estimatedRecoveryDate || undefined,
        notes: notes || undefined,
        recommendations: recommendations || undefined,
        updatedAt: new Date().toISOString()
      };

      await updateInjury(selectedInjury.id, updatedData);
      showToast('Historial médico actualizado', 'success');
      setShowEditModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar lesión', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddProgressNote = async () => {
    if (!selectedInjury?.id || !newProgressNote.trim()) return;

    try {
      const currentNotes = selectedInjury.progressNotes || [];
      const timestamp = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const noteWithTime = `[${timestamp}] ${newProgressNote.trim()}`;
      const updatedNotes = [noteWithTime, ...currentNotes];

      await updateInjury(selectedInjury.id, {
        progressNotes: updatedNotes,
        updatedAt: new Date().toISOString()
      });

      showToast('Nota de progreso añadida', 'success');
      setNewProgressNote('');
      setSelectedInjury(prev => prev ? { ...prev, progressNotes: updatedNotes } : null);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Error al añadir nota', 'error');
    }
  };

  const handleDischarge = async (injuryId: string) => {
    try {
      await updateInjury(injuryId, {
        status: 'recuperado',
        estimatedRecoveryDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      });
      showToast('Alta médica registrada. ¡Jugador recuperado! 🎉', 'success');
      if (showEditModal) setShowEditModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Error al registrar alta médica', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteInjury(deleteConfirmId);
      showToast('Registro de lesión eliminado', 'success');
      setDeleteConfirmId(null);
      await loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar registro', 'error');
    }
  };

  const resetForm = () => {
    setSelectedPlayerId('');
    setInjuryType('muscular');
    setSeverity('leve');
    setInjuryDate(new Date().toISOString().split('T')[0]);
    setEstimatedRecoveryDate('');
    setNotes('');
    setRecommendations('');
    setNewProgressNote('');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No definida';
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><Activity className="w-7 h-7 animate-pulse" /></div>
            Control de Lesiones e Historial Médico
          </h1>
          <p className="text-slate-500 mt-2">Registra bajas médicas, evoluciones de progreso y recomendaciones técnicas del club.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20 self-start md:self-auto shrink-0"
          >
            <Plus className="w-5 h-5" /> Registrar Lesión
          </button>
        )}
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500 text-white rounded-xl shadow-sm"><Activity className="w-5 h-5" /></div>
          <div>
            <h3 className="text-2xl font-black text-red-950">{activeCount}</h3>
            <p className="text-xs text-red-800 font-semibold">Lesiones Activas</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-sm"><CheckCircle2 className="w-5 h-5" /></div>
          <div>
            <h3 className="text-2xl font-black text-emerald-950">{recoveredCount}</h3>
            <p className="text-xs text-emerald-800 font-semibold">Altas Médicas (Histórico)</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm"><ShieldAlert className="w-5 h-5" /></div>
          <div>
            <h3 className="text-2xl font-black text-amber-950">{graveCount}</h3>
            <p className="text-xs text-amber-800 font-semibold">Activas de Gravedad Grave</p>
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por jugador o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Filtrar</span>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Todas las Gravedades</option>
            <option value="leve">Leve</option>
            <option value="moderada">Moderada</option>
            <option value="grave">Grave</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="activa">Lesión Activa</option>
            <option value="recuperado">Recuperado (Alta)</option>
          </select>
        </div>
      </div>

      {/* Main Injuries List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>
        ) : filteredInjuries.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-100 rounded-2xl">
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800">No se encontraron registros</h3>
            <p className="text-xs text-slate-400 mt-1">Registra la primera lesión o ajusta los filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredInjuries.map(inj => {
              // Calculate recovery remaining days if active and recovery date is defined
              let daysLeft: number | null = null;
              if (inj.status === 'activa' && inj.estimatedRecoveryDate) {
                const target = new Date(inj.estimatedRecoveryDate).getTime();
                const now = new Date().getTime();
                daysLeft = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
              }

              return (
                <div 
                  key={inj.id} 
                  className={`border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between ${
                    inj.status === 'recuperado' 
                      ? 'border-slate-100 bg-slate-50/40 text-slate-500' 
                      : inj.severity === 'grave'
                        ? 'border-red-200 bg-red-50/10'
                        : inj.severity === 'moderada'
                          ? 'border-amber-200 bg-amber-50/10'
                          : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Severity & Status Badges */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                          inj.severity === 'grave' 
                            ? 'bg-red-100 border-red-200 text-red-700' 
                            : inj.severity === 'moderada'
                              ? 'bg-amber-100 border-amber-200 text-amber-700'
                              : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                        }`}>
                          {inj.severity}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md uppercase tracking-wider text-slate-600">
                          {inj.type}
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        inj.status === 'recuperado'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : 'bg-rose-50 border-rose-100 text-rose-700 animate-pulse'
                      }`}>
                        {inj.status === 'recuperado' ? (
                          <>Alta Médica</>
                        ) : (
                          <>De Baja</>
                        )}
                      </span>
                    </div>

                    {/* Mid Section: Player Name & Category */}
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">{inj.playerName}</h3>
                      <p className="text-xs text-slate-400 font-semibold">{inj.category}</p>
                    </div>

                    {/* Recovery Timeline countdown */}
                    {inj.status === 'activa' && inj.estimatedRecoveryDate && (
                      <div className="bg-white border border-slate-100 p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Evolución estimada</span>
                        </div>
                        <span className={`font-black ${
                          daysLeft !== null && daysLeft < 0
                            ? 'text-slate-400'
                            : daysLeft !== null && daysLeft <= 7
                              ? 'text-rose-600'
                              : 'text-brand-600'
                        }`}>
                          {daysLeft !== null ? (
                            daysLeft < 0 
                              ? 'Fecha rebasada' 
                              : daysLeft === 0 
                                ? 'Recuperación hoy' 
                                : `~${daysLeft} días restantes`
                          ) : (
                            'Pendiente'
                          )}
                        </span>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">Fecha Lesión:</span>
                        <span>{formatDate(inj.injuryDate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {inj.status === 'recuperado' ? 'Alta Registrada:' : 'Recuperación Prevista:'}
                        </span>
                        <span className={inj.status === 'recuperado' ? 'text-emerald-600' : ''}>
                          {formatDate(inj.estimatedRecoveryDate)}
                        </span>
                      </div>
                    </div>

                    {/* Brief Note preview */}
                    {inj.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50/80 p-2.5 border border-slate-100/50 rounded-xl italic line-clamp-2">
                        "{inj.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-4 mt-4 border-t border-slate-100/70 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={() => handleEditOpen(inj)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> {canEdit ? 'Ficha Médica / Editar' : 'Ver Ficha Médica'}
                    </button>

                    <div className="flex items-center gap-2">
                      {inj.status === 'activa' && canEdit && (
                        <button
                          onClick={() => handleDischarge(inj.id!)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                        >
                          Dar Alta
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setDeleteConfirmId(inj.id!)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Injury Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" /> Registrar Lesión
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seleccionar Jugador</label>
                <select
                  required
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                >
                  <option value="">Selecciona un jugador...</option>
                  {players.map(p => (
                    <option key={p.uid} value={p.uid}>
                      {p.name || p.username} ({p.category || 'Sin categoría'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Lesión</label>
                  <select
                    value={injuryType}
                    onChange={(e) => setInjuryType(e.target.value as Injury['type'])}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {INJURY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gravedad</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Injury['severity'])}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold"
                  >
                    {SEVERITY_TYPES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha Lesión</label>
                  <input
                    type="date"
                    required
                    value={injuryDate}
                    onChange={(e) => setInjuryDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Recuperación Estimada</label>
                  <input
                    type="date"
                    value={estimatedRecoveryDate}
                    onChange={(e) => setEstimatedRecoveryDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción de la Lesión / Síntomas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                  placeholder="Ej. Dolor agudo en el isquiotibial izquierdo durante sprint."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Recomendaciones Iniciales del Club</label>
                <textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                  placeholder="Ej. Cero carga física, aplicar hielo 15 min cada 4 horas y acudir a fisioterapia."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/20">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Injury & Medical File Modal */}
      {showEditModal && selectedInjury && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" /> Ficha Médica de Jugador
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Jugador: {selectedInjury.playerName} | {selectedInjury.category}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Medical Summary Header in file */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Estado</span>
                  <span className={`text-xs font-black uppercase ${selectedInjury.status === 'recuperado' ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
                    {selectedInjury.status === 'recuperado' ? 'Recuperado' : 'De Baja'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tipo</span>
                  <span className="text-xs font-black text-slate-700 capitalize">{selectedInjury.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Gravedad</span>
                  <span className="text-xs font-black text-slate-700 capitalize">{selectedInjury.severity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Fecha Lesión</span>
                  <span className="text-xs font-bold text-slate-700">{formatDate(selectedInjury.injuryDate)}</span>
                </div>
              </div>

              {/* Progress Log Timeline */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Clock className="w-4 h-4 text-brand-500" /> Notas de Progreso y Evolución ({selectedInjury.progressNotes?.length || 0})
                </h4>

                {/* Log Entry Box */}
                {canEdit && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Registrar evolución (ej: Fisioterapia completada, ya trota)..."
                      value={newProgressNote}
                      onChange={(e) => setNewProgressNote(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handleAddProgressNote}
                      disabled={!newProgressNote.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1"
                    >
                      Añadir
                    </button>
                  </div>
                )}

                {/* Timeline Render */}
                {!selectedInjury.progressNotes || selectedInjury.progressNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No se han registrado notas de progreso en este caso todavía.
                  </p>
                ) : (
                  <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-3 pt-1">
                    {selectedInjury.progressNotes.map((note, index) => {
                      const regex = /^\[(.*?)\]\s*(.*)$/;
                      const match = note.match(regex);
                      const timeStr = match ? match[1] : '';
                      const contentStr = match ? match[2] : note;

                      return (
                        <div key={index} className="relative group">
                          {/* Dot */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-brand-500 rounded-full border border-white shadow-sm shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 block">{timeStr || 'Evolución'}</span>
                            <p className="text-xs text-slate-700 leading-normal font-medium">{contentStr}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form editing details */}
              <form onSubmit={handleUpdate} className="space-y-5 pt-4 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 pb-1">
                  <ArrowRight className="w-4 h-4 text-slate-500" /> {canEdit ? 'Editar Parámetros Médicos y Recomendaciones' : 'Detalles de la Lesión'}
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo de Lesión</label>
                    <select
                      value={injuryType}
                      disabled={!canEdit}
                      onChange={(e) => setInjuryType(e.target.value as Injury['type'])}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs disabled:opacity-75 disabled:bg-slate-100"
                    >
                      {INJURY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gravedad</label>
                    <select
                      value={severity}
                      disabled={!canEdit}
                      onChange={(e) => setSeverity(e.target.value as Injury['severity'])}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs font-bold disabled:opacity-75 disabled:bg-slate-100"
                    >
                      {SEVERITY_TYPES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fecha Lesión</label>
                    <input
                      type="date"
                      value={injuryDate}
                      disabled={!canEdit}
                      onChange={(e) => setInjuryDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold disabled:opacity-75 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Recuperación Prevista</label>
                    <input
                      type="date"
                      value={estimatedRecoveryDate}
                      disabled={!canEdit}
                      onChange={(e) => setEstimatedRecoveryDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold disabled:opacity-75 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Descripción / Diagnóstico</label>
                  <textarea
                    value={notes}
                    disabled={!canEdit}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs resize-none disabled:opacity-75 disabled:bg-slate-100"
                    placeholder="Detalles sobre el diagnóstico o dolor..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Recomendaciones del Club y Plan de Fisioterapia</label>
                  <textarea
                    value={recommendations}
                    disabled={!canEdit}
                    onChange={(e) => setRecommendations(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs resize-none disabled:opacity-75 disabled:bg-slate-100"
                    placeholder="Instrucciones para el jugador en casa..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  {selectedInjury.status === 'activa' && canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDischarge(selectedInjury.id!)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Dar de Alta Médica
                    </button>
                  )}
                  <div className="flex-1 flex justify-end gap-3">
                    {canEdit ? (
                      <>
                        <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all">Cancelar</button>
                        <button type="submit" disabled={formLoading} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                          {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar Cambios
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all">Cerrar</button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-slide-in">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¿Eliminar registro médico?</h3>
            <p className="text-sm text-slate-500 mt-2">Esta acción borrará de forma permanente el registro e historial de esta lesión en el sistema.</p>
            <div className="mt-6 flex gap-3">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
