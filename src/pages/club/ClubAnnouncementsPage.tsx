import { useState, useEffect } from 'react';
import { Megaphone, Plus, X, Loader2, Trash2, Pin, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { createAnnouncement, getClubAnnouncements, deleteAnnouncement, type Announcement } from '../../lib/announcementsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { getPlayersByClub, getStaffByClub } from '../../lib/userService';

export function ClubAnnouncementsPage() {
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((s) => s.showToast);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [imageURL, setImageURL] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  
  // Custom modal/dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statsAnnouncement, setStatsAnnouncement] = useState<Announcement | null>(null);

  const AUDIENCE_OPTIONS = [
    { value: 'menores_edad', label: 'Menores de edad' },
    { value: 'mayores_edad', label: 'Mayores de edad' },
    { value: 'tutores', label: 'Tutores/Padres' },
    { value: 'entrenadores', label: 'Entrenadores' },
    { value: 'cuerpo_tecnico', label: 'Cuerpo Técnico' },
  ];

  const loadData = async () => {
    const targetClubId = profile?.clubId || profile?.uid;
    if (!targetClubId) return;
    setLoading(true);
    try {
      const [annList, playersData, staffData] = await Promise.all([
        getClubAnnouncements(targetClubId),
        getPlayersByClub(targetClubId),
        getStaffByClub(targetClubId)
      ]);
      setAnnouncements(annList);
      setMembers([...playersData, ...staffData]);
    }
    catch (e) {
      console.error(e);
      showToast('Error al cargar datos del club', 'error');
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [profile?.clubId, profile?.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClubId = profile?.clubId || profile?.uid;
    if (!profile?.uid || !targetClubId) return;
    setFormLoading(true);
    try {
      await createAnnouncement({ 
        title, 
        body, 
        pinned, 
        authorId: profile.uid, 
        authorName: profile.name || 'Club', 
        scope: 'club', 
        clubId: targetClubId, 
        createdAt: new Date().toISOString(),
        imageURL: imageURL || undefined,
        targetAudience: targetAudience.length > 0 ? targetAudience : undefined
      });
      setShowModal(false); 
      setTitle(''); 
      setBody(''); 
      setPinned(false);
      setImageURL('');
      setTargetAudience([]);
      showToast('Comunicado publicado con éxito', 'success');
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Error al crear comunicado.", 'error');
    }
    finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteAnnouncement(deleteConfirmId);
      showToast('Comunicado eliminado con éxito', 'success');
      setDeleteConfirmId(null);
      await loadData();
    }
    catch (e) {
      console.error(e);
      showToast('Error al eliminar comunicado', 'error');
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  // Check if a club member belongs to the target audience of an announcement
  const isMemberInAudience = (member: UserProfile, targetAud?: string[]) => {
    if (!targetAud || targetAud.length === 0) return true;
    
    const userTags: string[] = [];
    const userRole = member.role || 'player';
    
    if (userRole === 'club') {
      userTags.push('presidentes');
    } else if (userRole === 'staff') {
      if (member.accountType === 'directivo') {
        userTags.push('cuerpo_tecnico');
      } else if (member.accountType === 'entrenador') {
        userTags.push('entrenadores');
      }
    } else if (userRole === 'player') {
      if (member.accountType === 'jugador') {
        userTags.push('jugadores');
        if (member.isAdult === true) {
          userTags.push('mayores_edad');
        } else {
          userTags.push('menores_edad');
        }
      } else if (member.accountType === 'tutor') {
        userTags.push('tutores');
        userTags.push('mayores_edad');
      }
    }
    
    return targetAud.some(tag => userTags.includes(tag));
  };

  // Helper labels for the reader stats view
  const getRoleBadgeLabel = (m: UserProfile) => {
    if (m.role === 'staff') {
      return m.accountType === 'entrenador' ? 'Entrenador' : 'Cuerpo Técnico';
    }
    return m.accountType === 'tutor' ? 'Tutor/Padre' : 'Jugador';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Megaphone className="w-7 h-7" /></div>
            Comunicados del Club
          </h1>
          <p className="text-slate-500 mt-2 text-base">Publica avisos dirigidos a todos los jugadores de tu club.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/30">
          <Plus className="w-5 h-5" /> Nuevo Comunicado
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
        ) : announcements.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900">Sin comunicados</h3>
            <p className="text-sm text-slate-500 mt-1">Publica el primer comunicado para tus jugadores.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {announcements.map(a => {
              // Calculate statistics
              const targetedCohort = members.filter(m => isMemberInAudience(m, a.targetAudience));
              const readCohort = targetedCohort.filter(m => a.readBy?.includes(m.uid || ''));
              const readCount = readCohort.length;
              const totalCount = targetedCohort.length;
              const percent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

              return (
                <div key={a.id} className={`p-6 rounded-2xl border transition-all hover:shadow-md ${a.pinned ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {a.pinned && <Pin className="w-4 h-4 text-amber-600 fill-amber-600" />}
                          <h3 className="font-bold text-slate-900 text-lg">{a.title}</h3>
                        </div>
                        
                        {/* Target audience badges */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {(!a.targetAudience || a.targetAudience.length === 0) ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider border border-slate-200">Todos</span>
                          ) : (
                            a.targetAudience.map(tag => {
                              const option = AUDIENCE_OPTIONS.find(o => o.value === tag);
                              return (
                                <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md uppercase tracking-wider border border-amber-200">
                                  {option ? option.label : tag}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                      
                      {/* Premium reading stats progress bar */}
                      <div 
                        onClick={() => setStatsAnnouncement(a)}
                        className="bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/20 p-3.5 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row items-center gap-4 justify-between"
                      >
                        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
                          <div className="p-1.5 bg-slate-200/60 rounded-lg text-slate-500">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Lectura del Comunicado</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{readCount} de {totalCount} destinatarios han leído</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent > 75 ? 'bg-emerald-500' : percent > 40 ? 'bg-amber-500' : 'bg-slate-400'
                              }`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black shrink-0 ${
                            percent > 75 ? 'text-emerald-600' : percent > 40 ? 'text-amber-600' : 'text-slate-500'
                          }`}>{percent}%</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 font-semibold pt-1">{formatDate(a.createdAt)}</p>
                    </div>
                    
                    {/* Image and Delete buttons */}
                    <div className="flex items-center md:items-start gap-4 self-stretch md:self-auto justify-between shrink-0">
                      {a.imageURL && (
                        <img src={a.imageURL} alt="" className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-xl border border-slate-100 shadow-sm" />
                      )}
                      <button onClick={() => setDeleteConfirmId(a.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors align-self-start">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Comunicado</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold" placeholder="Ej. Cambio de horario de entrenamientos" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensaje</label>
                <textarea required value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none" placeholder="Escribe el comunicado..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">URL de Imagen (Opcional)</label>
                <input type="url" value={imageURL} onChange={e => setImageURL(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm" placeholder="https://ejemplo.com/comunicado.jpg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Dirigido a (Opcional - Si no seleccionas ninguno, se enviará a todos)</label>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map(opt => {
                    const isChecked = targetAudience.includes(opt.value);
                    return (
                      <label key={opt.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setTargetAudience(prev => prev.filter(v => v !== opt.value));
                            } else {
                              setTargetAudience(prev => [...prev, opt.value]);
                            }
                          }}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input type="checkbox" checked={pinned} onChange={() => setPinned(!pinned)} className="w-4 h-4 text-amber-600 rounded" />
                <span className="text-sm font-semibold text-slate-700">Fijar como destacado</span>
              </label>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setTitle(''); setBody(''); setPinned(false); setImageURL(''); setTargetAudience([]); }} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publicar'}
                </button>
              </div>
            </form>
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
            <h3 className="text-lg font-bold text-slate-900">¿Eliminar comunicado?</h3>
            <p className="text-sm text-slate-500 mt-2">Esta acción no se puede deshacer y los jugadores ya no verán esta información.</p>
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

      {/* Readers Statistics Modal */}
      {statsAnnouncement && (() => {
        const targetedCohort = members.filter(m => isMemberInAudience(m, statsAnnouncement.targetAudience));
        const readCohort = targetedCohort.filter(m => statsAnnouncement.readBy?.includes(m.uid || ''));
        const pendingCohort = targetedCohort.filter(m => !statsAnnouncement.readBy?.includes(m.uid || ''));

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-in">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Control de Lectura</h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold line-clamp-1">{statsAnnouncement.title}</p>
                </div>
                <button onClick={() => setStatsAnnouncement(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
                {/* Read Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <h4 className="font-bold text-slate-800 text-sm">Leído por ({readCohort.length})</h4>
                  </div>
                  {readCohort.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      Nadie lo ha leído aún.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {readCohort.map(m => (
                        <div key={m.uid} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{m.name || 'Sin nombre'}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{m.username ? `@${m.username}` : m.email}</p>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 uppercase tracking-wider">
                            {getRoleBadgeLabel(m)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <h4 className="font-bold text-slate-800 text-sm">Pendiente de lectura ({pendingCohort.length})</h4>
                  </div>
                  {pendingCohort.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-100">
                      ¡Todos los destinatarios lo han leído! 🎉
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {pendingCohort.map(m => (
                        <div key={m.uid} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{m.name || 'Sin nombre'}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{m.username ? `@${m.username}` : m.email}</p>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 uppercase tracking-wider">
                            {getRoleBadgeLabel(m)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setStatsAnnouncement(null)} 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

