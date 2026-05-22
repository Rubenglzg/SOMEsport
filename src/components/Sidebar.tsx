import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Building2,
  User as UserIcon,
  CreditCard,
  FileCheck,
  Shield,
  BarChart3,
  Activity,
  Megaphone,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  Mail,
  History,
  Wallet,
  HelpCircle,
  Heart,
  Package
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: string[];
  section?: string;
}

const navItems: NavItem[] = [
  // --- Admin ---
  { icon: LayoutDashboard, label: 'Panel General', path: '/dashboard', roles: ['admin'], section: 'General' },
  { icon: Building2, label: 'Clubes', path: '/dashboard/clubs', roles: ['admin'], section: 'Gestión' },
  { icon: Users, label: 'Jugadores', path: '/dashboard/players', roles: ['admin'] },
  { icon: BarChart3, label: 'Estadísticas', path: '/dashboard/stats', roles: ['admin'] },
  { icon: Activity, label: 'Actividad', path: '/dashboard/activity', roles: ['admin'], section: 'Plataforma' },
  { icon: Megaphone, label: 'Comunicados', path: '/dashboard/announcements', roles: ['admin'] },
  { icon: Calendar, label: 'Temporadas', path: '/dashboard/seasons', roles: ['admin'] },
  { icon: Wallet, label: 'Caja Global', path: '/dashboard/treasury-control', roles: ['admin'] },
  { icon: HelpCircle, label: 'Soporte', path: '/dashboard/support', roles: ['admin'] },
  { icon: Settings, label: 'Ajustes', path: '/dashboard/settings', roles: ['admin'], section: 'Sistema' },

  // --- Club ---
  { icon: LayoutDashboard, label: 'Panel General', path: '/dashboard', roles: ['club'], section: 'General' },
  { icon: Building2, label: 'Mi Club', path: '/dashboard/my-club', roles: ['club'], section: 'Gestión' },
  { icon: Users, label: 'Directorio', path: '/dashboard/directory', roles: ['club'] },
  { icon: Users, label: 'Cuerpo Técnico', path: '/dashboard/staff', roles: ['club'] },
  { icon: FileCheck, label: 'Documentos', path: '/dashboard/documents', roles: ['club'] },
  { icon: Shield, label: 'Equipos', path: '/dashboard/teams', roles: ['club'] },
  { icon: CreditCard, label: 'Tesorería', path: '/dashboard/treasury', roles: ['club'] },
  { icon: CalendarDays, label: 'Instalaciones', path: '/dashboard/facilities', roles: ['club'] },
  { icon: Activity, label: 'Lesiones y Salud', path: '/dashboard/injuries', roles: ['club'] },
  { icon: Package, label: 'Material e Inventario', path: '/dashboard/inventory', roles: ['club'] },
  { icon: CalendarDays, label: 'Calendario', path: '/dashboard/calendar', roles: ['club'], section: 'Comunicación' },
  { icon: Megaphone, label: 'Comunicados', path: '/dashboard/club-announcements', roles: ['club'] },
  { icon: ClipboardCheck, label: 'Asistencia', path: '/dashboard/attendance', roles: ['club'] },
  { icon: Calendar, label: 'Temporadas', path: '/dashboard/club-seasons', roles: ['club'] },
  { icon: HelpCircle, label: 'Soporte', path: '/dashboard/helpdesk', roles: ['club'] },
  { icon: Settings, label: 'Ajustes', path: '/dashboard/settings', roles: ['club'], section: 'Sistema' },

  // --- Player ---
  { icon: LayoutDashboard, label: 'Mi Panel', path: '/dashboard', roles: ['player'], section: 'General' },
  { icon: FileText, label: 'Mis Documentos', path: '/dashboard/my-documents', roles: ['player'], section: 'Mi Ficha' },
  { icon: CreditCard, label: 'Mis Pagos', path: '/dashboard/my-payments', roles: ['player'] },
  { icon: Users, label: 'Mi Equipo', path: '/dashboard/my-team', roles: ['player'] },
  { icon: UserIcon, label: 'Mis Datos', path: '/dashboard/my-profile', roles: ['player'] },
  { icon: Heart, label: 'Mi Ficha Médica', path: '/dashboard/my-medical', roles: ['player'] },
  { icon: CalendarDays, label: 'Calendario', path: '/dashboard/my-calendar', roles: ['player'], section: 'Club' },
  { icon: Mail, label: 'Buzón', path: '/dashboard/my-messages', roles: ['player'] },
  { icon: History, label: 'Historial', path: '/dashboard/my-history', roles: ['player'] },
  { icon: HelpCircle, label: 'Soporte', path: '/dashboard/helpdesk', roles: ['player'] },
  { icon: Settings, label: 'Ajustes', path: '/dashboard/settings', roles: ['player'], section: 'Sistema' },

  // --- Staff (Coaches / Directors) ---
  { icon: LayoutDashboard, label: 'Panel Técnico', path: '/dashboard', roles: ['staff'], section: 'General' },
  { icon: Shield, label: 'Mis Equipos', path: '/dashboard/teams', roles: ['staff'], section: 'Gestión' },
  { icon: CalendarDays, label: 'Instalaciones', path: '/dashboard/facilities', roles: ['staff'] },
  { icon: Activity, label: 'Lesiones y Salud', path: '/dashboard/injuries', roles: ['staff'] },
  { icon: Package, label: 'Material e Inventario', path: '/dashboard/inventory', roles: ['staff'] },
  { icon: CalendarDays, label: 'Calendario', path: '/dashboard/calendar', roles: ['staff'], section: 'Calendario y Convocatorias' },
  { icon: ClipboardCheck, label: 'Asistencia', path: '/dashboard/attendance', roles: ['staff'] },
  { icon: HelpCircle, label: 'Soporte', path: '/dashboard/helpdesk', roles: ['staff'] },
  { icon: Settings, label: 'Ajustes', path: '/dashboard/settings', roles: ['staff'], section: 'Sistema' },
];

const STAFF_PATH_TO_PERMISSION_KEY: { [path: string]: string } = {
  '/dashboard/teams': 'teams',
  '/dashboard/facilities': 'facilities',
  '/dashboard/injuries': 'injuries',
  '/dashboard/inventory': 'inventory',
  '/dashboard/calendar': 'calendar',
  '/dashboard/attendance': 'attendance',
};

export function Sidebar() {
  const location = useLocation();
  const profile = useAuthStore((state) => state.profile);
  const userRole = profile?.role || 'player';

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles.includes(userRole)) return false;

    if (userRole === 'staff') {
      const permKey = STAFF_PATH_TO_PERMISSION_KEY[item.path];
      if (permKey) {
        const perm = profile?.staffPermissions?.[permKey as keyof typeof profile.staffPermissions];
        return perm?.enabled === true;
      }
    }

    return true;
  });

  // Group items by section
  const groupedItems: { section: string | null; items: NavItem[] }[] = [];
  let currentSection: string | null = null;

  filteredNavItems.forEach(item => {
    if (item.section && item.section !== currentSection) {
      currentSection = item.section;
      groupedItems.push({ section: currentSection, items: [item] });
    } else {
      if (groupedItems.length === 0) {
        groupedItems.push({ section: null, items: [item] });
      } else {
        groupedItems[groupedItems.length - 1].items.push(item);
      }
    }
  });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen hidden md:flex flex-col sticky top-0">
      <div className="h-24 flex items-center px-6 border-b border-slate-200 bg-slate-900 text-white relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1542652694-40abf526446e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Sidebar Banner" className="w-full h-full object-cover mix-blend-overlay" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30 border border-brand-500">
            S
          </div>
          <div>
            <span className="text-xl font-black tracking-tight block leading-none">Sooner</span>
            <span className="text-xs text-brand-400 font-bold uppercase tracking-widest mt-1 block">
              {userRole === 'admin' ? 'Administrador' : userRole === 'club' ? 'Panel de Club' : userRole === 'staff' ? 'Cuerpo Técnico' : 'Portal Jugador'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-4">
        {groupedItems.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.section && (
              <div className="mb-2 px-3 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                {group.section}
              </div>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path + item.label}
                    to={item.path}
                    className={twMerge(
                      clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-[13px] font-semibold',
                        isActive
                          ? 'bg-brand-50 text-brand-600 shadow-sm border border-brand-100'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )
                    )}
                  >
                    <Icon className={clsx("w-[18px] h-[18px]", isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">Soporte Técnico</p>
          <p className="text-xs text-slate-400 mb-3">¿Necesitas ayuda con las fichas?</p>
          <button className="w-full text-xs font-medium bg-white border border-slate-200 text-slate-700 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
            Contactar
          </button>
        </div>
      </div>
    </aside>
  );
}
