export type SearchMode = 'symptom' | 'medicine';

export interface RecommendedMedicineOption {
  referenceName: string;
  activeIngredient: string;
  dosage: string;
  whyItHelps: string;
  susAvailability: {
    status: 'gratuito_sus' | 'copagamento' | 'particular_generico';
    badgeText: string;
    instructions: string;
    requiresPrescription: boolean;
  };
  howToAskAtCounter: string;
  precautions: string;
}

export interface SymptomAnalysis {
  status: 'success' | 'urgent_care' | 'not_found';
  symptomQuery: string;
  clinicalOverview: string;
  recommendedMedicines: RecommendedMedicineOption[];
  warningSigns: string[];
  homeCareTips: string[];
  disclaimer: string;
  timestamp?: number;
}

export interface EquivalentMedicineOption {
  type: 'generico' | 'similar_intercambiavel' | 'referencia' | string;
  name: string;
  activeIngredient?: string;
  dosage?: string;
  badge?: string;
  badgeText?: string;
  savingsEstimated?: string;
  description?: string;
  advantage?: string;
  recommended?: boolean;
}

export interface MedicineAnalysis {
  status: 'success' | 'illegible' | 'not_found';
  commercialName: string;
  activeIngredient: string;
  dosage: string;
  purpose: string;
  dosageInfo?: string;
  precautions?: string;
  quickTips?: string[];
  howToAsk: string;
  equivalentMedicines?: EquivalentMedicineOption[];
  susAvailability?: {
    isFreeInSUS: boolean;
    badgeText: string;
    instructions: string;
    requiresPrescription?: boolean;
  };
  tarjaAmarelaInfo: {
    badgeText: string;
    lawReference?: string;
    savingsPercentRange: string;
    explanation: string;
  };
  farmaciaPopular: {
    isEligible: boolean;
    statusType: 'gratuito' | 'copagamento' | 'nao_coberto';
    badgeText: string;
    conditionName?: string;
    instructions: string;
  };
  anvisaRegulation: {
    bioequivalent: boolean;
    details: string;
  };
  disclaimer: string;
  illegibleMessage?: string;
  searchQuery?: string;
  timestamp?: number;
}

export type UnifiedAnalysis =
  | { type: 'medicine'; data: MedicineAnalysis }
  | { type: 'symptom'; data: SymptomAnalysis };

export interface SearchHistoryItem {
  id: string;
  type: 'medicine' | 'symptom';
  query: string;
  title: string;
  subtitle: string;
  badge: string;
  isSusFree: boolean;
  timestamp: number;
  medicineAnalysis?: MedicineAnalysis;
  symptomAnalysis?: SymptomAnalysis;
  // Optional legacy fields for backward compatibility
  commercialName?: string;
  activeIngredient?: string;
  dosage?: string;
  savingsPercent?: string;
  isFarmaciaPopular?: boolean;
  statusType?: string;
  analysis?: MedicineAnalysis;
}

export interface QuickExample {
  title: string;
  category: string;
  searchTerm: string;
  popular?: boolean;
}

export interface SymptomQuickExample {
  title: string;
  emoji: string;
  description: string;
  searchTerm: string;
  commonFreeSusMed: string;
  popular?: boolean;
}

export type MedicineCategory =
  | 'Todos'
  | 'Crônicos'
  | 'Analgésicos'
  | 'Anti-inflamatórios'
  | 'Antibióticos'
  | 'Gastrointestinais'
  | 'Antialérgicos & Respiratórios'
  | 'Saúde Mental';

export interface CatalogMedicine {
  id: string;
  referenceName: string;
  activeIngredient: string;
  commonDosage: string;
  category: Exclude<MedicineCategory, 'Todos'>;
  searchTerm: string;
  popularBadge?: string;
  farmaciaPopularStatus: 'gratuito' | 'copagamento' | 'nao_coberto';
  estimatedSavings: string;
  briefPurpose?: string;
}

