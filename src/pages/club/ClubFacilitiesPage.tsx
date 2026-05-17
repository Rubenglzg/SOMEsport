import { useState, useEffect } from 'react';
import { CalendarDays, Plus, X, Loader2, Trash2, MapPin, CheckCircle, Clock } from 'lucide-react';
import { getFacilitiesByClub, createFacility, updateFacility, deleteFacility, getBookingsByClub, createBooking, deleteBooking, type Facility, type FacilityBooking } from '../../lib/facilitiesService';
import { useAuthStore } from '../../store/authStore';

export function ClubFacilitiesPage() {
  const profile = useAuthStore((state) => state.profile);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Facility Form State
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('Campo de Fútbol');
  const [facilityLoading, setFacilityLoading] = useState(false);

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

  const loadData = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const [facData, bookData] = await Promise.all([
        getFacilitiesByClub(profile.uid),
        getBookingsByClub(profile.uid)
      ]);
      setFacilities(facData);
      setBookings(bookData);
    } catch (error) {
      console.error("Error loading facilities data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [profile?.uid]);

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFacilityLoading(true);
    try {
      await createFacility(profile.uid, facilityName, facilityType);
      setShowFacilityModal(false);
      setFacilityName('');
      await loadData();
    } catch (error) {
      console.error("Error creating facility:", error);
      alert("Error al crear la instalación.");
    } finally {
      setFacilityLoading(false);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta instalación? Se borrarán sus datos.")) return;
    try {
      await deleteFacility(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting facility:", error);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
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
    if (!profile?.uid) return;
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
          clubId: profile.uid,
          facilityId: selectedFacilityId,
          title: bookingTitle,
          date: d,
          startTime: bookingStartTime,
          endTime: bookingEndTime
        });
      }

      setShowBookingModal(false);
      setBookingTitle(''); setBookingDate(''); setBookingStartTime(''); setBookingEndTime('');
      setBookingRecurrence('none'); setBookingRecurrenceWeeks(8);
      await loadData();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Error al reservar la pista.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    try {
      await deleteBooking(id);
      await loadData();
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
          <p className="text-slate-500 mt-2 text-base">Control de campos, pistas y reservas de entrenamiento.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFacilityModal(true)} className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
            <Plus className="w-5 h-5" /> Añadir Instalación
          </button>
          <button onClick={() => {
            if (facilities.length === 0) {
              alert("Debes crear al menos una instalación antes de reservar.");
              return;
            }
            setSelectedFacilityId(facilities[0].id!);
            setShowBookingModal(true);
          }} className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/30">
            <Plus className="w-5 h-5" /> Reservar Pista
          </button>
        </div>
      </div>

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
              facilities.map(facility => (
                <div key={facility.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{facility.name}</h3>
                      <span className="text-xs font-semibold text-slate-500">{facility.type}</span>
                    </div>
                    <button onClick={() => handleDeleteFacility(facility.id!)} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      facility.status === 'Disponible' ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'
                    }`}>
                      {facility.status}
                    </span>
                    <button onClick={() => handleUpdateStatus(facility.id!, facility.status)} className="text-xs font-bold text-brand-600 hover:underline">
                      {facility.status === 'Disponible' ? 'Poner en Mantenimiento' : 'Habilitar'}
                    </button>
                  </div>
                </div>
              ))
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
                    return (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-brand-100 text-brand-600 rounded-xl mt-1 sm:mt-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{booking.title}</p>
                            <p className="text-xs text-slate-500 font-semibold">{facility?.name || 'Instalación desconocida'} • {booking.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                          <span className="text-sm font-bold text-slate-700">{booking.startTime} - {booking.endTime}</span>
                          <button onClick={() => handleDeleteBooking(booking.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
      {showFacilityModal && (
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
    </div>
  );
}
