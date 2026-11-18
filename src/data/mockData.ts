import { Category, Listing, Seller } from '../types';

import heroImg from '../assets/images/hero_marketplace_senegal_1794384364731.jpg';

export const HERO_IMAGE = heroImg;


export const SENEGAL_CITIES = [
  'Toutes les villes',
  'Dakar',
  'Thiès',
  'Saint-Louis',
  'Mbour & Saly',
  'Touba',
  'Ziguinchor',
  'Kaolack',
  'Rufisque'
];

export const DAKAR_NEIGHBORHOODS = [
  'Tous les quartiers',
  'Almadies',
  'Plateau',
  'Mermoz',
  'Sacré-Cœur',
  'Ouakam',
  'Yoff',
  'Ngor',
  'Médina',
  'Fann Résidence',
  'Liberté 6',
  'Parcelles Assainies',
  'Grand Yoff',
  'Pikine',
  'Guédiawaye',
  'Hann Maristes'
];

export const CATEGORIES: Category[] = [
  {
    id: 'telephones-electronique',
    name: 'Téléphones & Tablettes',
    iconName: 'Smartphone',
    description: 'Smartphones, tablettes, écouteurs et montres connectées',
    itemCount: 0
  },
  {
    id: 'vetements-chaussures',
    name: 'Vêtements & Mode',
    iconName: 'Shirt',
    description: 'Boubous traditionnels, robes, baskets, sacs et prêt-à-porter',
    itemCount: 0
  },
  {
    id: 'informatique',
    name: 'Ordinateurs & Tech',
    iconName: 'Laptop',
    description: 'PC portables, MacBooks, écrans, claviers et accessoires',
    itemCount: 0
  },
  {
    id: 'electromenager',
    name: 'Électroménager',
    iconName: 'Refrigerator',
    description: 'Réfrigérateurs, climatiseurs, mixeurs, machines à laver',
    itemCount: 0
  },
  {
    id: 'meubles-decoration',
    name: 'Maison & Mobilier',
    iconName: 'Armchair',
    description: 'Canapés, lits, tables à manger, tapis et luminaires',
    itemCount: 0
  },
  {
    id: 'vehicules',
    name: 'Véhicules & Motos',
    iconName: 'Car',
    description: 'Voitures occasion, scooters, motos et vélos à Dakar',
    itemCount: 0
  },
  {
    id: 'livres-loisirs',
    name: 'Livres & Loisirs',
    iconName: 'BookOpen',
    description: 'Romans, manuels scolaires UCAD, sport et jeux vidéo',
    itemCount: 0
  }
];

export const DEFAULT_PLATFORM_SETTINGS = {
  escrowFeePercent: 1.5,
  boostPriceFCFA: 1500,
  maintenanceMode: false,
  autoApproveListings: true
};

export const INITIAL_MOCK_LISTINGS: Listing[] = [
  {
    id: 'listing-1',
    title: 'iPhone 13 Pro Max 256Go - Très bon état (Bleu Pacifique)',
    description: 'iPhone 13 Pro Max authentique, capacité 256 Go, batterie à 88%. Vendu avec boîte d\'origine, facture et coque de protection. Visible à Mermoz / Almadies.',
    price: 380000,
    originalPrice: 450000,
    currency: 'FCFA',
    category: 'telephones-electronique',
    condition: 'Très bon état',
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'
    ],
    city: 'Dakar',
    neighborhood: 'Mermoz',
    sellerId: 'seller-1',
    seller: {
      id: 'seller-1',
      name: 'Ibrahima Diallo',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      phone: '+221 77 123 45 67',
      whatsapp: '+221 77 123 45 67',
      city: 'Dakar',
      neighborhood: 'Mermoz',
      rating: 4.9,
      reviewCount: 42,
      memberSince: 'Janvier 2024',
      isVerified: true,
      isBlocked: false,
      accountType: 'professionnel',
      shopName: 'Dakar Phone Store',
      responseTime: 'Moins d\'une heure',
      totalSales: 156,
      salesCount: 156,
      activeListingsCount: 8
    },
    isNegotiable: true,
    hasDelivery: true,
    deliveryFee: 2000,
    isFeatured: true,
    status: 'active',
    createdAt: '17/11/2026',
    viewsCount: 342,
    favoritesCount: 24
  },
  {
    id: 'listing-2',
    title: 'Boubou Traditionnel Brodé Homme - Soie de Dakar',
    description: 'Magnifique boubou complet 3 pièces en basin riche brodé à la main par un artisan local. Couleur bleu nuit. Taille unique (ajustable). Parfait pour cérémonies et Korité.',
    price: 45000,
    currency: 'FCFA',
    category: 'vetements-chaussures',
    condition: 'Comme neuf',
    images: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'
    ],
    city: 'Dakar',
    neighborhood: 'Plateau',
    sellerId: 'seller-2',
    seller: {
      id: 'seller-2',
      name: 'Fatou Ndiaye',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      phone: '+221 78 987 65 43',
      whatsapp: '+221 78 987 65 43',
      city: 'Dakar',
      neighborhood: 'Plateau',
      rating: 4.8,
      reviewCount: 19,
      memberSince: 'Mars 2024',
      isVerified: true,
      isBlocked: false,
      accountType: 'particulier',
      responseTime: 'En quelques heures',
      totalSales: 34,
      salesCount: 34,
      activeListingsCount: 5
    },
    isNegotiable: true,
    hasDelivery: true,
    deliveryFee: 1500,
    isFeatured: true,
    status: 'active',
    createdAt: '16/11/2026',
    viewsCount: 189,
    favoritesCount: 12
  },
  {
    id: 'listing-3',
    title: 'MacBook Pro 14" M1 Pro (16Go / 512Go SSD)',
    description: 'Ordinateur portable Apple MacBook Pro 14 pouces, puce M1 Pro, 16 Go de RAM, SSD 512 Go. État impeccable, cycle de batterie sain (92%). Vendu avec chargeur d\'origine.',
    price: 750000,
    originalPrice: 950000,
    currency: 'FCFA',
    category: 'informatique',
    condition: 'Très bon état',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
    ],
    city: 'Dakar',
    neighborhood: 'Almadies',
    sellerId: 'seller-3',
    seller: {
      id: 'seller-3',
      name: 'Stéphane Faye',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      phone: '+221 77 555 44 33',
      whatsapp: '+221 77 555 44 33',
      city: 'Dakar',
      neighborhood: 'Almadies',
      rating: 5.0,
      reviewCount: 28,
      memberSince: 'Juin 2023',
      isVerified: true,
      isBlocked: false,
      accountType: 'professionnel',
      shopName: 'Almadies Tech Lab',
      responseTime: 'Moins d\'une heure',
      totalSales: 89,
      salesCount: 89,
      activeListingsCount: 12
    },
    isNegotiable: false,
    hasDelivery: true,
    deliveryFee: 3000,
    isFeatured: true,
    status: 'active',
    createdAt: '15/11/2026',
    viewsCount: 512,
    favoritesCount: 45
  },
  {
    id: 'listing-4',
    title: 'Scooter Yamaha TMAX 530 - Immatriculé DK',
    description: 'Yamaha TMAX 530 en très bon état général, année 2018. Entretien régulier effectué chez le concessionnaire à Dakar. Pneus récents, double des clés disponible.',
    price: 2400000,
    currency: 'FCFA',
    category: 'vehicules',
    condition: 'Bon état',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'
    ],
    city: 'Dakar',
    neighborhood: 'Ngor',
    sellerId: 'seller-4',
    seller: {
      id: 'seller-4',
      name: 'Ousmane Ba',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
      phone: '+221 70 333 22 11',
      whatsapp: '+221 70 333 22 11',
      city: 'Dakar',
      neighborhood: 'Ngor',
      rating: 4.7,
      reviewCount: 15,
      memberSince: 'Septembre 2023',
      isVerified: true,
      isBlocked: false,
      accountType: 'particulier',
      responseTime: 'Dans la journée',
      totalSales: 12,
      salesCount: 12,
      activeListingsCount: 2
    },
    isNegotiable: true,
    hasDelivery: false,
    isFeatured: true,
    status: 'active',
    createdAt: '14/11/2026',
    viewsCount: 820,
    favoritesCount: 68
  },
  {
    id: 'listing-5',
    title: 'Salon Complet Scandinave 5 Places + Table Basse',
    description: 'Ensemble salon design scandinave comprenant un grand canapé 3 places, 2 fauteuils assortis en tissu gris clair et pieds en bois massif. Très confortable.',
    price: 180000,
    originalPrice: 250000,
    currency: 'FCFA',
    category: 'meubles-decoration',
    condition: 'Très bon état',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
    ],
    city: 'Dakar',
    neighborhood: 'Sacré-Cœur',
    sellerId: 'seller-5',
    seller: {
      id: 'seller-5',
      name: 'Mariama Sow',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
      phone: '+221 77 888 99 00',
      whatsapp: '+221 77 888 99 00',
      city: 'Dakar',
      neighborhood: 'Sacré-Cœur',
      rating: 4.9,
      reviewCount: 31,
      memberSince: 'Février 2024',
      isVerified: true,
      isBlocked: false,
      accountType: 'professionnel',
      shopName: 'Dakar Mobilier Design',
      responseTime: 'Moins d\'une heure',
      totalSales: 64,
      salesCount: 64,
      activeListingsCount: 14
    },
    isNegotiable: true,
    hasDelivery: true,
    deliveryFee: 5000,
    isFeatured: false,
    status: 'active',
    createdAt: '13/11/2026',
    viewsCount: 275,
    favoritesCount: 19
  },
  {
    id: 'listing-6',
    title: 'Réfrigérateur Samsung Inverter 320L No Frost',
    description: 'Frigo combi Samsung grand format, technologie Inverter économique, système No Frost (pas de givre). Classe énergétique A++. Fonctionne parfaitement.',
    price: 210000,
    currency: 'FCFA',
    category: 'electromenager',
    condition: 'Bon état',
    images: [
      'https://images.unsplash.com/photo-1584568694244-14fbdf82bd37?auto=format&fit=crop&w=800&q=80'
    ],
    city: 'Thiès',
    neighborhood: 'Centre-ville',
    sellerId: 'seller-6',
    seller: {
      id: 'seller-6',
      name: 'Modou Diop',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      phone: '+221 77 444 33 22',
      whatsapp: '+221 77 444 33 22',
      city: 'Thiès',
      neighborhood: 'Centre-ville',
      rating: 4.6,
      reviewCount: 18,
      memberSince: 'Octobre 2023',
      isVerified: false,
      isBlocked: false,
      accountType: 'particulier',
      responseTime: 'Dans la journée',
      totalSales: 22,
      salesCount: 22,
      activeListingsCount: 3
    },
    isNegotiable: true,
    hasDelivery: true,
    deliveryFee: 4000,
    isFeatured: false,
    status: 'active',
    createdAt: '12/11/2026',
    viewsCount: 198,
    favoritesCount: 11
  }
];
