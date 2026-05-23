import { useState, useEffect } from 'react';
import { CalendarDays, Plus, X, Loader2, Trash2, MapPin, Clock, ShieldAlert } from 'lucide-react';
import { getFacilitiesByClub, createFacility, updateFacility, deleteFacility, getBookingsByClub, createBooking, deleteBooking, type Facility, type FacilityBooking } from '../../lib/facilitiesService';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

export function ClubFacilitiesPage() {
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((s) => s.showToast);
  
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Facility Form State
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('Campo de Fútbol');
  const [facilityImageURL, setFacilityImageURL] = useState('');
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [selectedFacilityDetail, setSelectedFacilityDetail] = useState<Facility | null>(null);

  // Booking Form State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingRecurrence, setBookingRecurrence] = useState<'none' | 'weekly' | 'biweekly'>('none');
  const [bookingRecurrenceWeeks, setBookingRecurrenceWeeks] = useState(8);

  // --- Rol y Club ID dinámico ---
  const isStaff = profile?.role === 'staff';
  const targetClubId = profile?.clubId || profile?.uid;

  // --- Helpers de autorización ---
  const canManageFacilities = !isStaff; // Solo el club puede crear/eliminar/editar instalaciones
  const canDeleteBooking = (booking: FacilityBooking) => {
    if (!isStaff) return true; // El club puede borrar cualquier reserva
    return booking.createdBy === profile?.uid; // El staff solo sus propias reservas
  };

  const loadData = async () => {
    if (!targetClubId) return;
    setLoading(true);
    try {
      const [facData, bookData] = await Promise.all([
        getFacilitiesByClub(targetClubId),
        getBookingsByClub(targetClubId)
      ]);
      setFacilities(facData);
      setBookings(bookData);
    } catch (error) {
      console.error("Error loading facilities data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [targetClubId]);

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClubId || isStaff) return; // Protección adicional
    setFacilityLoading(true);
    try {
      await createFacility(targetClubId, facilityName, facilityType, facilityImageURL || undefined);
      setShowFacilityModal(false);
      setFacilityName('');
      setFacilityImageURL('');
      await loadData();
      showToast("¡Instalación registrada con éxito!", "success");
    } catch (error) {
      console.error("Error creating facility:", error);
      showToast("Error al crear la instalación.", "error");
    } finally {
      setFacilityLoading(false);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (isStaff) return; // Protección adicional
    if (!window.confirm("¿Seguro que quieres eliminar esta instalación? Se borrarán sus datos.")) return;
    try {
      await deleteFacility(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting facility:", error);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    if (isStaff) return; // Protección adicional
    const nextStatus = currentStatus === 'Disponible' ? 'Mantenimiento' : 'Disponible';
    try {
      await updateFacility(id, { status: nextStatus as any });
      await loadData();
    } catch (error) {
      console.error("Error updating facility status:", error);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClubId) return;
    setBookingLoading(true);
    try {
      const datesToBook: string[] = [bookingDate];
      if (bookingRecurrence !== 'none') {
        const incrementDays = bookingRecurrence === 'weekly' ? 7 : 14;
        const baseDate = new Date(bookingDate + 'T00:00:00');
        for (let i = 1; i < bookingRecurrenceWeeks; i++) {
          const nextDate = new Date(baseDate);
          nextDate.setDate(baseDate.getDate() + (i * incrementDays));
          datesToBook.push(nextDate.toISOString().split('T')[0]);
        }
      }

      for (const d of datesToBook) {
        await createBooking({
          clubId: targetClubId,
          facilityId: selectedFacilityId,
          title: bookingTitle,
          date: d,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          createdBy: profile?.uid || undefined
        });
      }

      setShowBookingModal(false);
      setBookingTitle(''); setBookingDate(''); setBookingStartTime(''); setBookingEndTime('');
      setBookingRecurrence('none'); setBookingRecurrenceWeeks(8);
      await loadData();
      showToast("¡Reserva realizada con éxito!", "success");
    } catch (error) {
      console.error("Error creating booking:", error);
      showToast("Error al reservar la pista.", "error");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleDeleteBooking = async (booking: FacilityBooking) => {
    if (!canDeleteBooking(booking)) {
      showToast("No tienes permisos para cancelar esta reserva. Solo el creador o el administrador del club pueden hacerlo.", "warning");
      return;
    }
    if (!window.confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    try {
      await deleteBooking(booking.id!);
      await loadData();
      showToast("Reserva cancelada.", "info");
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-600 rounded-xl">
              <CalendarDays className="w-7 h-7" />
            </div>
            Gestión de Instalaciones
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            {isStaff
              ? 'Consulta las instalaciones del club y gestiona tus reservas de entrenamiento.'
              : 'Control de campos, pistas y reservas de entrenamiento.'}
          </p>
        </div>
        <div className="flex gap-2">
          {canManageFacilities && (
            <button onClick={() => setShowFacilityModal(true)} className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              <Plus className="w-5 h-5" /> Añadir Instalación
            </button>
          )}
          <button onClick={() => {
            if (facilities.length === 0) {
              showToast("Debes crear al menos una instalación antes de reservar.", "warning");
              return;
            }
            setSelectedFacilityId(facilities[0].id!);
            setShowBookingModal(true);
          }} className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/30">
            <Plus className="w-5 h-5" /> Reservar Pista
          </button>
        </div>
      </div>

      {/* Staff info banner */}
      {isStaff && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium">
            Como miembro del cuerpo técnico, puedes reservar pistas pero no modificar las instalaciones del club. Solo puedes cancelar las reservas que tú hayas creado.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Facilities List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" /> Instalaciones
            </h2>
            {facilities.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <p className="text-slate-500">No hay instalaciones registradas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  return facilities.map(facility => (
                    <div key={facility.id} onClick={() => setSelectedFacilityDetail(facility)} className="bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer">
                      {/* Visual Pitch/Field Model */}
                      <div className="relative overflow-hidden">
                        {facility.imageURL ? (
                          <div className="h-32 w-full relative overflow-hidden">
                            <img
                              src={facility.imageURL}
                              alt={facility.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                          </div>
                        ) : (
                          <FacilityVisual type={facility.type} />
                        )}
                        <span className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                          facility.status === 'Disponible'
                            ? 'text-emerald-700 bg-emerald-100/90 border-emerald-200'
                            : 'text-amber-700 bg-amber-100/90 border-amber-200'
                        }`}>
                          {facility.status}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-brand-600 transition-colors">{facility.name}</h3>
                            {canManageFacilities && (
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteFacility(facility.id!); }} className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-slate-50 shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider inline-block">
                            {facility.type}
                          </span>
                        </div>
                        {canManageFacilities && (
                          <div className="border-t border-slate-100 pt-3 mt-3 flex justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(facility.id!, facility.status); }}
                              className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-wider transition-all ${
                                facility.status === 'Disponible'
                                  ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                  : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {facility.status === 'Disponible' ? 'Mantenimiento' : 'Habilitar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Bookings / Calendar */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" /> Horarios y Reservas
            </h2>
            {bookings.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
                <CalendarDays className="w-12 h-12 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Sin reservas activas</p>
                <p className="text-sm">Reserva una instalación para ver los horarios aquí.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="space-y-4">
                  {bookings.map(booking => {
                    const facility = facilities.find(f => f.id === booking.facilityId);
                    const canDelete = canDeleteBooking(booking);
                    return (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-brand-100 text-brand-600 rounded-xl mt-1 sm:mt-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{booking.title}</p>
                            <p className="text-xs text-slate-500 font-semibold">{facility?.name || 'Instalación desconocida'} • {booking.date}</p>
                            {isStaff && booking.createdBy === profile?.uid && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                                Tu reserva
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                          <span className="text-sm font-bold text-slate-700">{booking.startTime} - {booking.endTime}</span>
                          {canDelete && (
                            <button onClick={() => handleDeleteBooking(booking)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {showFacilityModal && canManageFacilities && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Añadir Instalación</h3>
              <button onClick={() => setShowFacilityModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFacility} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre (ej. Pista Central)</label>
                <input type="text" required value={facilityName} onChange={(e) => setFacilityName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Pista</label>
                <select value={facilityType} onChange={(e) => setFacilityType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-semibold text-slate-700">
                  <option value="Campo de Fútbol">Campo de Fútbol</option>
                  <option value="Pista de Baloncesto">Pista de Baloncesto</option>
                  <option value="Pista de Pádel">Pista de Pádel</option>
                  <option value="Gimnasio">Gimnasio</option>
                  <option value="Piscina">Piscina</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">URL de Imagen (Opcional)</label>
                <input type="url" value={facilityImageURL} onChange={(e) => setFacilityImageURL(e.target.value)} placeholder="https://ejemplo.com/pista.jpg" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={facilityLoading} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-500/30">
                  {facilityLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar Instalación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Reservar Instalación</h3>
              <button onClick={() => setShowBookingModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Instalación</label>
                <select value={selectedFacilityId} onChange={(e) => setSelectedFacilityId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-semibold text-slate-700">
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Actividad (ej. Entrenamiento Alevín)</label>
                <input type="text" required value={bookingTitle} onChange={(e) => setBookingTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
                <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Repetición</label>
                  <select value={bookingRecurrence} onChange={(e) => setBookingRecurrence(e.target.value as any)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-semibold text-slate-700">
                    <option value="none">Una vez</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="biweekly">Cada 2 semanas</option>
                  </select>
                </div>
                {bookingRecurrence !== 'none' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duración</label>
                    <select value={bookingRecurrenceWeeks} onChange={(e) => setBookingRecurrenceWeeks(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-semibold text-slate-700">
                      <option value={4}>4 semanas</option>
                      <option value={8}>8 semanas</option>
                      <option value={12}>12 semanas</option>
                      <option value={24}>24 semanas (Temporada)</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hora Inicio</label>
                  <input type="time" required value={bookingStartTime} onChange={(e) => setBookingStartTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hora Fin</label>
                  <input type="time" required value={bookingEndTime} onChange={(e) => setBookingEndTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={bookingLoading} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-500/30">
                  {bookingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Facility Detail Modal */}
      {selectedFacilityDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedFacilityDetail.name}</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedFacilityDetail.type}</p>
              </div>
              <button onClick={() => setSelectedFacilityDetail(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Large Visual Model */}
              <div className="relative">
                {selectedFacilityDetail.imageURL ? (
                  <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden relative shadow-md">
                    <img src={selectedFacilityDetail.imageURL} alt={selectedFacilityDetail.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                  </div>
                ) : (
                  <FacilityVisual type={selectedFacilityDetail.type} size="large" />
                )}
                
                <span className={`absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                  selectedFacilityDetail.status === 'Disponible'
                    ? 'text-emerald-700 bg-emerald-100/90 border-emerald-200'
                    : 'text-amber-700 bg-amber-100/90 border-amber-200'
                }`}>
                  {selectedFacilityDetail.status}
                </span>
              </div>

              {/* Today's Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  Estado de Ocupación para Hoy ({new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                </h4>
                
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const todayBookings = bookings.filter(
                    b => b.facilityId === selectedFacilityDetail.id && b.date === todayStr
                  );
                  
                  // Hours from 8:00 to 22:00
                  const timelineHours = Array.from({ length: 14 }, (_, i) => i + 8);
                  
                  return (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                      {timelineHours.map(hour => {
                        const booking = todayBookings.find(b => {
                          const startHour = parseInt(b.startTime.split(':')[0], 10);
                          const endHour = parseInt(b.endTime.split(':')[0], 10);
                          return hour >= startHour && hour < endHour;
                        });
                        
                        return (
                          <div
                            key={hour}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              booking
                                ? 'bg-red-50/50 border-red-100 text-red-900'
                                : 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-500 w-10">{hour.toString().padStart(2, '0')}:00</span>
                              <span className={`w-2.5 h-2.5 rounded-full ${booking ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                              <span>{booking ? booking.title : 'Disponible'}</span>
                            </div>
                            {booking && (
                              <span className="text-[10px] text-red-600 uppercase tracking-wider font-extrabold bg-red-100/50 px-2 py-0.5 rounded">
                                Reservado
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setSelectedFacilityDetail(null)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Cerrar
                </button>
                {selectedFacilityDetail.status === 'Disponible' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFacilityId(selectedFacilityDetail.id!);
                      setShowBookingModal(true);
                      setSelectedFacilityDetail(null);
                    }}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-500/30"
                  >
                    Reservar Pista
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FacilityVisual({ type, size = 'small' }: { type: string; size?: 'small' | 'large' }) {
  const isLarge = size === 'large';
  const containerClasses = isLarge 
    ? "w-full h-48 sm:h-64 rounded-2xl relative overflow-hidden shadow-inner border border-white/10"
    : "w-full h-32 rounded-t-2xl relative overflow-hidden shadow-inner border border-white/5";

  if (type === 'Campo de Fútbol') {
    return (
      <div className={`${containerClasses} bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-600 flex items-center justify-center p-3 select-none`}>
        {/* Field grass stripes */}
        <div className="absolute inset-0 flex">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-black/5' : 'bg-transparent'}`} />
          ))}
        </div>
        {/* Outer border line */}
        <div className="absolute inset-2 sm:inset-3 border border-white/30 rounded-sm">
          {/* Halfway line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/30 -translate-x-1/2" />
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-[20%] aspect-square border border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
          {/* Center spot */}
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
          {/* Penalty boxes */}
          <div className="absolute top-[20%] bottom-[20%] left-0 w-[15%] border-y border-r border-white/30" />
          <div className="absolute top-[20%] bottom-[20%] right-0 w-[15%] border-y border-l border-white/30" />
          {/* Goal areas */}
          <div className="absolute top-[35%] bottom-[35%] left-0 w-[5%] border-y border-r border-white/30" />
          <div className="absolute top-[35%] bottom-[35%] right-0 w-[5%] border-y border-l border-white/30" />
        </div>
      </div>
    );
  }

  if (type === 'Pista de Baloncesto') {
    return (
      <div className={`${containerClasses} bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 flex items-center justify-center p-3 select-none`}>
        {/* Wood grain texturing */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-black/30 to-black/60" />
        <div className="absolute inset-0 flex flex-col gap-[3px] opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-full h-[1px] bg-white" />
          ))}
        </div>
        
        {/* Boundary lines */}
        <div className="absolute inset-2 sm:inset-3 border border-white/40 rounded-sm">
          {/* Midcourt line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/40 -translate-x-1/2" />
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-[22%] aspect-square border border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
          
          {/* Free throw keys */}
          <div className="absolute top-[30%] bottom-[30%] left-0 w-[18%] border-y border-r border-white/40 bg-white/5" />
          <div className="absolute top-[30%] bottom-[30%] right-0 w-[18%] border-y border-l border-white/40 bg-white/5" />
          
          {/* Three point lines */}
          <div className="absolute top-[10%] bottom-[10%] -left-[10%] w-[32%] border-y border-r border-white/40 rounded-r-full" />
          <div className="absolute top-[10%] bottom-[10%] -right-[10%] w-[32%] border-y border-l border-white/40 rounded-l-full" />
          
          {/* Backboards & Hoops */}
          <div className="absolute top-1/2 left-[4%] w-[1px] h-[20%] bg-white/80 -translate-y-1/2" />
          <div className="absolute top-1/2 left-[4%] w-2 h-2 border border-orange-500 rounded-full -translate-y-1/2" />
          
          <div className="absolute top-1/2 right-[4%] w-[1px] h-[20%] bg-white/80 -translate-y-1/2" />
          <div className="absolute top-1/2 right-[4%] w-2 h-2 border border-orange-500 rounded-full -translate-y-1/2" />
        </div>
      </div>
    );
  }

  if (type === 'Pista de Pádel') {
    return (
      <div className={`${containerClasses} bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center p-3 select-none`}>
        {/* Court surface lines */}
        <div className="absolute inset-2 sm:inset-3 border border-white/40 rounded-sm">
          {/* Boundary inner frame */}
          <div className="absolute inset-1 border border-white/20">
            {/* Center net (dashed line) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-slate-300/60 border-l border-dashed border-white -translate-x-1/2" />
            
            {/* Service lines */}
            <div className="absolute top-0 bottom-0 left-[22%] w-[1px] bg-white/40" />
            <div className="absolute top-0 bottom-0 right-[22%] w-[1px] bg-white/40" />
            
            {/* Center service line */}
            <div className="absolute left-[22%] right-[22%] top-1/2 h-[1px] bg-white/40 -translate-y-1/2" />
          </div>
          {/* Padel Glass walls simulation */}
          <div className="absolute inset-0 border-x-2 border-slate-200/30" />
        </div>
      </div>
    );
  }

  if (type === 'Gimnasio') {
    return (
      <div className={`${containerClasses} bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 flex items-center justify-center p-4 select-none`}>
        {/* Gym rubber mat lines */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_1px_1px,_slate-300_1px,_transparent_0)] bg-[size:16px_16px]" />
        <div className="relative z-10 flex flex-col items-center gap-1.5 text-center text-slate-400">
          <div className="flex gap-2">
            <span className="w-8 h-2 bg-slate-600 rounded-full border border-slate-500" />
            <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-400" />
            <span className="w-8 h-2 bg-slate-600 rounded-full border border-slate-500" />
          </div>
          <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Zona de Fuerza</span>
        </div>
      </div>
    );
  }

  // default: Piscina
  return (
    <div className={`${containerClasses} bg-gradient-to-br from-cyan-500 via-sky-400 to-blue-500 flex flex-col justify-between p-2 sm:p-3 select-none`}>
      {/* Pool water pattern */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,_rgba(255,255,255,0.15)_25%,_transparent_25%,_transparent_50%,_rgba(255,255,255,0.15)_50%,_rgba(255,255,255,0.15)_75%,_transparent_75%,_transparent)] bg-[size:24px_24px]" />
      
      {/* Lanes */}
      <div className="relative w-full h-full border border-white/30 rounded-sm flex flex-col justify-between py-1 bg-blue-900/10">
        {[...Array(isLarge ? 6 : 4)].map((_, i) => (
          <div key={i} className="w-full flex items-center relative h-[2px]">
            {/* Lane floats */}
            <div className="absolute inset-x-0 h-[1px] bg-white/40 border-b border-dashed border-red-400/80" />
            <span className="absolute left-[20%] w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="absolute left-[40%] w-1.5 h-1.5 rounded-full bg-white" />
            <span className="absolute left-[60%] w-1.5 h-1.5 rounded-full bg-white" />
            <span className="absolute left-[80%] w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

