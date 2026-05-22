import { useState, useEffect } from 'react';
import { Calendar, Plus, X, Loader2, Check, Trash2, Edit, ToggleLeft, ToggleRight, DollarSign, Clock } from 'lucide-react';
import { getClubSeasons, createSeason, updateSeason, setClubActiveSeason, type Season } from '../../lib/seasonsService';
import { useAuthStore } from '../../store/authStore';

const DEFAULT_CATEGORIES = ['Prebenjamín', 'Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Senior'];

export function ClubSeasonsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Fees by category
  const [feesByCategory, setFeesByCategory] = useState<Record<string, number>>({});
  const [newCatName, setNewCatName] = useState('');
  const [newCatFee, setNewCatFee] = useState(0);

  // Installments
  const [installmentsEnabled, setInstallmentsEnabled] = useState(false);
  const [installments, setInstallments] = useState<{ name: string; percentage: number; dueDate: string }[]>([]);

  const loadData = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const data = await getClubSeasons(profile.uid);
      setSeasons(data);
    } catch (error) {
      console.error('Error loading seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [profile?.uid]);

  const resetForm = () => {
    setEditingSeason(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setIsActive(false);
    setFeesByCategory({});
    setNewCatName('');
    setNewCatFee(0);
    setInstallmentsEnabled(false);
    setInstallments([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (season: Season) => {
    setEditingSeason(season);
    setName(season.name);
    setStartDate(season.startDate);
    setEndDate(season.endDate);
    setIsActive(season.isActive);
    setFeesByCategory(season.feesByCategory || {});
    setInstallmentsEnabled(season.paymentInstallments?.enabled || false);
    setInstallments((season.paymentInstallments?.installments || []).map(inst => ({
      name: inst.name,
      percentage: inst.percentage,
      dueDate: inst.dueDate || ''
    })));
    setShowModal(true);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim() || newCatFee <= 0) return;
    setFeesByCategory(prev => ({ ...prev, [newCatName.trim()]: newCatFee }));
    setNewCatName('');
    setNewCatFee(0);
  };

  const handleRemoveCategory = (cat: string) => {
    setFeesByCategory(prev => {
      const copy = { ...prev };
      delete copy[cat];
      return copy;
    });
  };

  const handleAddInstallment = () => {
    if (installments.length >= 4) return;
    setInstallments(prev => [...prev, { name: `Plazo ${prev.length + 1}`, percentage: 0, dueDate: '' }]);
  };

  const handleUpdateInstallment = (index: number, field: string, value: string | number) => {
    setInstallments(prev => prev.map((inst, i) => i === index ? { ...inst, [field]: value } : inst));
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFormLoading(true);

    try {
      const seasonData = {
        name,
        startDate,
        endDate,
        isActive,
        clubId: profile.uid,
        createdAt: editingSeason?.createdAt || new Date().toISOString(),
        feesByCategory: Object.keys(feesByCategory).length > 0 ? feesByCategory : undefined,
        paymentInstallments: installmentsEnabled ? { enabled: true, installments } : { enabled: false, installments: [] },
      };

      if (editingSeason?.id) {
        await updateSeason(editingSeason.id, seasonData);
        if (isActive) {
          await setClubActiveSeason(profile.uid, editingSeason.id);
        }
      } else {
        await createSeason(seasonData);
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving season:', error);
      alert('Error al guardar la temporada.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSetActive = async (seasonId: string) => {
    if (!profile?.uid) return;
    try {
      setLoading(true);
      await setClubActiveSeason(profile.uid, seasonId);
      await loadData();
    } catch (error) {
      console.error('Error setting active season:', error);
    }
  };

  const totalInstallmentPercentage = installments.reduce((sum, inst) => sum + Number(inst.percentage), 0);

  if (loading) {
    return <div className="flex justify-center items-center p-24"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-violet-100 text-violet-600 rounded-xl">
              <Calendar className="w-7 h-7" />
            </div>
            Gestión de Temporadas
          </h1>
          <p className="text-slate-500 mt-2 text-base">Configura temporadas, cuotas por categoría y plazos de pago para tu club.</p>
        </div>
        <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/30">
          <Plus className="w-5 h-5" />
          Nueva Temporada
        </button>
      </div>

      {/* Seasons List */}
      {seasons.length === 0 ? (
        <div className="text-center p-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Sin temporadas creadas</h3>
          <p className="text-slate-500 mb-6">Crea tu primera temporada para configurar cuotas y plazos de pago.</p>
          <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-violet-500 transition-all">
            <Plus className="w-5 h-5" /> Crear Primera Temporada
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {seasons.map(season => (
            <div key={season.id} className={`bg-white rounded-3xl border p-6 shadow-sm transition-all ${season.isActive ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${season.isActive ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{season.name}</h3>
                      {season.isActive && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md uppercase tracking-wider border border-violet-200">Activa</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{season.startDate} — {season.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!season.isActive && (
                    <button onClick={() => handleSetActive(season.id!)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                      Activar
                    </button>
                  )}
                  <button onClick={() => handleOpenEdit(season)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fees by category */}
              {season.feesByCategory && Object.keys(season.feesByCategory).length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Cuotas por Categoría</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(season.feesByCategory).map(([cat, fee]) => (
                      <span key={cat} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                        <DollarSign className="w-3 h-3" />
                        {cat}: {fee}€
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Installments info */}
              {season.paymentInstallments?.enabled && season.paymentInstallments.installments.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Plazos de Pago Habilitados</p>
                  <div className="flex flex-wrap gap-2">
                    {season.paymentInstallments.installments.map((inst, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                        <Clock className="w-3 h-3" />
                        {inst.name}: {inst.percentage}%{inst.dueDate ? ` (hasta ${inst.dueDate})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 bg-violet-50 border-b border-violet-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingSeason ? 'Editar Temporada' : 'Nueva Temporada del Club'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-violet-600 uppercase tracking-wider">Datos Básicos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de la Temporada</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 transition-all font-semibold" placeholder="Ej. Temporada 2025-2026" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Inicio</label>
                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Fin</label>
                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={isActive} onChange={() => setIsActive(!isActive)} className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500" />
                      <span className="text-sm font-bold text-slate-700">Marcar como temporada activa</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Fees by Category */}
              <div className="space-y-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Cuotas por Categoría
                </h4>
                <p className="text-xs text-slate-500">Define precios específicos por categoría.</p>

                {/* Existing categories */}
                {Object.entries(feesByCategory).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(feesByCategory).map(([cat, fee]) => (
                      <div key={cat} className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{cat}</span>
                          <span className="text-sm font-black text-emerald-600">{fee}€</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new category */}
                <div className="flex gap-2">
                  <select value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-400">
                    <option value="">Seleccionar categoría...</option>
                    {DEFAULT_CATEGORIES.filter(c => !feesByCategory[c]).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__custom">Otra (personalizada)...</option>
                  </select>
                  {newCatName === '__custom' && (
                    <input
                      type="text"
                      placeholder="Nombre..."
                      onChange={e => setNewCatName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  )}
                  <input type="number" min={0} placeholder="€" value={newCatFee || ''} onChange={e => setNewCatFee(Number(e.target.value))} className="w-24 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button type="button" onClick={handleAddCategory} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Installments */}
              <div className="space-y-4 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Pago Fraccionado (Plazos)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setInstallmentsEnabled(!installmentsEnabled)}
                    className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      installmentsEnabled
                        ? 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {installmentsEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {installmentsEnabled ? 'Habilitado' : 'Deshabilitado'}
                  </button>
                </div>

                {installmentsEnabled && (
                  <div className="space-y-3 animate-fade-in">
                    <p className="text-xs text-slate-500">Define los plazos de pago. La suma de los porcentajes debe ser 100%.</p>

                    {installments.map((inst, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-100">
                        <input
                          type="text"
                          value={inst.name}
                          onChange={e => handleUpdateInstallment(i, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="Nombre del plazo"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={inst.percentage}
                            onChange={e => handleUpdateInstallment(i, 'percentage', Number(e.target.value))}
                            className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={e => handleUpdateInstallment(i, 'dueDate', e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <button type="button" onClick={() => handleRemoveInstallment(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center justify-between">
                      <button type="button" onClick={handleAddInstallment} disabled={installments.length >= 4} className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus className="w-3.5 h-3.5" /> Añadir Plazo
                      </button>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        totalInstallmentPercentage === 100
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        Total: {totalInstallmentPercentage}% {totalInstallmentPercentage === 100 ? <Check className="inline w-3 h-3" /> : '(debe ser 100%)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading || (installmentsEnabled && totalInstallmentPercentage !== 100)}
                  className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-violet-500/20"
                >
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingSeason ? 'Guardar Cambios' : 'Crear Temporada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
