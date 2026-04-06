import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number;
  isPaid: boolean;
}

export interface Settings {
  monthlySalary: number;
  monthlyBudget: number;
  currency: string;
  theme: 'light' | 'dark' | 'system';
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  removeCategory: (id: string) => void;
  updateCategory: (category: Category) => void;
  bills: Bill[];
  setBills: (bills: Bill[]) => void;
  addBill: (bill: Bill) => void;
  toggleBillPaid: (id: string) => void;
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Food',          icon: 'Utensils',       color: '#ff6b2b' }, // electric orange
  { id: '2', name: 'Transport',     icon: 'Car',            color: '#00c2e0' }, // electric cyan
  { id: '3', name: 'Entertainment', icon: 'Gamepad2',       color: '#a855f7' }, // bold violet
  { id: '4', name: 'Shopping',      icon: 'ShoppingBag',    color: '#f43f8e' }, // hot pink
  { id: '5', name: 'Health',        icon: 'HeartPulse',     color: '#ff4757' }, // vivid red
  { id: '6', name: 'Bills',         icon: 'Receipt',        color: '#00e096' }, // neon mint
  { id: '7', name: 'Education',     icon: 'GraduationCap',  color: '#1e90ff' }, // bright blue
  { id: '8', name: 'Others',        icon: 'MoreHorizontal', color: '#94a3b8' }, // cool slate
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      isLoading: true,
      setIsLoading: (loading) => set({ isLoading: loading }),
      expenses: [],
      setExpenses: (expenses) => set({ expenses }),
      addExpense: (expense) => set((state) => ({ expenses: [expense, ...state.expenses] })),
      removeExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
      categories: defaultCategories,
      setCategories: (categories) => set({ categories }),
      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
      removeCategory: (id) => set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
      updateCategory: (category) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === category.id ? category : c)),
        })),
      bills: [],
      setBills: (bills) => set({ bills }),
      addBill: (bill) => set((state) => ({ bills: [...state.bills, bill] })),
      toggleBillPaid: (id) =>
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, isPaid: !b.isPaid } : b)),
        })),
      settings: {
        monthlySalary: 5000,
        monthlyBudget: 3000,
        currency: 'USD',
        theme: 'system',
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'expense-flow-storage',
      partialize: (state) => ({
        expenses: state.expenses,
        categories: state.categories,
        bills: state.bills,
        settings: state.settings,
      }),
    }
  )
);