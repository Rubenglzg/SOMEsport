import { useState } from 'react';
import { Building2, Save, Loader2, Link2, Code2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { updateUserProfile, checkUsernameExists } from '../../lib/userService';

export function ClubSettingsPage() {
  const profile = useAuthStore((state) => state.profile);
  const [clubName, setClubName] = useState(profile?.name || '');
  const [clubUsername, setClubUsername] = useState(profile?.username || '');
  const [activeSports, setActiveSports] = useState<string[]>(profile?.activeSports || (profile?.sportType ? [profile.sportType] : ['Fútbol']));
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const cleanUsername = clubUsername.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      
      // Si el nombre de usuario cambió, comprobar si ya está en uso por otro usuario
      if (cleanUsername && cleanUsername !== profile.username) {
        const isTaken = await checkUsernameExists(cleanUsername);
        if (isTaken) {
          alert('El nombre de enlace o usuario ya está siendo utilizado por otro club o cuenta.');
          setLoading(false);
          return;
        }
      }

      await updateUserProfile(profile.uid, { 
        name: clubName, 
        activeSports,
        username: cleanUsername || undefined
      });
      
      useAuthStore.getState().setProfile({ 
        ...profile, 
        name: clubName, 
        activeSports,
        username: cleanUsername || undefined
      });
      
      alert('Información del club actualizada correctamente.');
    } catch (error) {
      console.error("Error al guardar info del club:", error);
      alert('Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-brand-100 text-brand-600 rounded-xl">
            <Building2 className="w-7 h-7" />
          </div>
          Configuración del Club
        </h1>
        <p className="text-slate-500 mt-2 text-base">Personaliza los datos de tu club y el tipo de deporte.</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Oficial del Club</label>
            <input
              type="text"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Identificador del Club (Enlace Personalizado)</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 font-semibold text-sm">/inscribirse/</span>
              <input
                type="text"
                required
                value={clubUsername}
                onChange={(e) => setClubUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full pl-28 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all font-semibold text-slate-700"
                placeholder="ej-nombre-club"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Este identificador único definirá tu URL pública de inscripciones. Úsalo sin espacios ni caracteres especiales.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deportes Habilitados</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'Fútbol', label: 'Fútbol' },
                { value: 'Baloncesto', label: 'Baloncesto' },
                { value: 'Fútbol Sala', label: 'Fútbol Sala' },
                { value: 'eSports', label: 'eSports' },
                { value: 'Voleibol', label: 'Voleibol' },
                { value: 'Pádel', label: 'Pádel' },
                { value: 'Tenis', label: 'Tenis' },
                { value: 'Natación', label: 'Natación' }
              ].map(sport => {
                const isActive = activeSports.includes(sport.value);
                return (
                  <label key={sport.value} className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all text-center ${isActive ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={isActive} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveSports([...activeSports, sport.value]);
                        } else {
                          setActiveSports(activeSports.filter(s => s !== sport.value));
                        }
                      }} 
                    />
                    <span className="font-bold text-sm">{sport.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">Selecciona los deportes que ofrece tu club. Podrás filtrar tus equipos por estos deportes.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      {/* Public Registration Link Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-600" /> Página Pública de Inscripciones
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
            Comparte este enlace en la página web oficial de tu club, tus redes sociales o por grupos de WhatsApp. Los nuevos jugadores o sus tutores podrán rellenar el formulario de pre-inscripción online en un flujo interactivo paso a paso.
          </p>
        </div>

        {(() => {
          const clubSlug = profile?.username || profile?.uid;
          const publicUrl = `${window.location.origin}/inscribirse/${clubSlug}`;
          const iframeCode = `<!-- Formulario de Inscripción Oficial de ${profile?.name || 'Nuestro Club'} en AvantiaEsport -->
<div style="width: 100%; max-width: 650px; margin: 0 auto; overflow: hidden; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; background: #ffffff;">
  <iframe 
    src="${publicUrl}" 
    style="width: 100%; height: 850px; border: none; display: block;"
    title="Inscripción Online - ${profile?.name || 'Club'}"
  ></iframe>
</div>`;

          return (
            <div className="space-y-6">
              {/* Link block */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Enlace de Inscripción Oficial</label>
                <div className="flex flex-col sm:flex-row gap-3 max-w-3xl">
                  <input 
                    type="text" 
                    readOnly 
                    value={publicUrl} 
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-600 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      alert("¡Enlace copiado al portapapeles con éxito!");
                    }}
                    className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 text-sm flex items-center justify-center gap-2 shrink-0"
                  >
                    Copiar Enlace
                  </button>
                </div>
              </div>

              {/* Embed Code block */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-brand-600" /> Código HTML para tu Desarrollador Web
                </label>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Si prefieres que los usuarios se registren directamente desde tu sitio web actual sin salir de él, copia este código HTML y pégalo en la sección HTML de tu WordPress, Wix, Squarespace o web a medida.
                </p>
                <div className="bg-slate-900 rounded-2xl p-4 relative font-mono text-xs text-slate-300 max-w-3xl border border-slate-800 shadow-inner overflow-x-auto max-h-[160px]">
                  <pre className="pr-12 select-all whitespace-pre-wrap">{iframeCode}</pre>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(iframeCode);
                      alert("¡Código de integración copiado al portapapeles!");
                    }}
                    className="absolute right-3 top-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition-colors border border-slate-700 shadow-sm"
                  >
                    Copiar Código
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <p className="text-xs text-slate-400 mt-3 pt-2">
          Cualquier registro completado aparecerá automáticamente en tu **Directorio** con el estado de **"Pendiente"** para que lo apruebes con un solo clic.
        </p>
      </div>
    </div>
  );
}
