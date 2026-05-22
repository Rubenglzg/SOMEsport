import { useState, useEffect } from 'react';
import { Calendar, Loader2, CheckCircle, Building2, DollarSign, Clock, Search, ChevronDown, AlertTriangle } from 'lucide-react';
import { getClubSeasons, type Season } from '../../lib/seasonsService';
import { getClubs } from '../../lib/userService';
import type { UserProfile } from '../../store/authStore';

interface ClubSeasonGroup {
  club: UserProfile;
  seasons: Season[];
}

export function AdminSeasonsPage() {
  const [clubGroups, setClubGroups] = useState<ClubSeasonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'noSeason' | 'installments'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const clubsData = await getClubs();
      const groups: ClubSeasonGroup[] = [];
      for (const club of clubsData) {
        if (!club.uid) continue;
        const clubSeasons = await getClubSeasons(club.uid);
        groups.push({ club, seasons: clubSeasons });
      }
      setClubGroups(groups);
    } catch (error) {
      console.error("Error loading seasons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Stats
  const totalClubs = clubGroups.length;
  const clubsWithActive = clubGroups.filter(g => g.seasons.some(s => s.isActive)).length;
  const clubsWithInstallments = clubGroups.filter(g => g.seasons.some(s => s.paymentInstallments?.enabled)).length;
  const clubsWithoutSeasons = clubGroups.filter(g => g.seasons.length === 0).length;
  const totalSeasons = clubGroups.reduce((sum, g) => sum + g.seasons.length, 0);

  // Filtering
  const filteredGroups = clubGroups
    .filter(g => (g.club.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(g => {
      if (filterMode === 'active') return g.seasons.some(s => s.isActive);
      if (filterMode === 'noSeason') return g.seasons.length === 0;
      if (filterMode === 'installments') return g.seasons.some(s => s.paymentInstallments?.enabled);
      return true;
    });

  const toggleExpand = (uid: string) => {
    setExpandedClubId(expandedClubId === uid ? null : uid);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 text-violet-600 rounded-xl"><Calendar className="w-7 h-7" /></div>
          Supervisión de Temporadas
        </h1>
        <p className="text-slate-500 mt-2 text-base">Vista panorámica de las temporadas, cuotas y plazos configurados por cada club.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button onClick={() => setFilterMode('all')} className={`rounded-2xl p-4 text-left transition-all border ${filterMode === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
          <p className={`text-2xl font-black ${filterMode === 'all' ? 'text-white' : 'text-slate-900'}`}>{totalClubs}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${filterMode === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Clubes Total</p>
        </button>
        <button onClick={() => setFilterMode('active')} className={`rounded-2xl p-4 text-left transition-all border ${filterMode === 'active' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-200'}`}>
          <p className={`text-2xl font-black ${filterMode === 'active' ? 'text-white' : 'text-emerald-600'}`}>{clubsWithActive}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${filterMode === 'active' ? 'text-emerald-100' : 'text-emerald-500'}`}>Temp. Activa</p>
        </button>
        <button onClick={() => setFilterMode('installments')} className={`rounded-2xl p-4 text-left transition-all border ${filterMode === 'installments' ? 'bg-amber-600 text-white border-amber-600 shadow-lg' : 'bg-amber-50 border-amber-100 hover:border-amber-200'}`}>
          <p className={`text-2xl font-black ${filterMode === 'installments' ? 'text-white' : 'text-amber-600'}`}>{clubsWithInstallments}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${filterMode === 'installments' ? 'text-amber-100' : 'text-amber-500'}`}>Con Plazos</p>
        </button>
        <button onClick={() => setFilterMode('noSeason')} className={`rounded-2xl p-4 text-left transition-all border ${filterMode === 'noSeason' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-red-50 border-red-100 hover:border-red-200'}`}>
          <p className={`text-2xl font-black ${filterMode === 'noSeason' ? 'text-white' : 'text-red-600'}`}>{clubsWithoutSeasons}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${filterMode === 'noSeason' ? 'text-red-100' : 'text-red-500'}`}>Sin Configurar</p>
        </button>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-2xl font-black text-indigo-600">{totalSeasons}</p>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-1">Temporadas Creadas</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar club por nombre..."
          className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500 transition-all w-full"
        />
      </div>

      {/* Club list */}
      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center p-16 bg-white border border-slate-200 rounded-3xl">
          <Building2 className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-900 text-lg">No hay clubes con este filtro</h3>
          <p className="text-sm text-slate-500 mt-1">Prueba con otro filtro o término de búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(group => {
            const isExpanded = expandedClubId === group.club.uid;
            const activeSeason = group.seasons.find(s => s.isActive);
            const hasSeason = group.seasons.length > 0;

            return (
              <div key={group.club.uid} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                !hasSeason ? 'border-red-200 bg-red-50/20' : activeSeason ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'
              }`}>
                {/* Club Row */}
                <button
                  onClick={() => hasSeason && toggleExpand(group.club.uid!)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                      {group.club.photoURL ? (
                        <img src={group.club.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        group.club.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{group.club.name}</p>
                      <p className="text-xs text-slate-500">@{group.club.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!hasSeason ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> Sin temporada
                      </span>
                    ) : (
                      <>
                        {activeSeason ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                            <CheckCircle className="inline w-3 h-3 mr-1" />{activeSeason.name}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                            Sin activa
                          </span>
                        )}
                        {activeSeason?.feesByCategory && Object.keys(activeSeason.feesByCategory).length > 0 && (
                          <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-100 hidden sm:inline-flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />{Object.keys(activeSeason.feesByCategory).length} cat.
                          </span>
                        )}
                        {group.seasons.some(s => s.paymentInstallments?.enabled) && (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 hidden sm:inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />Plazos
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                          {group.seasons.length}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-3">
                    {group.seasons.map(season => (
                      <div key={season.id} className={`p-5 rounded-2xl border bg-white transition-all ${season.isActive ? 'border-violet-300 ring-1 ring-violet-100' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-4 h-4 ${season.isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                            <h4 className="font-bold text-slate-900">{season.name}</h4>
                            {season.isActive && (
                              <span className="text-[10px] font-black px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md uppercase tracking-wider border border-violet-200">Activa</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{season.startDate} — {season.endDate}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="font-bold px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg">
                            Cuota base: {season.fee}€
                          </span>

                          {season.feesByCategory && Object.entries(season.feesByCategory).map(([cat, catFee]) => (
                            <span key={cat} className="font-bold px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                              <DollarSign className="inline w-3 h-3 mr-0.5" />{cat}: {catFee}€
                            </span>
                          ))}

                          {season.paymentInstallments?.enabled && season.paymentInstallments.installments.map((inst, i) => (
                            <span key={i} className="font-bold px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                              <Clock className="inline w-3 h-3 mr-0.5" />{inst.name}: {inst.percentage}%{inst.dueDate ? ` (${inst.dueDate})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
