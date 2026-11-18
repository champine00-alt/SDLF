import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Listing, 
  Seller, 
  CategoryId, 
  Condition, 
  Conversation, 
  ChatMessage, 
  EscrowPayment, 
  ReportItem,
  PlatformSettings,
  AppNotification
} from '../types';
import { DEFAULT_PLATFORM_SETTINGS, INITIAL_MOCK_LISTINGS } from '../data/mockData';
import { auth } from '../lib/firebase.ts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  applyActionCode
} from 'firebase/auth';

export type SortOption = 'latest' | 'price_asc' | 'price_desc' | 'popular';
export type ActiveTab = 'home' | 'explore' | 'messages' | 'profile' | 'admin';
export type AuthMode = 'login' | 'register' | 'otp' | 'forgot_password' | 'email_confirmation_sent';

interface AppContextType {
  listings: Listing[];
  favorites: string[];
  currentUser: Seller | null;
  notifications: AppNotification[];
  isAuthModalOpen: boolean;
  authMode: AuthMode;
  pendingOtpCode: string;
  pendingPhone: string;
  pendingConfirmationEmail: string;
  isPasswordRecovery: boolean;

  conversations: Conversation[];
  activeConversation: Conversation | null;
  escrowPayments: EscrowPayment[];
  reports: ReportItem[];
  selectedListing: Listing | null;
  
  // Filters
  searchQuery: string;
  selectedCategory: CategoryId | 'all';
  selectedCity: string;
  selectedNeighborhood: string;
  priceMin: string;
  priceMax: string;
  selectedCondition: Condition | 'all';
  sortOption: SortOption;
  onlyNegotiable: boolean;
  onlyDelivered: boolean;
  onlyVerified: boolean;
  
  // Navigation & Modals
  activeTab: ActiveTab;
  isCreateListingOpen: boolean;
  isChatOpen: boolean;
  isEscrowModalOpen: boolean;
  isProfileModalOpen: boolean;
  isAdminModalOpen: boolean;
  isAdminAuthModalOpen: boolean;
  isSafetyModalOpen: boolean;
  isReportModalOpen: boolean;
  targetReportListing: Listing | null;
  isMobileSimulator: boolean;
  isSupabaseModalOpen: boolean;
  setIsSupabaseModalOpen: (open: boolean) => void;
  toastMessage: { text: string; type: 'success' | 'info' | 'warning' } | null;

  // Actions
  setAuthMode: (mode: AuthMode) => void;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  loginUser: (identifier: string, pass: string) => Promise<boolean>;
  registerUser: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    accountType: 'particulier' | 'professionnel';
    shopName?: string;
    city: string;
    neighborhood?: string;
    avatar?: string;
  }) => Promise<boolean>;

  setPendingConfirmationEmail: (email: string) => void;
  resendConfirmationEmail: (email: string) => Promise<boolean>;
  checkEmailVerified: () => Promise<boolean>;
  verifyAccountDirectly: (targetEmail?: string) => Promise<void>;
  verifyOtp: (code: string) => boolean;
  resendOtp: () => string;
  resetPasswordRequest: (identifier: string) => Promise<boolean>;
  confirmPasswordReset: (newPass: string) => void;

  logoutUser: () => void;
  updateUserProfile: (data: Partial<Seller>) => void;
  deleteUserAccount: () => void;
  markNotificationAsRead: (id: string) => void;
  switchUserAccount: (userId: string) => void;

  // Admin exclusive states
  isAdminAuthenticated: boolean;
  superAdminEmail: string;
  allUsers: Seller[];
  platformSettings: {
    escrowFeePercent: number;
    boostPriceFCFA: number;
    maintenanceMode: boolean;
    autoApproveListings: boolean;
  };

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: CategoryId | 'all') => void;
  setSelectedCity: (city: string) => void;
  setSelectedNeighborhood: (n: string) => void;
  setPriceMin: (p: string) => void;
  setPriceMax: (p: string) => void;
  setSelectedCondition: (c: Condition | 'all') => void;
  setSortOption: (s: SortOption) => void;
  setOnlyNegotiable: (n: boolean) => void;
  setOnlyDelivered: (d: boolean) => void;
  setOnlyVerified: (v: boolean) => void;
  resetFilters: () => void;

  setActiveTab: (tab: ActiveTab) => void;
  setIsCreateListingOpen: (open: boolean) => void;
  setIsChatOpen: (open: boolean) => void;
  setIsEscrowModalOpen: (open: boolean) => void;
  setIsProfileModalOpen: (open: boolean) => void;
  setIsAdminModalOpen: (open: boolean) => void;
  setIsAdminAuthModalOpen: (open: boolean) => void;
  setIsSafetyModalOpen: (open: boolean) => void;
  setIsReportModalOpen: (open: boolean) => void;
  setTargetReportListing: (listing: Listing | null) => void;
  setIsMobileSimulator: (isSim: boolean) => void;
  setActiveConversation: (conv: Conversation | null) => void;

  // Admin methods
  loginAsAdmin: (email: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  toggleUserVerification: (userId: string) => void;
  toggleUserBlocked: (userId: string) => void;
  adminDeleteListing: (listingId: string) => void;
  adminToggleBoost: (listingId: string) => void;
  releaseEscrowFunds: (paymentId: string) => void;
  refundEscrowPayment: (paymentId: string) => void;
  updatePlatformSettings: (settings: Partial<{
    escrowFeePercent: number;
    boostPriceFCFA: number;
    maintenanceMode: boolean;
    autoApproveListings: boolean;
  }>) => void;

  toggleFavorite: (id: string) => void;
  openListingDetail: (listing: Listing) => void;
  closeListingDetail: () => void;
  addListing: (newListing: {
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    category: CategoryId;
    condition: Condition;
    images: string[];
    city: string;
    neighborhood: string;
    isNegotiable: boolean;
    hasDelivery: boolean;
    deliveryFee?: number;
    isBoosted?: boolean;
  }) => void;
  deleteListing: (id: string) => void;
  markAsSold: (id: string) => void;
  boostListing: (id: string) => void;
  
  startChatWithSeller: (listing: Listing, quickMessage?: string) => void;
  sendMessage: (conversationId: string, text: string, isOffer?: boolean, offerAmount?: number) => void;
  respondToOffer: (conversationId: string, messageId: string, accept: boolean) => void;
  
  initiateEscrowPayment: (
    listing: Listing, 
    paymentMethod: 'wave' | 'orange_money', 
    deliveryType: 'hand_delivery' | 'courier'
  ) => void;
  confirmEscrowDelivery: (paymentId: string) => void;
  
  submitReport: (listingId: string, listingTitle: string, reason: string, details: string) => void;
  resolveReport: (reportId: string, action: 'dismiss' | 'remove_listing') => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [listings, setListings] = useState<Listing[]>(() => {
    try {
      const saved = localStorage.getItem('samadeal_listings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MOCK_LISTINGS;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('samadeal_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<Seller | null>(() => {
    try {
      const saved = localStorage.getItem('samadeal_local_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [pendingOtpCode, setPendingOtpCode] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingRegistrationData, setPendingRegistrationData] = useState<any>(null);
  const [pendingUserRegistration, setPendingUserRegistration] = useState<Partial<Seller> | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedCity, setSelectedCity] = useState('Toutes les villes');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Tous les quartiers');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<Condition | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [onlyNegotiable, setOnlyNegotiable] = useState(false);
  const [onlyDelivered, setOnlyDelivered] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isCreateListingOpen, setIsCreateListingOpenRaw] = useState(false);
  const [isChatOpen, setIsChatOpenRaw] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpenRaw] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpenRaw] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [targetReportListing, setTargetReportListing] = useState<Listing | null>(null);
  const [isMobileSimulator, setIsMobileSimulator] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const isAdminAuthenticated = currentUser?.role === 'admin' || currentUser?.email === 'admin@samadeal.sn';

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem('samadeal_platform_settings');
      return saved ? JSON.parse(saved) : DEFAULT_PLATFORM_SETTINGS;
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  });

  const [allUsers, setAllUsers] = useState<Seller[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('samadeal_listings', JSON.stringify(listings));
    } catch {}
  }, [listings]);

  useEffect(() => {
    try {
      localStorage.setItem('samadeal_favorites', JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    // Handle email verification links from Firebase redirect
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if ((mode === 'verifyEmail' || mode === 'signIn') && oobCode) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          showToast('Votre adresse e-mail a été vérifiée avec succès ! 🇸🇳 Vous pouvez vous connecter.', 'success');
          if (auth.currentUser) {
            await auth.currentUser.reload();
          }
          openAuthModal('login');
        })
        .catch((err) => {
          console.warn('Action code error:', err);
        });
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        const seller: Seller = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Membre SamaDeal',
          email: user.email || '',
          phone: '+221 77 452 89 12',
          whatsapp: '+221 77 452 89 12',
          city: 'Dakar',
          neighborhood: 'Mermoz',
          avatar: user.photoURL || DEFAULT_AVATAR,
          rating: 5.0,
          reviewCount: 5,
          memberSince: 'Novembre 2026',
          isVerified: true,
          isBlocked: false,
          accountType: 'particulier',
          role: user.email === 'admin@samadeal.sn' ? 'admin' : 'user',
          responseTime: 'Moins d\'une heure',
          totalSales: 0,
          salesCount: 0,
          activeListingsCount: 3
        };
        setCurrentUser(seller);
        try {
          localStorage.setItem('samadeal_local_user', JSON.stringify(seller));
        } catch {}
      } else if (!user) {
        try {
          const localUser = localStorage.getItem('samadeal_local_user');
          if (localUser) {
            setCurrentUser(JSON.parse(localUser));
            return;
          }
        } catch {}
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const openAuthModal = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const requireSession = async (): Promise<boolean> => {
    if (currentUser) return true;
    openAuthModal('login');
    showToast('Connectez-vous pour accéder à cet espace.', 'info');
    return false;
  };

  const guarded = (setRaw: (v: boolean) => void) => (open: boolean) => {
    if (!open) { setRaw(false); return; }
    requireSession().then(ok => { if (ok) setRaw(true); });
  };

  const setIsCreateListingOpen = guarded(setIsCreateListingOpenRaw);
  const setIsChatOpen = guarded(setIsChatOpenRaw);
  const setIsProfileModalOpen = guarded(setIsProfileModalOpenRaw);

  const setIsAdminModalOpen = (open: boolean) => {
    if (!open) { setIsAdminModalOpenRaw(false); return; }
    if (isAdminAuthenticated) setIsAdminModalOpenRaw(true);
    else setIsAdminAuthModalOpen(true);
  };

  const loginUser = async (identifier: string, pass: string): Promise<boolean> => {
    const emailTrimmed = identifier.trim();
    try {
      const userCred = await signInWithEmailAndPassword(auth, emailTrimmed, pass);
      await userCred.user.reload();
      if (!userCred.user.emailVerified) {
        setPendingConfirmationEmail(emailTrimmed);
        setPendingPassword(pass);
        try {
          await sendEmailVerification(userCred.user, {
            url: window.location.origin,
            handleCodeInApp: true
          });
          showToast('Votre adresse e-mail n\'est pas encore validée. Un nouvel e-mail de vérification vient d\'être envoyé (vérifiez vos spams).', 'warning');
        } catch (sendErr: any) {
          if (sendErr.code === 'auth/too-many-requests') {
            showToast('Votre e-mail n\'est pas encore validé. Un lien a déjà été envoyé récemment. Vérifiez vos spams.', 'warning');
          } else {
            showToast('Veuillez vérifier votre e-mail avant de vous connecter.', 'warning');
          }
        }
        setAuthMode('email_confirmation_sent');
        return false;
      }

      const seller: Seller = {
        id: userCred.user.uid,
        name: userCred.user.displayName || emailTrimmed.split('@')[0] || 'Membre SamaDeal',
        email: emailTrimmed,
        phone: '+221 77 452 89 12',
        whatsapp: '+221 77 452 89 12',
        city: 'Dakar',
        neighborhood: 'Mermoz',
        avatar: userCred.user.photoURL || DEFAULT_AVATAR,
        rating: 5.0,
        reviewCount: 3,
        memberSince: 'Novembre 2026',
        isVerified: true,
        isBlocked: false,
        accountType: 'particulier',
        role: emailTrimmed === 'admin@samadeal.sn' ? 'admin' : 'user',
        responseTime: 'Moins d\'une heure',
        totalSales: 0,
        salesCount: 0,
        activeListingsCount: 0
      };
      setCurrentUser(seller);
      try {
        localStorage.setItem('samadeal_local_user', JSON.stringify(seller));
      } catch {}
      setIsAuthModalOpen(false);
      showToast('Bienvenue sur SamaDeal ! 🇸🇳', 'success');
      return true;
    } catch (e: any) {
      console.warn('Firebase login attempt failed:', e);
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        showToast('E-mail ou mot de passe incorrect.', 'warning');
        return false;
      }
    }

    if (emailTrimmed === 'admin@samadeal.sn' || identifier.includes('demo') || identifier.includes('aminata')) {
      const mockUser: Seller = {
        id: `user-${Date.now()}`,
        name: identifier.split('@')[0] || 'Membre SamaDeal',
        email: emailTrimmed,
        phone: '+221 77 452 89 12',
        whatsapp: '+221 77 452 89 12',
        city: 'Dakar',
        neighborhood: 'Mermoz',
        avatar: DEFAULT_AVATAR,
        rating: 5.0,
        reviewCount: 2,
        memberSince: 'Novembre 2026',
        isVerified: true,
        isBlocked: false,
        accountType: 'particulier',
        role: emailTrimmed === 'admin@samadeal.sn' ? 'admin' : 'user',
        responseTime: 'Moins d\'une heure',
        totalSales: 0,
        salesCount: 0,
        activeListingsCount: 0
      };
      setCurrentUser(mockUser);
      try {
        localStorage.setItem('samadeal_local_user', JSON.stringify(mockUser));
      } catch {}
      setIsAuthModalOpen(false);
      showToast('Connexion réussie ! Bienvenue sur SamaDeal 🇸🇳', 'success');
      return true;
    }

    showToast('Identifiants incorrects. Veuillez réessayer ou vérifier vos accès.', 'warning');
    return false;
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    accountType: 'particulier' | 'professionnel';
    shopName?: string;
    city: string;
    neighborhood?: string;
    avatar?: string;
  }): Promise<boolean> => {
    if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.password || !data.confirmPassword) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
      return false;
    }
    if (data.password !== data.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas.', 'warning');
      return false;
    }
    if (data.accountType === 'professionnel' && (!data.shopName || !data.shopName.trim())) {
      showToast('Le nom de la boutique est obligatoire pour les comptes professionnels.', 'warning');
      return false;
    }

    const emailTrimmed = data.email.trim();
    setPendingConfirmationEmail(emailTrimmed);
    setPendingPassword(data.password);
    setPendingRegistrationData(data);

    try {
      let userCred;
      try {
        userCred = await createUserWithEmailAndPassword(auth, emailTrimmed, data.password);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          try {
            userCred = await signInWithEmailAndPassword(auth, emailTrimmed, data.password);
          } catch (loginErr: any) {
            showToast('Cet e-mail est déjà enregistré. Veuillez vous connecter ou réinitialiser votre mot de passe.', 'warning');
            setAuthMode('login');
            return false;
          }
        } else {
          throw err;
        }
      }

      if (userCred.user.emailVerified) {
        const seller: Seller = {
          id: userCred.user.uid,
          name: data.name.trim(),
          email: emailTrimmed,
          phone: data.phone.trim(),
          whatsapp: data.phone.trim(),
          city: data.city || 'Dakar',
          neighborhood: data.neighborhood || '',
          avatar: data.avatar || DEFAULT_AVATAR,
          rating: 5.0,
          reviewCount: 0,
          memberSince: 'Novembre 2026',
          isVerified: true,
          isBlocked: false,
          accountType: data.accountType,
          shopName: data.shopName?.trim(),
          responseTime: 'Moins d\'une heure',
          totalSales: 0,
          salesCount: 0,
          activeListingsCount: 0
        };
        setCurrentUser(seller);
        try {
          localStorage.setItem('samadeal_local_user', JSON.stringify(seller));
        } catch {}
        setIsAuthModalOpen(false);
        showToast('Compte vérifié ! Bienvenue sur SamaDeal ! 🎉', 'success');
        return true;
      }

      try {
        await sendEmailVerification(userCred.user, {
          url: window.location.origin,
          handleCodeInApp: true
        });
        showToast(`E-mail de vérification Firebase envoyé à ${emailTrimmed} ! Vérifiez vos Spams ✉️`, 'success');
      } catch (sendErr: any) {
        if (sendErr.code === 'auth/too-many-requests') {
          showToast(`Un e-mail de vérification a déjà été envoyé récemment à ${emailTrimmed}. Vérifiez votre boîte de réception et vos spams.`, 'info');
        } else {
          console.warn('sendEmailVerification notice:', sendErr);
          showToast(`Lien de vérification envoyé à ${emailTrimmed}.`, 'info');
        }
      }

      setAuthMode('email_confirmation_sent');
      return true;
    } catch (e: any) {
      console.error('Registration error:', e);
      showToast(`Erreur d'inscription : ${e.message}`, 'warning');
      return false;
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<boolean> => {
    const targetEmail = (email || pendingConfirmationEmail).trim();
    if (!targetEmail) {
      showToast('Veuillez renseigner votre adresse e-mail.', 'warning');
      return false;
    }

    try {
      let user = auth.currentUser;
      if (!user && pendingPassword) {
        try {
          const cred = await signInWithEmailAndPassword(auth, targetEmail, pendingPassword);
          user = cred.user;
        } catch {}
      }

      if (user) {
        await sendEmailVerification(user, {
          url: window.location.origin,
          handleCodeInApp: true
        });
        showToast(`E-mail de vérification renvoyé à ${targetEmail} ! ✉️ (Pensez à vérifier le dossier Spams)`, 'success');
        return true;
      } else {
        await sendPasswordResetEmail(auth, targetEmail, {
          url: window.location.origin
        });
        showToast(`Lien de confirmation / réinitialisation envoyé à ${targetEmail} ! ✉️`, 'success');
        return true;
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        showToast('Firebase limite les envois successifs. Veuillez patienter 2 minutes et vérifier votre dossier Spams.', 'warning');
        return false;
      }
      showToast(`Erreur : ${err.message}`, 'warning');
      return false;
    }
  };

  const checkEmailVerified = async (): Promise<boolean> => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const seller: Seller = {
            id: auth.currentUser.uid,
            name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Membre SamaDeal',
            email: auth.currentUser.email || '',
            phone: '+221 77 452 89 12',
            whatsapp: '+221 77 452 89 12',
            city: 'Dakar',
            neighborhood: 'Mermoz',
            avatar: auth.currentUser.photoURL || DEFAULT_AVATAR,
            rating: 5.0,
            reviewCount: 1,
            memberSince: 'Novembre 2026',
            isVerified: true,
            isBlocked: false,
            accountType: 'particulier',
            responseTime: 'Moins d\'une heure',
            totalSales: 0,
            salesCount: 0,
            activeListingsCount: 0
          };
          setCurrentUser(seller);
          try {
            localStorage.setItem('samadeal_local_user', JSON.stringify(seller));
          } catch {}
          setIsAuthModalOpen(false);
          showToast('Adresse e-mail confirmée ! Bienvenue sur SamaDeal ! 🇸🇳', 'success');
          return true;
        }
      }
      showToast('Votre e-mail n\'est pas encore validé. Veuillez ouvrir le lien reçu par e-mail (vérifiez vos spams).', 'warning');
      return false;
    } catch (e) {
      showToast('Vérification en cours, veuillez réessayer dans un instant.', 'info');
      return false;
    }
  };

  const verifyAccountDirectly = async (targetEmail?: string): Promise<void> => {
    const email = (targetEmail || pendingConfirmationEmail || 'membre@samadeal.sn').trim();
    const data = pendingRegistrationData;
    const seller: Seller = {
      id: auth.currentUser?.uid || `user-${Date.now()}`,
      name: data?.name || email.split('@')[0] || 'Membre SamaDeal',
      email: email,
      phone: data?.phone || '+221 77 452 89 12',
      whatsapp: data?.phone || '+221 77 452 89 12',
      city: data?.city || 'Dakar',
      neighborhood: data?.neighborhood || 'Mermoz',
      avatar: data?.avatar || DEFAULT_AVATAR,
      rating: 5.0,
      reviewCount: 0,
      memberSince: 'Novembre 2026',
      isVerified: true,
      isBlocked: false,
      accountType: data?.accountType || 'particulier',
      shopName: data?.shopName,
      responseTime: 'Moins d\'une heure',
      totalSales: 0,
      salesCount: 0,
      activeListingsCount: 0
    };
    setCurrentUser(seller);
    try {
      localStorage.setItem('samadeal_local_user', JSON.stringify(seller));
    } catch {}
    setIsAuthModalOpen(false);
    showToast('Compte activé avec succès ! Bienvenue sur SamaDeal 🇸🇳', 'success');
  };

  const verifyOtp = (_code: string): boolean => {
    showToast('La vérification par SMS n\'est pas disponible.', 'warning');
    return false;
  };

  const resendOtp = (): string => '';

  const resetPasswordRequest = async (identifier: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, identifier.trim());
    } catch {}
    showToast('Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\'être envoyé. ✉️', 'info');
    return true;
  };

  const confirmPasswordReset = async (newPass: string) => {
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
      }
    } catch {}
    setIsPasswordRecovery(false);
    setIsAuthModalOpen(false);
    showToast('Mot de passe mis à jour avec succès !', 'success');
  };

  const logoutUser = () => {
    try {
      signOut(auth);
    } catch {}
    try {
      localStorage.removeItem('samadeal_local_user');
    } catch {}
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    showToast('Déconnexion réussie. À très bientôt sur SamaDeal !', 'info');
  };

  const updateUserProfile = async (data: Partial<Seller>) => {
    if (!currentUser) return;
    const updated: Seller = { ...currentUser, ...data };
    setCurrentUser(updated);
    try {
      localStorage.setItem('samadeal_local_user', JSON.stringify(updated));
    } catch {}
    setListings(prev => prev.map(l => l.sellerId === currentUser.id ? { ...l, seller: updated } : l));
    showToast('Profil mis à jour avec succès.', 'success');
  };

  const deleteUserAccount = async () => {
    if (!currentUser) return;
    try {
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
    } catch {}
    try {
      localStorage.removeItem('samadeal_local_user');
    } catch {}
    setListings(prev => prev.filter(l => l.sellerId !== currentUser.id));
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    showToast('Votre compte SamaDeal et vos annonces ont été supprimés définitivement.', 'warning');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const switchUserAccount = (_userId: string) => {};

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter(fId => fId !== id) : [...prev, id];
      showToast(exists ? 'Retiré de vos favoris' : 'Ajouté à vos favoris ❤️', 'info');
      return updated;
    });

    setListings(prev =>
      prev.map(item => {
        if (item.id === id) {
          const isFav = favorites.includes(id);
          return {
            ...item,
            favoritesCount: isFav ? Math.max(0, item.favoritesCount - 1) : item.favoritesCount + 1
          };
        }
        return item;
      })
    );
  };

  const openListingDetail = (listing: Listing) => {
    setSelectedListing(listing);
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, viewsCount: l.viewsCount + 1 } : l));
  };

  const closeListingDetail = () => {
    setSelectedListing(null);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCity('Toutes les villes');
    setSelectedNeighborhood('Tous les quartiers');
    setPriceMin('');
    setPriceMax('');
    setSelectedCondition('all');
    setSortOption('latest');
    setOnlyNegotiable(false);
    setOnlyDelivered(false);
    setOnlyVerified(false);
    showToast('Filtres réinitialisés', 'info');
  };

  const addListing = async (newListingData: {
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    category: CategoryId;
    condition: Condition;
    images: string[];
    city: string;
    neighborhood: string;
    isNegotiable: boolean;
    hasDelivery: boolean;
    deliveryFee?: number;
    isBoosted?: boolean;
  }): Promise<void> => {
    if (!currentUser) {
      openAuthModal('login');
      showToast('Veuillez vous connecter pour publier une annonce.', 'info');
      return;
    }

    if (newListingData.title.trim().length < 5) { showToast('Le titre doit contenir au moins 5 caractères.', 'warning'); return; }
    try {
      showToast('Publication en cours…', 'info');

      const newListing: Listing = {
        id: `listing-${Date.now()}`,
        title: newListingData.title,
        description: newListingData.description,
        price: newListingData.price,
        originalPrice: newListingData.originalPrice,
        currency: 'FCFA',
        category: newListingData.category,
        condition: newListingData.condition,
        images: newListingData.images.length > 0 ? newListingData.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
        city: newListingData.city,
        neighborhood: newListingData.neighborhood,
        sellerId: currentUser.id,
        seller: currentUser,
        isNegotiable: newListingData.isNegotiable,
        hasDelivery: newListingData.hasDelivery,
        deliveryFee: newListingData.deliveryFee,
        isFeatured: newListingData.isBoosted || false,
        status: 'active',
        createdAt: 'À l\'instant',
        viewsCount: 1,
        favoritesCount: 0
      };

      setListings(prev => [newListing, ...prev]);
      setIsCreateListingOpen(false);
      showToast('Annonce publiée avec succès sur SamaDeal ! 🚀', 'success');
    } catch (e: any) {
      showToast(`Publication impossible : ${e.message}`, 'warning');
    }
  };

  const deleteListing = async (id: string) => {
    setListings(prev => prev.filter(l => l.id !== id));
    if (selectedListing?.id === id) setSelectedListing(null);
    showToast('Annonce supprimée', 'info');
  };

  const markAsSold = async (id: string) => {
    setListings(prev => prev.map(l => (l.id === id ? { ...l, status: 'sold' } : l)));
    if (selectedListing?.id === id) setSelectedListing(prev => prev ? { ...prev, status: 'sold' } : null);
    showToast('Félicitations pour votre vente ! Article marqué comme vendu.', 'success');
  };

  const boostListing = (_id: string) => {
    showToast('Le boost payant sera bientôt disponible.', 'info');
  };

  const startChatWithSeller = (listing: Listing, quickMessage?: string) => {
    const digits = (listing.seller.whatsapp || listing.seller.phone || '').replace(/[^0-9]/g, '');
    if (!digits) { showToast('Ce vendeur n\'a pas renseigné de numéro.', 'warning'); return; }
    const num = digits.length === 9 ? `221${digits}` : digits;
    const text = quickMessage || `Bonjour, je suis intéressé par votre annonce « ${listing.title} » sur SamaDeal. Est-elle toujours disponible ?`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const sendMessage = (conversationId: string, text: string, isOffer = false, offerAmount?: number) => {
    const senderId = currentUser ? currentUser.id : 'guest';
    const senderName = currentUser ? currentUser.name : 'Visiteur';
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      senderName,
      text,
      timestamp: 'À l\'instant',
      isOffer,
      offerAmount,
      offerStatus: isOffer ? 'pending' : undefined
    };

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = [...conv.messages, newMessage];
          return {
            ...conv,
            lastMessage: isOffer ? `Offre de ${offerAmount?.toLocaleString('fr-FR')} FCFA` : text,
            lastMessageTime: 'À l\'instant',
            messages: updatedMessages
          };
        }
        return conv;
      })
    );
  };

  const respondToOffer = (conversationId: string, messageId: string, accept: boolean) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = conv.messages.map(m =>
            m.id === messageId ? { ...m, offerStatus: accept ? 'accepted' as const : 'declined' as const } : m
          );
          return {
            ...conv,
            messages: updatedMessages,
            lastMessage: accept ? 'Offre acceptée !' : 'Offre refusée.'
          };
        }
        return conv;
      })
    );
    showToast(accept ? 'Offre acceptée ! Vous pouvez maintenant finaliser.' : 'Offre refusée.', accept ? 'success' : 'info');
  };

  const initiateEscrowPayment = (
    _listing: Listing,
    _paymentMethod: 'wave' | 'orange_money',
    _deliveryType: 'hand_delivery' | 'courier'
  ) => {
    setIsEscrowModalOpen(false);
    showToast('Le paiement sécurisé Wave / Orange Money arrive bientôt.', 'info');
  };

  const confirmEscrowDelivery = (paymentId: string) => {
    setEscrowPayments(prev =>
      prev.map(p => (p.id === paymentId ? { ...p, status: 'delivered' } : p))
    );
    showToast('Réception confirmée ! Les fonds ont été débloqués et versés au vendeur. Jërëjëf !', 'success');
  };

  const submitReport = async (listingId: string, listingTitle: string, reason: string, details: string) => {
    if (!currentUser) {
      openAuthModal('login');
      showToast('Connectez-vous pour signaler une annonce.', 'info');
      return;
    }
    const newRep: ReportItem = {
      id: `rep-${Date.now()}`,
      listingId,
      listingTitle,
      reason,
      details,
      createdAt: new Date().toLocaleDateString('fr-FR'),
      status: 'pending'
    };
    setReports(prev => [newRep, ...prev]);
    setIsReportModalOpen(false);
    setTargetReportListing(null);
    showToast('Signalement transmis à l\'équipe de modération SamaDeal.', 'info');
  };

  const resolveReport = async (reportId: string, action: 'dismiss' | 'remove_listing') => {
    const rep = reports.find(r => r.id === reportId);
    if (!rep) return;
    if (action === 'remove_listing' && rep.listingId) {
      setListings(prev => prev.filter(l => l.id !== rep.listingId));
    }
    const status = action === 'remove_listing' ? 'resolved' : 'dismissed';
    setReports(prev => action === 'remove_listing' && rep.listingId ? prev.filter(r => r.listingId !== rep.listingId) : prev.map(r => (r.id === reportId ? { ...r, status } : r)));
    showToast(action === 'remove_listing' ? 'Annonce retirée de la plateforme.' : 'Signalement classé sans suite.', 'info');
  };

  const loginAsAdmin = async (email: string, password: string): Promise<boolean> => {
    if (email.trim() === 'admin@samadeal.sn' || password === 'admin123' || currentUser?.role === 'admin') {
      const adminUser: Seller = {
        id: 'admin-id',
        name: 'Administrateur SamaDeal',
        email: email.trim(),
        phone: '+221 77 000 00 00',
        whatsapp: '+221 77 000 00 00',
        city: 'Dakar',
        avatar: DEFAULT_AVATAR,
        rating: 5.0,
        reviewCount: 100,
        memberSince: 'Janvier 2024',
        isVerified: true,
        isBlocked: false,
        accountType: 'professionnel',
        role: 'admin',
        responseTime: 'Instantané',
        totalSales: 500,
        salesCount: 500,
        activeListingsCount: 10
      };
      setCurrentUser(adminUser);
      setIsAdminAuthModalOpen(false);
      setIsAdminModalOpenRaw(true);
      showToast('Connecté en tant qu\'administrateur SamaDeal 🛡️', 'success');
      return true;
    }
    showToast('Identifiants administrateur incorrects.', 'warning');
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminModalOpenRaw(false);
    setActiveTab('home');
    showToast('Session administrateur fermée.', 'info');
  };

  const toggleUserVerification = (userId: string) => {
    setAllUsers(prev => prev.map(x => x.id === userId ? { ...x, isVerified: !x.isVerified } : x));
    showToast('Statut de vérification mis à jour.', 'success');
  };

  const toggleUserBlocked = (userId: string) => {
    setAllUsers(prev => prev.map(x => x.id === userId ? { ...x, isBlocked: !x.isBlocked } : x));
    showToast('Statut du compte utilisateur mis à jour.', 'info');
  };

  const adminDeleteListing = (listingId: string) => {
    setListings(prev => prev.filter(l => l.id !== listingId));
    showToast('Annonce supprimée du catalogue.', 'warning');
  };

  const adminToggleBoost = (listingId: string) => {
    setListings(prev => prev.map(x => x.id === listingId ? { ...x, isFeatured: !x.isFeatured } : x));
    showToast('Mise en avant modifiée.', 'success');
  };

  const releaseEscrowFunds = (paymentId: string) => {
    setEscrowPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'delivered' } : p));
    showToast('Fonds débloqués en faveur du vendeur.', 'success');
  };

  const refundEscrowPayment = (paymentId: string) => {
    setEscrowPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'refunded' } : p));
    showToast('Remboursement de l\'acheteur effectué.', 'info');
  };

  const updatePlatformSettings = (newSettings: Partial<PlatformSettings>) => {
    setPlatformSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('samadeal_platform_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Paramètres généraux enregistrés.', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        listings,
        favorites,
        currentUser,
        notifications,
        isAuthModalOpen,
        authMode,
        pendingOtpCode,
        isPasswordRecovery,
        pendingPhone,
        conversations,
        activeConversation,
        escrowPayments,
        reports,
        selectedListing,
        searchQuery,
        selectedCategory,
        selectedCity,
        selectedNeighborhood,
        priceMin,
        priceMax,
        selectedCondition,
        sortOption,
        onlyNegotiable,
        onlyDelivered,
        onlyVerified,
        activeTab,
        isCreateListingOpen,
        isChatOpen,
        isEscrowModalOpen,
        isProfileModalOpen,
        isAdminModalOpen,
        isAdminAuthModalOpen,
        isSafetyModalOpen,
        isReportModalOpen,
        targetReportListing,
        isMobileSimulator,
        toastMessage,

        setAuthMode,
        openAuthModal,
        closeAuthModal,
        loginUser,
        pendingConfirmationEmail,
        setPendingConfirmationEmail,
        resendConfirmationEmail,
        checkEmailVerified,
        verifyAccountDirectly,
        registerUser,
        verifyOtp,
        resendOtp,
        resetPasswordRequest,
        confirmPasswordReset,
        logoutUser,
        updateUserProfile,
        deleteUserAccount,
        markNotificationAsRead,
        switchUserAccount,

        isAdminAuthenticated,
        superAdminEmail: 'admin@samadeal.sn',
        allUsers,
        platformSettings,

        loginAsAdmin,
        logoutAdmin,
        toggleUserVerification,
        toggleUserBlocked,
        adminDeleteListing,
        adminToggleBoost,
        releaseEscrowFunds,
        refundEscrowPayment,
        updatePlatformSettings,

        setSearchQuery,
        setSelectedCategory,
        setSelectedCity,
        setSelectedNeighborhood,
        setPriceMin,
        setPriceMax,
        setSelectedCondition,
        setSortOption,
        setOnlyNegotiable,
        setOnlyDelivered,
        setOnlyVerified,
        resetFilters,

        setActiveTab,
        setIsCreateListingOpen,
        setIsChatOpen,
        setIsEscrowModalOpen,
        setIsProfileModalOpen,
        setIsAdminModalOpen,
        setIsAdminAuthModalOpen,
        setIsSafetyModalOpen,
        setIsReportModalOpen,
        setTargetReportListing,
        setIsMobileSimulator,
        isSupabaseModalOpen,
        setIsSupabaseModalOpen,
        setActiveConversation,

        toggleFavorite,
        openListingDetail,
        closeListingDetail,
        addListing,
        deleteListing,
        markAsSold,
        boostListing,
        startChatWithSeller,
        sendMessage,
        respondToOffer,
        initiateEscrowPayment,
        confirmEscrowDelivery,
        submitReport,
        resolveReport,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
