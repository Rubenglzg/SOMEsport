import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-inter">
      <Helmet>
        <title>Términos de Servicio | Sooner</title>
        <meta name="description" content="Términos y condiciones de uso de la plataforma Sooner." />
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 font-outfit">Términos de Servicio</h1>
          
          <div className="space-y-8 text-lg leading-relaxed bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar la plataforma Sooner, aceptas estar sujeto a estos Términos de Servicio. 
                Si no estás de acuerdo con alguna parte de los términos, no podrás acceder a la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">2. Uso de la Plataforma</h2>
              <p>
                Te comprometes a utilizar Sooner únicamente para fines lícitos y de acuerdo con estos términos. 
                Eres responsable de mantener la confidencialidad de tu cuenta y contraseña.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-outfit">3. Propiedad Intelectual</h2>
              <p>
                Todo el contenido, características y funcionalidad de la plataforma Sooner son propiedad exclusiva 
                de SOM Esport y están protegidos por leyes de derechos de autor, marcas comerciales y otras leyes 
                de propiedad intelectual.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Terms;
