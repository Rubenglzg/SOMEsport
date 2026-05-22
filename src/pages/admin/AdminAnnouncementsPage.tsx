import { useState, useEffect } from 'react';
import { Megaphone, Plus, X, Loader2, Trash2, Pin, Edit, Users, Building } from 'lucide-react';
import { createAnnouncement, getGlobalAnnouncements, deleteAnnouncement, updateAnnouncement, type Announcement } from '../../lib/announcementsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { getClubs } from '../../lib/userService';

const AUDIENCE_OPTIONS = [
  { id: 'presidentes', name: 'Presidentes / Directivos de Club' },
  { id: 'cuerpo_tecnico', name: 'Cuerpo Técnico' },
  { id: 'entrenadores', name: 'Entrenadores' },
  { id: 'jugadores', name: 'Jugadores' },
  { id: 'tutores', name: 'Tutores de menores' },
  { id: 'mayores_edad', name: 'Mayores de edad (+18)' },
];

export function AdminAnnouncementsPage() {
  const profile = useAuthStore((state) => state.profile);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [clubsList, setClubsList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  
  // Advanced targeting state
  const [targetAllClubs, setTargetAllClubs] = useState(true);
  const [targetClubs, setTargetClubs] = useState<string[]>([]);
  
  const [targetAllRoles, setTargetAllRoles] = useState(true);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [annData, clubsData] = await Promise.all([
        getGlobalAnnouncements(),
        getClubs()
      ]);
      setAnnouncements(annData);
      setClubsList(clubsData);
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setBody('');
    setPinned(false);
    setTargetAllClubs(true);
    setTargetClubs([]);
    setTargetAllRoles(true);
    setTargetAudience([]);
    setShowModal(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setBody(announcement.body);
    setPinned(announcement.pinned || false);
    
    const hasTargetClubs = announcement.targetClubs && announcement.targetClubs.length > 0;
    setTargetAllClubs(!hasTargetClubs);
    setTargetClubs(announcement.targetClubs || []);
    
    const hasTargetAudience = announcement.targetAudience && announcement.targetAudience.length > 0;
    setTargetAllRoles(!hasTargetAudience);
    setTargetAudience(announcement.targetAudience || []);
    
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFormLoading(true);
    
    const finalClubs = targetAllClubs ? [] : targetClubs;
    const finalAudience = targetAllRoles ? [] : targetAudience;

    try {
      if (editingAnnouncement) {
        if (!editingAnnouncement.id) return;
        await updateAnnouncement(editingAnnouncement.id, {
          title,
          body,
          pinned,
          targetClubs: finalClubs,
          targetAudience: finalAudience
        });
      } else {
        await createAnnouncement({
          title, body, pinned,
          authorId: profile.uid,
          authorName: profile.name || 'Administrador',
          scope: 'global',
          createdAt: new Date().toISOString(),
          targetClubs: finalClubs,
          targetAudience: finalAudience
        });
      }
      setShowModal(false);
      setEditingAnnouncement(null);
      setTitle(''); setBody(''); setPinned(false);
      setTargetClubs([]); setTargetAudience([]);
      await loadData();
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Error al guardar comunicado.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    if (!announcement.id) return;
    try {
      await updateAnnouncement(announcement.id, { pinned: !announcement.pinned });
      await loadData();
    } catch (error) {
      console.error("Error toggling pin status:", error);
      alert("Error al cambiar estado destacado.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este comunicado?')) return;
    try {
      await deleteAnnouncement(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  const handleClubCheckboxChange = (clubId: string) => {
    setTargetClubs(prev => 
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    );
  };

  const handleAudienceCheckboxChange = (tagId: string) => {
    setTargetAudience(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  // Sort pinned announcements first, then by date descending
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Megaphone className="w-7 h-7" /></div>
            Comunicados y Boletines
          </h1>
          <p className="text-slate-500 mt-2 text-base">Publica y segmenta comunicados dirigidos a clubes y demografías específicas.</p>
        </div>
        <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/30">
          <Plus className="w-5 h-5" /> Nuevo Comunicado
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
        ) : sortedAnnouncements.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900">Sin comunicados</h3>
            <p className="text-sm text-slate-500 mt-1">Publica el primer comunicado segmentado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAnnouncements.map(a => (
              <div key={a.id} className={`p-5 rounded-2xl border transition-colors hover:shadow-sm ${a.pinned ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {a.pinned && <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />}
                        <h3 className="font-bold text-slate-900 text-base">{a.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                    </div>

                    {/* Metadata tags and targeting information */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                      {/* Targeted Clubs */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-20">Destinos:</span>
                        {a.targetClubs && a.targetClubs.length > 0 ? (
                          a.targetClubs.map(cid => {
                            const cObj = clubsList.find(c => c.uid === cid);
                            return (
                              <span key={cid} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100/50">
                                <Building className="w-2.5 h-2.5" /> {cObj?.name || 'Club'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                            🌍 Todos los Clubes
                          </span>
                        )}
                      </div>

                      {/* Targeted Audience Roles */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-20">Audiencia:</span>
                        {a.targetAudience && a.targetAudience.length > 0 ? (
                          a.targetAudience.map(tag => {
                            const opt = AUDIENCE_OPTIONS.find(o => o.id === tag);
                            return (
                              <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-100/50">
                                <Users className="w-2.5 h-2.5" /> {opt?.name || tag}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                            👥 Todos los roles y tutores
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 font-semibold mt-1">{a.authorName} • {formatDate(a.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleTogglePin(a)}
                      className={`p-2 rounded-lg transition-colors ${
                        a.pinned
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-slate-50'
                      }`}
                      title={a.pinned ? "Desfijar de portada" : "Fijar en portada"}
                    >
                      <Pin className={`w-4 h-4 ${a.pinned ? 'fill-amber-600' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Comunicado"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id!)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {editingAnnouncement ? 'Editar Comunicado Segmentado' : 'Nuevo Comunicado Segmentado'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Título del Comunicado</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold" placeholder="Ej. Convocatoria y Horarios de Partidos" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Mensaje / Contenido</label>
                <textarea required value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none text-sm font-medium" placeholder="Escribe el contenido detallado aquí..." />
              </div>

              {/* Segmented Clubs Targeting */}
              <div className="space-y-2.5 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">🏢 Segmentar Clubes Destino</span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700 cursor-pointer">
                    <input type="checkbox" checked={targetAllClubs} onChange={() => setTargetAllClubs(!targetAllClubs)} className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500" />
                    Enviar a todos los clubes
                  </label>
                </div>
                
                {!targetAllClubs && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/50 max-h-32 overflow-y-auto animate-fade-in">
                    {clubsList.map(club => (
                      <label key={club.uid} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100/50 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={targetClubs.includes(club.uid!)}
                          onChange={() => handleClubCheckboxChange(club.uid!)}
                          className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500"
                        />
                        {club.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Segmented Audience Roles Targeting */}
              <div className="space-y-2.5 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">👥 Segmentar Roles Receptores</span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700 cursor-pointer">
                    <input type="checkbox" checked={targetAllRoles} onChange={() => setTargetAllRoles(!targetAllRoles)} className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500" />
                    Enviar a todos los roles
                  </label>
                </div>
                
                {!targetAllRoles && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/50 animate-fade-in">
                    {AUDIENCE_OPTIONS.map(role => (
                      <label key={role.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100/50 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={targetAudience.includes(role.id)}
                          onChange={() => handleAudienceCheckboxChange(role.id)}
                          className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500"
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={pinned} onChange={() => setPinned(!pinned)} className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-700">Fijar como destacado</span>
                    <p className="text-[10px] text-slate-500">Aparecerá fijado al principio del buzón</p>
                  </div>
                </label>
              </div>
              
              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingAnnouncement ? 'Guardar Cambios' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
