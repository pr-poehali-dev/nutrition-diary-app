export interface FoodEntry {
  id: string;
  products: string[];
  date: Date;
  hasAllergy: boolean;
}

export interface EditingEntry {
  id: string;
  products: string[];
  hasAllergy: boolean;
}

export type AllergyFilter = 'all' | 'allergy' | 'safe';
