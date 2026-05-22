import { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Loader2, ArrowUpRight, Trash2, AlertTriangle, User, RefreshCw, Calendar, X, AlertCircle } from 'lucide-react';
import { getStaffByClub } from '../../lib/userService';
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem, getLoansByClub, createLoan, returnLoan, type InventoryItem, type InventoryLoan } from '../../lib/inventoryService';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

export function ClubInventoryPage() {
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'warehouse' | 'loans'>('warehouse');
  
  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<InventoryLoan[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);

  // Search/Filter State
  const [search, setSearch] = useState('');
  const [filterThreshold, setFilterThreshold] = useState('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form State
  const [formLoading, setFormLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Material Form
  const [itemName, setItemName] = useState('');
  const [itemTotalQuantity, setItemTotalQuantity] = useState(10);
  const [itemMinThreshold, setItemMinThreshold] = useState(3);
  const [itemLocation, setItemLocation] = useState('');

  // Loan Form
  const [loanItemId, setLoanItemId] = useState('');
  const [loanCoachId, setLoanCoachId] = useState('');
  const [loanQuantity, setLoanQuantity] = useState(1);

  const clubId = profile?.role === 'club' ? profile?.uid : profile?.clubId;

  // --- Permisos del Personal (Staff) ---
  const staffPerm = profile?.role === 'staff' ? profile.staffPermissions?.inventory : null;
  const canEdit = staffPerm ? staffPerm.canEdit : true;

  const loadData = async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const [itemList, loanList, staffList] = await Promise.all([
        getInventoryItems(clubId),
        getLoansByClub(clubId),
        getStaffByClub(clubId)
      ]);
      setItems(itemList);
      setLoans(loanList);
      setStaff(staffList);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar inventario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clubId]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !itemName.trim() || !canEdit) return;

    setFormLoading(true);
    try {
      await createInventoryItem(clubId, {
        name: itemName.trim(),
        totalQuantity: itemTotalQuantity,
        availableQuantity: itemTotalQuantity,
        minThreshold: itemMinThreshold,
        location: itemLocation.trim() || undefined
      });

      showToast('Material registrado con éxito', 'success');
      setShowAddModal(false);
      resetItemForm();
      await loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al registrar material', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditItemOpen = (item: InventoryItem) => {
    if (!canEdit) return;
    setSelectedItem(item);
    setItemName(item.name);
    setItemTotalQuantity(item.totalQuantity);
    setItemMinThreshold(item.minThreshold);
    setItemLocation(item.location || '');
    setShowEditModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem?.id || !canEdit) return;

    setFormLoading(true);
    try {
      await updateInventoryItem(selectedItem.id, {
        name: itemName.trim(),
        totalQuantity: itemTotalQuantity,
        minThreshold: itemMinThreshold,
        location: itemLocation.trim() || undefined
      });

      showToast('Material actualizado con éxito', 'success');
      setShowEditModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar material', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmId || !canEdit) return;
    try {
      await deleteInventoryItem(deleteConfirmId);
      showToast('Material eliminado del inventario', 'success');
      setDeleteConfirmId(null);
      await loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar artículo', 'error');
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !loanItemId || !loanCoachId || !canEdit) return;

    const chosenItem = items.find(i => i.id === loanItemId);
    const chosenCoach = staff.find(s => s.uid === loanCoachId);

    if (!chosenItem) {
      showToast('Artículo seleccionado no válido', 'error');
      return;
    }
    if (!chosenCoach) {
      showToast('Entrenador seleccionado no válido', 'error');
      return;
    }

    setFormLoading(true);
    try {
      await createLoan(clubId, {
        itemId: loanItemId,
        itemName: chosenItem.name,
        coachId: loanCoachId,
        coachName: chosenCoach.name || chosenCoach.username || 'Entrenador',
        quantity: loanQuantity,
        dateBorrowed: new Date().toISOString().split('T')[0]
      });

      showToast('Préstamo asignado con éxito', 'success');
      setShowLoanModal(false);
      resetLoanForm();
      await loadData();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al asignar préstamo', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReturnLoan = async (loan: InventoryLoan) => {
    if (!loan.id || !canEdit) return;
    setLoading(true);
    try {
      await returnLoan(loan.id, loan.itemId, loan.quantity);
      showToast('Material devuelto y reincorporado al almacén', 'success');
      await loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al devolver material', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemName('');
    setItemTotalQuantity(10);
    setItemMinThreshold(3);
    setItemLocation('');
  };

  const resetLoanForm = () => {
    setLoanItemId('');
    setLoanCoachId('');
    setLoanQuantity(1);
  };

  // Search and threshold alarms logic
  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || 
                          (i.location && i.location.toLowerCase().includes(search.toLowerCase()));
    const matchesAlert = filterThreshold === 'all' 
      ? true 
      : filterThreshold === 'low' 
        ? i.availableQuantity <= i.minThreshold 
        : i.availableQuantity > i.minThreshold;
    return matchesSearch && matchesAlert;
  });

  const filteredLoans = loans.filter(l => {
    if (profile?.role === 'staff' && l.coachId !== profile.uid) {
      return false;
    }
    return l.itemName.toLowerCase().includes(search.toLowerCase()) || 
           l.coachName.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => b.dateBorrowed.localeCompare(a.dateBorrowed));

  // Analytics Helpers
  const totalItemCount = items.length;
  const lowStockCount = items.filter(i => i.availableQuantity <= i.minThreshold).length;
  const activeLoansCount = loans.filter(l => l.status === 'prestado' && (profile?.role !== 'staff' || l.coachId === profile.uid)).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Package className="w-7 h-7" /></div>
            Gestión de Almacén e Inventario de Material
          </h1>
          <p className="text-slate-500 mt-2">Controla el stock de balones, petos y conos, y rastrea los préstamos asignados a entrenadores.</p>
        </div>

        {(profile?.role === 'club' || (profile?.role === 'staff' && canEdit)) && (
          <div className="flex gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => { resetItemForm(); setShowAddModal(true); }}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/10"
            >
              <Plus className="w-4 h-4" /> Registrar Material
            </button>
            <button
              onClick={() => { resetLoanForm(); setShowLoanModal(true); }}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/10"
            >
              <ArrowUpRight className="w-4 h-4" /> Asignar Préstamo
            </button>
          </div>
        )}
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-slate-600 text-white rounded-xl shadow-sm"><Package className="w-5 h-5" /></div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{totalItemCount}</h3>
            <p className="text-xs text-slate-500 font-semibold">Artículos Registrados</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500 text-white rounded-xl shadow-sm"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <h3 className="text-2xl font-black text-red-950">{lowStockCount}</h3>
            <p className="text-xs text-red-800 font-semibold">Alertas de Stock Bajo</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm"><User className="w-5 h-5" /></div>
          <div>
            <h3 className="text-2xl font-black text-amber-950">{activeLoansCount}</h3>
            <p className="text-xs text-amber-800 font-semibold">Préstamos Activos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => { setActiveTab('warehouse'); setSearch(''); }}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'warehouse' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-650'
          }`}
        >
          {activeTab === 'warehouse' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
          Almacén y Stock
        </button>

        <button
          onClick={() => { setActiveTab('loans'); setSearch(''); }}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'loans' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-650'
          }`}
        >
          {activeTab === 'loans' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
          Préstamos y Asignaciones
        </button>
      </div>

      {/* Search & Filtering Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'warehouse' ? "Buscar por material o ubicación..." : "Buscar por material o entrenador..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-semibold"
          />
        </div>

        {activeTab === 'warehouse' && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Filtrar</span>
            </div>

            <select
              value={filterThreshold}
              onChange={(e) => setFilterThreshold(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos los Niveles</option>
              <option value="low">Stock Bajo Mínimo</option>
              <option value="good">Stock Correcto</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : activeTab === 'warehouse' ? (
        /* WAREHOUSE TAB */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-slate-100 rounded-2xl">
              <Package className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800">No hay material en almacén</h3>
              <p className="text-xs text-slate-400 mt-1">Registra tu primer material deportivo para comenzar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredItems.map(item => {
                const isLow = item.availableQuantity <= item.minThreshold;

                return (
                  <div 
                    key={item.id}
                    className={`border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between ${
                      isLow ? 'border-red-200 bg-red-50/10' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Alert banner if low */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {isLow ? (
                          <span className="text-[9px] font-black px-2 py-0.5 bg-red-100 border border-red-200 text-red-700 rounded-md uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" /> Stock Bajo
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-md uppercase tracking-wider">
                            Correcto
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-semibold italic">
                          📍 {item.location || 'Sin ubicación'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">{item.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Actualizado el: {new Date(item.updatedAt).toLocaleDateString('es-ES')}</p>
                      </div>

                      {/* Stock Counter Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>Disponibles: <span className={isLow ? 'text-red-600 font-black' : ''}>{item.availableQuantity}</span></span>
                          <span className="text-slate-400">Total: {item.totalQuantity}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLow ? 'bg-red-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${item.totalQuantity > 0 ? (item.availableQuantity / item.totalQuantity) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold">Umbral mínimo de alerta: {item.minThreshold} unidades</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {(profile?.role === 'club' || (profile?.role === 'staff' && canEdit)) && (
                      <div className="pt-4 mt-4 border-t border-slate-150 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleEditItemOpen(item)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                        >
                          Editar Stock
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id!)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* LOANS TAB */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          {filteredLoans.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-slate-100 rounded-2xl">
              <RefreshCw className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800">No hay préstamos activos</h3>
              <p className="text-xs text-slate-400 mt-1">Asigna un préstamo de material a un entrenador.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Artículo</th>
                    <th className="pb-3">Entrenador</th>
                    <th className="pb-3 text-center">Cantidad</th>
                    <th className="pb-3">Fecha Préstamo</th>
                    <th className="pb-3">Estado / Devolución</th>
                    <th className="pb-3 text-right pr-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map(loan => (
                    <tr key={loan.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-slate-900">{loan.itemName}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-450" />
                          <span className="font-semibold text-slate-700">{loan.coachName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-black text-slate-800">{loan.quantity} uds</td>
                      <td className="py-3.5 text-slate-400 font-semibold">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {new Date(loan.dateBorrowed).toLocaleDateString('es-ES')}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          loan.status === 'devuelto' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                            : 'bg-amber-50 border-amber-100 text-amber-700 animate-pulse'
                        }`}>
                          {loan.status === 'devuelto' ? 'Devuelto' : 'Prestado'}
                        </span>
                        {loan.dateReturned && (
                          <span className="text-[9px] text-slate-400 ml-1.5">el {new Date(loan.dateReturned).toLocaleDateString('es-ES')}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        {loan.status === 'prestado' && (profile?.role === 'club' || (profile?.role === 'staff' && canEdit)) && (
                          <button
                            onClick={() => handleReturnLoan(loan)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-750 text-white rounded-lg text-[10px] font-black tracking-wider uppercase transition-colors shadow-sm"
                          >
                            Registrar Devolución
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-600" /> Registrar Material
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre del Artículo</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                  placeholder="Ej. Balones Adidas T5, Conos Chinos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Stock Total</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemTotalQuantity}
                    onChange={(e) => setItemTotalQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Límite Mínimo Alerta</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemMinThreshold}
                    onChange={(e) => setItemMinThreshold(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ubicación / Estante (Opcional)</label>
                <input
                  type="text"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold"
                  placeholder="Ej. Armario B, Estantería 3"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold transition-all">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-md">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-600" /> Modificar Material
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre del Artículo</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Stock Total</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemTotalQuantity}
                    onChange={(e) => setItemTotalQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Límite Mínimo Alerta</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemMinThreshold}
                    onChange={(e) => setItemMinThreshold(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ubicación / Estante</label>
                <input
                  type="text"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold transition-all">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Item Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-600" /> Registrar Préstamo de Material
              </h3>
              <button onClick={() => setShowLoanModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Seleccionar Artículo</label>
                <select
                  required
                  value={loanItemId}
                  onChange={(e) => setLoanItemId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                >
                  <option value="">Selecciona material...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id} disabled={i.availableQuantity <= 0}>
                      {i.name} (Disponibles: {i.availableQuantity} de {i.totalQuantity}) {i.availableQuantity <= 0 ? '— SIN STOCK' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Seleccionar Entrenador / Staff</label>
                <select
                  required
                  value={loanCoachId}
                  onChange={(e) => setLoanCoachId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                >
                  <option value="">Selecciona destinatario...</option>
                  {staff.map(s => (
                    <option key={s.uid} value={s.uid}>
                      {s.name || s.username} ({s.accountType || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cantidad a Prestar</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={loanQuantity}
                  onChange={(e) => setLoanQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowLoanModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold transition-all">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-md">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-slide-in">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¿Eliminar del inventario?</h3>
            <p className="text-sm text-slate-500 mt-2">Esta acción eliminará de forma permanente el material y su stock registrado de la base de datos.</p>
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
                onClick={handleDeleteItem}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
