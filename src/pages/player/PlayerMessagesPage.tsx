import { useState, useEffect } from 'react';
import { Mail, Loader2, Pin, Check, Eye } from 'lucide-react';
import { getAnnouncementsForUser, markAnnouncementAsRead, type Announcement } from '../../lib/announcementsService';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

export function PlayerMessagesPage() {
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.showToast);
  const [messages, setMessages] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Use the intelligent filtering function instead of the basic one
      const filtered = await getAnnouncementsForUser(profile);
      setMessages(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [profile]);

  const handleMarkAsRead = async (announcementId: string) => {
    if (!profile?.uid) return;
    try {
      await markAnnouncementAsRead(announcementId, profile.uid);
      showToast('Comunicado marcado como leído', 'success');
      setMessages(prev =>
        prev.map(m =>
          m.id === announcementId
            ? { ...m, readBy: [...(m.readBy || []), profile.uid as string] }
            : m
        )
      );
    } catch (error) {
      console.error(error);
      showToast('Error al marcar el comunicado como leído', 'error');
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Mail className="w-7 h-7" /></div>
          Buzón de Mensajes
        </h1>
        <p className="text-slate-500 mt-2">Comunicados de tu club y de la plataforma, filtrados según tu perfil.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : messages.length === 0 ? (
        <div className="text-center p-12 bg-white border border-slate-200 border-dashed rounded-2xl text-slate-500">
          <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">No hay mensajes</p>
          <p className="text-sm mt-1">Los comunicados de tu club y de la plataforma aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const AUDIENCE_LABELS: Record<string, string> = {
              menores_edad: 'Menores',
              mayores_edad: 'Mayores',
              tutores: 'Tutores/Padres',
              entrenadores: 'Entrenadores',
              cuerpo_tecnico: 'Cuerpo Técnico',
            };

            return messages.map(m => (
              <div key={m.id} className={`bg-white rounded-2xl border p-6 transition-all hover:shadow-md ${m.pinned ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
                <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {m.pinned && <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${m.scope === 'global' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.scope === 'global' ? 'Plataforma' : 'Club'}
                        </span>
                        {m.targetAudience && m.targetAudience.map(tag => (
                          <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider border border-slate-200">
                            {AUDIENCE_LABELS[tag] || tag}
                          </span>
                        ))}
                        {profile?.uid && (m.readBy?.includes(profile.uid) ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Leído
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md uppercase tracking-wider border border-rose-200 animate-pulse">
                            Nuevo
                          </span>
                        ))}
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg">{m.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold">{m.authorName} • {formatDate(m.createdAt)}</p>
                      {profile?.uid && !m.readBy?.includes(profile.uid) && (
                        <button
                          onClick={() => handleMarkAsRead(m.id!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all hover:scale-[1.02]"
                        >
                          <Eye className="w-3.5 h-3.5" /> Marcar como leído
                        </button>
                      )}
                    </div>
                  </div>
                  {m.imageURL && (
                    <img src={m.imageURL} alt="" className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0" />
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

