import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-inter">
      <Helmet>
        <title>Política de Privacidad | Sooner</title>
        <meta name="description" content="Política de privacidad y protección de datos de Sooner (SOM Esport)." />
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 font-outfit">Política de Privacidad</h1>
          
          <div className="space-y-8 text-lg leading-relaxed bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">1. Introducción</h2>
              <p>
                En SOM Esport (en adelante, "la Empresa"), valoramos enormemente la privacidad de nuestros usuarios. 
                Esta Política de Privacidad describe cómo recopilamos, usamos, compartimos y protegemos la información 
                personal cuando utilizas la plataforma Sooner.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">2. Información que Recopilamos</h2>
              <p>
                Recopilamos información que nos proporcionas directamente al crear una cuenta, como tu nombre, 
                dirección de correo electrónico, nombre del club y rol dentro de la organización. También podemos 
                recopilar datos de uso y analíticas para mejorar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">3. Uso de la Información</h2>
              <p>
                Utilizamos tu información para proporcionar, mantener y mejorar la plataforma Sooner, así como para 
                comunicarnos contigo acerca de actualizaciones, ofertas y soporte técnico.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">4. Seguridad</h2>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos personales 
                contra acceso no autorizado, alteración, divulgación o destrucción.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
