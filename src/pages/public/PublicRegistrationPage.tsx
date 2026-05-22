import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, CheckCircle, Loader2, Calendar, User, Phone, Mail, Award, ArrowRight, ArrowLeft } from 'lucide-react';
import { normalizeSport } from '../../lib/sportUtils';

export function PublicRegistrationPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [clubName, setClubName] = useState('');
  const [clubSports, setClubSports] = useState<string[]>([]);
  const [loadingClub, setLoadingClub] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [realClubId, setRealClubId] = useState(''); // Stores the actual long Firebase UID

  // Step state
  const [step, setStep] = useState(1); // 1: Player info, 2: Tutor (if minor), 3: Experience & Submit
  const [submitted, setSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [isAdult, setIsAdult] = useState(true);
  const [dni, setDni] = useState('');

  // Tutor Fields
  const [tutorName, setTutorName] = useState('');
  const [tutorPhone, setTutorPhone] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');

  // Experience / Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchClub = async () => {
      if (!clubId) {
        setErrorMsg('Identificador de Club no provisto.');
        setLoadingClub(false);
        return;
      }
      try {
        // 1. Try to fetch directly by UID
        let clubDoc = await getDoc(doc(db, 'users', clubId));
        let data = clubDoc.exists() ? clubDoc.data() : null;
        let actualId = clubId;

        // 2. If it does not exist or isn't a club, query by username (slug)
        if (!data || data.role !== 'club') {
          const q = query(
            collection(db, 'users'), 
            where('role', '==', 'club'), 
            where('username', '==', clubId.toLowerCase().trim())
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            clubDoc = snapshot.docs[0];
            data = clubDoc.data() || null;
            actualId = clubDoc.id;
          }
        }

        if (!data || data.role !== 'club') {
          setErrorMsg('El club especificado no existe o no es válido.');
        } else {
          setRealClubId(actualId);
          setClubName(data.name || 'Club Deportivo');
          const sports = Array.from(new Set(
            (data.activeSports && data.activeSports.length > 0
              ? data.activeSports
              : (data.sportType ? [data.sportType] : ['Fútbol'])
            ).map(normalizeSport)
          )) as string[];
          setClubSports(sports);
          if (sports.length > 0) {
            setSelectedSport(sports[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching club:', err);
        setErrorMsg('Error al conectar con el servidor.');
      } finally {
        setLoadingClub(false);
      }
    };
    fetchClub();
  }, [clubId]);

  // Handle BirthDate changes to dynamically toggle Tutor step
  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    if (!val) return;
    const birth = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    setIsAdult(age >= 18);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name || !email || !birthDate || !selectedSport) {
        alert('Por favor, completa los campos requeridos del jugador.');
        return;
      }
      if (!isAdult) {
        setStep(2);
      } else {
        setStep(3);
      }
    } else if (step === 2) {
      if (!tutorName || !tutorPhone || !tutorEmail) {
        alert('Por favor, completa los campos obligatorios del tutor/padre de familia.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realClubId) return;
    setFormLoading(true);

    try {
      // Create a pending player profile in the users collection without authentication credentials
      const tempDocRef = doc(collection(db, 'users'));
      const pendingProfile = {
        uid: tempDocRef.id,
        name,
        email,
        birthDate,
        dni: dni || '',
        phone: phone || '',
        sportType: selectedSport,
        isAdult,
        tutorName: isAdult ? '' : tutorName,
        tutorPhone: isAdult ? '' : tutorPhone,
        tutorEmail: isAdult ? '' : tutorEmail,
        notes: notes || '',
        role: 'player',
        accountType: 'jugador',
        status: 'Pendiente',
        createdAt: new Date().toISOString(),
        clubId: realClubId,
        isPreRegistration: true // flag to distinguish from manually added ones
      };

      await setDoc(tempDocRef, pendingProfile);
      setSubmitted(true);
    } catch (err) {
      console.error('Error in public registration:', err);
      alert('Hubo un problema al enviar tu solicitud de inscripción.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loadingClub) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-semibold">Cargando formulario de inscripción...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 max-w-md w-full text-center shadow-md">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Formulario no disponible</h2>
          <p className="text-slate-500 leading-relaxed mb-6">{errorMsg}</p>
          <Link to="/" className="inline-flex justify-center items-center px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-md">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-brand-950 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col my-8">
        
        {/* Banner */}
        <div className="p-8 bg-slate-900 text-white relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Banner" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 border border-brand-500 flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-500/30">
              S
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight leading-none block">Inscripción Oficial</span>
              <span className="text-brand-400 font-bold uppercase text-[10px] tracking-widest mt-1 block">{clubName}</span>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-md animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">¡Solicitud Enviada con Éxito!</h3>
              <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                Tus datos de pre-inscripción han sido registrados en la base de datos oficial de <strong>{clubName}</strong>. 
              </p>
              <p className="text-slate-400 text-xs mt-3">
                El club revisará tu ficha y se pondrá en contacto contigo para proporcionarte tus claves de acceso una vez aprobada.
              </p>
            </div>
            <div className="pt-6">
              <button onClick={() => window.location.reload()} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all text-sm shadow-md">
                Enviar Otra Inscripción
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 flex-1 flex flex-col justify-between space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center gap-2 justify-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>1</span>
              <span className="w-8 h-0.5 bg-slate-200"></span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2 ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>2</span>
              <span className="w-8 h-0.5 bg-slate-200"></span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 3 ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>3</span>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4 flex-1">
                <div className="border-b pb-2 mb-4 border-slate-100">
                  <h4 className="font-bold text-slate-900 text-lg">Datos del Jugador</h4>
                  <p className="text-xs text-slate-500">Ingresa la información personal del deportista.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Completo *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. Carlos Martínez" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">DNI / NIE / Pasaporte (Opcional)</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={dni} onChange={e => setDni(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. 12345678Z" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. carlos@correo.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Nacimiento *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" required value={birthDate} onChange={e => handleBirthDateChange(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono (Opcional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. 654 321 098" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Deporte de Interés *</label>
                  <div className="relative">
                    <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={selectedSport} onChange={e => setSelectedSport(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-brand-500">
                      {clubSports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4 flex-1">
                <div className="border-b pb-2 mb-4 border-slate-100">
                  <h4 className="font-bold text-slate-900 text-lg">Datos del Tutor / Tutor legal</h4>
                  <p className="text-xs text-slate-500">Requerido porque el jugador es menor de edad.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Completo del Padre/Tutor *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required={!isAdult} value={tutorName} onChange={e => setTutorName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. Padre/Madre de familia" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono del Tutor *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" required={!isAdult} value={tutorPhone} onChange={e => setTutorPhone(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. 654987321" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email del Tutor *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" required={!isAdult} value={tutorEmail} onChange={e => setTutorEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800" placeholder="Ej. tutor@correo.com" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4 flex-1">
                <div className="border-b pb-2 mb-4 border-slate-100">
                  <h4 className="font-bold text-slate-900 text-lg">Información Adicional</h4>
                  <p className="text-xs text-slate-500">Cuéntanos sobre tu experiencia u observaciones médicas.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notas / Experiencia previa / Observaciones médicas</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-800 resize-none" placeholder="Ej. 2 años de experiencia en otro club, alergias, dolencias físicas..." />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-6 border-t border-slate-100 flex gap-3">
              {step > 1 && (
                <button type="button" onClick={() => setStep(prev => prev === 3 && !isAdult ? 2 : 1)} className="px-5 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={handleNextStep} className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={formLoading} className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Completar Registro'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
