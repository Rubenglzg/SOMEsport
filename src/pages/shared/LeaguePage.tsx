import { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Award, Loader2, Plus, Target, Medal, Flag, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getPlayerTeam, getTeamsByClub, type Team } from '../../lib/teamsService';
import { getClubEvents } from '../../lib/eventsService';
import { getPlayersByClub } from '../../lib/userService';

interface StandingRow {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  isUserTeam: boolean;
  position?: number;
}

interface Tournament {
  id: string;
  name: string;
  category: string;
  teamId: string;
  teamName: string;
  status: 'Inscrito' | 'En Fase de Grupos' | 'Cuartos de Final' | 'Semifinales' | 'Final' | 'Campeón';
  nextMatchDate: string;
  rival: string;
  enrolledAt: string;
}

interface TrophyRecord {
  id: string;
  title: string;
  year: string;
  category: string;
  teamId: string;
  teamName: string;
  type: 'oro' | 'plata' | 'bronce';
  description: string;
}

export function LeaguePage() {
  const profile = useAuthStore((state) => state.profile);
  const [loading, setLoading] = useState(true);
  
  // Teams lists
  const [clubTeams, setClubTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  // Core lists loaded dynamically
  const [teamMatches, setTeamMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  
  // Simulated Trophies Database
  const [trophies, setTrophies] = useState<TrophyRecord[]>([]);
  
  // Simulated Tournaments Database
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollTeamId, setEnrollTeamId] = useState('');
  const [enrollTourName, setEnrollTourName] = useState('Avantia Cup 2026');

  // active tab
  const [activeTab, setActiveTab] = useState<'league' | 'tournaments' | 'trophies'>('league');

  const userRole = profile?.role || 'player';
  const targetClubId = profile?.clubId || profile?.uid;

  // Load static/initial simulated database
  useEffect(() => {
    if (!targetClubId) return;

    // Seed initial simulated trophies
    setTrophies([
      { id: '1', title: 'Campeón Liga Preferente', year: '2024/2025', category: 'Senior A', teamId: 'senior-a', teamName: 'Senior A', type: 'oro', description: 'Primer puesto histórico logrando el ascenso federativo.' },
      { id: '2', title: 'Subcampeón Copa FFCV', year: '2024', category: 'Juvenil A', teamId: 'juvenil-a', teamName: 'Juvenil A', type: 'plata', description: 'Gran andadura copera cayendo en una final reñida.' },
      { id: '3', title: 'Copa Navideña de Campeones', year: '2025', category: 'Alevín B', teamId: 'alevin-b', teamName: 'Alevín B', type: 'oro', description: 'Ganadores invictos en el torneo benéfico navideño.' },
      { id: '4', title: 'Tercer Puesto Copa de Campeones', year: '2024', category: 'Infantil A', teamId: 'infantil-a', teamName: 'Infantil A', type: 'bronce', description: 'Victoria por el tercer y cuarto puesto en la tanda de penaltis.' }
    ]);

    // Seed initial simulated tournaments
    setTournaments([
      { id: '1', name: 'Avantia Cup 2026', category: 'Senior', teamId: 'senior-a', teamName: 'Senior A', status: 'En Fase de Grupos', nextMatchDate: '2026-06-03', rival: 'Atlético Balompié', enrolledAt: '2026-05-10' },
      { id: '2', name: 'Copa Federación FFCV', category: 'Juvenil', teamId: 'juvenil-a', teamName: 'Juvenil A', status: 'Semifinales', nextMatchDate: '2026-06-14', rival: 'Sporting Club', enrolledAt: '2026-05-12' }
    ]);
  }, [targetClubId]);

  // Load Teams & setup initial selection based on role
  useEffect(() => {
    const loadTeams = async () => {
      if (!targetClubId) return;
      setLoading(true);
      try {
        const teamsData = await getTeamsByClub(targetClubId);
        setClubTeams(teamsData);

        if (userRole === 'club') {
          if (teamsData.length > 0) {
            setSelectedTeamId(teamsData[0].id || '');
          }
        } else if (userRole === 'staff') {
          // Coach: Filter teams they are assigned to
          const coachTeams = teamsData.filter(t => 
            t.id === profile?.teamId || (profile?.teamIds && profile.teamIds.includes(t.id || ''))
          );
          if (coachTeams.length > 0) {
            setSelectedTeamId(coachTeams[0].id || '');
          } else if (teamsData.length > 0) {
            setSelectedTeamId(teamsData[0].id || '');
          }
        } else {
          // Player / Tutor: Load their assigned team
          const targetPlayerUid = profile?.accountType === 'tutor' ? profile.fichaId : profile?.uid;
          if (targetPlayerUid) {
            const playerTeam = await getPlayerTeam(targetPlayerUid);
            if (playerTeam) {
              setClubTeams([playerTeam]);
              setSelectedTeamId(playerTeam.id || '');
            }
          }
        }
      } catch (error) {
        console.error("Error loading league teams:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, [profile?.uid, profile?.clubId, profile?.fichaId, userRole]);

  // Fetch match details & calculate standings for the selected team
  useEffect(() => {
    const calculateLeague = async () => {
      if (!selectedTeamId || !targetClubId) return;
      try {
        const teamObj = clubTeams.find(t => t.id === selectedTeamId);
        if (!teamObj) return;

        const allEvents = await getClubEvents(targetClubId);
        const matches = allEvents.filter(e => e.teamId === selectedTeamId && e.type === 'match');
        setTeamMatches(matches);

        // Process past matches
        const todayStr = new Date().toISOString().split('T')[0];
        const pastMatches = matches.filter(m => m.date < todayStr && m.goalsFor !== undefined && m.goalsAgainst !== undefined);

        let w = 0, d = 0, l = 0, gf = 0, ga = 0;
        pastMatches.forEach(m => {
          const gfVal = m.goalsFor || 0;
          const gaVal = m.goalsAgainst || 0;
          gf += gfVal;
          ga += gaVal;
          if (gfVal > gaVal) w++;
          else if (gfVal === gaVal) d++;
          else l++;
        });

        const points = w * 3 + d * 1;

        // Generate Standing Table
        const rivalNames = [
          'Atlético Balompié', 
          'Sporting Club', 
          'Deportivo Unión', 
          'Real Esport', 
          'CD Estrella', 
          'Rayo Club', 
          'UD Olimpo', 
          'Tormenta CF', 
          'Avantia CF'
        ];

        const simulatedRows = rivalNames.map(rName => {
          let hash = 0;
          for (let i = 0; i < rName.length; i++) {
            hash = rName.charCodeAt(i) + ((hash << 5) - hash);
          }
          hash = Math.abs(hash);

          const played = Math.max(2, Math.min(10, pastMatches.length || 4));
          const won = hash % (played + 1);
          const remaining = played - won;
          const drawn = remaining > 0 ? (hash >> 2) % (remaining + 1) : 0;
          const lost = remaining - drawn;
          const pts = won * 3 + drawn * 1;
          const goalsForSim = (hash % 15) + won * 2;
          const goalsAgainstSim = ((hash >> 4) % 15) + lost * 2;

          return {
            name: rName,
            played,
            won,
            drawn,
            lost,
            goalsFor: goalsForSim,
            goalsAgainst: goalsAgainstSim,
            points: pts,
            isUserTeam: false
          };
        });

        simulatedRows.push({
          name: teamObj.name,
          played: pastMatches.length,
          won: w,
          drawn: d,
          lost: l,
          goalsFor: gf,
          goalsAgainst: ga,
          points: points,
          isUserTeam: true
        });

        // Sort standings
        simulatedRows.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const diffB = b.goalsFor - b.goalsAgainst;
          const diffA = a.goalsFor - a.goalsAgainst;
          if (diffB !== diffA) return diffB - diffA;
          return b.goalsFor - a.goalsFor;
        });

        const sortedStandings = simulatedRows.map((row, idx) => ({
          ...row,
          position: idx + 1
        }));

        setStandings(sortedStandings);
      } catch (error) {
        console.error("Error calculating league standings:", error);
      }
    };
    calculateLeague();
  }, [selectedTeamId, clubTeams, targetClubId]);

  // Handle enrolling team in a new tournament
  const handleEnrollTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollTeamId || !enrollTourName) return;

    const chosenTeam = clubTeams.find(t => t.id === enrollTeamId);
    if (!chosenTeam) return;

    const newTournament: Tournament = {
      id: genRandomId(),
      name: enrollTourName,
      category: chosenTeam.category || 'Senior',
      teamId: enrollTeamId,
      teamName: chosenTeam.name,
      status: 'Inscrito',
      nextMatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rival: 'Oponente Clasificatorio',
      enrolledAt: new Date().toISOString().split('T')[0]
    };

    setTournaments(prev => [newTournament, ...prev]);
    setShowEnrollModal(false);
    setEnrollTeamId('');
    alert(`¡Éxito! El equipo ${chosenTeam.name} ha sido inscrito en el torneo ${enrollTourName}.`);
  };

  const genRandomId = () => Math.random().toString(36).substring(2, 9);

  // Filter trophies based on role & team selection
  const filteredTrophies = trophies.filter(trophy => {
    if (userRole === 'club') {
      // Club sees all trophies, but can narrow down by selected team if they choose
      return true; 
    } else if (userRole === 'staff') {
      // Coach sees history of trophies won with their assigned teams
      const coachTeamIds = clubTeams.map(t => t.id);
      return coachTeamIds.includes(trophy.teamId) || trophy.teamId === selectedTeamId;
    } else {
      // Player sees their team's trophies
      return trophy.teamId === selectedTeamId;
    }
  });

  // Filter tournaments based on role
  const filteredTournaments = tournaments.filter(tour => {
    if (userRole === 'club') {
      return true;
    } else if (userRole === 'staff') {
      const coachTeamIds = clubTeams.map(t => t.id);
      return coachTeamIds.includes(tour.teamId);
    } else {
      return tour.teamId === selectedTeamId;
    }
  });

  const selectedTeam = clubTeams.find(t => t.id === selectedTeamId);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-24">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <Trophy className="w-7 h-7" />
            </div>
            Competiciones y Ligas
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            {userRole === 'club' 
              ? 'Control general de clasificaciones, torneos inscritos y vitrina de trofeos de todas las plantillas.'
              : userRole === 'staff'
              ? 'Panel de rendimiento competitivo para tus equipos asignados.'
              : 'Sigue la trayectoria, partidos de copa y vitrina de trofeos de tu equipo.'}
          </p>
        </div>

        {/* Club Admin Inscribe in Tournament button */}
        {userRole === 'club' && (
          <button 
            onClick={() => {
              if (clubTeams.length > 0) setEnrollTeamId(clubTeams[0].id || '');
              setShowEnrollModal(true);
            }}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/30"
          >
            <Plus className="w-4 h-4" /> Inscribir en Torneo
          </button>
        )}
      </div>

      {/* Team Selection Dropdown (Only for Club and Coach with multiple teams) */}
      {clubTeams.length > 1 && (userRole === 'club' || userRole === 'staff') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-700 text-sm">Selecciona plantilla a analizar:</span>
          </div>
          <select 
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 sm:w-72"
          >
            {clubTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.category || 'Sin categoría'})</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('league')} 
            className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'league' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flag className="w-4 h-4" /> Liga Regular
          </button>
          
          <button 
            onClick={() => setActiveTab('tournaments')} 
            className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'tournaments' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Target className="w-4 h-4" /> Torneos y Copas
            {filteredTournaments.length > 0 && (
              <span className="bg-brand-100 text-brand-700 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-black">
                {filteredTournaments.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('trophies')} 
            className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'trophies' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" /> Vitrina de Trofeos
            {filteredTrophies.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-black">
                {filteredTrophies.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        {/* LEAGUE STANDINGS TAB */}
        {activeTab === 'league' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Standings table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Tabla de Posiciones</h3>
                  <p className="text-xs text-slate-500 mt-1">Clasificación general de la categoría {selectedTeam?.category || 'General'}</p>
                </div>
                <div className="text-xs font-semibold px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">
                  Fútbol 11
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-12">Pos</th>
                      <th className="py-3 px-4">Equipo</th>
                      <th className="py-3 px-4 text-center w-12">PJ</th>
                      <th className="py-3 px-4 text-center w-10">G</th>
                      <th className="py-3 px-4 text-center w-10">E</th>
                      <th className="py-3 px-4 text-center w-10">P</th>
                      <th className="py-3 px-4 text-center w-16">GF:GC</th>
                      <th className="py-3 px-4 text-center w-16">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {standings.map((st) => (
                      <tr 
                        key={st.name} 
                        className={`text-xs ${
                          st.isUserTeam 
                            ? 'bg-amber-50/80 font-bold text-amber-900' 
                            : 'text-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-bold">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center ${
                            st.position === 1 ? 'bg-amber-100 text-amber-700' :
                            st.position === 2 ? 'bg-slate-100 text-slate-700' :
                            st.position === 3 ? 'bg-amber-50 text-amber-800' : 'bg-transparent'
                          }`}>
                            {st.position}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold truncate max-w-[180px]">{st.name}</td>
                        <td className="py-3 px-4 text-center">{st.played}</td>
                        <td className="py-3 px-4 text-center">{st.won}</td>
                        <td className="py-3 px-4 text-center">{st.drawn}</td>
                        <td className="py-3 px-4 text-center">{st.lost}</td>
                        <td className="py-3 px-4 text-center text-slate-400">{st.goalsFor}:{st.goalsAgainst}</td>
                        <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">{st.points}</td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">No hay datos de clasificación para esta plantilla.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar information */}
            <div className="space-y-6">
              {/* Category definition explanation card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Shield className="w-32 h-32" /></div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  ¿Qué es la Categoría?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  La <strong>Categoría</strong> (Ej. <em>Senior, Juvenil, Infantil, Alevín</em>) clasifica a los jugadores en base a su edad y nivel competitivo regulado. 
                </p>
                <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                  Sirve para que Sooner estructure de forma atómica:
                </p>
                <ul className="text-xs text-slate-300 space-y-1 mt-2 list-disc list-inside pl-1">
                  <li>Las cuotas de pago correspondientes.</li>
                  <li>El calendario de entrenamientos adecuado.</li>
                  <li>Las fichas médicas y de seguro federativo.</li>
                  <li>La correspondencia automatizada de las clasificaciones.</li>
                </ul>
              </div>

              {/* Competitive summary card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Resumen de la Temporada
                </h3>
                {selectedTeam ? (
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Partidos Jugados</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        {standings.find(s => s.isUserTeam)?.played || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Puntos Totales</p>
                      <p className="text-2xl font-black text-brand-600 mt-1">
                        {standings.find(s => s.isUserTeam)?.points || 0} pts
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Goles Marcados / Encajados</p>
                      <p className="text-lg font-black text-slate-900 mt-1">
                        {standings.find(s => s.isUserTeam)?.goalsFor || 0} favor • {standings.find(s => s.isUserTeam)?.goalsAgainst || 0} contra
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No hay plantilla seleccionada.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOURNAMENTS & COPAS TAB */}
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-600" />
                Torneos y Copas Activas ({filteredTournaments.length})
              </h3>
              <p className="text-slate-500 text-xs mb-6">Lista de competiciones del sistema K.O., ligas veraniegas o torneos benéficos.</p>

              {filteredTournaments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTournaments.map((tour) => (
                    <div key={tour.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col justify-between space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest px-2.5 py-1 bg-brand-50 border border-brand-100 rounded-full">
                            {tour.name}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-base mt-3">{tour.teamName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Categoría: {tour.category}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          tour.status === 'Campeón' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          tour.status === 'Semifinales' || tour.status === 'Final' ? 'bg-red-100 text-red-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {tour.status}
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-400 font-medium">Próximo Rival:</span>
                          <span className="font-bold text-slate-700">{tour.rival}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Fecha:</span>
                          <span className="font-bold text-slate-700">{new Date(tour.nextMatchDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Inscripción el {new Date(tour.enrolledAt).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                  <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-600">Sin inscripciones activas</p>
                  <p className="text-xs text-slate-400 mt-1">Tu equipo no está inscrito en ningún torneo o copa secundaria en este momento.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TROPHIES CABINET TAB */}
        {activeTab === 'trophies' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Vitrina Histórica de Trofeos ({filteredTrophies.length})
                </h3>
                <p className="text-slate-500 text-xs mt-1">Palmarés oficial y títulos conquistados por las plantillas.</p>
              </div>
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>

            {filteredTrophies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
                {filteredTrophies.map((trophy) => (
                  <div key={trophy.id} className="relative group bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col items-center text-center space-y-4">
                    
                    {/* Shelf decoration */}
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-300 rounded-b-2xl group-hover:bg-amber-400 transition-colors"></div>

                    {/* Trophy Icon with colored ring depending on medal type */}
                    <div className={`p-4 rounded-full ${
                      trophy.type === 'oro' ? 'bg-amber-100 text-amber-600' :
                      trophy.type === 'plata' ? 'bg-slate-200 text-slate-600' :
                      'bg-orange-100 text-orange-700'
                    } ring-4 ring-white shadow-md relative`}>
                      <Trophy className="w-8 h-8" />
                      <Medal className="w-4 h-4 absolute bottom-0 right-0 text-white fill-current" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{trophy.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Temporada {trophy.year}</p>
                      <p className="text-xs text-brand-600 font-bold mt-1">Plantilla: {trophy.teamName}</p>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">{trophy.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Vitrina de trofeos vacía</p>
                <p className="text-xs text-slate-400 mt-1">Aún no se han registrado títulos para este equipo. ¡A competir por el campeonato!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ENROLL TOURNAMENT MODAL */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-600" />
                Inscribir en Competición
              </h3>
            </div>
            <form onSubmit={handleEnrollTournament} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre del Torneo / Copa</label>
                <input 
                  type="text" 
                  required 
                  value={enrollTourName} 
                  onChange={(e) => setEnrollTourName(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-slate-700" 
                  placeholder="Ej. Copa Oro FFCV, Avantia Cup" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipo del Club</label>
                <select 
                  value={enrollTeamId}
                  onChange={(e) => setEnrollTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-sm"
                >
                  {clubTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category || 'General'})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowEnrollModal(false)}
                  className="w-1/2 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs hover:bg-brand-700 transition-colors shadow-md"
                >
                  Confirmar Alta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
