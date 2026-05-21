// src/store/useLightboxStore.js
import { create } from "zustand"

export const useLightboxStore = create((set) => ({
  isOpen: false,
  images: [], // [{ imageUrl }]
  currentIndex: 0,

  openLightbox: ({ images, index = 0 }) => set({ isOpen: true, images, currentIndex: index }),

  closeLightbox: () => set({ isOpen: false, images: [], currentIndex: 0 }),

  goNext: () => set((s) => ({ currentIndex: Math.min(s.currentIndex + 1, s.images.length - 1) })),

  goPrev: () => set((s) => ({ currentIndex: Math.max(s.currentIndex - 1, 0) })),
}))
