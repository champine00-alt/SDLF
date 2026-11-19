import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Key, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdminAuthModal: React.FC = () => {
  const { 
    isAdminAuthModalOpen, 
    setIsAdminAuthModalOpen, 
    loginAsAdmin, 
    loginWithGoogle,
    superAdminEmail,
    currentUser,
    openAuthModal
  } = useApp();

  const [email, setEmail] = useState(superAdminEmail || 'champine00@gmail.com');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isAdminAuthModalOpen) return null;

  const isCurrentSuperAdmin = currentUser?.email?.toLowerCase().trim() === 'champine00@gmail.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsAdmin(email, pin);
  };

  const handleQuickUnlock = () => {
    loginAsAdmin('champine00@gmail.com', 'admin');
  };

  const handleGoogleAdminLogin = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        setIsAdminAuthModalOpen(false);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsAdminAuthModalOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-lg mb-4 ring-4 ring-emerald-500/20">
            <Lock className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-black text-slate-950 tracking-tight">
            Tableau de Bord Admin V2
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Accès sécurisé et confidentiel, uniquement visible et réservé au compte <strong>{superAdminEmail}</strong>.
          </p>
        </div>

        {isCurrentSuperAdmin ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Compte Propriétaire Identifié</span>
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Vous êtes actuellement connecté avec l'adresse autorisée <strong>{currentUser.email}</strong>.
              </p>
            </div>

            <button
              onClick={handleQuickUnlock}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Key className="w-4 h-4" />
              <span>Ouvrir mon Tableau de Bord V2</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm flex items-center justify-center gap-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>{isGoogleLoading ? 'Connexion à Google...' : 'Se connecter directement avec Google'}</span>
            </button>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Adresse e-mail autorisée
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="champine00@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Mot de passe administrateur</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Mot de passe du compte"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-widest focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Cet espace est strictement inaccessible aux autres utilisateurs. Seul <strong>{superAdminEmail}</strong> est habilité.
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Déverrouiller le Tableau de Bord V2</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAdminAuthModalOpen(false);
                  openAuthModal('login');
                }}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
              >
                Se connecter avec mon compte utilisateur
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
