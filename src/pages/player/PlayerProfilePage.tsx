import { useState, useEffect } from 'react';
import { User as UserIcon, Shield } from 'lucide-react';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function PlayerProfilePage() {
  const profile = useAuthStore((state) => state.profile);
  const [childProfile, setChildProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadChild = async () => {
      if (profile?.accountType === 'tutor' && profile.fichaId) {
        try {
          const childDoc = await getDoc(doc(db, 'users', profile.fichaId));
          if (childDoc.exists()) {
            setChildProfile(childDoc.data() as UserProfile);
          }
        } catch (e) {
          console.error("Error loading child profile:", e);
        }
      }
    };
    loadChild();
  }, [profile?.fichaId, profile?.accountType]);

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <UserIcon className="w-7 h-7" />
          </div>
          Mis Datos Personales
        </h1>
        <p className="text-slate-500 mt-2 text-base">Consulta la información asociada a tu perfil de acceso y ficha federativa.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-slate-500" />
          Datos del Usuario
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">{profile.name}</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">{profile.email}</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de Usuario (@)</label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">@{profile.username}</div>
            <p className="text-[11px] text-slate-500 mt-2">Para modificar tu nombre de usuario, dirígete a la sección Ajustes.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Cuenta</label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium capitalize">{profile.accountType || 'Jugador'}</div>
          </div>
        </div>
      </div>

      {/* Child Profile Card for Tutors */}
      {profile.accountType === 'tutor' && childProfile && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Ficha del Jugador Tutelado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo del Menor</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">{childProfile.name}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoría Asignada</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">{childProfile.category || 'Sin asignar'}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Ficha</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">{childProfile.isAdult ? 'Mayor de edad' : 'Menor de edad'}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado de la Ficha</label>
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                  childProfile.status === 'Aprobada' || childProfile.status === 'Activo' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' :
                  childProfile.status === 'Pendiente' ? 'text-amber-700 bg-amber-100 border border-amber-200' :
                  'text-brand-700 bg-brand-100 border border-brand-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    childProfile.status === 'Aprobada' || childProfile.status === 'Activo' ? 'bg-emerald-500' :
                    childProfile.status === 'Pendiente' ? 'bg-amber-500' : 'bg-brand-500'
                  }`}></span>
                  {childProfile.status || 'Pendiente'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
