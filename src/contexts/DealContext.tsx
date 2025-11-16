/**
 * Deal Context Provider
 * Epic: E-001 Multi-Deal Pipeline Support
 * Task: E-001-T-16
 *
 * Manages the globally selected deal ID across the application.
 * Persists selection to localStorage for continuity across page reloads.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DealContextType {
  selectedDealId: string | null;
  setSelectedDealId: (dealId: string | null) => void;
  isLoading: boolean;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

interface DealProviderProps {
  children: ReactNode;
}

export function DealProvider({ children }: DealProviderProps) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('esie_selected_deal_id');
    if (saved) {
      setSelectedDealId(saved);
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (selectedDealId) {
      localStorage.setItem('esie_selected_deal_id', selectedDealId);
    } else {
      localStorage.removeItem('esie_selected_deal_id');
    }
  }, [selectedDealId]);

  return (
    <DealContext.Provider value={{ selectedDealId, setSelectedDealId, isLoading }}>
      {children}
    </DealContext.Provider>
  );
}

/**
 * Hook to access deal context
 * @throws Error if used outside DealProvider
 */
export function useDeal() {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error('useDeal must be used within DealProvider');
  }
  return context;
}
