// Export all stores for easy importing
export { default as useAuthStore } from './authStore';
export { default as useElectionStore } from './electionStore';

// Combined store hook for convenience
export const useStore = () => {
  const authStore = useAuthStore();
  const electionStore = useElectionStore();
  
  return {
    ...authStore,
    ...electionStore,
    // Combined actions
    initializeApp: async () => {
      await electionStore.fetchElections();
    },
    resetApp: () => {
      authStore.logout();
      // Reset other stores as needed
    }
  };
};
