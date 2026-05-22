import { useState, useEffect } from 'react';
import { HelpCircle, Loader2, Search, MessageSquare, Send, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { getAllTickets, addTicketReply, updateTicketStatus, updateTicketPriority, type SupportTicket, type TicketReply } from '../../lib/supportService';
import { useAuthStore } from '../../store/authStore';

export function AdminSupportPage() {
  const profile = useAuthStore((s) => s.profile);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getAllTickets();
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (e) {
      console.error("Error loading tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket?.id || !replyMessage.trim() || !profile) return;
    setSendingReply(true);
    try {
      const reply: TicketReply = {
        authorName: profile.name || 'Admin',
        authorRole: 'admin',
        message: replyMessage.trim(),
        createdAt: new Date().toISOString()
      };
      await addTicketReply(selectedTicket.id, reply);
      
      // Auto transition to 'in_progress' if currently 'open'
      if (selectedTicket.status === 'open') {
        await updateTicketStatus(selectedTicket.id, 'in_progress');
      }

      setReplyMessage('');
      await loadTickets();
    } catch (error) {
      console.error("Error replying to ticket:", error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleChangeStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      await updateTicketStatus(ticketId, status);
      await loadTickets();
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangePriority = async (ticketId: string, priority: SupportTicket['priority']) => {
    try {
      await updateTicketPriority(ticketId, priority);
      await loadTickets();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityBadge = (p: SupportTicket['priority']) => {
    const map = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[p]}`}>{labels[p]}</span>;
  };

  const getStatusBadge = (s: SupportTicket['status']) => {
    const map = {
      open: 'bg-red-50 text-red-600 border-red-100',
      in_progress: 'bg-amber-50 text-amber-600 border-amber-100',
      resolved: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };
    const labels = { open: 'Abierto', in_progress: 'En Proceso', resolved: 'Resuelto' };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${map[s]}`}>{labels[s]}</span>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-brand-100 text-brand-600 rounded-xl">
            <HelpCircle className="w-7 h-7" />
          </div>
          Centro de Soporte
        </h1>
        <p className="text-slate-500 mt-2 text-base">Atiende las consultas, incidencias y dudas enviadas por los usuarios de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Ticket List Panel */}
        <div className={`lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 ${selectedTicket ? 'hidden lg:block' : 'block'}`}>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-700" />
            Bandeja de Entrada
          </h2>

          {/* Filters */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar ticket..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Cualquier estado</option>
                <option value="open">Abiertos</option>
                <option value="in_progress">En proceso</option>
                <option value="resolved">Resueltos</option>
              </select>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Cualquier prioridad</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-600 animate-spin" /></div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-sm">No se encontraron tickets.</p>
            ) : (
              filteredTickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-4 rounded-2xl transition-all my-1.5 border flex items-center justify-between ${
                    selectedTicket?.id === t.id
                      ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                      : 'border-transparent hover:bg-slate-50/70 hover:border-slate-100'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 mr-2">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(t.priority)}
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="font-bold text-slate-950 text-sm truncate">{t.subject}</p>
                    <p className="text-xs text-slate-500 truncate">{t.userName} ({t.userRole})</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Chat & Admin controls */}
        <div className={`lg:col-span-2 space-y-6 ${!selectedTicket ? 'hidden lg:block' : 'block'}`}>
          {selectedTicket ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[70vh]">
              {/* Ticket Top bar */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">Ticket #{selectedTicket.id?.substring(0, 6)}</span>
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h3 className="font-black text-slate-900 text-lg mt-1 truncate">{selectedTicket.subject}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={e => handleChangeStatus(selectedTicket.id!, e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Proceso</option>
                    <option value="resolved">Resuelto</option>
                  </select>
                  <select
                    value={selectedTicket.priority}
                    onChange={e => handleChangePriority(selectedTicket.id!, e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[50vh]">
                {/* Initial Description */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 max-w-[85%]">
                    <p className="text-xs font-bold text-slate-700 mb-1">{selectedTicket.userName} ({selectedTicket.userRole === 'club' ? 'Club' : 'Jugador/Tutor'})</p>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedTicket.description}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Replies */}
                {selectedTicket.replies?.map((rep, idx) => {
                  const isAdmin = rep.authorRole === 'admin';
                  return (
                    <div key={idx} className={`flex gap-3 ${isAdmin ? 'justify-end' : ''}`}>
                      {!isAdmin && (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className={`rounded-2xl p-4 max-w-[85%] ${
                        isAdmin
                          ? 'bg-brand-600 text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-900 rounded-tl-none'
                      }`}>
                        <p className={`text-xs font-bold mb-1 ${isAdmin ? 'text-brand-100' : 'text-slate-700'}`}>
                          {rep.authorName} {isAdmin ? '(Soporte)' : ''}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{rep.message}</p>
                        <p className={`text-[10px] mt-2 font-medium ${isAdmin ? 'text-brand-200/80' : 'text-slate-400'}`}>
                          {new Date(rep.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  placeholder={selectedTicket.status === 'resolved' ? "El ticket está resuelto. Escribe para reabrir..." : "Escribe una respuesta..."}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-md"
                >
                  {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center h-[70vh] flex flex-col justify-center items-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mb-4 animate-pulse" />
              <h3 className="font-bold text-slate-900 text-lg">Bandeja de soporte vacía</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">Selecciona un ticket de soporte de la izquierda para interactuar, responder y realizar seguimiento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
