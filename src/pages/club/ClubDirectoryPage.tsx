import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, X, Loader2, Edit, Trash2, Lock, Unlock, AlertCircle, CheckCircle, Search, Filter, Zap, Copy, Download, Puzzle } from 'lucide-react';
import { getPlayersByClub, createPlayerUser, deleteUserAccount, updateUserAuth, updateUserProfile } from '../../lib/userService';
import { getTeamsByClub, assignPlayerToTeam, removePlayerFromTeam, type Team } from '../../lib/teamsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';

export function ClubDirectoryPage() {
  const profile = useAuthStore((state) => state.profile);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<UserProfile | null>(null);
  const [isAuthUnlocked, setIsAuthUnlocked] = useState(false);

  // Copilot State
  const [copilotPlayer, setCopilotPlayer] = useState<UserProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [newAccountType, setNewAccountType] = useState<'jugador' | 'tutor'>('jugador');
  const [newIsAdult, setNewIsAdult] = useState(true);
  const [newStatus, setNewStatus] = useState('Pendiente');
  const [newFichaId, setNewFichaId] = useState(''); // ID del jugador al que se vincula el tutor
  const [newDni, setNewDni] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTutorName, setNewTutorName] = useState('');
  const [newTutorPhone, setNewTutorPhone] = useState('');
  const [newTutorEmail, setNewTutorEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'jugador', 'tutor'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'Pendiente', 'Activo'

  const loadData = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const [playersData, teamsData] = await Promise.all([
        getPlayersByClub(profile.uid),
        getTeamsByClub(profile.uid)
      ]);
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [profile?.uid]);

  const pendingPlayers = players.filter(p => p.status === 'Pendiente');
  const activePlayers = players.filter(p => p.status === 'Activo' || p.status === 'Aprobada');

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.username || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' ? true : p.accountType === filterType;
      const matchesStatus = filterStatus === 'all' ? true : 
                            (filterStatus === 'Activo' ? (p.status === 'Activo' || p.status === 'Aprobada') : p.status === filterStatus);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [players, searchQuery, filterType, filterStatus]);

  const visibleTeams = useMemo(() => {
    return teams.filter(team => {
      if (!profile?.activeSports || profile.activeSports.length === 0) return true;
      return team.sportType ? profile.activeSports.includes(team.sportType) : true;
    });
  }, [teams, profile]);

  const handleOpenCreateModal = () => {
    setEditingPlayer(null);
    setNewName(''); setNewUsername(''); setNewEmail(''); setNewPassword('');
    setNewTeamId(''); setNewAccountType('jugador'); setNewIsAdult(true); setNewStatus('Pendiente'); setNewFichaId('');
    setNewDni(''); setNewBirthDate(''); setNewPhone('');
    setNewTutorName(''); setNewTutorPhone(''); setNewTutorEmail(''); setNewNotes('');
    setIsAuthUnlocked(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (player: UserProfile) => {
    setEditingPlayer(player);
    setNewName(player.name || ''); 
    
    // Si es un pre-registro (no tiene username)
    const isPreReg = !player.username;
    if (isPreReg) {
      const generatedUsername = player.name 
        ? player.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") 
        : '';
      setNewUsername(generatedUsername);
      setNewPassword('avantia123');
      setIsAuthUnlocked(true);
    } else {
      setNewUsername(player.username || '');
      setNewPassword('');
      setIsAuthUnlocked(false);
    }

    setNewEmail(player.email || '');
    setNewTeamId(player.teamId || ''); 
    setNewAccountType((player.accountType === 'tutor' ? 'tutor' : 'jugador') as 'jugador' | 'tutor');
    setNewIsAdult(player.isAdult ?? true); 
    setNewStatus(player.status || 'Pendiente'); 
    setNewFichaId(player.fichaId || '');
    setNewDni(player.dni || '');
    setNewBirthDate(player.birthDate || '');
    setNewPhone(player.phone || '');
    setNewTutorName(player.tutorName || '');
    setNewTutorPhone(player.tutorPhone || '');
    setNewTutorEmail(player.tutorEmail || '');
    setNewNotes(player.notes || '');
    setIsModalOpen(true);
  };

  const handleDeletePlayer = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este usuario?')) return;
    try {
      setLoading(true);
      await deleteUserAccount(uid);
      await loadData();
    } catch (error: any) {
      console.error("Error deleting player:", error);
      alert("Error al eliminar: " + error.message);
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFormLoading(true);
    try {
      if (newAccountType === 'tutor') {
        if (!newFichaId) {
          alert("Debes seleccionar una Ficha de Jugador a vincular.");
          setFormLoading(false);
          return;
        }
        const linkedTutors = players.filter(p => p.accountType === 'tutor' && p.fichaId === newFichaId && p.uid !== (editingPlayer?.uid || ''));
        if (linkedTutors.length >= 2) {
          alert("No se pueden asociar más de 2 tutores a la misma ficha de jugador (máximo de 3 cuentas en total: 1 jugador + 2 tutores).");
          setFormLoading(false);
          return;
        }
      }

      if (editingPlayer) {
        const isPreReg = !editingPlayer.username;
        
        if (isPreReg) {
          // Es un pre-registro público, creamos su cuenta formal de autenticación
          const newPlayer = await createPlayerUser({
            email: newEmail,
            password: newPassword,
            name: newName,
            username: newUsername,
            clubId: profile.uid,
            teamId: newTeamId,
            accountType: newAccountType,
            isAdult: newAccountType === 'tutor' ? true : newIsAdult,
            fichaId: newAccountType === 'tutor' ? newFichaId : undefined,
            phone: newPhone || editingPlayer.phone || '',
            tutorName: newTutorName || editingPlayer.tutorName || '',
            tutorPhone: newTutorPhone || editingPlayer.tutorPhone || '',
            tutorEmail: newTutorEmail || editingPlayer.tutorEmail || '',
            notes: newNotes || editingPlayer.notes || '',
            dni: newDni || editingPlayer.dni || '',
            birthDate: newBirthDate || editingPlayer.birthDate || ''
          });
          
          // Establecemos su estado final
          await updateUserProfile(newPlayer.uid!, { status: newStatus === 'Pendiente' ? 'Activo' : newStatus });
          if (newTeamId && newPlayer.uid) await assignPlayerToTeam(newTeamId, newPlayer.uid);
          
          // Eliminamos la ficha temporal de pre-inscripción
          if (editingPlayer.uid && editingPlayer.uid !== newPlayer.uid) {
            try {
              await deleteUserAccount(editingPlayer.uid);
            } catch (delError) {
              console.warn("deleteUserAccount cloud function failed (likely missing deployment or 500 error), running client Firestore delete fallback:", delError);
              try {
                const { db } = await import('../../lib/firebase');
                const { doc, deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'users', editingPlayer.uid));
              } catch (clientDelError) {
                console.error("Failed client-side delete fallback:", clientDelError);
              }
            }
          }
        } else {
          // Edición estándar
          await updateUserProfile(editingPlayer.uid!, {
            name: newName, username: newUsername, teamId: newTeamId,
            accountType: newAccountType, isAdult: newAccountType === 'tutor' ? true : newIsAdult, status: newStatus,
            fichaId: newAccountType === 'tutor' ? newFichaId : undefined,
            phone: newPhone,
            tutorName: newTutorName,
            tutorPhone: newTutorPhone,
            tutorEmail: newTutorEmail,
            notes: newNotes,
            dni: newDni,
            birthDate: newBirthDate
          });
          if (editingPlayer.teamId !== newTeamId) {
            if (editingPlayer.teamId) await removePlayerFromTeam(editingPlayer.teamId, editingPlayer.uid!);
            if (newTeamId) await assignPlayerToTeam(newTeamId, editingPlayer.uid!);
          }
          if (isAuthUnlocked && (newEmail !== editingPlayer.email || newPassword.length > 0)) {
            await updateUserAuth(editingPlayer.uid!, newEmail, newPassword || undefined);
          }
        }
      } else {
        const newPlayer = await createPlayerUser({
          email: newEmail, password: newPassword, name: newName, username: newUsername,
          clubId: profile.uid, teamId: newTeamId, accountType: newAccountType,
          isAdult: newAccountType === 'tutor' ? true : newIsAdult,
          fichaId: newAccountType === 'tutor' ? newFichaId : undefined,
          phone: newPhone,
          tutorName: newTutorName,
          tutorPhone: newTutorPhone,
          tutorEmail: newTutorEmail,
          notes: newNotes,
          dni: newDni,
          birthDate: newBirthDate
        });
        if (newTeamId && newPlayer.uid) await assignPlayerToTeam(newTeamId, newPlayer.uid);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving account:", error);
      alert("Error al guardar la cuenta: " + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            Directorio de Jugadores
          </h1>
          <p className="text-slate-500 mt-2 text-base">Gestiona las fichas de todos los jugadores y tutores del club.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsExtensionModalOpen(true)} 
            className="inline-flex items-center gap-2 bg-slate-900 text-slate-100 px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 border border-slate-800"
          >
            <Puzzle className="w-5 h-5 text-brand-400" />
            Extensión FFCV
          </button>
          <button onClick={handleOpenCreateModal} className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/30 hover:-translate-y-0.5">
            <Plus className="w-5 h-5" />
            Añadir Jugador / Tutor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users className="w-6 h-6" /></div>
          <div><p className="text-2xl font-black text-slate-900">{players.length}</p><p className="text-xs text-slate-500 font-semibold">Total Fichas</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
          <div><p className="text-2xl font-black text-slate-900">{pendingPlayers.length}</p><p className="text-xs text-slate-500 font-semibold">Pendientes</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
          <div><p className="text-2xl font-black text-slate-900">{activePlayers.length}</p><p className="text-xs text-slate-500 font-semibold">Aprobadas</p></div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o usuario..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm appearance-none font-semibold text-slate-700"
            >
              <option value="all">Todos los Tipos</option>
              <option value="jugador">Solo Jugadores</option>
              <option value="tutor">Solo Tutores</option>
            </select>
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm appearance-none font-semibold text-slate-700"
          >
            <option value="all">Cualquier Estado</option>
            <option value="Activo">Activos / Aprobados</option>
            <option value="Pendiente">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-10 h-10" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No hay resultados</h3>
              <p className="text-slate-500">Prueba a cambiar los filtros o añadir un nuevo registro.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Jugador / Contacto</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Equipo</th>
                  <th className="px-6 py-4 font-semibold">Estado de Ficha</th>
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlayers.map((row) => (
                  <tr key={row.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">{row.name?.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-bold text-slate-900">{row.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            {row.username ? `@${row.username}` : (
                              <span className="text-brand-600 font-bold bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded text-[10px] uppercase">Pre-inscripción</span>
                            )}
                            {row.sportType && <span className="text-slate-400">• {row.sportType}</span>}
                            <span className="text-slate-400">• {row.email}</span>
                          </p>
                          {row.accountType === 'tutor' && row.fichaId && (
                            <p className="text-[10px] uppercase font-bold text-indigo-600 mt-1">
                              Tutor de: {players.find(p => p.uid === row.fichaId)?.name || 'Jugador desconocido'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">{row.accountType || 'Jugador'}</span></td>
                    <td className="px-6 py-4 font-medium text-slate-700">{teams.find(t => t.id === row.teamId)?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'Aprobada' || row.status === 'Activo' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' :
                        row.status === 'Pendiente' ? 'text-amber-700 bg-amber-100 border border-amber-200' :
                        'text-brand-700 bg-brand-100 border border-brand-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Aprobada' || row.status === 'Activo' ? 'bg-emerald-500' : row.status === 'Pendiente' ? 'bg-amber-500' : 'bg-brand-500'}`}></span>
                        {row.status || 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setCopilotPlayer(row)} 
                          className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                          title="Copia Rápida de Datos"
                        >
                          <Zap className="w-4 h-4 fill-amber-500/20" />
                        </button>
                        <button onClick={() => handleOpenEditModal(row)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeletePlayer(row.uid!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingPlayer ? 'Editar Ficha' : 'Registrar Nueva Ficha'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Datos Personales</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Nombre del jugador o tutor" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de Usuario</label>
                  <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="ej. carlos_perez10" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">DNI / NIE / Pasaporte</label>
                    <input type="text" value={newDni} onChange={(e) => setNewDni(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all font-semibold" placeholder="Ej. 12345678Z" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha Nacimiento</label>
                    <input type="date" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono de Contacto</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Ej. 654321098" />
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Credenciales de Acceso</h4>
                  {editingPlayer && (
                    <button type="button" onClick={() => setIsAuthUnlocked(!isAuthUnlocked)} className={`text-xs flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg transition-colors ${isAuthUnlocked ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                      {isAuthUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {isAuthUnlocked ? 'Bloquear' : 'Desbloquear'}
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
                  <input type="email" required disabled={!isAuthUnlocked} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{editingPlayer ? 'Nueva Contraseña (opcional)' : 'Contraseña Inicial'}</label>
                  <input type="password" required={!editingPlayer} disabled={!isAuthUnlocked} minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Mínimo 6 caracteres" />
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Detalles Deportivos</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Cuenta</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['jugador', 'tutor'] as const).map(type => (
                      <label key={type} className={`border-2 rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${newAccountType === type ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="radio" name="accountType" className="sr-only" checked={newAccountType === type} onChange={() => setNewAccountType(type)} />
                        <span className="text-sm font-bold capitalize">{type === 'tutor' ? 'Padre / Tutor' : 'Jugador'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {newAccountType === 'jugador' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Edad del Jugador</label>
                    <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                        <input type="radio" name="isAdult" checked={newIsAdult} onChange={() => setNewIsAdult(true)} className="w-4 h-4 text-brand-600" /> Mayor de Edad
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                        <input type="radio" name="isAdult" checked={!newIsAdult} onChange={() => setNewIsAdult(false)} className="w-4 h-4 text-brand-600" /> Menor de Edad
                      </label>
                    </div>
                  </div>
                )}
                {newAccountType === 'tutor' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ficha de Jugador a Vincular</label>
                    <select required value={newFichaId} onChange={(e) => setNewFichaId(e.target.value)} className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl outline-none transition-all font-semibold">
                      <option value="">Selecciona al Jugador Principal...</option>
                      {players.filter(p => p.accountType === 'jugador').map(player => (
                        <option key={player.uid} value={player.uid}>{player.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Esta cuenta de tutor gestionará los pagos y calendario del jugador seleccionado.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipo</label>
                  <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-700">
                    <option value="">Ninguno / Sin Equipo</option>
                    {visibleTeams.map(team => (<option key={team.id} value={team.id}>{team.name}</option>))}
                  </select>
                </div>
                {editingPlayer && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado de la Ficha</label>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-700">
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Activo">Activo / Aprobada</option>
                    </select>
                  </div>
                )}
                {editingPlayer && editingPlayer.accountType === 'jugador' && (
                  <div className="pt-5 border-t border-slate-100 space-y-3">
                    <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Cuentas de Tutores Vinculadas</h4>
                    {players.filter(p => p.accountType === 'tutor' && p.fichaId === editingPlayer.uid).length === 0 ? (
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border">No hay tutores vinculados a este jugador.</p>
                    ) : (
                      <div className="space-y-2">
                        {players.filter(p => p.accountType === 'tutor' && p.fichaId === editingPlayer.uid).map(tutor => (
                          <div key={tutor.uid} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{tutor.name}</p>
                              <p className="text-xs text-slate-500">@{tutor.username} • {tutor.email}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Tutor</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {players.filter(p => p.accountType === 'tutor' && p.fichaId === editingPlayer.uid).length < 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const mainPlayerUid = editingPlayer.uid!;
                          setEditingPlayer(null);
                          setNewAccountType('tutor');
                          setNewFichaId(mainPlayerUid);
                          setNewName(''); setNewUsername(''); setNewEmail(''); setNewPassword('');
                          setIsAuthUnlocked(true);
                        }}
                        className="w-full mt-2 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all"
                      >
                        + Vincular una nueva cuenta de Tutor a este jugador
                      </button>
                    )}
                  </div>
                )}

                {newAccountType === 'jugador' && (
                  <div className="pt-5 border-t border-slate-100 space-y-4">
                    <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Notas & Observaciones</h4>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones Médicas / Experiencia / Comentarios</label>
                      <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm resize-none font-semibold text-slate-700" placeholder="Alergias, experiencia previa, dolencias físicas..." />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-500/30 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingPlayer ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copia Rápida de Datos del Jugador */}
      {copilotPlayer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end p-0">
          <div className="bg-slate-950 text-slate-100 w-full max-w-md h-screen shadow-2xl flex flex-col border-l border-slate-800 animate-slide-in">
            {/* Header */}
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Copia Rápida</h3>
                  <p className="text-xs text-slate-400 font-medium">Datos de {copilotPlayer.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setCopilotPlayer(null)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">Campos de la Ficha</h4>
              {[
                { label: 'Nombre Completo', val: copilotPlayer.name || '', key: 'nombre' },
                { label: 'DNI / NIE', val: copilotPlayer.dni || 'No provisto', key: 'dni' },
                { label: 'Fecha de Nacimiento', val: copilotPlayer.birthDate || 'No provista', key: 'fechaNac' },
                { label: 'Correo Electrónico', val: copilotPlayer.email || '', key: 'email' },
                { label: 'Teléfono', val: copilotPlayer.phone || 'No provisto', key: 'phone' },
                { label: 'Deporte / Modalidad', val: copilotPlayer.sportType || 'Fútbol', key: 'sport' },
                ...(copilotPlayer.tutorName ? [
                  { label: 'Nombre del Tutor', val: copilotPlayer.tutorName || '', key: 'tutorName' },
                  { label: 'Teléfono del Tutor', val: copilotPlayer.tutorPhone || '', key: 'tutorPhone' },
                  { label: 'Email del Tutor', val: copilotPlayer.tutorEmail || '', key: 'tutorEmail' }
                ] : []),
                { label: 'Observaciones / Notas', val: copilotPlayer.notes || 'Ninguna', key: 'notes' }
              ].map((field) => {
                const isCopied = copiedField === field.key;
                return (
                  <div key={field.key} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-4 group hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</span>
                      <p className="text-sm font-bold text-slate-200 select-all">{field.val}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(field.val);
                        setCopiedField(field.key);
                        setTimeout(() => setCopiedField(null), 1500);
                      }}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isCopied 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-500 font-semibold shrink-0">
              Haz clic en el icono de copiar para copiar cada campo individualmente.
            </div>
          </div>
        </div>
      )}


      {/* Extension Installation Guide Modal */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-800 overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
                  <Puzzle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Extensión Chrome Avantia FFCV</h3>
                  <p className="text-xs text-slate-400 font-medium">Instalación y Configuración del Copiloto</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExtensionModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <p className="text-sm text-slate-300 leading-relaxed">
                Nuestra extensión te permite autocompletar todas las fichas federativas en el portal de la <strong>FFCV / Novanet / RFEF</strong> en un solo clic, sin copiar y pegar a mano.
              </p>

              {/* Download ZIP Button */}
              <a 
                href="/avantia-ffcv-extension.zip" 
                download="avantia-ffcv-extension.zip"
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 text-sm flex items-center justify-center gap-2 border border-indigo-500/30 hover:-translate-y-0.5"
              >
                <Download className="w-5 h-5 animate-bounce" />
                Descargar Extensión (.ZIP)
              </a>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Pasos para la instalación</h4>
                
                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Descarga y Descomprime la Extensión', desc: 'Haz clic en el botón de arriba para descargar el archivo ZIP y descomprímelo en una carpeta de tu ordenador.' },
                    { step: '2', title: 'Abre la configuración de extensiones', desc: 'Abre Google Chrome y ve a la dirección URL: chrome://extensions/' },
                    { step: '3', title: 'Activa el Modo Desarrollador', desc: 'En la esquina superior derecha de la pantalla de extensiones, activa el interruptor "Modo de desarrollador".' },
                    { step: '4', title: 'Carga la carpeta descomprimida', desc: 'Haz clic en "Cargar descomprimida" (arriba a la izquierda) y selecciona la carpeta que acabas de descomprimir en el paso 1. ¡Listo para usar!' }
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 p-3 bg-slate-900/60 rounded-2xl border border-slate-850">
                      <div className="w-7 h-7 bg-brand-500/20 text-brand-400 border border-brand-500/35 rounded-full flex items-center justify-center font-black text-xs shrink-0">{item.step}</div>
                      <div className="space-y-1">
                        <h5 className="text-sm font-bold text-white leading-none">{item.title}</h5>
                        <p className="text-xs text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border-t border-slate-800 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsExtensionModalOpen(false)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 text-sm flex items-center justify-center gap-1.5"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
