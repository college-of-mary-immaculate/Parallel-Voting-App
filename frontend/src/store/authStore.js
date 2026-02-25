import { create } from 'zustand';

const useAuthStore = create((set) => ({
  // User state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Login action
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: credentials.email,
        role: 'student'
      };
      
      set({ 
        user: mockUser, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return { success: true };
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      return { success: false, error: error.message };
    }
  },

  // Register action
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const mockUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        role: 'student'
      };
      
      set({ 
        user: mockUser, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return { success: true };
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      return { success: false, error: error.message };
    }
  },

  // Logout action
  logout: () => {
    set({ 
      user: null, 
      isAuthenticated: false, 
      error: null 
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useAuthStore;
