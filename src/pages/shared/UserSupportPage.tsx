import { useState, useEffect } from 'react';
import { HelpCircle, Plus, X, Loader2, MessageSquare, Send, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getUserTickets, createTicket, addTicketReply, type SupportTicket, type TicketReply } from '../../lib/supportService';

export function UserSupportPage() {
  const profile = useAuthStore((s) => s.profile);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [formLoading, setFormLoading] = useState(false);

  // Chat reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const loadTickets = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const data = await getUserTickets(profile.uid);
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, [profile?.uid]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFormLoading(true);
    try {
      await createTicket({
        userId: profile.uid,
        userName: profile.name || 'Usuario',
        userEmail: profile.email || '',
        userRole: (profile.role && profile.role !== 'admin' ? profile.role : 'player') as 'club' | 'player' | 'staff',
        clubId: profile.clubId || profile.uid, // If club owner, clubId is their own uid
        subject,
        description,
        priority
      });
      setSubject('');
      setDescription('');
      setPriority('low');
      setShowModal(false);
      await loadTickets();
    } catch (error) {
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket?.id || !replyMessage.trim() || !profile) return;
    setReplyLoading(true);
    try {
      const reply: TicketReply = {
        authorName: profile.name || 'Usuario',
        authorRole: 'user',
        message: replyMessage.trim(),
        createdAt: new Date().toISOString()
      };
      await addTicketReply(selectedTicket.id, reply);
      setReplyMessage('');
      await loadTickets();
    } catch (error) {
      console.error(error);
    } finally {
      setReplyLoading(false);
    }
  };



  const getStatusLabel = (s: SupportTicket['status']) => {
    const map = {
      open: { label: 'Abierto', class: 'bg-red-100 text-red-800' },
      in_progress: { label: 'En Proceso', class: 'bg-amber-100 text-amber-800' },
      resolved: { label: 'Resuelto', class: 'bg-emerald-100 text-emerald-800' }
    };
    return map[s] || { label: s, class: 'bg-slate-100' };
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-600 rounded-xl">
              <HelpCircle className="w-7 h-7" />
            </div>
            Soporte Técnico
          </h1>
          <p className="text-slate-500 mt-2 text-base">Abre incidencias, consulta dudas o solicita ayuda a la administración de AvantiaEsport.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/30"
        >
          <Plus className="w-5 h-5" /> Nueva Consulta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="md:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Mis Consultas
          </h2>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-600 animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-xs">No tienes tickets de soporte activos.</p>
            ) : (
              tickets.map(t => {
                const s = getStatusLabel(t.status);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all my-1.5 flex items-center justify-between ${
                      selectedTicket?.id === t.id
                        ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                        : 'border-transparent hover:bg-slate-50/70 hover:border-slate-100'
                    }`}
                  >
                    <div className="min-w-0 mr-2 space-y-1">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${s.class}`}>{s.label}</span>
                      <p className="font-bold text-slate-900 text-sm truncate">{t.subject}</p>
                      <p className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat / Detail View */}
        <div className="md:col-span-2 space-y-4">
          {selectedTicket ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[55vh]">
              {/* Ticket Top */}
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      selectedTicket.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Prioridad {selectedTicket.priority}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${getStatusLabel(selectedTicket.status).class}`}>
                      {getStatusLabel(selectedTicket.status).label}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-950 mt-1">{selectedTicket.subject}</h3>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[40vh]">
                {/* Initial Description */}
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                    Yo
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 max-w-[85%]">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedTicket.description}</p>
                    <p className="text-[9px] text-slate-400 mt-2">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Replies */}
                {selectedTicket.replies?.map((rep, idx) => {
                  const isAdmin = rep.authorRole === 'admin';
                  return (
                    <div key={idx} className={`flex gap-3 ${isAdmin ? '' : 'justify-end'}`}>
                      {isAdmin && (
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                          Sup
                        </div>
                      )}
                      <div className={`rounded-2xl p-4 max-w-[85%] ${
                        isAdmin
                          ? 'bg-slate-100 text-slate-900 rounded-tl-none'
                          : 'bg-brand-600 text-white rounded-tr-none'
                      }`}>
                        <p className={`text-xs font-bold mb-1 ${isAdmin ? 'text-brand-700' : 'text-brand-100'}`}>
                          {rep.authorName} {isAdmin ? '(Soporte)' : ''}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{rep.message}</p>
                        <p className={`text-[9px] mt-2 ${isAdmin ? 'text-slate-400' : 'text-brand-200/80'}`}>
                          {new Date(rep.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Send response */}
              {selectedTicket.status !== 'resolved' ? (
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    placeholder="Escribe una respuesta..."
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={replyLoading || !replyMessage.trim()}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 rounded-xl transition-all shadow-md flex items-center justify-center"
                  >
                    {replyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-center text-xs font-bold text-emerald-800 shrink-0">
                  Esta consulta ha sido marcada como resuelta. Si sigues teniendo problemas, ponte en contacto con administración.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center h-[55vh] flex flex-col justify-center items-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-900">Ningún ticket seleccionado</h3>
              <p className="text-slate-500 text-xs mt-1">Selecciona una consulta activa de la izquierda para ver las respuestas de soporte.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Nueva Consulta de Soporte</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asunto</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej. Error en cobro de cuota"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prioridad / Urgencia</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all font-semibold text-slate-700"
                >
                  <option value="low">Baja (Dudas de uso, sugerencias)</option>
                  <option value="medium">Media (Modificaciones de datos, errores menores)</option>
                  <option value="high">Alta (Problemas críticos de cobros, bloqueos de cuenta)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción Detallada</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe la incidencia o duda con el mayor detalle posible..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
