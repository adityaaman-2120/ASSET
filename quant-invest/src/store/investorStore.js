import { create } from 'zustand'

export const useInvestorStore = create((set) => ({
  profile: null,
  portfolio: null,
  stocks: [],
  signals: [],
  setProfile: (p) => set({ profile: p }),
  setPortfolio: (p) => set({ portfolio: p }),
  setStocks: (s) => set({ stocks: s }),
  setSignals: (s) => set({ signals: s }),
}))
