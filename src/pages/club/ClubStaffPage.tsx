import { useState, useEffect } from 'react';
import { Users, Plus, X, Loader2, Edit, Trash2 } from 'lucide-react';
import { getStaffByClub, createStaffUser, deleteUserAccount, updateUserProfile } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
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
  const [newSportType, setNewSportType] = useState('Fútbol');
  const [newTeamId, setNewTeamId] = useState('');

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
    const defaultSport = normalizeSport(profile?.activeSports?.[0] || profile?.sportType || 'Fútbol');
    setNewSportType(defaultSport);
    setNewTeamId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: UserProfile) => {
    setEditingStaff(member);
    setNewName(member.name || ''); setNewUsername(member.username || '');
    setNewEmail(member.email || ''); setNewPassword('');
    setNewAccountType((member.accountType as any) || 'entrenador');
    const defaultSport = normalizeSport(profile?.activeSports?.[0] || profile?.sportType || 'Fútbol');
    setNewSportType(normalizeSport(member.sportType) || defaultSport);
    setNewTeamId(member.teamId || '');
    setIsModalOpen(true);
  };

  const handleDeleteStaff = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este miembro del cuerpo técnico?')) return;
    try {
      setLoading(true);
      await deleteUserAccount(uid);
      await loadData();
    } catch (error: any) {
      console.error("Error deleting staff:", error);
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
          teamId: newAccountType === 'entrenador' && newTeamId ? newTeamId : undefined
        });
      } else {
        await createStaffUser({
          email: newEmail, password: newPassword, name: newName, username: newUsername,
          clubId: profile.uid, accountType: newAccountType,
          sportType: newAccountType === 'entrenador' ? newSportType : undefined,
          teamId: newAccountType === 'entrenador' && newTeamId ? newTeamId : undefined
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving staff:", error);
      alert("Error al guardar: " + error.message);
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
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">{row.accountType || 'Entrenador'}</span></td>
                    <td className="px-6 py-4 font-medium text-slate-700">{row.accountType === 'entrenador' ? normalizeSport(row.sportType) || 'General' : '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {row.accountType === 'entrenador'
                        ? (teams.find(t => t.id === row.teamId)?.name || 'Ninguno / Todos')
                        : '-'}
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
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipo Asignado</label>
                        <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-700">
                          <option value="">Ninguno / Todos los del deporte</option>
                          {teams
                            .filter(t => normalizeSport(t.sportType) === normalizeSport(newSportType))
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  )}
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
