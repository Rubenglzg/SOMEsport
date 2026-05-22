import { useState, useEffect } from 'react';
import { Building2, Plus, X, Loader2, Edit, Trash2, Lock, Unlock, Shield, Search, Link2, Check, Eye, Users, UserCheck, ChevronRight } from 'lucide-react';
import { getClubs, createClubUser, deleteUserAccount, updateUserAuth, updateUserProfile, getPlayersByClub, getStaffByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { uploadUserProfilePhoto } from '../../lib/storageService';
import type { UserProfile } from '../../store/authStore';


export function AdminClubsPage() {
  const [clubs, setClubs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingClub, setEditingClub] = useState<UserProfile | null>(null);
  const [isAuthUnlocked, setIsAuthUnlocked] = useState(false);

  // Form state
  const [newClubName, setNewClubName] = useState('');
  const [newClubUsername, setNewClubUsername] = useState('');
  const [newClubEmail, setNewClubEmail] = useState('');
  const [newClubPassword, setNewClubPassword] = useState('');

  // Photo State
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // --- Inspection Modal State ---
  const [inspectClub, setInspectClub] = useState<UserProfile | null>(null);
  const [inspectTeams, setInspectTeams] = useState<Team[]>([]);
  const [inspectStaff, setInspectStaff] = useState<UserProfile[]>([]);
  const [inspectPlayers, setInspectPlayers] = useState<UserProfile[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectLocked, setInspectLocked] = useState(true);
  const [inspectSaving, setInspectSaving] = useState(false);
  const [inspectTab, setInspectTab] = useState<'info' | 'teams' | 'staff' | 'players'>('info');

  // Editable fields for inspection
  const [inspName, setInspName] = useState('');
  const [inspUsername, setInspUsername] = useState('');
  const [inspEmail, setInspEmail] = useState('');


  const loadData = async () => {
    setLoading(true);
    try {
      const clubsData = await getClubs();
      setClubs(clubsData);
    } catch (error) {
      console.error("Error loading clubs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreateModal = () => {
    setEditingClub(null);
    setNewClubName(''); setNewClubUsername(''); setNewClubEmail(''); setNewClubPassword('');
    setSelectedPhoto(null); setPhotoPreview('');
    setIsAuthUnlocked(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (club: UserProfile) => {
    setEditingClub(club);
    setNewClubName(club.name || ''); setNewClubUsername(club.username || '');
    setNewClubEmail(club.email || ''); setNewClubPassword('');
    setSelectedPhoto(null); setPhotoPreview(club.photoURL || '');
    setIsAuthUnlocked(false);
    setIsModalOpen(true);
  };

  const handleOpenInspection = async (club: UserProfile) => {
    setInspectClub(club);
    setInspName(club.name || '');
    setInspUsername(club.username || '');
    setInspEmail(club.email || '');
    setInspectLocked(true);
    setInspectTab('info');
    setInspectLoading(true);
    try {
      const [teamsData, staffData, playersData] = await Promise.all([
        getTeamsByClub(club.uid!),
        getStaffByClub(club.uid!),
        getPlayersByClub(club.uid!)
      ]);
      setInspectTeams(teamsData);
      setInspectStaff(staffData);
      setInspectPlayers(playersData);
    } catch (error) {
      console.error("Error loading club inspection:", error);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleSaveInspection = async () => {
    if (!inspectClub?.uid) return;
    setInspectSaving(true);
    try {
      await updateUserProfile(inspectClub.uid, {
        name: inspName,
        username: inspUsername,
      });
      setInspectLocked(true);
      setInspectClub({ ...inspectClub, name: inspName, username: inspUsername });
      await loadData();
    } catch (error: any) {
      console.error("Error saving inspection:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setInspectSaving(false);
    }
  };


  const handleDeleteClub = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar completamente este club?')) return;
    try {
      setLoading(true);
      await deleteUserAccount(uid);
      await loadData();
    } catch (error: any) {
      console.error("Error deleting club:", error);
      alert("Error al eliminar el club: " + error.message);
      setLoading(false);
    }
  };

  const handleCopyLink = (clubId: string) => {
    const url = `${window.location.origin}/inscribirse/${clubId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(clubId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      let currentUid = '';
      if (editingClub) {
        currentUid = editingClub.uid!;
        await updateUserProfile(currentUid, { name: newClubName, username: newClubUsername });
        if (isAuthUnlocked && (newClubEmail !== editingClub.email || newClubPassword.length > 0)) {
          await updateUserAuth(currentUid, newClubEmail, newClubPassword || undefined);
        }
      } else {
        const newClub = await createClubUser(newClubEmail, newClubPassword, newClubName, newClubUsername);
        currentUid = newClub.uid!;
      }

      // Subir foto si se seleccionó una
      if (selectedPhoto && currentUid) {
        const photoURL = await uploadUserProfilePhoto(currentUid, selectedPhoto);
        await updateUserProfile(currentUid, { photoURL });
      }

      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving club:", error);
      alert("Error al guardar el club: " + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredClubs = clubs.filter(club => 
    (club.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (club.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inspectTabs = [
    { id: 'info' as const, label: 'Información', icon: Building2 },
    { id: 'teams' as const, label: `Equipos (${inspectTeams.length})`, icon: Shield },
    { id: 'staff' as const, label: `Staff (${inspectStaff.length})`, icon: UserCheck },
    { id: 'players' as const, label: `Jugadores (${inspectPlayers.length})`, icon: Users },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Building2 className="w-7 h-7" />
            </div>
            Directorio de Clubes
          </h1>
          <p className="text-slate-500 mt-2 text-base">Gestiona todos los clubes registrados en la plataforma.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Registrar Nuevo Club
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-700" /> Clubes Registrados
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar club..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full sm:w-64"
              />
            </div>
            <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg shrink-0">
              {filteredClubs.length} clubes
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No se encontraron clubes</h3>
              <p className="text-slate-500">Prueba con otro término de búsqueda o registra un nuevo club.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Club / Entidad</th>
                  <th className="px-6 py-4 font-semibold">Usuario e Inscripción</th>
                  <th className="px-6 py-4 font-semibold">Email de Contacto</th>
                  <th className="px-6 py-4 font-semibold">Fecha de Alta</th>
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClubs.map((club) => (
                  <tr key={club.uid} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleOpenInspection(club)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                          {club.photoURL ? (
                            <img src={club.photoURL} alt={club.name} className="w-full h-full object-cover" />
                          ) : (
                            club.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{club.name}</p>
                          <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-slate-700 font-medium text-xs">@{club.username || 'N/A'}</span>
                        <button
                          onClick={() => handleCopyLink(club.uid!)}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            copiedId === club.uid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/70 hover:scale-102'
                          }`}
                          title="Copiar enlace de inscripción pública de este club"
                        >
                          {copiedId === club.uid ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 animate-bounce" /> ¡Enlace Copiado!
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3 h-3 text-indigo-600" /> Copiar Enlace Registro
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{club.email}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {club.createdAt ? new Date(club.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenInspection(club)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Inspeccionar">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenEditModal(club)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClub(club.uid!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ============================================== */}
      {/* INSPECTION MODAL                                */}
      {/* ============================================== */}
      {inspectClub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-black overflow-hidden border border-white/30">
                  {inspectClub.photoURL ? (
                    <img src={inspectClub.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    inspectClub.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black">{inspectClub.name}</h3>
                  <p className="text-indigo-200 text-sm font-medium">@{inspectClub.username} • {inspectClub.email}</p>
                </div>
              </div>
              <button onClick={() => setInspectClub(null)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 shrink-0">
              {inspectTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setInspectTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
                      inspectTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {inspectLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
              ) : (
                <>
                  {/* INFO TAB */}
                  {inspectTab === 'info' && (
                    <div className="space-y-6">
                      {/* Lock Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-3">
                          {inspectLocked ? <Lock className="w-5 h-5 text-slate-400" /> : <Unlock className="w-5 h-5 text-amber-600" />}
                          <div>
                            <p className="font-bold text-sm text-slate-900">{inspectLocked ? '🔒 Datos Protegidos' : '🔓 Edición Habilitada'}</p>
                            <p className="text-xs text-slate-500">{inspectLocked ? 'Haz clic en desbloquear para modificar los datos del club.' : 'Puedes editar los campos del club. Guarda los cambios al terminar.'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setInspectLocked(!inspectLocked)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                            inspectLocked
                              ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                              : 'bg-amber-100 border border-amber-300 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {inspectLocked ? <><Unlock className="w-3.5 h-3.5" /> Desbloquear</> : <><Lock className="w-3.5 h-3.5" /> Bloquear</>}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Oficial</label>
                          <input
                            type="text"
                            value={inspName}
                            onChange={e => setInspName(e.target.value)}
                            disabled={inspectLocked}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                          <input
                            type="text"
                            value={inspUsername}
                            onChange={e => setInspUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                            disabled={inspectLocked}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                          <input
                            type="email"
                            value={inspEmail}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all opacity-60 cursor-not-allowed"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">El email se gestiona desde Editar Club (credenciales).</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Alta</label>
                          <input
                            type="text"
                            value={inspectClub.createdAt ? new Date(inspectClub.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all opacity-60 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
                          <p className="text-3xl font-black text-indigo-600">{inspectTeams.length}</p>
                          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mt-1">Equipos</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                          <p className="text-3xl font-black text-emerald-600">{inspectStaff.length}</p>
                          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1">Staff</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                          <p className="text-3xl font-black text-blue-600">{inspectPlayers.length}</p>
                          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-1">Jugadores</p>
                        </div>
                      </div>

                      {/* Save Button */}
                      {!inspectLocked && (
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                          <button
                            onClick={handleSaveInspection}
                            disabled={inspectSaving}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                          >
                            {inspectSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TEAMS TAB */}
                  {inspectTab === 'teams' && (
                    <div className="space-y-3">
                      {inspectTeams.length === 0 ? (
                        <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                          <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                          <p className="font-bold">Este club no tiene equipos creados.</p>
                        </div>
                      ) : (
                        inspectTeams.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                <Shield className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{t.name}</p>
                                <p className="text-xs text-slate-500">{t.category} • {t.sportType || 'Fútbol'}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                              {t.playerIds?.length || 0} jugadores
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* STAFF TAB */}
                  {inspectTab === 'staff' && (
                    <div className="space-y-3">
                      {inspectStaff.length === 0 ? (
                        <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                          <UserCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                          <p className="font-bold">Este club no tiene cuerpo técnico registrado.</p>
                        </div>
                      ) : (
                        inspectStaff.map(s => (
                          <div key={s.uid} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm overflow-hidden">
                                {s.photoURL ? <img src={s.photoURL} alt="" className="w-full h-full object-cover" /> : s.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{s.name}</p>
                                <p className="text-xs text-slate-500">{s.accountType === 'entrenador' ? 'Entrenador' : 'Directivo'} • {s.email}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                              s.accountType === 'entrenador' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
                            }`}>
                              {s.accountType}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* PLAYERS TAB */}
                  {inspectTab === 'players' && (
                    <div className="space-y-3">
                      {inspectPlayers.length === 0 ? (
                        <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                          <p className="font-bold">Este club no tiene jugadores inscritos.</p>
                        </div>
                      ) : (
                        inspectPlayers.map(p => (
                          <div key={p.uid} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden">
                                {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : p.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{p.name}</p>
                                <p className="text-xs text-slate-500">
                                  {p.accountType === 'tutor' ? 'Tutor' : 'Jugador'} • {p.category || 'Sin categoría'} • {p.email}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                              p.status === 'Activo' || p.status === 'Aprobada'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {p.status || 'Pendiente'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* CREATE / EDIT MODAL                             */}
      {/* ============================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {editingClub ? 'Editar Club' : 'Registrar Nuevo Club'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Datos de la Entidad</h4>

                {/* Logo Uploader */}
                <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center font-bold text-slate-400 shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedPhoto(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                      id="club-photo-upload"
                    />
                    <label
                      htmlFor="club-photo-upload"
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm inline-block"
                    >
                      {photoPreview ? 'Cambiar Logo' : 'Subir Logo del Club'}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Oficial del Club</label>
                  <input type="text" required value={newClubName} onChange={(e) => setNewClubName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Ej. FC Barcelona Esports" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Identificador Único (Username)</label>
                  <input type="text" required value={newClubUsername} onChange={(e) => setNewClubUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="ej. fcb_esports" />
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Credenciales de Acceso</h4>
                  {editingClub && (
                    <button type="button" onClick={() => setIsAuthUnlocked(!isAuthUnlocked)} className={`text-xs flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg transition-colors ${isAuthUnlocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                      {isAuthUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {isAuthUnlocked ? 'Bloquear' : 'Desbloquear para editar'}
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo de Administración</label>
                    <input type="email" required disabled={!isAuthUnlocked} value={newClubEmail} onChange={(e) => setNewClubEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="admin@club.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {editingClub ? 'Nueva Contraseña (opcional)' : 'Contraseña Inicial Segura'}
                    </label>
                    <input type="password" required={!editingClub} disabled={!isAuthUnlocked} minLength={6} value={newClubPassword} onChange={(e) => setNewClubPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Mínimo 6 caracteres" />
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingClub ? 'Guardar Cambios' : 'Registrar Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
