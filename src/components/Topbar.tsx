import { Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { getUserTickets } from '../lib/supportService';

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Avatar URL: prefer uploaded profile photo, fallback to auth photo
  const avatarUrl = profile?.photoURL || user?.user_metadata?.avatar_url || null;

  // Load support tickets and compute unread count (status not resolved)
  useEffect(() => {
    const fetchTickets = async () => {
      if (!profile?.uid) return;
      try {
        const tickets = await getUserTickets(profile.uid);
        const count = tickets.filter((t) => t.status !== 'resolved').length;
        setUnreadCount(count);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    };
    fetchTickets();
  }, [profile?.uid]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-end sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50">
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
          <Bell className="h-5 w-5" />
        </button>
        
        {/* Profile Info */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[200px]">
              {profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuario'}
            </span>
            <span className="text-xs text-slate-500 truncate max-w-[240px]" title={user?.email || ''}>
              {user?.email || 'Admin'}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <button 
            onClick={handleSignOut}
            className="ml-1 p-2 text-slate-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
