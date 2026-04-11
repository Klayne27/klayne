import { create } from "zustand"

export const useLightboxStore = create((set) => ({
  images: [],
  currentIndex: null,
  isOpen: false,

  // Enhanced opener that handles both single images and arrays
  openLightbox: (data, index = 0) => {
    // If 'data' is an array, use it. If it's a single object, wrap it in [].
    const imageArray = Array.isArray(data) ? data : [data]

    set({
      images: imageArray,
      currentIndex: index,
      isOpen: true,
    })
  },

  closeLightbox: () => set({ isOpen: false, currentIndex: null }),

  // Logic remains the same, it just works on an array of length 1
  nextImage: () =>
    set((state) => ({
      currentIndex: (state.currentIndex + 1) % state.images.length,
    })),

  prevImage: () =>
    set((state) => ({
      currentIndex: (state.currentIndex - 1 + state.images.length) % state.images.length,
    })),
}))
