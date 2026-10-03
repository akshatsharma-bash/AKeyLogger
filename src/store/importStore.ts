import { create } from 'zustand';
import type { Backup } from '../backup/schema';

/** Holds parsed backups so ImportReview receives a key, not the whole object, as a route param. */
interface S {
  backups: Record<string, Backup>;
  put: (b: Backup) => string;
  take: (key: string) => void;
}

export const useImportStore = create<S>((set, get) => ({
  backups: {},
  put: b => {
    const key = String(Date.now());
    set({ backups: { ...get().backups, [key]: b } });
    return key;
  },
  take: key => {
    const rest = { ...get().backups };
    delete rest[key];
    set({ backups: rest });
  },
}));
