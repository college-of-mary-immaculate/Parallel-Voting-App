import { create } from 'zustand';

const useElectionStore = create((set) => ({
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
      // Mock data - replace with actual API
      const mockElections = [
        {
          id: 1,
          title: 'Student Council Election 2024',
          description: 'Vote for your student council representatives',
          status: 'active',
          startDate: '2024-03-01',
          endDate: '2024-03-15',
          candidates: [
            { id: 1, name: 'John Doe', position: 'President', department: 'Computer Science' },
            { id: 2, name: 'Jane Smith', position: 'President', department: 'Business Administration' },
            { id: 3, name: 'Mike Brown', position: 'President', department: 'Engineering' }
          ]
        },
        {
          id: 2,
          title: 'Club Representatives Election',
          description: 'Vote for club representatives',
          status: 'upcoming',
          startDate: '2024-03-20',
          endDate: '2024-03-25',
          candidates: []
        }
      ];
      
      set({ 
        elections: mockElections, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.message, 
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
      // Mock API call - replace with actual API
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
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      return { success: false, error: error.message };
    }
  },

  // Fetch results
  fetchResults: async (electionId) => {
    set({ isLoading: true, error: null });
    try {
      // Mock results - replace with actual API
      const mockResults = {
        [electionId]: {
          totalVotes: 150,
          candidates: [
            { id: 1, name: 'John Doe', votes: 60, percentage: 40 },
            { id: 2, name: 'Jane Smith', votes: 55, percentage: 36.67 },
            { id: 3, name: 'Mike Brown', votes: 35, percentage: 23.33 }
          ]
        }
      };
      
      set(state => ({
        results: {
          ...state.results,
          ...mockResults
        },
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
    }
  },

  // Check if user has voted
  hasUserVoted: (electionId) => {
    const state = useElectionStore.getState();
    return !!state.userVotes[electionId];
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useElectionStore;
