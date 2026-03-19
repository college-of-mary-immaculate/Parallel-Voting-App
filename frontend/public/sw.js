const CACHE_NAME = 'vote-app-v1';
const STATIC_CACHE = 'vote-app-static-v1';
const DYNAMIC_CACHE = 'vote-app-dynamic-v1';
const API_CACHE = 'vote-app-api-v1';
const IMAGE_CACHE = 'vote-app-images-v1';

// Performance optimization settings
const CACHE_STRATEGIES = {
  // Static assets - cache first, network fallback
  STATIC: 'cache-first',
  // API calls - network first, cache fallback
  API: 'network-first',
  // Images - cache first with stale-while-revalidate
  IMAGES: 'stale-while-revalidate',
  // Dynamic content - network first
  DYNAMIC: 'network-first'
};

// Cache size limits
const CACHE_LIMITS = {
  STATIC: 50 * 1024 * 1024, // 50MB
  DYNAMIC: 20 * 1024 * 1024, // 20MB
  API: 10 * 1024 * 1024, // 10MB
  IMAGES: 100 * 1024 * 1024 // 100MB
};

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/static/media/logo.png',
  '/static/media/icon-192x192.png',
  '/static/media/icon-512x512.png'
];

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// Install event - cache static assets with performance optimization
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching critical assets first');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        // Cache remaining static assets in background
        return caches.open(STATIC_CACHE)
          .then((cache) => {
            const remainingAssets = STATIC_ASSETS.filter(asset => 
              !CRITICAL_ASSETS.includes(asset)
            );
            return cache.addAll(remainingAssets);
          });
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches with size management
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && 
                  cacheName !== DYNAMIC_CACHE && 
                  cacheName !== API_CACHE && 
                  cacheName !== IMAGE_CACHE) {
                console.log('Service Worker: Deleting old cache', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        }),
      // Clean up oversized caches
      cleanOversizedCaches()
    ])
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Clean up caches that exceed size limits
async function cleanOversizedCaches() {
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    let totalSize = 0;
    const entries = [];
    
    // Calculate total size
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const size = await getResponseSize(response);
        totalSize += size;
        entries.push({ request, response, size });
      }
    }
    
    // Remove oldest entries if cache is too large
    const limit = CACHE_LIMITS[cacheName.split('-').pop().toUpperCase()] || 
                   CACHE_LIMITS.STATIC;
    
    if (totalSize > limit) {
      console.log(`Service Worker: Cache ${cacheName} exceeds limit, cleaning up`);
      
      // Sort by size (largest first) and remove until under limit
      entries.sort((a, b) => b.size - a.size);
      
      for (const entry of entries) {
        if (totalSize <= limit) break;
        
        await cache.delete(entry.request);
        totalSize -= entry.size;
        console.log(`Service Worker: Removed ${entry.request.url} from cache`);
      }
    }
  }
}

// Get response size (approximate)
async function getResponseSize(response) {
  const clone = response.clone();
  const buffer = await clone.arrayBuffer();
  return buffer.byteLength;
}

// Determine cache strategy based on request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Static assets
  if (pathname.includes('/static/') || 
      pathname.endsWith('.js') || 
      pathname.endsWith('.css') || 
      pathname.endsWith('.woff2') ||
      pathname.endsWith('.woff')) {
    return CACHE_STRATEGIES.STATIC;
  }
  
  // Images
  if (pathname.includes('/images/') || 
      pathname.endsWith('.png') || 
      pathname.endsWith('.jpg') || 
      pathname.endsWith('.jpeg') || 
      pathname.endsWith('.gif') || 
      pathname.endsWith('.webp')) {
    return CACHE_STRATEGIES.IMAGES;
  }
  
  // API calls
  if (pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.API;
  }
  
  // Dynamic content
  return CACHE_STRATEGIES.DYNAMIC;
}

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {
        // Ignore network errors for cache-first
      });
    
    return cachedResponse;
  }
  
  // Fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network-first strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch from network
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Return cached response if network fails
      return cachedResponse;
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network response
  return networkPromise;
}

// Optimized fetch event with performance strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const strategy = getCacheStrategy(request);
      
      switch (strategy) {
        case CACHE_STRATEGIES.STATIC:
          return cacheFirstStrategy(request, STATIC_CACHE);
          
        case CACHE_STRATEGIES.IMAGES:
          return staleWhileRevalidateStrategy(request, IMAGE_CACHE);
          
        case CACHE_STRATEGIES.API:
          return networkFirstStrategy(request, API_CACHE);
          
        case CACHE_STRATEGIES.DYNAMIC:
          return networkFirstStrategy(request, DYNAMIC_CACHE);
          
        default:
          // Default to network-first
          return networkFirstStrategy(request, DYNAMIC_CACHE);
      }
    })()
      .catch((error) => {
        console.error('Service Worker: Request failed', error);
        
        // Fallback responses
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        
        return new Response('Offline - No cached version available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'text/plain'
          }
        });
      })
  );
});

// Background sync for offline actions with performance optimization
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncVotes());
  }
  
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// Optimized push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'Vote App',
    body: 'You have a new notification',
    icon: '/static/media/icon-192x192.png',
    badge: '/static/media/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    requireInteraction: false,
    silent: false
  };
  
  // Parse notification data if provided
  if (event.data) {
    try {
      const data = JSON.parse(event.data.text());
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Service Worker: Failed to parse notification data', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/static/media/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/static/media/icon-192x192.png'
        }
      ]
    })
  );
});

// Optimized notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.matchAll()
        .then((clientList) => {
          // Focus existing window if available
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

// Optimized sync functions
async function syncVotes() {
  try {
    const offlineVotes = await getOfflineVotes();
    const batchSize = 10; // Process in batches for performance
    
    for (let i = 0; i < offlineVotes.length; i += batchSize) {
      const batch = offlineVotes.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (vote) => {
          try {
            const response = await fetch('/api/votes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(vote)
            });
            
            if (response.ok) {
              await removeOfflineVote(vote.id);
            }
          } catch (error) {
            console.error('Service Worker: Failed to sync vote', error);
          }
        })
      );
      
      // Small delay between batches to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

async function syncAnalytics() {
  try {
    const analyticsData = await getAnalyticsData();
    
    if (analyticsData.length > 0) {
      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analyticsData)
      });
      
      await clearAnalyticsData();
    }
  } catch (error) {
    console.error('Service Worker: Analytics sync failed', error);
  }
}

// Enhanced message handling for cache management
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    updateCache();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    clearCache(event.data.cacheName);
  }
  
  if (event.data && event.data.type === 'PRELOAD_ROUTES') {
    preloadRoutes(event.data.routes);
  }
});

// Enhanced cache update function
async function updateCache() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    console.log('Service Worker: Cache updated');
  } catch (error) {
    console.error('Service Worker: Failed to update cache', error);
  }
}

// Clear specific cache
async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log(`Service Worker: Cache ${cacheName} cleared`);
  } catch (error) {
    console.error(`Service Worker: Failed to clear cache ${cacheName}`, error);
  }
}

// Preload routes for better performance
async function preloadRoutes(routes) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    for (const route of routes) {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
        }
      } catch (error) {
        console.error(`Service Worker: Failed to preload ${route}`, error);
      }
    }
    
    console.log('Service Worker: Routes preloaded');
  } catch (error) {
    console.error('Service Worker: Route preloading failed', error);
  }
}

// Helper functions for offline storage
async function getOfflineVotes() {
  // This would integrate with IndexedDB or localStorage
  return [];
}

async function removeOfflineVote(voteId) {
  // This would remove the synced vote from offline storage
  console.log('Service Worker: Removing synced vote', voteId);
}

async function getAnalyticsData() {
  // This would get analytics data from offline storage
  return [];
}

async function clearAnalyticsData() {
  // This would clear analytics data from offline storage
  console.log('Service Worker: Analytics data cleared');
}
