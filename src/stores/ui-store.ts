import { create } from "zustand";

type TransactionType = "expense" | "income";

interface TransactionModalState {
  isOpen: boolean;
  type: TransactionType;
  editId: string | null;
  open: (type: TransactionType, editId?: string) => void;
  close: () => void;
}

export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  type: "expense",
  editId: null,
  open: (type, editId) => set({ isOpen: true, type, editId: editId || null }),
  close: () => set({ isOpen: false, editId: null }),
}));

interface NotificationState {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "error";
    read: boolean;
    createdAt: Date;
  }>;
  addNotification: (n: Omit<NotificationState["notifications"][0], "id" | "read" | "createdAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (n) =>
    set((state) => ({
      notifications: [
        {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date(),
        },
        ...state.notifications,
      ],
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
