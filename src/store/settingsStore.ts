import { create } from 'zustand';
import { getSettings, saveSettings } from '../db/repositories/meta';
import { DEFAULT_SETTINGS, Settings } from '../db/types';

interface S {
  settings: Settings;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<S>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  load: async () => set({ settings: await getSettings() }),
  update: async patch => {
    const next = { ...get().settings, ...patch };
    await saveSettings(next);
    set({ settings: next });
  },
}));
