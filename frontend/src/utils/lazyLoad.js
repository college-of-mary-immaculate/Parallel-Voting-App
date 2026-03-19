// Lazy loading utilities for components and routes

// React lazy loading with error boundary
export const lazyLoad = (importFunc, fallback = null) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props) => (
    <React.Suspense fallback={fallback || <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Preload component
export const preloadComponent = (importFunc) => {
  importFunc();
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return isIntersecting;
};

// Image lazy loading with intersection observer
export const LazyImage = ({ src, alt, className, placeholder, ...props }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {placeholder && !isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          {...props}
        />
      )}
    </div>
  );
};

// Route-based code splitting
export const createLazyRoute = (path, componentPath, fallback = null) => ({
  path,
  element: lazyLoad(() => import(componentPath), fallback)
});

// Chunk preloading strategy
export const preloadChunks = () => {
  // Preload critical chunks after initial load
  setTimeout(() => {
    // Admin dashboard
    import('../pages/AdminDashboard');
    // Analytics
    import('../pages/Analytics');
    // Settings
    import('../pages/Settings');
  }, 2000);
};

// Dynamic import with retry
export const dynamicImport = (importFunc, retries = 3) => {
  return new Promise((resolve, reject) => {
    const attemptImport = async (attempt) => {
      try {
        const module = await importFunc();
        resolve(module);
      } catch (error) {
        if (attempt < retries) {
          setTimeout(() => attemptImport(attempt + 1), 1000 * attempt);
        } else {
          reject(error);
        }
      }
    };
    attemptImport(0);
  });
};
