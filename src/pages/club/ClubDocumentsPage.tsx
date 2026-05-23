import { useState, useEffect } from 'react';
import { FileCheck, FileText, CheckCircle, Eye, X, Loader2, Search, Filter, AlertCircle, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { getClubPendingDocuments, getClubDocuments, updateDocumentStatus, type PlayerDocument } from '../../lib/storageService';
import { getPlayersByClub } from '../../lib/userService';
import { getTeamsByClub, type Team } from '../../lib/teamsService';
import { useAuthStore, type UserProfile } from '../../store/authStore';

export function ClubDocumentsPage() {
  const profile = useAuthStore((state) => state.profile);
  const [pendingDocs, setPendingDocs] = useState<PlayerDocument[]>([]);
  const [allDocs, setAllDocs] = useState<PlayerDocument[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & filters state
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionDocId, setRejectionDocId] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = async () => {
    const targetClubId = profile?.clubId || profile?.uid;
    if (!targetClubId) return;
    setLoading(true);
    try {
      const [pendingData, allData, playersData, teamsData] = await Promise.all([
        getClubPendingDocuments(targetClubId),
        getClubDocuments(targetClubId),
        getPlayersByClub(targetClubId),
        getTeamsByClub(targetClubId)
      ]);
      setPendingDocs(pendingData);
      setAllDocs(allData);
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.clubId, profile?.uid]);

  const handleApprove = async (docId: string) => {
    try {
      await updateDocumentStatus(docId, 'approved', '');
      await loadData();
    } catch (error) {
      console.error("Error approving document:", error);
      alert("Error al aprobar el documento.");
    }
  };

  const handleOpenRejectModal = (docId: string) => {
    setRejectionDocId(docId);
    setRejectionNotes('');
    setShowRejectionModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionDocId) return;
    setRejecting(true);
    try {
      const notes = rejectionNotes.trim() || 'Documento no válido, por favor súbelo de nuevo de forma clara.';
      await updateDocumentStatus(rejectionDocId, 'rejected', notes);
      setShowRejectionModal(false);
      await loadData();
    } catch (error) {
      console.error("Error rejecting document:", error);
      alert("Error al rechazar el documento.");
    } finally {
      setRejecting(false);
    }
  };

  // Rejection quick note selection
  const setQuickNote = (note: string) => {
    setRejectionNotes(note);
  };

  // Filtering lists
  const filteredPendingDocs = pendingDocs.filter(doc => {
    const player = players.find(p => p.uid === doc.userId);
    const matchesSearch = !searchQuery || player?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = !selectedTeamId || player?.teamId === selectedTeamId;
    return matchesSearch && matchesTeam;
  });

  const filteredAllDocs = allDocs.filter(doc => {
    const player = players.find(p => p.uid === doc.userId);
    const matchesSearch = !searchQuery || player?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = !selectedTeamId || player?.teamId === selectedTeamId;
    return matchesSearch && matchesTeam;
  });

  const docTypeLabel = (type: string) => {
    switch (type) {
      case 'dni': return 'DNI / Pasaporte';
      case 'medical': return 'Reconocimiento Médico';
      case 'parental': return 'Autorización Tutor';
      default: return 'Otro Documento';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <FileCheck className="w-7 h-7" />
            </div>
            Verificador de Documentos
          </h1>
          <p className="text-slate-500 mt-2 text-base">Audita expedientes, gestiona aprobaciones y revisa el historial de fichas del club.</p>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          className="self-start md:self-auto inline-flex items-center gap-2 text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Pendientes de Revisión ({pendingDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Historial de Fichas ({allDocs.length})
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar jugador por nombre..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-slate-400 font-medium"
          />
        </div>

        {/* Team Dropdown */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <select 
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-semibold appearance-none"
          >
            <option value="">Todos los Equipos</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-3.5 flex items-center text-slate-400">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
          </div>
        </div>
      </div>

      {/* Main View Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
          </div>
        ) : activeTab === 'pending' ? (
          /* TAB 1: PENDING DOCUMENTS */
          filteredPendingDocs.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Sin expedientes pendientes</h3>
              <p className="text-slate-500 text-sm">No quedan documentos por auditar con los filtros seleccionados.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Pendientes de Verificación
                </h2>
                <span className="text-xs font-bold text-amber-700 bg-amber-100/60 px-3 py-1 rounded-full border border-amber-200">
                  {filteredPendingDocs.length} pendiente{filteredPendingDocs.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPendingDocs.map(doc => {
                  const player = players.find(p => p.uid === doc.userId);
                  const playerTeam = teams.find(t => t.id === player?.teamId)?.name;
                  return (
                    <div key={doc.id} className="border border-slate-200 rounded-2xl p-5 hover:border-brand-200 hover:shadow-sm transition-all bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 uppercase tracking-wide text-[10px] mb-0.5">
                                {docTypeLabel(doc.type)}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-bold text-slate-800">{player?.name || 'Jugador desconocido'}</p>
                                {playerTeam && (
                                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                    {playerTeam}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {doc.fileName && (
                          <p className="text-xs text-slate-500 truncate mb-3 px-1 font-mono">{doc.fileName}</p>
                        )}
                      </div>

                      <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex justify-center items-center gap-2 py-2 px-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 shadow-sm transition-all shrink-0"
                        >
                          <Eye className="w-4 h-4 text-slate-400" /> Ver Ficha
                        </a>
                        <button
                          onClick={() => handleOpenRejectModal(doc.id!)}
                          className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors font-bold text-sm shrink-0"
                          title="Rechazar con Observaciones"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(doc.id!)}
                          className="flex-1 bg-brand-600 text-white border border-transparent rounded-xl hover:bg-brand-700 transition-colors font-bold text-sm"
                        >
                          Aprobar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* TAB 2: HISTORY LIST OF ALL DOCUMENTS */
          filteredAllDocs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 border border-slate-100 rounded-2xl bg-slate-50/50">
              <FileText className="w-12 h-12 text-slate-350 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No se encontraron fichas históricas</p>
              <p className="text-xs">Ajusta los filtros o asegúrate de que haya registros en la base de datos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                    <th className="px-6 py-4 rounded-l-2xl">Jugador / Equipo</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Documento</th>
                    <th className="px-6 py-4">Fecha Subida</th>
                    <th className="px-6 py-4">Observaciones / Motivos</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 rounded-r-2xl text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {filteredAllDocs.map(doc => {
                    const player = players.find(p => p.uid === doc.userId);
                    const playerTeam = teams.find(t => t.id === player?.teamId)?.name;
                    
                    // Format upload date
                    let formattedDate = '-';
                    if (doc.uploadedAt) {
                      try {
                        const dateObj = doc.uploadedAt?.toDate ? doc.uploadedAt.toDate() : new Date(doc.uploadedAt);
                        formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                      } catch (e) {
                        formattedDate = String(doc.uploadedAt);
                      }
                    }

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{player?.name || 'Jugador desconocido'}</span>
                            {playerTeam && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 w-fit mt-0.5">
                                {playerTeam}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2 py-0.8 rounded-full border border-brand-100">
                            {docTypeLabel(doc.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate font-mono text-xs text-slate-500">
                          {doc.fileName || 'document.pdf'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4 max-w-[250px]">
                          {doc.status === 'rejected' ? (
                            <div className="flex items-start gap-1.5 text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-relaxed">{doc.notes || 'Rechazado sin observaciones'}</span>
                            </div>
                          ) : doc.status === 'approved' ? (
                            <span className="text-xs text-slate-400 italic">Verificado correctamente</span>
                          ) : (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 font-semibold">Pendiente de auditar</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            doc.status === 'approved' ? 'text-emerald-700 bg-emerald-100/60 border border-emerald-200' :
                            doc.status === 'rejected' ? 'text-rose-700 bg-rose-100/60 border border-rose-200' :
                            'text-amber-700 bg-amber-100/60 border border-amber-200'
                          }`}>
                            {doc.status === 'approved' ? 'Aprobado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shadow-sm border border-slate-200/50"
                              title="Visualizar documento"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            {doc.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(doc.id!)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors border border-emerald-150"
                                title="Aprobar Ficha"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {doc.status !== 'rejected' && (
                              <button
                                onClick={() => handleOpenRejectModal(doc.id!)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-150"
                                title="Rechazar / Cambiar Observación"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL: CUSTOM REJECTION NOTES */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-255">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-950 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Motivo de Rechazo
              </h3>
              <button 
                onClick={() => setShowRejectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-150/50 hover:bg-slate-200/50 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">Escribe la razón exacta de la invalidación. El jugador verá este comentario de inmediato en su buzón privado.</p>
              
              {/* Quick suggestions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Notas rápidas sugeridas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "El reverso del DNI está borroso.",
                    "El reconocimiento médico está caducado.",
                    "Falta la firma autorizada del tutor.",
                    "El documento está incompleto o cortado."
                  ].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setQuickNote(sug)}
                      className="text-[10px] font-semibold text-slate-650 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-colors text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Detalles adicionales / Observaciones:</label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Ej: El DNI está recortado y no se aprecian bien los bordes del documento. Por favor, realiza una foto completa."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectionModal(false)}
                disabled={rejecting}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
