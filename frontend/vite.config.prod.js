import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Production-specific configuration
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react({
        // Fast Refresh in development
        fastRefresh: mode === 'development',
        // JSX runtime optimization
        jsxRuntime: 'automatic',
        // Remove React PropTypes in production
        removePropTypes: mode === 'production'
      })
    ],
    
    // Build configuration
    build: {
      // Output directory
      outDir: 'dist',
      // Empty output directory before build
      emptyOutDir: true,
      
      // Source maps configuration
      sourcemap: env.VITE_SOURCE_MAP === 'true',
      
      // Minification
      minify: env.VITE_MINIFY === 'true' ? 'terser' : false,
      
      // Target browsers
      target: ['es2020', 'chrome80', 'firefox78', 'safari13'],
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Rollup options for advanced optimization
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Core React libraries
            vendor: ['react', 'react-dom', 'react-router-dom'],
            
            // Chart libraries
            charts: ['chart.js', 'react-chartjs-2'],
            
            // Utility libraries
            utils: ['axios', 'zustand'],
            
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
          
          // Optimized chunk naming
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
          },
          
          // Entry file naming
          entryFileNames: `assets/[name]-[hash].js`
        },
        
        // External dependencies (if needed)
        external: [],
        
        // Plugin configuration
        plugins: []
      },
      
      // Terser options for production minification
      terserOptions: mode === 'production' ? {
        compress: {
          // Remove console.log in production
          drop_console: env.VITE_ENABLE_ERROR_REPORTING !== 'true',
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          // Remove unused code
          dead_code: true,
          // Optimize conditionals
          conditionals: true,
          // Optimize booleans
          booleans: true,
          // Optimize loops
          loops: true,
          // Optimize if statements
          if_return: true,
          // Join consecutive statements
          join_vars: true,
          // Reduce variable names
          reduce_vars: true,
          // Remove typeof checks
          typeofs: true
        },
        mangle: {
          // Mangle variable names
          toplevel: true,
          // Safari 10 compatibility
          safari10: true
        },
        format: {
          // Remove comments
          comments: false
        }
      } : {},
      
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // Report compressed size
      reportCompressedSize: true,
      
      // Generate manifest
      manifest: true
    },
    
    // Development server configuration
    server: {
      port: 5173,
      host: true,
      // Enable HMR
      hmr: true,
      // Proxy configuration for API
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    
    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      // Proxy configuration for API
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
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
      ],
      exclude: []
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
      // CSS modules configuration
      modules: {
        localsConvention: 'camelCase'
      },
      
      // PostCSS configuration
      postcss: {
        plugins: [
          // Add autoprefixer
          require('autoprefixer'),
          // Add CSS optimization for production
          mode === 'production' && require('cssnano')({
            preset: 'default'
          })
        ].filter(Boolean)
      },
      
      // Dev sourcemaps for CSS
      devSourcemap: env.VITE_SOURCE_MAP === 'true'
    },
    
    // Environment variables
    define: {
      // Build information
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __BUILD_ENV__: JSON.stringify(mode),
      
      // Feature flags
      __ENABLE_ANALYTICS__: env.VITE_ENABLE_ANALYTICS === 'true',
      __ENABLE_PERFORMANCE_MONITORING__: env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
      __ENABLE_ERROR_REPORTING__: env.VITE_ENABLE_ERROR_REPORTING === 'true',
      __ENABLE_PWA__: env.VITE_ENABLE_PWA === 'true',
      __ENABLE_OFFLINE__: env.VITE_ENABLE_OFFLINE === 'true'
    },
    
    // Experimental features
    experimental: {
      // Build renderer
      renderBuiltUrl: (filename, { hostType }) => {
        // Use CDN for static assets in production
        if (mode === 'production' && hostType === 'js') {
          return { relative: true };
        }
        return { relative: true };
      }
    },
    
    // Public path configuration
    base: mode === 'production' ? '/' : '/',
    
    // Preview configuration
    preview: {
      port: 4173,
      host: true
    }
  };
});
