import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2, Loader2, Edit, Trash2, X, Search, Filter, FileText, Eye, ShieldAlert, FileCheck, Check } from 'lucide-react';
import { getClubs, getAllPlayers, deleteUserAccount, updateUserProfile } from '../../lib/userService';
import { getPlayerDocuments, updateDocumentStatus, type PlayerDocument } from '../../lib/storageService';
import type { UserProfile } from '../../store/authStore';

export function AdminPlayersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewPlayerId = searchParams.get('review');
  const initialPendingFilter = searchParams.get('status');

  const [clubs, setClubs] = useState<UserProfile[]>([]);
  const [allPlayers, setAllPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialPendingFilter || '');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Inspection & Form Modal States
  const [inspectedPlayer, setInspectedPlayer] = useState<UserProfile | null>(null);
  const [inspectedDocs, setInspectedDocs] = useState<PlayerDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docNotesInput, setDocNotesInput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'docs'>('profile');
  const [actioningDocId, setActioningDocId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Security Locking State
  const [isLocked, setIsLocked] = useState(true);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDni, setFormDni] = useState('');
  const [formIsAdult, setFormIsAdult] = useState(true);
  const [formTutorName, setFormTutorName] = useState('');
  const [formTutorPhone, setFormTutorPhone] = useState('');
  const [formTutorEmail, setFormTutorEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('Pendiente');

  const loadData = async () => {
    setLoading(true);
    try {
      const [clubsData, playersData] = await Promise.all([getClubs(), getAllPlayers()]);
      setClubs(clubsData);
      setAllPlayers(playersData);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenInspectDrawer = async (player: UserProfile, startUnlocked = false) => {
    setInspectedPlayer(player);
    setIsLocked(!startUnlocked);
    
    // Initialize form states with player data
    setFormName(player.name || '');
    setFormUsername(player.username || '');
    setFormEmail(player.email || '');
    setFormPhone(player.phone || '');
    setFormBirthDate(player.birthDate || '');
    setFormCategory(player.category || '');
    setFormDni(player.dni || '');
    setFormIsAdult(player.isAdult ?? true);
    setFormTutorName(player.tutorName || '');
    setFormTutorPhone(player.tutorPhone || '');
    setFormTutorEmail(player.tutorEmail || '');
    setFormNotes(player.notes || '');
    setFormStatus(player.status || 'Pendiente');

    setInspectedDocs([]);
    setActiveTab('profile');
    setLoadingDocs(true);
    setSearchParams({ review: player.uid! }); // Sync URL
    try {
      const docs = await getPlayerDocuments(player.uid!);
      setInspectedDocs(docs);
    } catch (error) {
      console.error("Error fetching player documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Handle URL parameters for direct player review
  useEffect(() => {
    if (!loading && allPlayers.length > 0 && reviewPlayerId) {
      const foundPlayer = allPlayers.find(p => p.uid === reviewPlayerId);
      if (foundPlayer) {
        handleOpenInspectDrawer(foundPlayer, false);
      }
    }
  }, [loading, allPlayers, reviewPlayerId]);

  const handleCloseInspectDrawer = () => {
    setInspectedPlayer(null);
    setSearchParams({}); // Clear search params
    setIsLocked(true);
  };

  const handleDocumentApproval = async (docId: string, status: 'approved' | 'rejected') => {
    setActioningDocId(docId);
    try {
      const notes = status === 'rejected' ? docNotesInput[docId] || 'Documento no legible o inválido. Por favor súbelo de nuevo.' : '';
      await updateDocumentStatus(docId, status, notes);
      
      // Refresh documents
      if (inspectedPlayer?.uid) {
        const docs = await getPlayerDocuments(inspectedPlayer.uid);
        setInspectedDocs(docs);
      }
      
      // Clean notes input
      setDocNotesInput(prev => ({ ...prev, [docId]: '' }));
    } catch (error) {
      console.error("Error updating document status:", error);
      alert("Hubo un error al actualizar el estado del documento.");
    } finally {
      setActioningDocId(null);
    }
  };

  const handleDeletePlayer = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar completamente a este usuario?')) return;
    try {
      setLoading(true);
      await deleteUserAccount(uid);
      if (inspectedPlayer?.uid === uid) {
        handleCloseInspectDrawer();
      }
      await loadData();
    } catch (error: any) {
      console.error("Error deleting player:", error);
      alert("Error al eliminar al jugador: " + error.message);
      setLoading(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedPlayer?.uid) return;
    setFormLoading(true);
    try {
      const updatedData = {
        name: formName,
        username: formUsername,
        email: formEmail,
        phone: formPhone,
        birthDate: formBirthDate,
        category: formCategory,
        dni: formDni,
        isAdult: formIsAdult,
        tutorName: formTutorName,
        tutorPhone: formTutorPhone,
        tutorEmail: formTutorEmail,
        notes: formNotes,
        status: formStatus
      };
      await updateUserProfile(inspectedPlayer.uid, updatedData);
      
      // Update local state and lock
      setInspectedPlayer(prev => prev ? { ...prev, ...updatedData } : null);
      setIsLocked(true);
      await loadData();
    } catch (error: any) {
      console.error("Error saving profile changes:", error);
      alert("Error al guardar los cambios: " + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveInspectedStatus = async (status: string) => {
    if (!inspectedPlayer?.uid) return;
    setLoadingDocs(true);
    try {
      await updateUserProfile(inspectedPlayer.uid, { status });
      // Update local states
      setInspectedPlayer(prev => prev ? { ...prev, status } : null);
      setFormStatus(status);
      await loadData();
    } catch (error: any) {
      console.error("Error updating inspected player status:", error);
      alert("No se pudo actualizar el estado del jugador: " + error.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Filter players
  const filteredPlayers = allPlayers.filter(player => {
    const matchesSearch = 
      (player.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClub = selectedClub === '' || player.clubId === selectedClub;
    const matchesStatus = selectedStatus === '' || player.status === selectedStatus;
    
    const playerCategory = (player.category || '').toLowerCase();
    const matchesCategory = selectedCategory === '' || playerCategory.includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesClub && matchesStatus && matchesCategory;
  });

  const uniqueCategories = Array.from(
    new Set(allPlayers.map(p => p.category).filter(Boolean))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            Directorio de Jugadores
          </h1>
          <p className="text-slate-500 mt-2 text-base">Vista global de todos los jugadores y tutores de los clubes.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-2">
          <Filter className="w-5 h-5 text-slate-500" /> Controles y Filtros de Búsqueda
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o @"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="">Todos los Clubes</option>
            {clubs.map(club => (
              <option key={club.uid} value={club.uid}>{club.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="">Todas las Categorías</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="">Cualquier Estado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Activo">Activo / Aprobado</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Fichas de Jugadores
          </h2>
          <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {filteredPlayers.length} de {allPlayers.length} fichas
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Sin coincidencias</h3>
              <p className="text-slate-500">Prueba ajustando los filtros de búsqueda.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Jugador / Contacto</th>
                  <th className="px-6 py-4 font-semibold">Club Perteneciente</th>
                  <th className="px-6 py-4 font-semibold">Categoría / Tipo</th>
                  <th className="px-6 py-4 font-semibold">Estado Global</th>
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlayers.map((player) => {
                  const clubObj = clubs.find(c => c.uid === player.clubId);
                  return (
                    <tr
                      key={player.uid}
                      onClick={() => handleOpenInspectDrawer(player, false)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{player.name}</span>
                          <span className="text-xs text-slate-500">@{player.username} • {player.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                          <Building2 className="w-3 h-3" /> {clubObj?.name || 'Club Desconocido'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{player.category || '-'}</span>
                          <span className="text-xs text-slate-500 capitalize">{player.accountType || 'Jugador'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          player.status === 'Aprobada' || player.status === 'Activo' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' :
                          player.status === 'Pendiente' ? 'text-amber-700 bg-amber-100 border border-amber-200' :
                          'text-brand-700 bg-brand-100 border border-brand-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            player.status === 'Aprobada' || player.status === 'Activo' ? 'bg-emerald-500' :
                            player.status === 'Pendiente' ? 'bg-amber-500' : 'bg-brand-500'
                          }`}></span>
                          {player.status || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenInspectDrawer(player, false)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Revisar Expediente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenInspectDrawer(player, true)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Datos"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.uid!)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Large Centered Modal for Player Profile Inspection & Locked Editing */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={handleCloseInspectDrawer} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" />

          {/* Centered Large Modal Container */}
          <div className="relative w-full max-w-4xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col z-10 max-h-[90vh] border border-slate-100 animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-2xl border border-blue-200 overflow-hidden shadow-sm shrink-0">
                  {inspectedPlayer.photoURL ? (
                    <img src={inspectedPlayer.photoURL} alt={inspectedPlayer.name} className="w-full h-full object-cover" />
                  ) : (
                    inspectedPlayer.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl leading-tight flex items-center gap-2">
                    {inspectedPlayer.name}
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200/80 text-slate-600 rounded-md uppercase tracking-wider">
                      {inspectedPlayer.accountType || 'Jugador'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">@{inspectedPlayer.username} • {inspectedPlayer.email}</p>
                </div>
              </div>

              {/* Safety Switch Toggle */}
              <div className="flex items-center gap-3 self-start sm:self-center">
                <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsLocked(!isLocked)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      isLocked 
                        ? 'bg-white text-slate-700 border border-slate-200/50' 
                        : 'bg-red-500 text-white border border-red-600 ring-2 ring-red-500/20'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <span className="text-xs">🔒</span> Desbloquear Edición
                      </>
                    ) : (
                      <>
                        <span className="text-xs">🔓</span> Edición Habilitada
                      </>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={handleCloseInspectDrawer}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-slate-100 shrink-0 text-sm font-semibold bg-slate-50/50">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  activeTab === 'profile'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Expediente y Datos
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex-1 py-3 text-center border-b-2 transition-all relative ${
                  activeTab === 'docs'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Documentación Adjunta
                {inspectedDocs.some(d => d.status === 'pending') && (
                  <span className="absolute top-3.5 right-6 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Modal Body / Forms */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {activeTab === 'profile' ? (
                <form onSubmit={handleSaveChanges} className="space-y-6">
                  {/* Lock banner */}
                  {!isLocked && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      Atención: El modo edición está desbloqueado. Ten cuidado al guardar los cambios para no alterar datos sensibles accidentalmente.
                    </div>
                  )}

                  {/* Form fields grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de Usuario</label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email de Acceso</label>
                      <input
                        type="email"
                        required
                        disabled={isLocked}
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teléfono Móvil</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Nacimiento</label>
                      <input
                        type="date"
                        disabled={isLocked}
                        value={formBirthDate}
                        onChange={(e) => setFormBirthDate(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">DNI / Pasaporte</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={formDni}
                        onChange={(e) => setFormDni(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoría Deportiva</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Cuenta (Edad)</label>
                      <select
                        disabled={isLocked}
                        value={formIsAdult ? 'adult' : 'minor'}
                        onChange={(e) => setFormIsAdult(e.target.value === 'adult')}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        <option value="adult">Adulto (+18)</option>
                        <option value="minor">Menor de Edad (Requiere Tutor)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado de Ficha</label>
                      <select
                        disabled={isLocked}
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Activo">Activo / Aprobada</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notas Internas de Administración</label>
                      <textarea
                        disabled={isLocked}
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Sin notas de administración registradas..."
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all outline-none ${
                          isLocked 
                            ? 'bg-slate-50/80 text-slate-600 border-slate-200/60 cursor-not-allowed select-none italic' 
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Tutor Section (If minor) */}
                  {!formIsAdult && (
                    <div className="space-y-4 pt-6 border-t border-slate-200">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Información de Tutor Legal</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre Tutor</label>
                          <input
                            type="text"
                            required
                            disabled={isLocked}
                            value={formTutorName}
                            onChange={(e) => setFormTutorName(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-xl text-xs font-semibold transition-all outline-none bg-white ${
                              isLocked 
                                ? 'text-slate-500 border-slate-200/60 cursor-not-allowed select-none' 
                                : 'text-slate-800 border-slate-300 focus:ring-1 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono Tutor</label>
                          <input
                            type="text"
                            required
                            disabled={isLocked}
                            value={formTutorPhone}
                            onChange={(e) => setFormTutorPhone(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-xl text-xs font-semibold transition-all outline-none bg-white ${
                              isLocked 
                                ? 'text-slate-500 border-slate-200/60 cursor-not-allowed select-none' 
                                : 'text-slate-800 border-slate-300 focus:ring-1 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Tutor</label>
                          <input
                            type="email"
                            required
                            disabled={isLocked}
                            value={formTutorEmail}
                            onChange={(e) => setFormTutorEmail(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-xl text-xs font-semibold transition-all outline-none bg-white ${
                              isLocked 
                                ? 'text-slate-500 border-slate-200/60 cursor-not-allowed select-none' 
                                : 'text-slate-800 border-slate-300 focus:ring-1 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit action buttons (Show only when unlocked) */}
                  {!isLocked && (
                    <div className="pt-6 border-t border-slate-200 flex justify-end gap-3 animate-fade-in shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLocked(true);
                          // Revert to current inspected values
                          setFormName(inspectedPlayer.name || '');
                          setFormUsername(inspectedPlayer.username || '');
                          setFormEmail(inspectedPlayer.email || '');
                          setFormPhone(inspectedPlayer.phone || '');
                          setFormBirthDate(inspectedPlayer.birthDate || '');
                          setFormCategory(inspectedPlayer.category || '');
                          setFormDni(inspectedPlayer.dni || '');
                          setFormIsAdult(inspectedPlayer.isAdult ?? true);
                          setFormTutorName(inspectedPlayer.tutorName || '');
                          setFormTutorPhone(inspectedPlayer.tutorPhone || '');
                          setFormTutorEmail(inspectedPlayer.tutorEmail || '');
                          setFormNotes(inspectedPlayer.notes || '');
                          setFormStatus(inspectedPlayer.status || 'Pendiente');
                        }}
                        className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        Cancelar y Bloquear
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                        Guardar Cambios
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auditoría de Documentación</h4>

                  {loadingDocs ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500">Cargando adjuntos...</span>
                    </div>
                  ) : inspectedDocs.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-900 text-sm">Sin archivos</p>
                      <p className="text-xs text-slate-500 mt-1">El jugador aún no ha subido ningún documento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inspectedDocs.map(doc => {
                        const typeLabel = doc.type === 'dni' ? 'DNI / Pasaporte' : doc.type === 'medical' ? 'Reconocimiento Médico' : 'Autorización Paterna';
                        return (
                          <div key={doc.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
                                  <div className="overflow-hidden">
                                    <p className="font-bold text-slate-900 text-xs uppercase tracking-wide">{typeLabel}</p>
                                    <p className="text-[10px] text-slate-400 truncate w-36 mt-0.5" title={doc.fileName}>{doc.fileName}</p>
                                  </div>
                                </div>
                                
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  doc.status === 'approved' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200/55' :
                                  doc.status === 'rejected' ? 'text-red-700 bg-red-100 border border-red-200/55' :
                                  'text-blue-700 bg-blue-100 border border-blue-200/55'
                                }`}>
                                  {doc.status === 'approved' ? 'Aprobado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                </span>
                              </div>

                              {doc.notes && (
                                <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 font-semibold mt-2.5">
                                  <span className="font-bold">Rechazo:</span> {doc.notes}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2 pt-3 border-t border-slate-200/60 mt-3">
                              <div className="flex gap-2">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver Adjunto
                                </a>
                                
                                {doc.status !== 'approved' && (
                                  <button
                                    onClick={() => handleDocumentApproval(doc.id!, 'approved')}
                                    disabled={actioningDocId === doc.id}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1"
                                  >
                                    {actioningDocId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Aprobar
                                  </button>
                                )}
                              </div>

                              {/* Rejection input and trigger */}
                              {doc.status !== 'rejected' && (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={docNotesInput[doc.id!] || ''}
                                    onChange={(e) => setDocNotesInput(prev => ({ ...prev, [doc.id!]: e.target.value }))}
                                    placeholder="Escribe el motivo del rechazo..."
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-red-500 bg-white"
                                  />
                                  <button
                                    onClick={() => handleDocumentApproval(doc.id!, 'rejected')}
                                    disabled={actioningDocId === doc.id || !docNotesInput[doc.id!]}
                                    className="w-full py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                                  >
                                    Rechazar Documento
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Status Buttons (Disabled when editing, to enforce single flow) */}
            {isLocked && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado Global Ficha</span>
                <div className="flex items-center gap-2">
                  {['Pendiente', 'En Proceso', 'Activo'].map(st => {
                    const isSelected = inspectedPlayer.status === st || (st === 'Activo' && inspectedPlayer.status === 'Aprobada');
                    const colorMap: Record<string, string> = {
                      'Pendiente': 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700',
                      'En Proceso': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                      'Activo': 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
                    };

                    return (
                      <button
                        key={st}
                        onClick={() => handleSaveInspectedStatus(st)}
                        disabled={loadingDocs}
                        className={`py-1.5 px-4 font-bold text-xs border rounded-xl transition-all shadow-sm ${
                          isSelected ? colorMap[st] : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {st === 'Activo' ? 'Aprobada / Activo' : st}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

