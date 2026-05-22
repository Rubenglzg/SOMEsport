import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const STAFF_PATH_TO_PERMISSION_KEY: { [path: string]: string } = {
  '/dashboard/teams': 'teams',
  '/dashboard/facilities': 'facilities',
  '/dashboard/injuries': 'injuries',
  '/dashboard/inventory': 'inventory',
  '/dashboard/calendar': 'calendar',
  '/dashboard/attendance': 'attendance',
};

export function DashboardLayout() {
  const location = useLocation();
  const profile = useAuthStore((state) => state.profile);

  // Guard check for staff role
  let isDenied = false;
  if (profile?.role === 'staff') {
    const matchedPath = Object.keys(STAFF_PATH_TO_PERMISSION_KEY).find(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
    if (matchedPath) {
      const permKey = STAFF_PATH_TO_PERMISSION_KEY[matchedPath];
      const perm = profile.staffPermissions?.[permKey as keyof typeof profile.staffPermissions];
      if (!perm || perm.enabled !== true) {
        isDenied = true;
      }
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {isDenied ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center px-4">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-red-100 animate-pulse">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Acceso Restringido</h1>
              <p className="text-slate-500 text-base leading-relaxed mb-8">
                Lo sentimos, tu cuenta no tiene permisos habilitados por el club para acceder a este módulo. Si crees que deberías tener acceso, ponte en contacto con la administración.
              </p>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Panel Técnico
              </Link>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
