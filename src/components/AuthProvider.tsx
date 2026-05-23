import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { UserProfile } from '../store/authStore';
import { Loader2 } from 'lucide-react';

/**
 * Mapea las columnas snake_case de la tabla users_profiles 
 * a las propiedades camelCase de la interfaz UserProfile.
 */
function mapDbProfileToUserProfile(dbRow: any): UserProfile {
  return {
    uid: dbRow.id,
    email: dbRow.email,
    name: dbRow.name,
    username: dbRow.username,
    role: dbRow.role,
    clubId: dbRow.club_id,
    accountType: dbRow.account_type,
    isAdult: dbRow.is_adult,
    sportType: dbRow.sport_type,
    teamId: dbRow.team_id,
    teamIds: dbRow.team_ids,
    staffPermissions: dbRow.staff_permissions,
    directorSpecialization: dbRow.director_specialization,
    status: dbRow.status,
    createdAt: dbRow.created_at,
    photoURL: dbRow.photo_url,
    activeSports: dbRow.active_sports,
    // Campos que puedan existir en la DB con el mismo nombre
    category: dbRow.category,
    fichaId: dbRow.ficha_id,
    dni: dbRow.dni,
    birthDate: dbRow.birth_date || dbRow.fecha_nacimiento,
    phone: dbRow.phone,
    tutorName: dbRow.tutor_name,
    tutorPhone: dbRow.tutor_phone,
    tutorEmail: dbRow.tutor_email,
    notes: dbRow.notes,
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setProfile, setLoading, loading } = useAuthStore();

  useEffect(() => {
    // 1. Obtener la sesión inicial
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        setUser(user);

        if (user) {
          const { data: profileData, error } = await supabase
            .from('users_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (!error && profileData) {
            setProfile(mapDbProfileToUserProfile(profileData));
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error setting up auth session:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
        try {
          const { data: profileData, error } = await supabase
            .from('users_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (!error && profileData) {
            setProfile(mapDbProfileToUserProfile(profileData));
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching auth change profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
