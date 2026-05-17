import { useState, useEffect, useRef } from 'react';
import { FileText, UploadCloud, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getPlayerDocuments, uploadPlayerDocument, type PlayerDocument, type DocumentType } from '../../lib/storageService';

export function PlayerDocumentsPage() {
  const profile = useAuthStore((state) => state.profile);
  const [documents, setDocuments] = useState<PlayerDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<DocumentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('dni');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const targetUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;
    if (!targetUid) return;
    try {
      const docs = await getPlayerDocuments(targetUid);
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  useEffect(() => { loadData(); }, [profile?.uid, profile?.fichaId]);

  const handleFileClick = (type: DocumentType) => {
    setSelectedDocType(type);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;
    if (!file || !targetUid || !profile?.clubId) return;
    setUploadingDoc(selectedDocType);
    setUploadProgress(0);
    try {
      await uploadPlayerDocument(targetUid, profile.clubId, file, selectedDocType, (progress) => setUploadProgress(progress));
      await loadData();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Hubo un error al subir el archivo.");
    } finally {
      setUploadingDoc(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getDocStatusUI = (type: DocumentType, title: string) => {
    const doc = documents.find(d => d.type === type);

    if (uploadingDoc === type) {
      return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg"><Loader2 className="w-5 h-5 animate-spin" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <div className="w-48 h-1.5 bg-blue-200 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!doc) {
      return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg shadow-sm"><AlertCircle className="w-5 h-5" /></div>
            <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-amber-600 font-medium mt-0.5">Pendiente de subir</p></div>
          </div>
          <button onClick={() => handleFileClick(type)} className="text-xs font-semibold bg-white shadow-sm border border-amber-200 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1.5">
            <UploadCloud className="w-3.5 h-3.5" /> Subir Archivo
          </button>
        </div>
      );
    }

    if (doc.status === 'pending') {
      return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg shadow-sm"><Clock className="w-5 h-5" /></div>
            <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-blue-600 font-medium mt-0.5">En revisión por el club</p></div>
          </div>
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 hover:underline">Ver adjunto</a>
        </div>
      );
    }

    if (doc.status === 'rejected') {
      return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-lg shadow-sm"><AlertCircle className="w-5 h-5" /></div>
            <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-red-600 font-medium mt-0.5">Rechazado. {doc.notes || 'Sube un documento válido.'}</p></div>
          </div>
          <button onClick={() => handleFileClick(type)} className="text-xs font-semibold bg-white shadow-sm border border-red-200 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5">
            <UploadCloud className="w-3.5 h-3.5" /> Volver a subir
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg shadow-sm"><CheckCircle className="w-5 h-5" /></div>
          <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-emerald-600 font-medium mt-0.5">Verificado y aprobado</p></div>
        </div>
      </div>
    );
  };

  if (!profile) return null;

  const isAdultPlayer = profile.accountType === 'tutor' ? false : profile.isAdult;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-brand-100 text-brand-600 rounded-xl">
            <FileText className="w-7 h-7" />
          </div>
          Mis Documentos
        </h1>
        <p className="text-slate-500 mt-2 text-base">Sube los documentos necesarios para tramitar tu ficha federativa.</p>
      </div>

      {/* Documents Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Centro de Documentación</h2>
          <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex items-center gap-1.5">
            {documents.filter(d => d.status === 'approved').length} de {isAdultPlayer ? 2 : 3} aprobados
          </div>
        </div>

        <div className="space-y-4">
          {getDocStatusUI('dni', 'DNI o Pasaporte (Anverso y Reverso)')}
          {getDocStatusUI('medical', 'Certificado / Reconocimiento Médico')}
          {!isAdultPlayer && getDocStatusUI('parental', 'Autorización Paterna / Tutor Legal')}
        </div>
      </div>
    </div>
  );
}
