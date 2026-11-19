import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  Trash2, 
  AlertTriangle, 
  Package, 
  Users, 
  DollarSign, 
  ExternalLink,
  Sparkles,
  Lock,
  LogOut,
  Sliders,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Filter,
  Check,
  RefreshCw,
  TrendingUp,
  Percent,
  Settings,
  Download,
  FileText,
  Calendar,
  ArrowUpRight,
  BarChart3,
  Clock,
  Activity,
  Phone,
  MessageSquare,
  Shield
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdminPortalModal: React.FC = () => {
  const { 
    isAdminModalOpen, 
    setIsAdminModalOpen, 
    isAdminAuthenticated,
    superAdminEmail,
    logoutAdmin,
    listings, 
    allUsers,
    escrowPayments, 
    reports, 
    resolveReport, 
    toggleUserVerification,
    toggleUserBlocked,
    adminDeleteListing,
    adminToggleBoost,
    releaseEscrowFunds,
    refundEscrowPayment,
    platformSettings,
    updatePlatformSettings,
    openListingDetail,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'users' | 'escrow' | 'reports' | 'settings'>('overview');
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [listingSearch, setListingSearch] = useState('');
  const [listingFilter, setListingFilter] = useState<'all' | 'active' | 'sold' | 'boosted'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified' | 'blocked'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live settings state
  const [feePercent, setFeePercent] = useState(platformSettings.escrowFeePercent);
  const [boostFee, setBoostFee] = useState(platformSettings.boostPriceFCFA);
  const [maintenance, setMaintenance] = useState(platformSettings.maintenanceMode);
  const [autoApprove, setAutoApprove] = useState(platformSettings.autoApproveListings);

  // Region / City distribution (must run unconditionally before early return)
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    listings.forEach(l => {
      counts[l.city] = (counts[l.city] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [listings]);

  // Filter listings (must run unconditionally before early return)
  const filteredAdminListings = useMemo(() => {
    return listings.filter(l => {
      if (listingFilter === 'active' && l.status !== 'active') return false;
      if (listingFilter === 'sold' && l.status !== 'sold') return false;
      if (listingFilter === 'boosted' && !l.isFeatured) return false;
      if (!listingSearch.trim()) return true;
      const q = listingSearch.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) || 
        l.seller.name.toLowerCase().includes(q) || 
        l.city.toLowerCase().includes(q)
      );
    });
  }, [listings, listingSearch, listingFilter]);

  // Filter users (must run unconditionally before early return)
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (userFilter === 'verified' && !u.isVerified) return false;
      if (userFilter === 'unverified' && u.isVerified) return false;
      if (userFilter === 'blocked' && !u.isBlocked) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) || 
        (u.email && u.email.toLowerCase().includes(q)) || 
        u.phone.includes(q)
      );
    });
  }, [allUsers, userSearch, userFilter]);

  // Strictly protected: only visible and accessible by champine00@gmail.com
  if (!isAdminModalOpen || !isAdminAuthenticated) return null;

  // Financial statistics V2
  const totalEscrowVolume = escrowPayments.reduce((acc, p) => acc + p.total, 0);
  const totalCommissionsEarned = escrowPayments.reduce((acc, p) => acc + p.fee, 0);
  const totalBoostRevenue = listings.filter(l => l.isFeatured).length * platformSettings.boostPriceFCFA;
  const totalPlatformRevenue = totalCommissionsEarned + totalBoostRevenue;

  // Escrow breakdown by operator (Wave vs Orange Money)
  const waveTransactions = escrowPayments.filter(p => p.paymentMethod === 'wave');
  const omTransactions = escrowPayments.filter(p => p.paymentMethod === 'orange_money');
  const waveVolume = waveTransactions.reduce((acc, p) => acc + p.total, 0);
  const omVolume = omTransactions.reduce((acc, p) => acc + p.total, 0);
  const totalTransCount = escrowPayments.length || 1;
  const wavePercent = Math.round((waveTransactions.length / totalTransCount) * 100);
  const omPercent = 100 - wavePercent;

  // In escrow (pending delivery)
  const pendingEscrowPayments = escrowPayments.filter(p => p.status === 'in_escrow');
  const pendingEscrowAmount = pendingEscrowPayments.reduce((acc, p) => acc + p.total, 0);

  const pendingReports = reports.filter(r => r.status === 'pending');
  const activeListings = listings.filter(l => l.status === 'active');
  const soldListings = listings.filter(l => l.status === 'sold');
  const boostedListings = listings.filter(l => l.isFeatured);

  // Live refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Données du Tableau de Bord V2 actualisées en direct ⚡', 'success');
    }, 400);
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const header = 'Type,ID,Titre_ou_Nom,Montant_FCFA,Statut,Methode_ou_Ville,Date\n';
      const escrowRows = escrowPayments.map(p => 
        `Paiement_Escrow,${p.id},"${p.listingTitle.replace(/"/g, '""')}",${p.total},${p.status},${p.paymentMethod},${p.createdAt}`
      );
      const listingRows = listings.map(l => 
        `Annonce,${l.id},"${l.title.replace(/"/g, '""')}",${l.price},${l.status},${l.city},${l.condition}`
      );
      const csvString = 'data:text/csv;charset=utf-8,' + encodeURIComponent(header + escrowRows.concat(listingRows).join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', csvString);
      downloadAnchor.setAttribute('download', `samadeal_rapport_v2_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      showToast('Export CSV du Tableau de Bord V2 téléchargé ! 📊', 'success');
    } catch {
      showToast('Erreur lors de la génération du rapport CSV.', 'warning');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformSettings({
      escrowFeePercent: Number(feePercent),
      boostPriceFCFA: Number(boostFee),
      maintenanceMode: maintenance,
      autoApproveListings: autoApprove
    });
    showToast('Paramètres de la plateforme mis à jour avec succès.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header V2 */}
        <div className="px-5 sm:px-8 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md font-black text-lg shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400">SamaDeal Sénégal</span>
                <span className="text-slate-600">/</span>
                <h3 className="text-base font-black tracking-tight text-white">Tableau de Bord V2</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Accès Exclusif
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Propriétaire habilité : <strong className="text-emerald-400">{superAdminEmail}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Quick Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Exporter le rapport comptable CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Rapport CSV</span>
            </button>

            {/* Refresh Live Data */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Lock Session */}
            <button
              onClick={logoutAdmin}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Verrouiller la session administrateur"
            >
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Verrouiller</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation V2 */}
        <div className="px-5 sm:px-8 py-2.5 bg-slate-800 text-slate-300 flex items-center justify-between gap-4 overflow-x-auto border-b border-slate-700">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'overview', label: 'Tableau de Bord V2', icon: BarChart3, count: null },
              { id: 'listings', label: 'Annonces', icon: Package, count: listings.length },
              { id: 'users', label: 'Vendeurs & Membres', icon: Users, count: allUsers.length },
              { id: 'escrow', label: 'Séquestres Wave/OM', icon: ShieldCheck, count: escrowPayments.length },
              { id: 'reports', label: 'Modération', icon: AlertTriangle, count: pendingReports.length },
              { id: 'settings', label: 'Configuration V2', icon: Settings, count: null }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === tab.id ? 'bg-emerald-800 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Timeframe Filter */}
          <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-700 text-[11px] font-semibold shrink-0">
            {[
              { id: 'today', label: 'Aujourd\'hui' },
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: 'all', label: 'Tout' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  timeframe === t.id 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Viewport */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
          {/* TAB 1: OVERVIEW / TABLEAU DE BORD V2 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top 4 Performance KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Chiffre d'Affaires Net */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>Revenus Net SamaDeal</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-700 tabular-nums">
                    {totalPlatformRevenue.toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
                    <span className="text-emerald-600 font-bold flex items-center">
                      <ArrowUpRight className="w-3 h-3" /> +18.4%
                    </span>
                    <span>· Commissions + {boostedListings.length} Boosts</span>
                  </div>
                </div>

                {/* KPI 2: Volume Total Escrow */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>Volume Garanti Wave & OM</span>
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                    {totalEscrowVolume.toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    {escrowPayments.length} paiements sécurisés au Sénégal
                  </div>
                </div>

                {/* KPI 3: Séquestres Actifs en Transit */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>Fonds Détenus sous Séquestre</span>
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-700 tabular-nums">
                    {pendingEscrowAmount.toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    {pendingEscrowPayments.length} transactions en attente de livraison
                  </div>
                </div>

                {/* KPI 4: Annonces & Conversion */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>Catalogue Annonces</span>
                    <Package className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                    {listings.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">{activeListings.length} actives</span>
                    <span>·</span>
                    <span className="text-slate-400">{soldListings.length} vendues</span>
                  </div>
                </div>
              </div>

              {/* Analytics Section V2: Mobile Money Channels & City Map */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 cols: Mobile Money Channels & Escrow Protection */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Répartition des Flux Mobile Money (Sénégal)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supervision en temps réel des transactions protégées par séquestre
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Commission : {platformSettings.escrowFeePercent}%
                    </span>
                  </div>

                  {/* Channel Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${wavePercent}%` }} 
                        className="h-full bg-sky-500 transition-all duration-500" 
                        title={`Wave Sénégal : ${wavePercent}%`}
                      />
                      <div 
                        style={{ width: `${omPercent}%` }} 
                        className="h-full bg-orange-500 transition-all duration-500" 
                        title={`Orange Money : ${omPercent}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span className="font-semibold text-slate-800">Wave Sénégal ({wavePercent}%)</span>
                        <span className="text-slate-400 font-mono tabular-nums">· {waveVolume.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span className="font-semibold text-slate-800">Orange Money ({omPercent}%)</span>
                        <span className="text-slate-400 font-mono tabular-nums">· {omVolume.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>

                  {/* Escrow Quick Release Strip */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700">Transactions sous séquestre récentes</span>
                      <button 
                        onClick={() => setActiveTab('escrow')}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Gérer les séquestres ({escrowPayments.length})
                      </button>
                    </div>

                    <div className="space-y-2">
                      {escrowPayments.slice(0, 3).map((p) => (
                        <div key={p.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl flex items-center justify-between text-xs transition-colors">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 truncate">{p.listingTitle}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>Acheteur : {p.buyerName}</span>
                              <span>·</span>
                              <span className={p.paymentMethod === 'wave' ? 'text-sky-600 font-semibold' : 'text-orange-600 font-semibold'}>
                                {p.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-slate-900 tabular-nums">
                              {p.total.toLocaleString('fr-FR')} F
                            </div>
                            <div className="mt-0.5">
                              {p.status === 'in_escrow' ? (
                                <button
                                  onClick={() => releaseEscrowFunds(p.id)}
                                  className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                                >
                                  Libérer fonds
                                </button>
                              ) : (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  p.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {p.status === 'delivered' ? 'Livré & Payé' : 'Remboursé'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Geographic Presence & Moderation Alerts */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Top Cities */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Répartition par Ville & Région
                    </h4>
                    <div className="space-y-2">
                      {cityCounts.slice(0, 4).map(([cityName, count]) => {
                        const pct = Math.round((count / (listings.length || 1)) * 100);
                        return (
                          <div key={cityName} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">{cityName}</span>
                              <span className="font-mono text-slate-500 tabular-nums">{count} annonces ({pct}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${pct}%` }} 
                                className="h-full bg-emerald-600 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Moderation Alerts */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <span>Signalements & Modération</span>
                        {pendingReports.length > 0 && (
                          <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                            {pendingReports.length} en attente
                          </span>
                        )}
                      </h4>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="text-xs text-emerald-600 font-bold hover:underline"
                      >
                        Traiter
                      </button>
                    </div>

                    {pendingReports.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        ✅ Aucun signalement en attente. Votre communauté est sereine.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingReports.slice(0, 2).map((r) => (
                          <div key={r.id} className="p-3 bg-red-50/60 rounded-xl border border-red-100 text-xs">
                            <div className="font-bold text-slate-900">{r.listingTitle}</div>
                            <div className="text-red-700 font-semibold mt-0.5">{r.reason}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5 truncate">"{r.details}"</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fast Super-Admin Actions Bar */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Actions Rapides Super-Administrateur</h5>
                    <p className="text-[11px] text-slate-400">
                      Gérez les paramètres globaux de la plateforme en un clic
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveTab('listings')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
                  >
                    Gérer le catalogue
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
                  >
                    Vérifier les vendeurs
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Configurer tarifs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LISTINGS CATALOG V2 */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher annonce, vendeur, ville..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'active', label: 'Actives' },
                    { id: 'sold', label: 'Vendues' },
                    { id: 'boosted', label: 'Boostées VIP' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setListingFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        listingFilter === f.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Article</th>
                        <th className="py-3 px-3">Prix FCFA</th>
                        <th className="py-3 px-3">Vendeur</th>
                        <th className="py-3 px-3">Ville</th>
                        <th className="py-3 px-3">Statut</th>
                        <th className="py-3 px-3 text-right">Actions Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdminListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={listing.images[0]} 
                                alt="" 
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                              />
                              <div className="min-w-0 max-w-[220px]">
                                <div className="font-bold text-slate-900 truncate">{listing.title}</div>
                                <div className="text-[10px] text-slate-400">{listing.condition}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                            {listing.price.toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{listing.seller.name}</div>
                            <div className="text-[10px] text-slate-400">{listing.seller.phone}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {listing.city} {listing.neighborhood ? `(${listing.neighborhood})` : ''}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {listing.status === 'sold' ? (
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded">
                                  Vendu
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                  En ligne
                                </span>
                              )}
                              {listing.isFeatured && (
                                <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded">
                                  VIP
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => adminToggleBoost(listing.id)}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  listing.isFeatured
                                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                                title={listing.isFeatured ? 'Retirer le boost' : 'Booster l\'annonce'}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openListingDetail(listing)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                title="Voir l'annonce"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => adminDeleteListing(listing.id)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS & SELLERS V2 */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher vendeur, nom, email, tél..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'verified', label: 'Vérifiés' },
                    { id: 'unverified', label: 'Non vérifiés' },
                    { id: 'blocked', label: 'Suspendus' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setUserFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        userFilter === f.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Utilisateur</th>
                        <th className="py-3 px-3">Contact</th>
                        <th className="py-3 px-3">Localisation</th>
                        <th className="py-3 px-3">Note & Ventes</th>
                        <th className="py-3 px-3">Statut Badge</th>
                        <th className="py-3 px-3 text-right">Actions Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={user.avatar} 
                                alt="" 
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" 
                              />
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span>{user.name}</span>
                                  {user.role === 'admin' && (
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded">
                                      PROPRIÉTAIRE
                                    </span>
                                  )}
                                  {user.isBlocked && (
                                    <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[9px] font-bold rounded">
                                      SUSPENDU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Membre depuis {user.memberSince}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-700">{user.phone}</div>
                            <div className="text-[10px] text-slate-400">{user.email || 'Non renseigné'}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {user.city}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-amber-600 font-bold tabular-nums">★ {user.rating}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">{user.totalSales} ventes</div>
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => toggleUserVerification(user.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                                user.isVerified
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{user.isVerified ? 'Vérifié' : 'Non vérifié'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => toggleUserBlocked(user.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                  user.isBlocked
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                {user.isBlocked ? 'Réactiver' : 'Suspendre'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ESCROW TRANSACTIONS V2 */}
          {activeTab === 'escrow' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold">Supervision Séquestre Wave & Orange Money V2</h4>
                  <p className="mt-0.5 leading-relaxed text-emerald-800">
                    En tant que super-administrateur (<strong className="font-semibold text-emerald-900">{superAdminEmail}</strong>), vous avez autorité pour libérer les fonds au vendeur ou rembourser l'acheteur en cas de litige.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
                >
                  Exporter Séquestres CSV
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Transaction / Article</th>
                        <th className="py-3 px-3">Montant Total</th>
                        <th className="py-3 px-3">Commission SamaDeal</th>
                        <th className="py-3 px-3">Méthode</th>
                        <th className="py-3 px-3">Statut</th>
                        <th className="py-3 px-3 text-right">Arbitrage Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {escrowPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.listingTitle}</div>
                            <div className="text-[10px] text-slate-500">
                              Acheteur : {p.buyerName} ({p.buyerPhone}) → Vendeur : {p.sellerName}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                            {p.total.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700 tabular-nums">
                            +{p.fee.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              p.paymentMethod === 'wave' ? 'bg-sky-100 text-sky-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {p.paymentMethod === 'wave' ? 'Wave Sénégal' : 'Orange Money'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'refunded'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.status === 'delivered' ? 'Fonds versés' : p.status === 'refunded' ? 'Remboursé' : 'Sous séquestre'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {p.status === 'in_escrow' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => releaseEscrowFunds(p.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-colors"
                                  title="Libérer les fonds au vendeur"
                                >
                                  Payer Vendeur
                                </button>
                                <button
                                  onClick={() => refundEscrowPayment(p.id)}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[10px] transition-colors"
                                  title="Rembourser l'acheteur"
                                >
                                  Rembourser
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Clôturé</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS & MODERATION V2 */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Signalements émis par les acheteurs ({reports.length})
              </h4>

              {reports.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  Aucun signalement en attente.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{report.listingTitle}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            report.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : report.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {report.status === 'pending' ? 'À traiter' : report.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-red-600">
                          Motif : {report.reason}
                        </div>
                        <p className="text-xs text-slate-600">
                          "{report.details}"
                        </p>
                        <div className="text-[10px] text-slate-400">
                          Signalé le {report.createdAt}
                        </div>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => resolveReport(report.id, 'dismiss')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                          >
                            Classer sans suite
                          </button>
                          <button
                            onClick={() => resolveReport(report.id, 'remove_listing')}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer l'annonce</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS V2 */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Paramètres de la plateforme SamaDeal V2</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ces réglages influent directement sur le modèle économique et les frais de service.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Commission de protection séquestre (%)
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={feePercent}
                      onChange={(e) => setFeePercent(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Actuellement {platformSettings.escrowFeePercent}% sur chaque transaction Wave / OM sécurisée.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tarif SamaDeal Boost (FCFA)
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="100"
                      min="500"
                      value={boostFee}
                      onChange={(e) => setBoostFee(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">FCFA</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Prix facturé aux vendeurs pour 7 jours de sponsorisation.
                  </span>
                </div>

                <div className="pt-2 space-y-3 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoApprove}
                      onChange={(e) => setAutoApprove(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Validation automatique des nouvelles annonces
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintenance}
                      onChange={(e) => setMaintenance(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-xs font-semibold text-red-700">
                      Activer le mode maintenance temporaire
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Enregistrer les paramètres V2
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
