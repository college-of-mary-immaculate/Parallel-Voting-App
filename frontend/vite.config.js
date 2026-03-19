import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          
          // Chart libraries
          charts: ['chart.js', 'react-chartjs-2'],
          
          // Utility libraries
          utils: ['axios', 'zustand'],
          
          // UI components (if using a UI library)
          ui: [], // Add UI library imports here
          
          // Admin features
          admin: [
            './src/pages/AdminDashboard',
            './src/pages/ManageElections',
            './src/pages/ManageCandidates',
            './src/pages/ManageUsers',
            './src/pages/AdminSettings'
          ],
          
          // Analytics features
          analytics: [
            './src/pages/Analytics',
            './src/pages/DetailedAnalytics',
            './src/pages/RealTimeDashboard'
          ],
          
          // Voting features
          voting: [
            './src/pages/Vote',
            './src/pages/VoteConfirmation',
            './src/pages/Results'
          ]
        },
        
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.[^.]*$/, '')
            : 'chunk';
          
          if (facadeModuleId === 'index') {
            return `assets/[name]-[hash].js`;
          }
          
          return `assets/${facadeModuleId}-[hash].js`;
        },
        
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `media/[name]-[hash][extname]`;
          }
          
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      }
    },
    
    // Target modern browsers
    target: 'es2020',
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Generate source maps for debugging
    sourcemap: true
  },
  
  // Development server optimization
  server: {
    // Enable HMR
    hmr: true,
    
    // Optimize dependency pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'zustand',
        'chart.js',
        'react-chartjs-2'
      ]
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
      'chart.js',
      'react-chartjs-2'
    ]
  },
  
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@contexts': resolve(__dirname, './src/contexts'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@store': resolve(__dirname, './src/store'),
      '@styles': resolve(__dirname, './src/styles'),
      '@assets': resolve(__dirname, './src/assets')
    }
  },
  
  // CSS optimization
  css: {
    // Enable CSS modules
    modules: {
      localsConvention: 'camelCase'
    },
    
    // PostCSS configuration
    postcss: {
      plugins: [
        // Add any PostCSS plugins here
      ]
    },
    
    // Dev sourcemaps for CSS
    devSourcemap: true
  },
  
  // Preview configuration
  preview: {
    port: 4173,
    host: true
  },
  
  // Environment variables
  define: {
    // Remove process.env.NODE_ENV from production
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
