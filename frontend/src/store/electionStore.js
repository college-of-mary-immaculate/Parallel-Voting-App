import { create } from 'zustand';
import { electionsAPI, votingAPI, resultsAPI } from '../services';

const useElectionStore = create((set, get) => ({
  // Elections state
  elections: [],
  currentElection: null,
  userVotes: {},
  results: {},
  isLoading: false,
  error: null,

  // Fetch elections
  fetchElections: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await electionsAPI.getAll();
      
      if (result.success) {
        set({ 
          elections: result.data, 
          isLoading: false 
        });
      } else {
        set({ 
          error: result.error, 
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: 'Failed to fetch elections. Please try again.', 
        isLoading: false 
      });
    }
  },

  // Set current election
  setCurrentElection: (election) => {
    set({ currentElection: election });
  },

  // Submit vote
  submitVote: async (electionId, candidateId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await votingAPI.submitVote({
        electionId,
        candidateId
      });
      
      if (result.success) {
        const newVote = {
          electionId,
          candidateId,
          timestamp: new Date().toISOString()
        };
        
        set(state => ({
          userVotes: {
            ...state.userVotes,
            [electionId]: newVote
          },
          isLoading: false
        }));
        
        return { success: true };
      } else {
        set({ 
          error: result.error, 
          isLoading: false 
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ 
        error: 'Failed to submit vote. Please try again.', 
        isLoading: false 
      });
      return { success: false, error: 'Failed to submit vote. Please try again.' };
    }
  },

  // Fetch results
  fetchResults: async (electionId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await resultsAPI.getElectionResults(electionId);
      
      if (result.success) {
        set(state => ({
          results: {
            ...state.results,
            [electionId]: result.data
          },
          isLoading: false
        }));
      } else {
        set({ 
          error: result.error, 
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: 'Failed to fetch results. Please try again.', 
        isLoading: false 
      });
    }
  },

  // Check if user has voted
  hasUserVoted: (electionId) => {
    const state = get();
    return !!state.userVotes[electionId];
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Initialize store
  initializeStore: async () => {
    await fetchElections();
  }
}));

// Initialize store on creation
useElectionStore.getState().initializeStore();

export default useElectionStore;
