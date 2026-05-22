import { useState, useEffect } from 'react';
import { Users, Plus, X, Loader2, Edit, Trash2 } from 'lucide-react';
import { getStaffByClub, createStaffUser, deleteUserAccount, updateUserProfile } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { useAuthStore, type UserProfile, type StaffPermissions } from '../../store/authStore';
import { normalizeSport } from '../../lib/sportUtils';

const DEFAULT_COACH_PERMISSIONS: StaffPermissions = {
  teams: { enabled: true, accessLevel: 'assigned', canEdit: true },
  facilities: { enabled: true, accessLevel: 'all', canEdit: true },
  injuries: { enabled: false, accessLevel: 'assigned', canEdit: false },
  inventory: { enabled: true, accessLevel: 'all', canEdit: false },
  calendar: { enabled: true, accessLevel: 'assigned', canEdit: true },
  attendance: { enabled: true, accessLevel: 'assigned', canEdit: true },
};

const SPECIALIZATION_DEFAULT_PERMISSIONS: Record<'general' | 'financiero' | 'tactico' | 'material', StaffPermissions> = {
  general: {
    teams: { enabled: true, accessLevel: 'all', canEdit: true },
    facilities: { enabled: true, accessLevel: 'all', canEdit: true },
    injuries: { enabled: true, accessLevel: 'all', canEdit: true },
    inventory: { enabled: true, accessLevel: 'all', canEdit: true },
    calendar: { enabled: true, accessLevel: 'all', canEdit: true },
    attendance: { enabled: true, accessLevel: 'all', canEdit: true },
  },
  financiero: {
    teams: { enabled: true, accessLevel: 'all', canEdit: false },
    facilities: { enabled: true, accessLevel: 'all', canEdit: false },
    injuries: { enabled: false, accessLevel: 'all', canEdit: false },
    inventory: { enabled: true, accessLevel: 'all', canEdit: false },
    calendar: { enabled: true, accessLevel: 'all', canEdit: false },
    attendance: { enabled: false, accessLevel: 'all', canEdit: false },
  },
  tactico: {
    teams: { enabled: true, accessLevel: 'all', canEdit: true },
    facilities: { enabled: false, accessLevel: 'assigned', canEdit: false },
    injuries: { enabled: true, accessLevel: 'all', canEdit: true },
    inventory: { enabled: false, accessLevel: 'assigned', canEdit: false },
    calendar: { enabled: true, accessLevel: 'all', canEdit: true },
    attendance: { enabled: true, accessLevel: 'all', canEdit: true },
  },
  material: {
    teams: { enabled: false, accessLevel: 'assigned', canEdit: false },
    facilities: { enabled: true, accessLevel: 'all', canEdit: true },
    injuries: { enabled: false, accessLevel: 'assigned', canEdit: false },
    inventory: { enabled: true, accessLevel: 'all', canEdit: true },
    calendar: { enabled: true, accessLevel: 'all', canEdit: false },
    attendance: { enabled: false, accessLevel: 'assigned', canEdit: false },
  }
};

const modulesConfig: { key: keyof StaffPermissions; label: string }[] = [
  { key: 'teams', label: 'Equipos y Plantillas' },
  { key: 'facilities', label: 'Instalaciones y Reservas' },
  { key: 'injuries', label: 'Salud y Lesiones' },
  { key: 'inventory', label: 'Material e Inventario' },
  { key: 'calendar', label: 'Calendario y Convocatorias' },
  { key: 'attendance', label: 'Control de Asistencia' }
];


export function ClubStaffPage() {
  const profile = useAuthStore((state) => state.profile);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAccountType, setNewAccountType] = useState<'entrenador' | 'directivo'>('entrenador');
  const [newDirectorSpecialization, setNewDirectorSpecialization] = useState<'general' | 'financiero' | 'tactico' | 'material'>('general');
  const [newSportType, setNewSportType] = useState('Fútbol');
  const [newTeamId, setNewTeamId] = useState('');
  const [newTeamIds, setNewTeamIds] = useState<string[]>([]);
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>(DEFAULT_COACH_PERMISSIONS);

  const handleTogglePermissionEnabled = (moduleKey: keyof StaffPermissions) => {
    setStaffPermissions(prev => {
      const current = prev[moduleKey] || { enabled: false, accessLevel: 'assigned', canEdit: false };
      return {
        ...prev,
        [moduleKey]: {
          ...current,
          enabled: !current.enabled
        }
      };
    });
  };

  const handleChangePermissionAccess = (moduleKey: keyof StaffPermissions, level: 'all' | 'assigned') => {
    setStaffPermissions(prev => {
      const current = prev[moduleKey] || { enabled: false, accessLevel: 'assigned', canEdit: false };
      return {
        ...prev,
        [moduleKey]: {
          ...current,
          accessLevel: level
        }
      };
    });
  };

  const handleChangePermissionCanEdit = (moduleKey: keyof StaffPermissions, canEdit: boolean) => {
    setStaffPermissions(prev => {
      const current = prev[moduleKey] || { enabled: false, accessLevel: 'assigned', canEdit: false };
      return {
        ...prev,
        [moduleKey]: {
          ...current,
          canEdit
        }
      };
    });
  };


  useEffect(() => {
    if (profile) {
      const defaultSport = normalizeSport(profile.activeSports?.[0] || profile.sportType || 'Fútbol');
      setNewSportType(defaultSport);
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const [staffData, teamsData] = await Promise.all([
        getStaffByClub(profile.uid),
        getTeamsByClub(profile.uid)
      ]);
      setStaff(staffData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Error loading staff:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [profile?.uid]);

  const handleOpenCreateModal = () => {
    setEditingStaff(null);
    setNewName(''); setNewUsername(''); setNewEmail(''); setNewPassword('');
    setNewAccountType('entrenador');
    setNewDirectorSpecialization('general');
    setStaffPermissions(DEFAULT_COACH_PERMISSIONS);
    const defaultSport = normalizeSport(profile?.activeSports?.[0] || profile?.sportType || 'Fútbol');
    setNewSportType(defaultSport);
    setNewTeamId('');
    setNewTeamIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: UserProfile) => {
    setEditingStaff(member);
    setNewName(member.name || ''); setNewUsername(member.username || '');
    setNewEmail(member.email || ''); setNewPassword('');
    setNewAccountType((member.accountType as 'entrenador' | 'directivo') || 'entrenador');
    setNewDirectorSpecialization(member.directorSpecialization || 'general');
    const defaultSport = normalizeSport(profile?.activeSports?.[0] || profile?.sportType || 'Fútbol');
    setNewSportType(normalizeSport(member.sportType) || defaultSport);
    setNewTeamId(member.teamId || '');
    setNewTeamIds(member.teamIds || (member.teamId ? [member.teamId] : []));
    if (member.staffPermissions) {
      setStaffPermissions(member.staffPermissions);
    } else {
      setStaffPermissions(
        member.accountType === 'directivo' 
          ? SPECIALIZATION_DEFAULT_PERMISSIONS[member.directorSpecialization || 'general'] 
          : DEFAULT_COACH_PERMISSIONS
      );
    }
    setIsModalOpen(true);
  };

  // Auto-switch default permissions when toggling role or specialization in CREATE mode
  useEffect(() => {
    if (!editingStaff) {
      if (newAccountType === 'directivo') {
        setStaffPermissions(SPECIALIZATION_DEFAULT_PERMISSIONS[newDirectorSpecialization]);
      } else {
        setStaffPermissions(DEFAULT_COACH_PERMISSIONS);
      }
    }
  }, [newAccountType, newDirectorSpecialization, editingStaff]);


  const handleDeleteStaff = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este miembro del cuerpo técnico?')) return;
    try {
      setLoading(true);
      await deleteUserAccount(uid);
      await loadData();
    } catch (err) {
      console.error("Error deleting staff:", err);
      const error = err as Error;
      alert("Error al eliminar: " + error.message);
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFormLoading(true);
    try {
      if (editingStaff) {
        await updateUserProfile(editingStaff.uid!, {
          name: newName, username: newUsername,
          accountType: newAccountType,
          sportType: newAccountType === 'entrenador' ? newSportType : undefined,
          teamId: newAccountType === 'entrenador' && newTeamId ? newTeamId : undefined,
          teamIds: newAccountType === 'entrenador' ? newTeamIds : undefined,
          staffPermissions: staffPermissions,
          directorSpecialization: newAccountType === 'directivo' ? newDirectorSpecialization : undefined
        });
      } else {
        await createStaffUser({
          email: newEmail, password: newPassword, name: newName, username: newUsername,
          clubId: profile.uid, accountType: newAccountType,
          directorSpecialization: newAccountType === 'directivo' ? newDirectorSpecialization : undefined,
          sportType: newAccountType === 'entrenador' ? newSportType : undefined,
          teamId: newAccountType === 'entrenador' && newTeamId ? newTeamId : undefined,
          teamIds: newAccountType === 'entrenador' ? newTeamIds : undefined,
          staffPermissions: staffPermissions
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving staff:", err);
      const error = err as Error;
      let errorMessage = error.message;
      
      // Traducir errores comunes de Firebase Auth
      if (errorMessage.includes("auth/email-already-in-use") || errorMessage.includes("email-already-in-use")) {
        errorMessage = "El correo electrónico ingresado ya está registrado por otra cuenta.";
      } else if (errorMessage.includes("auth/invalid-email") || errorMessage.includes("invalid-email")) {
        errorMessage = "El formato del correo electrónico ingresado no es válido.";
      } else if (errorMessage.includes("auth/weak-password") || errorMessage.includes("weak-password")) {
        errorMessage = "La contraseña elegida es muy débil. Debe tener al menos 6 caracteres.";
      } else if (errorMessage.includes("username-exists") || errorMessage.includes("ya está en uso")) {
        errorMessage = "El nombre de usuario ya está siendo utilizado por otra persona.";
      }
      
      alert("Error al guardar: " + errorMessage);
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
            <div className="p-2.5 bg-brand-100 text-brand-600 rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            Cuerpo Técnico
          </h1>
          <p className="text-slate-500 mt-2 text-base">Gestiona a los entrenadores y directivos del club.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/30 hover:-translate-y-0.5">
          <Plus className="w-5 h-5" />
          Añadir Miembro
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
          ) : staff.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-10 h-10" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Aún no hay cuerpo técnico</h3>
              <p className="text-slate-500">Añade a tu primer entrenador o directivo pulsando el botón superior.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Miembro</th>
                  <th className="px-6 py-4 font-semibold">Cargo</th>
                  <th className="px-6 py-4 font-semibold">Deporte</th>
                  <th className="px-6 py-4 font-semibold">Equipo Asignado</th>
                  <th className="px-6 py-4 font-semibold">Accesos</th>
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {staff.map((row) => (
                  <tr key={row.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">{row.name?.charAt(0).toUpperCase()}</div>
                        <div><p className="font-bold text-slate-900">{row.name}</p><p className="text-xs text-slate-500">@{row.username} • {row.email}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                          {row.accountType || 'Entrenador'}
                        </span>
                        {row.accountType === 'directivo' && (
                          <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-wider pl-0.5">
                            {row.directorSpecialization === 'financiero' ? 'Financiero' : 
                             row.directorSpecialization === 'tactico' ? 'Táctico' : 
                             row.directorSpecialization === 'material' ? 'Material' : 'General'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{row.accountType === 'entrenador' ? normalizeSport(row.sportType) || 'General' : '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {row.accountType === 'entrenador'
                        ? (row.teamIds && row.teamIds.length > 0
                            ? row.teamIds.map(tid => teams.find(t => t.id === tid)?.name).filter(Boolean).join(', ')
                            : (teams.find(t => t.id === row.teamId)?.name || 'Todos de la categoría'))
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {modulesConfig.map(m => {
                          const perm = row.staffPermissions?.[m.key];
                          if (!perm?.enabled) return null;
                          const levelLabel = perm.accessLevel === 'all' ? 'Todo' : 'Asig';
                          const actionLabel = perm.canEdit ? 'Editor' : 'Lector';
                          return (
                            <span 
                              key={m.key} 
                              className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                                perm.canEdit 
                                  ? 'bg-brand-50 text-brand-700 border-brand-100' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                              title={`${m.label} (${actionLabel} - Equipos: ${perm.accessLevel === 'all' ? 'Todos' : 'Solo su equipo'})`}
                            >
                              {m.label.split(' ')[0]} <span className="opacity-60 font-semibold ml-0.5 text-[8px]">{levelLabel[0]}{actionLabel[0]}</span>
                            </span>
                          );
                        })}
                        {(!row.staffPermissions || Object.values(row.staffPermissions).every(v => !v.enabled)) && (
                          <span className="text-slate-400 text-xs italic">Sin accesos</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditModal(row)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteStaff(row.uid!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-xl font-bold text-slate-900">{editingStaff ? 'Editar Miembro' : 'Añadir Miembro'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Datos Personales</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de Usuario</label>
                  <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                </div>
              </div>

              {!editingStaff && (
                <div className="pt-5 border-t border-slate-100 space-y-4">
                  <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Credenciales de Acceso</h4>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
                    <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña Inicial</label>
                    <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all" />
                  </div>
                </div>
              )}

              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Cargo</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Cargo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['entrenador', 'directivo'] as const).map(type => (
                      <label key={type} className={`border-2 rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${newAccountType === type ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="radio" name="accountType" className="sr-only" checked={newAccountType === type} onChange={() => setNewAccountType(type)} />
                        <span className="text-sm font-bold capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                  {newAccountType === 'entrenador' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deporte Asignado</label>
                        <select value={newSportType} onChange={(e) => { setNewSportType(e.target.value); setNewTeamId(''); }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-700">
                          {Array.from(new Set(
                            (profile?.activeSports && profile.activeSports.length > 0
                              ? profile.activeSports
                              : (profile?.sportType ? [profile.sportType] : ['Fútbol'])
                            ).map(normalizeSport)
                          )).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipos Asignados</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                          <label className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={newTeamIds.length === 0} 
                              onChange={() => setNewTeamIds([])} 
                              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" 
                            />
                            <span className="text-sm font-medium text-slate-700">Todos los de la categoría</span>
                          </label>
                          
                          {teams
                            .filter(t => normalizeSport(t.sportType) === normalizeSport(newSportType))
                            .map(t => (
                              <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={newTeamIds.includes(t.id!)} 
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewTeamIds(prev => [...prev, t.id!]);
                                    } else {
                                      setNewTeamIds(prev => prev.filter(id => id !== t.id));
                                    }
                                  }} 
                                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" 
                                />
                                <span className="text-sm font-medium text-slate-700">{t.name} <span className="text-slate-400 text-xs">({t.category})</span></span>
                              </label>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )}
                  {newAccountType === 'directivo' && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Especialización Visual del Directivo</label>
                        <select 
                          value={newDirectorSpecialization} 
                          onChange={(e) => {
                            const spec = e.target.value as 'general' | 'financiero' | 'tactico' | 'material';
                            setNewDirectorSpecialization(spec);
                            setStaffPermissions(SPECIALIZATION_DEFAULT_PERMISSIONS[spec]);
                          }} 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="general">General (Control 360° Completo)</option>
                          <option value="financiero">Financiero (Auditoría, Gastos y Balances)</option>
                          <option value="tactico">Táctico (Equipos, Lesiones y Planificación)</option>
                          <option value="material">Material (Almacén, Logística e Instalaciones)</option>
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                          La especialización ajusta automáticamente los permisos recomendados y adapta la disposición visual de su sesión.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="pt-5 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Permisos de Acceso y Funciones</h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">Configuración</span>
                </div>
                <div className="space-y-3">
                  {modulesConfig.map(({ key, label }) => {
                    const perm = staffPermissions[key] || { enabled: false, accessLevel: 'assigned', canEdit: false };
                    return (
                      <div key={key} className={`p-4 rounded-2xl border transition-all ${perm.enabled ? 'bg-slate-50/60 border-slate-200' : 'bg-white border-slate-100 opacity-60'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={perm.enabled} 
                              onChange={() => handleTogglePermissionEnabled(key)}
                              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 transition-all cursor-pointer" 
                            />
                            <span className="font-bold text-slate-800 text-sm">{label}</span>
                          </label>
                        </div>
                        
                        {perm.enabled && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Equipos Permitidos</label>
                              <select 
                                value={perm.accessLevel} 
                                onChange={(e) => handleChangePermissionAccess(key, e.target.value as 'all' | 'assigned')}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                              >
                                <option value="all">Todos los Equipos</option>
                                <option value="assigned">Solo su Equipo Asignado</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nivel de Acción</label>
                              <select 
                                value={perm.canEdit ? "edit" : "view"} 
                                onChange={(e) => handleChangePermissionCanEdit(key, e.target.value === 'edit')}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                              >
                                <option value="view">Lector (Solo Ver)</option>
                                <option value="edit">Editor (Modificar/Crear)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>


                <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3 shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-500/30 disabled:opacity-50">
                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingStaff ? 'Guardar Cambios' : 'Añadir Miembro'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
