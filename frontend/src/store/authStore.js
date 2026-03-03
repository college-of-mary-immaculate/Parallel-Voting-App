import { create } from 'zustand';
import { authAPI } from '../services';

const useAuthStore = create((set, get) => ({
  // User state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,

  // Login action
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authAPI.login(credentials);
      
      if (result.success) {
        // Store token in localStorage
        localStorage.setItem('token', result.token);
        
        set({ 
          user: result.data,
          isAuthenticated: true, 
          token: result.token,
          isLoading: false 
        });
        
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
        error: 'Login failed. Please try again.', 
        isLoading: false 
      });
      return { success: false, error: 'Login failed. Please try again.' };
    }
  },

  // Register action
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authAPI.register(userData);
      
      if (result.success) {
        // Store token in localStorage
        localStorage.setItem('token', result.token);
        
        set({ 
          user: result.data, 
          isAuthenticated: true, 
          token: result.token,
          isLoading: false 
        });
        
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
        error: 'Registration failed. Please try again.', 
        isLoading: false 
      });
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  },

  // Logout action
  logout: async () => {
    set({ isLoading: true });
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      set({ 
        user: null, 
        isAuthenticated: false, 
        token: null,
        error: null,
        isLoading: false 
      });
    }
  },

  // Initialize auth state from localStorage
  initializeAuth: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
      // Optionally fetch user profile here if needed
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Get current token
  getToken: () => {
    return get().token || localStorage.getItem('token');
  },
}));

// Initialize auth state on store creation
useAuthStore.getState().initializeAuth();

export default useAuthStore;
