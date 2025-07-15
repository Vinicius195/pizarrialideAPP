import type { PizzaSize } from '@/types';

export interface PizzaSettings {
  basePrices: Record<PizzaSize, number>;
  sizeAvailability: Record<PizzaSize, boolean>;
}

// This is a mock in-memory "database" for settings.
let settings: PizzaSettings = {
  basePrices: {
    pequeno: 35.00,
    medio: 45.00,
    grande: 55.00,
    GG: 65.00,
  },
  sizeAvailability: {
    pequeno: true,
    medio: true,
    grande: true,
    GG: true,
  }
};

// In a real app, these would be API calls.
export const getMockSettings = (): PizzaSettings => {
  return settings;
};

export const updateMockSettings = (newSettings: PizzaSettings) => {
  settings = newSettings;
};
