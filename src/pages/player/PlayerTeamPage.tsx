import { useState, useEffect } from 'react';
import { Users, Shield, Loader2, Calendar, Activity, Trophy } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getPlayerTeam, type Team } from '../../lib/teamsService';
import { getPlayersByClub } from '../../lib/userService';
import type { UserProfile } from '../../store/authStore';

export function PlayerTeamPage() {
  const profile = useAuthStore((state) => state.profile);
  const [team, setTeam] = useState<Team | null>(null);
  const [teammates, setTeammates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const targetPlayerUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;
      if (!targetPlayerUid) return;
      setLoading(true);
      try {
        const teamData = await getPlayerTeam(targetPlayerUid);
        if (teamData) {
          setTeam(teamData);
          const clubId = profile?.clubId;
          if (clubId) {
            const allClubPlayers = await getPlayersByClub(clubId);
            const myTeammates = allClubPlayers.filter(p => teamData.playerIds.includes(p.uid!) && p.uid !== targetPlayerUid);
            setTeammates(myTeammates);
          }
        }
      } catch (error) {
        console.error("Error loading team:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.uid, profile?.clubId, profile?.fichaId]);

  if (!profile) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-24">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <Users className="w-7 h-7" />
          </div>
          Mi Equipo
        </h1>
        <p className="text-slate-500 mt-2 text-base">Información sobre tu equipo asignado y compañeros.</p>
      </div>

      {/* Team Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {team ? (
          <div className="space-y-8">
            {/* Top Grid: Info & Next Match */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Info */}
              <div className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-2xl p-6 border border-brand-200 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/30">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Nombre del Equipo</p>
                    <p className="text-2xl font-black text-brand-900">{team.name}</p>
                  </div>
                </div>
                {team.category && (
                  <div className="mt-2">
                    <span className="text-sm font-semibold text-brand-700 bg-white/80 px-3 py-1 rounded-lg border border-brand-200">
                      Categoría: {team.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Next Match (Simulated) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="font-bold text-sm">Próximo Partido</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded uppercase tracking-wider">Liga Regular</span>
                </div>
                <div>
                  <div className="flex items-center justify-between font-black text-lg text-slate-900 mb-2">
                    <span className="truncate max-w-[40%]">{team.name}</span>
                    <span className="text-slate-400 text-sm">VS</span>
                    <span className="truncate max-w-[40%] text-right">Rival FC</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-4">
                    Sábado, 10:00 AM • Pabellón Principal
                  </p>
                </div>
              </div>
            </div>

            {/* Simulated Stats */}
            <div className="grid grid-cols-3 gap-4">
               <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                 <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                 <p className="text-xs text-slate-500 font-bold uppercase mb-1">Posición Liga</p>
                 <p className="text-xl font-black text-slate-900">3º</p>
               </div>
               <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                 <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                 <p className="text-xs text-slate-500 font-bold uppercase mb-1">Racha</p>
                 <p className="text-xl font-black text-emerald-600 tracking-widest">V V D V</p>
               </div>
               <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                 <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                 <p className="text-xs text-slate-500 font-bold uppercase mb-1">Plantilla</p>
                 <p className="text-xl font-black text-slate-900">{teammates.length + 1}</p>
               </div>
            </div>

            {/* Teammates */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                Compañeros de Equipo ({teammates.length})
              </h3>
              {teammates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teammates.map(t => (
                    <div key={t.uid} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                        {t.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900">{t.name}</span>
                        <p className="text-xs text-slate-500 capitalize">{t.accountType || 'Jugador'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  <p className="text-sm text-slate-500 italic">Eres el único miembro de este equipo actualmente.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aún no asignado</h3>
            <p className="text-slate-500">El club te asignará a un equipo una vez tu ficha sea aprobada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
