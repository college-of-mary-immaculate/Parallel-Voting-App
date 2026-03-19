import React, { useState, useRef, useEffect } from 'react';
import { measureImageLoad } from '../utils/performance';

const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  width,
  height,
  loading = 'lazy',
  sizes,
  srcSet,
  placeholder = true,
  quality = 75,
  format = 'auto',
  onLoad,
  onError,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef();
  const observerRef = useRef();

  // Generate optimized image URL (example for image CDN)
  const getOptimizedSrc = (originalSrc, w, h, q, f) => {
    if (!originalSrc) return null;
    
    // This is an example - implement based on your image CDN/service
    const params = new URLSearchParams();
    if (w) params.append('w', w);
    if (h) params.append('h', h);
    if (q) params.append('q', q);
    if (f && f !== 'auto') params.append('f', f);
    
    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  };

  // Generate responsive srcSet
  const generateSrcSet = (baseSrc) => {
    if (!srcSet && width) {
      // Generate default srcSet based on width
      const sizes = [width, width * 0.75, width * 0.5, width * 0.25];
      return sizes
        .map(w => `${getOptimizedSrc(baseSrc, w, null, quality, format)} ${w}w`)
        .join(', ');
    }
    return srcSet;
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && !isInView) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        },
        {
          rootMargin: '50px 0px', // Start loading 50px before image comes into view
          threshold: 0.01
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, isInView]);

  // Set image source when in view
  useEffect(() => {
    if (isInView && src && !currentSrc) {
      const optimizedSrc = getOptimizedSrc(src, width, height, quality, format);
      setCurrentSrc(optimizedSrc);
    }
  }, [isInView, src, width, height, quality, format, currentSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    
    // Measure performance
    if (src) {
      measureImageLoad(src).end(true);
    }
    
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    
    // Measure performance
    if (src) {
      measureImageLoad(src).end(false);
    }
    
    onError?.();
  };

  // Generate placeholder
  const renderPlaceholder = () => {
    if (!placeholder) return null;
    
    return (
      <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" 
           style={{ 
             width: width ? `${width}px` : '100%',
             height: height ? `${height}px` : '100%'
           }} />
    );
  };

  // Generate error state
  const renderError = () => {
    return (
      <div className="absolute inset-0 bg-gray-300 rounded flex items-center justify-center"
           style={{ 
             width: width ? `${width}px` : '100%',
             height: height ? `${height}px` : '100%'
           }}>
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto'
      }}
    >
      {/* Placeholder */}
      {placeholder && !isLoaded && !hasError && renderPlaceholder()}
      
      {/* Error state */}
      {hasError && renderError()}
      
      {/* Actual image */}
      {isInView && currentSrc && !hasError && (
        <img
          src={currentSrc}
          srcSet={generateSrcSet(currentSrc)}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 w-full h-full object-cover ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
      
      {/* Low quality image placeholder (LQIP) */}
      {isInView && !isLoaded && !hasError && (
        <img
          src={getOptimizedSrc(src, width, height, 20, 'webp')}
          alt=""
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// Specialized optimized components
export const Avatar = ({ src, alt, size = 40, className = '', ...props }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={`rounded-full ${className}`}
    format="webp"
    {...props}
  />
);

export const Thumbnail = ({ src, alt, className = '', ...props }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={150}
    height={150}
    className={`rounded-lg ${className}`}
    format="webp"
    {...props}
  />
);

export const HeroImage = ({ src, alt, className = '', ...props }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={1200}
    height={600}
    className={`rounded-xl ${className}`}
    quality={85}
    format="auto"
    loading="eager"
    {...props}
  />
);

export default OptimizedImage;
