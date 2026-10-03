import { create } from 'zustand';

interface Snack {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onExpire?: () => void | Promise<void>;
}

interface S {
  current: Snack | null;
  show: (s: Omit<Snack, 'id'>, ms?: number) => void;
  action: () => void;
  /** Commits a pending snack (runs onExpire) now, e.g. before a write that depends on it. */
  flush: () => Promise<void>;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export const useSnackbar = create<S>((set, get) => ({
  current: null,
  show: async (s, ms = 5000) => {
    await get().flush();
    const snack = { ...s, id: ++seq };
    set({ current: snack });
    timer = setTimeout(() => {
      if (get().current?.id === snack.id) get().flush();
    }, ms);
  },
  action: () => {
    const c = get().current;
    if (timer) clearTimeout(timer);
    set({ current: null });
    c?.onAction?.();
  },
  flush: async () => {
    const c = get().current;
    if (timer) clearTimeout(timer);
    timer = null;
    set({ current: null });
    await c?.onExpire?.();
  },
}));

export const toast = (message: string, ms = 3000) =>
  useSnackbar.getState().show({ message }, ms);
