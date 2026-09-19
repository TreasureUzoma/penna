import { create } from "zustand";

type ModalType = "new-subscriber" | "new-segment" | "new-domain";

interface ModalStore {
  isOpen: boolean;
  type: ModalType | null;
  data?: Record<string, unknown>;
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  type: null,
  data: undefined,
  openModal: (type, data) => set({ isOpen: true, type, data }),
  closeModal: () => set({ isOpen: false, type: null, data: undefined }),
}));
