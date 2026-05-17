import { useState, useEffect } from 'react';
import { Users, Building2, Loader2, Edit, Trash2, X } from 'lucide-react';
import { getClubs, getAllPlayers, deleteUserAccount, updateUserProfile } from '../../lib/userService';
import type { UserProfile } from '../../store/authStore';

export function AdminPlayersPage() {
  const [clubs, setClubs] = useState<UserProfile[]>([]);
  const [allPlayers, setAllPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<UserProfile | null>(null);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newStatus, setNewStatus] = useState('Pendiente');

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

  const handleOpenEditModal = (player: UserProfile) => {
    setEditingPlayer(player);
    setNewName(player.name || '');
    setNewUsername(player.username || '');
    setNewStatus(player.status || 'Pendiente');
    setIsModalOpen(true);
  };

  const handleDeletePlayer = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar completamente a este usuario?')) return;
    try {
      setLoading(true);
      await deleteUserAccount(uid);
      await loadData();
    } catch (error: any) {
      console.error("Error deleting player:", error);
      alert("Error al eliminar al jugador: " + error.message);
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer?.uid) return;
    setFormLoading(true);
    try {
      await updateUserProfile(editingPlayer.uid, {
        name: newName,
        username: newUsername,
        status: newStatus
      });
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
          <p className="text-slate-500 mt-2 text-base">Vista global de todos los jugadores registrados en la plataforma.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" /> Todos los Jugadores
          </h2>
          <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{allPlayers.length} fichas</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
          ) : allPlayers.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Sin jugadores</h3>
              <p className="text-slate-500">Aún no hay jugadores registrados en ningún club.</p>
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
                {allPlayers.map((player) => {
                  const clubObj = clubs.find(c => c.uid === player.clubId);
                  return (
                    <tr key={player.uid} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{player.name}</span>
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
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEditModal(player)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeletePlayer(player.uid!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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

      {/* Modal de Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Editar Jugador</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de Usuario</label>
                  <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado de la Ficha</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-700">
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Activo">Activo / Aprobada</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
