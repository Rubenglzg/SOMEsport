import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  FileText,
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Activity,
  Globe,
  Play,
  Lock,
  Server,
  ShieldCheck,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { submitContactForm } from '../../lib/landingService';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [formData, setFormData] = React.useState({
    clubName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitContactForm(formData);
      setSubmitted(true);
      setFormData({ clubName: '', email: '', phone: '', message: '' });
    } catch (error) {
      alert('Error al enviar el formulario. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Sooner",
    "operatingSystem": "Web, iOS, Android, Windows, Mac",
    "applicationCategory": "SportsManagementApplication",
    "publisher": {
      "@type": "Organization",
      "name": "SOM Esport"
    },
    "description": "Plataforma profesional para la gestión integral de clubes deportivos, jugadores, competiciones y tesorería."
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-inter selection:bg-emerald-500/20 overflow-x-hidden flex flex-col items-center">
      <Helmet>
        <html lang="es" />
        <title>Sooner | Gestión Profesional para Clubes Deportivos | SOM Esport</title>
        <meta name="description" content="La plataforma premium e intuitiva para la gestión de clubes deportivos, plantillas y calendarios. SOM Esport presenta Sooner." />
        <meta name="keywords" content="gestión deportiva, software clubes, esports, fútbol, baloncesto, balonmano, plataforma deportiva, sooner, som esport" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sooner.som-esport.com/" />
        <meta property="og:title" content="Sooner - El futuro de la gestión deportiva" />
        <meta property="og:description" content="Gestiona tu club de forma intuitiva y profesional con Sooner de SOM Esport." />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://sooner.som-esport.com/" />
        <meta property="twitter:title" content="Sooner - Gestión Deportiva" />
        <meta property="twitter:description" content="La plataforma más elegante e intuitiva para clubes deportivos. Únete a Sooner." />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3 group cursor-pointer">
            <img src="/logoSOMEsport.png" alt="SOM Esport Logo" className="h-12 group-hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
          </div>

          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-600 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Características</a>
            <a href="#security" className="hover:text-emerald-600 transition-colors">Seguridad</a>
            <a href="#downloads" className="hover:text-emerald-600 transition-colors">Plataformas</a>
            <a href="#merch" className="hover:text-emerald-600 transition-colors">Merchandising</a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">Contacto</a>
          </nav>

          <Link
            to="/login"
            className="px-6 py-2.5 bg-slate-900 text-white border border-transparent rounded-full hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-300 font-semibold"
          >
            Acceder
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="w-full max-w-7xl px-4 sm:px-6 flex flex-col gap-24 sm:gap-32 pb-32 pt-32 relative">

        {/* Global ambient background */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-emerald-200/20 blur-[150px] rounded-full mix-blend-multiply" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-100/30 blur-[150px] rounded-full mix-blend-multiply" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Hero Section */}
        <section className="relative text-center w-full" aria-label="Introducción">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 pt-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-xs font-bold uppercase tracking-widest mb-8">
              <Globe className="w-4 h-4 text-emerald-500" /> Software de organización multideportiva
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-[1.1] text-slate-900 font-outfit">
              El ecosistema digital <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
                para tu club deportivo
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Todo lo que necesitas para gestionar plantillas, calendarios y tesorería en una única plataforma diseñada para la máxima facilidad de uso.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#contact" className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5">
                Solicitar Acceso <ArrowRight className="w-5 h-5" />
              </a>
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                <Play className="w-5 h-5 text-slate-400" /> Ver Video Demo
              </Link>
            </div>
          </motion.div>

          {/* Unified Hero Mockup */}
          <motion.div
            className="mt-20 relative perspective-[2000px] w-full"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.4 }}
          >
            <div className="relative mx-auto max-w-5xl rounded-[2rem] bg-white border border-slate-200/80 p-2 shadow-2xl ring-1 ring-slate-900/5 overflow-hidden">
              <div className="bg-slate-50 rounded-[1.5rem] overflow-hidden border border-slate-100 flex flex-col relative">

                {/* Header */}
                <div className="h-14 border-b border-slate-200 bg-white flex items-center px-6 gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="mx-auto w-64 h-7 bg-slate-50 border border-slate-100 rounded flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <div className="w-20 h-1.5 bg-slate-200 rounded-full"></div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="h-[450px] flex relative bg-white">
                  {/* Subtle basketball court / football field watermark texture in background */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[url('https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-luminosity"></div>

                  {/* Sidebar */}
                  <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-6 flex flex-col gap-3 relative z-10">
                    <div className="h-10 w-full bg-white border border-emerald-100 shadow-sm rounded-xl mb-4 flex items-center px-3 gap-3">
                      <div className="w-5 h-5 rounded bg-emerald-500"></div>
                      <div className="h-2 w-20 bg-emerald-100 rounded"></div>
                    </div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-10 w-full bg-transparent hover:bg-white rounded-xl flex items-center px-3 transition-colors cursor-pointer">
                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>

                  {/* Main Grid */}
                  <div className="flex-1 p-6 grid grid-cols-3 gap-4 relative z-10">
                    <div className="col-span-3 mb-2 flex justify-between items-center">
                      <div className="text-xl font-bold text-slate-800 font-outfit">Visión General de Club</div>
                      <div className="h-8 w-24 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-lg flex items-center justify-center">Sincronizado</div>
                    </div>

                    {/* Sport Image Cards */}
                    <div className="col-span-1 rounded-2xl overflow-hidden relative border border-slate-100 shadow-sm group">
                      <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80" alt="Fútbol" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <div className="text-xs font-medium text-emerald-400 mb-1">Fútbol 11</div>
                        <div className="font-bold">Alevín A</div>
                      </div>
                    </div>

                    <div className="col-span-1 rounded-2xl overflow-hidden relative border border-slate-100 shadow-sm group">
                      <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80" alt="Baloncesto" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <div className="text-xs font-medium text-blue-400 mb-1">Baloncesto</div>
                        <div className="font-bold">Cadete B</div>
                      </div>
                    </div>

                    <div className="col-span-1 rounded-2xl bg-white border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <Users className="w-6 h-6 text-slate-400 mb-2" />
                        <div className="text-xs text-slate-500 font-medium">Total Jugadores</div>
                      </div>
                      <div className="text-3xl font-black text-slate-900">450<span className="text-emerald-500 text-sm ml-2">↑ 12%</span></div>
                    </div>

                    {/* UI Data Chart */}
                    <div className="col-span-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2 shadow-inner flex items-end h-32 gap-2">
                      {[40, 70, 45, 90, 65, 85, 100, 75].map((h, i) => (
                        <div key={i} className="flex-1 bg-emerald-200/50 rounded-t-sm hover:bg-emerald-400 transition-colors" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* OVERLAY for blur / pixelated effect with CTA */}
                <div className="absolute inset-0 bg-white/20 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                  <Lock className="w-16 h-16 text-emerald-600 mb-6 drop-shadow-lg" />
                  <h3 className="text-3xl font-black text-slate-900 font-outfit mb-2 drop-shadow-md">Área Restringida</h3>
                  <p className="text-slate-800 font-medium mb-8 max-w-md drop-shadow-sm">Solicita acceso para ver una demostración en vivo de las capacidades reales de la plataforma.</p>
                  <a href="#contact" className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1">
                    Solicitar Demo Completa
                  </a>
                </div>

              </div>
            </div>
          </motion.div>
        </section>

        {/* Cohesive Features Section */}
        <section id="features" className="w-full relative z-10" aria-label="Características">
          <div className="bg-white rounded-[3rem] p-8 sm:p-12 md:p-16 border border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row gap-16 items-center">

            <div className="flex-1">
              <h2 className="text-4xl font-extrabold mb-6 text-slate-900 font-outfit">Conectando todas las piezas del club</h2>
              <p className="text-slate-600 text-lg mb-10 leading-relaxed">
                Nuestra plataforma unifica la comunicación, tesorería y el área deportiva para cualquier disciplina de equipo. Todo con una interfaz limpia que no requiere conocimientos técnicos.
              </p>
              <div className="space-y-6">
                {[
                  {
                    icon: <Calendar className="w-5 h-5 text-emerald-600" />,
                    title: "Organización de Entrenamientos",
                    desc: "Sincroniza horarios de pistas y pabellones para evitar solapamientos en diferentes categorías."
                  },
                  {
                    icon: <FileText className="w-5 h-5 text-emerald-600" />,
                    title: "Gestión Documental Segura",
                    desc: "Fichas de jugadores, reconocimientos médicos y cuotas unificadas en la nube."
                  },
                  {
                    icon: <Smartphone className="w-5 h-5 text-emerald-600" />,
                    title: "Comunicación Directa",
                    desc: "Notificaciones push al instante para padres y jugadores sobre cambios de última hora."
                  }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-outfit mb-1">{feature.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 relative w-full">
              <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&q=80"
                  alt="Deporte de interior"
                  className="w-full h-48 sm:h-64 object-cover rounded-[2rem] shadow-lg translate-y-6 border border-white/50"
                />
                <img
                  src="https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&q=80"
                  alt="Baloncesto"
                  className="w-full h-56 sm:h-72 object-cover rounded-[2rem] shadow-xl border border-white/50"
                />
                <div className="col-span-2 bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-slate-800">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white font-outfit">Multidisciplinar</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Un club, todas las secciones</div>
                    </div>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-slate-700" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Major Security / Trust Section */}
        <section id="security" className="w-full relative z-10" aria-label="Seguridad">
          <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-12 md:p-16 border border-slate-800 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">

            {/* Background glow */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-xl mb-8 relative z-10">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>

            <h2 className="text-4xl font-extrabold text-white font-outfit mb-6 relative z-10">Infraestructura de Grado Bancario</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-16 leading-relaxed relative z-10">
              Tratar con datos de deportistas, especialmente menores de edad, requiere la máxima responsabilidad. Hemos diseñado Sooner bajo los estándares más estrictos de privacidad europeos.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full relative z-10">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-sm">
                <Server className="w-8 h-8 text-emerald-400 mb-4 mx-auto" />
                <h3 className="text-xl font-bold text-white mb-2 font-outfit">Servidores en la UE</h3>
                <p className="text-slate-400 text-sm">Toda la información se aloja en clústeres seguros ubicados dentro de la Unión Europea, garantizando la soberanía de los datos.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4 mx-auto" />
                <h3 className="text-xl font-bold text-white mb-2 font-outfit">100% Cumplimiento RGPD</h3>
                <p className="text-slate-400 text-sm">Gestión de consentimientos y políticas de privacidad preconfiguradas para que el club esté cubierto legalmente de forma automática.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-sm">
                <Activity className="w-8 h-8 text-emerald-400 mb-4 mx-auto" />
                <h3 className="text-xl font-bold text-white mb-2 font-outfit">Copias de Seguridad</h3>
                <p className="text-slate-400 text-sm">Realizamos copias de seguridad automatizadas diariamente y mantenemos un cifrado de extremo a extremo (SSL).</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cohesive Downloads Section */}
        <section id="downloads" className="w-full relative z-10" aria-label="Descargas">
          <div className="bg-slate-50 rounded-[3rem] p-8 sm:p-16 relative overflow-hidden shadow-xl border border-slate-200/60">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200/40 blur-[100px] rounded-full pointer-events-none" />

            <div className="text-center mb-16 relative z-10">
              <h2 className="text-4xl font-extrabold mb-4 text-slate-900 font-outfit">Siempre a mano</h2>
              <p className="text-slate-600 text-lg max-w-xl mx-auto">Herramientas nativas y rápidas, adaptadas a la realidad de directivos que usan ordenador y familias que usan el móvil.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
              {/* Desktop Card */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] p-8 hover:shadow-md transition-shadow">
                <Monitor className="w-10 h-10 text-slate-700 mb-6" />
                <h3 className="text-2xl font-bold mb-3 text-slate-900 font-outfit">Escritorio</h3>
                <p className="text-slate-600 mb-8 text-sm">El panel de control potente para la dirección deportiva y tesorería del club.</p>
                <div className="space-y-3">
                  <button className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                    <Download className="w-4 h-4" /> Windows App
                  </button>
                  <button className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                    <Download className="w-4 h-4" /> macOS App
                  </button>
                </div>
              </div>

              {/* Mobile Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-500/50 rounded-[2rem] p-8 shadow-lg shadow-emerald-900/20">
                <Smartphone className="w-10 h-10 text-white mb-6" />
                <h3 className="text-2xl font-bold mb-3 text-white font-outfit">Móvil</h3>
                <p className="text-emerald-100 mb-8 text-sm">El acceso diario para jugadores, con horarios, resultados y notificaciones push.</p>
                <div className="space-y-3">
                  <button className="w-full py-3 px-4 bg-white text-emerald-900 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                    <Download className="w-4 h-4" /> Instalar en Android
                  </button>
                  <button className="w-full py-3 px-4 bg-emerald-900/40 hover:bg-emerald-900/60 text-white border border-emerald-400/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                    Instalar en iOS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FotoEsport Merch Section */}
        <section id="merch" className="w-full relative z-10" aria-label="Merchandising">
          <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-12 md:p-16 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden border border-slate-800">

            {/* Decor */}
            <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-6">
                <ShoppingBag className="w-4 h-4" /> FotoEsport Merch
              </div>
              <h2 className="text-4xl font-extrabold text-white font-outfit mb-4 leading-tight">Merchandising Personalizado y Rentable</h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed max-w-xl">
                Ofrecemos a tu club productos personalizados (tazas, llaveros, calendarios...) sin coste inicial. **Totalmente sincronizado con Sooner** para que gestiones todo desde un único lugar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Sincronizado con tu Dashboard
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Productos personalizados
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> 0€ de coste para el club
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Genera ingresos con cada venta
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Sin carga de trabajo para el club
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Fotografías gratuitas
                </div>
              </div>

              <a
                href="https://fotoesportmerch.es"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-8 py-4 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-1 items-center gap-2"
              >
                Saber más sobre Merchandising <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            <div className="relative z-10 flex-shrink-0 w-full md:w-1/3 flex justify-center md:justify-end">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                <img src="/logoFotoEsportMerch.png" alt="FotoEsport Merch Logo" className="w-full max-w-[250px] drop-shadow-2xl" />
              </div>
            </div>

          </div>
        </section>

        {/* Cohesive Contact Section */}
        <section id="contact" className="w-full relative z-10" aria-label="Contacto">
          <div className="bg-white border border-slate-200/60 rounded-[3rem] p-8 md:p-16 shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl font-extrabold mb-6 text-slate-900 leading-tight font-outfit">
                  Profesionaliza la gestión <br /> de tu entidad
                </h2>
                <p className="text-slate-600 text-lg mb-8">
                  Sabemos exactamente qué necesitas solucionar en tu día a día. Cuéntanos vuestra situación y nos pondremos en contacto.
                </p>

                <div className="flex flex-col gap-4 mb-10">
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Demo completa de la plataforma
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Soporte humano real y directo
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Migración de datos sin estrés
                  </div>
                </div>
              </div>

              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-10 text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit">Solicitud Recibida</h3>
                  <p className="text-slate-600 text-sm">Nuestro equipo contactará contigo a la mayor brevedad posible para asesorarte.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-emerald-600 text-sm font-bold hover:underline"
                  >
                    Enviar otra solicitud
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 shadow-inner">
                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        required
                        value={formData.clubName}
                        onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm shadow-sm"
                        placeholder="Nombre de la entidad deportiva"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm shadow-sm"
                        placeholder="Correo electrónico"
                      />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm shadow-sm"
                        placeholder="Teléfono (Opcional)"
                      />
                    </div>
                    <div>
                      <textarea
                        rows={6}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm shadow-sm resize-none"
                        placeholder="Describe el caso de tu club y por qué solicitas acceso a la plataforma. ¿Qué problemas buscáis resolver?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                      ) : (
                        "Solicitar Acceso"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-200 bg-white" aria-label="Pie de página">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/logoSOMEsport.png" alt="SOM Esport Logo" className="h-12 opacity-100" />
          </div>
          <p className="text-slate-500 text-sm font-medium">
            © {new Date().getFullYear()} SOM Esport. Plataforma de gestión deportiva.
          </p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <Link to="/privacidad" className="hover:text-emerald-600 transition-colors">Privacidad</Link>
            <Link to="/terminos" className="hover:text-emerald-600 transition-colors">Términos</Link>
            <Link to="/cookies" className="hover:text-emerald-600 transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
