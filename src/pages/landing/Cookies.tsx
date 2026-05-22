import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Cookies = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-inter">
      <Helmet>
        <title>Política de Cookies | Sooner</title>
        <meta name="description" content="Política de cookies de la plataforma Sooner." />
      </Helmet>

      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors">Volver al inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 font-outfit">Sooner</span>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 font-outfit">Política de Cookies</h1>
          
          <div className="space-y-8 text-lg leading-relaxed bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">1. ¿Qué son las cookies?</h2>
              <p>
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo cuando los visitas. 
                Se utilizan ampliamente para hacer que los sitios web funcionen, o funcionen de manera más eficiente, 
                así como para proporcionar información a los propietarios del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">2. Cómo usamos las cookies</h2>
              <p>
                Utilizamos cookies de sesión para mantener tu sesión activa mientras navegas por Sooner, y cookies 
                persistentes para recordar tus preferencias de idioma y ajustes de visualización. 
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">3. Gestión de cookies</h2>
              <p>
                Puedes configurar tu navegador para rechazar todas o algunas de las cookies, o para que te avise 
                cuando los sitios web establezcan o accedan a cookies. Ten en cuenta que si desactivas o rechazas las 
                cookies, es posible que algunas partes de Sooner resulten inaccesibles o no funcionen correctamente.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cookies;
