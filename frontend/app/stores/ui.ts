import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    isSidebarOpen: true,
    isMobile: false,
  }),

  getters: {
    sidebarOpen: (state) => state.isSidebarOpen,
    isMobileView: (state) => state.isMobile,
  },

  actions: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },

    openSidebar() {
      this.isSidebarOpen = true;
    },

    closeSidebar() {
      this.isSidebarOpen = false;
    },

    setMobile(isMobile: boolean) {
      this.isMobile = isMobile;
      // Auto-collapse sidebar on mobile
      if (isMobile) {
        this.isSidebarOpen = false;
      }
    },
  },
});
