import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { performanceUtils } from '../utils/performance';

const VirtualScroll = ({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const containerRef = useRef(null);
  const scrollElementRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerSize.height) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerSize.height, overscan, items.length]);

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Total height of all items
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(performanceUtils.throttle((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(event);
  }, 16), [onScroll]); // 16ms ~ 60fps

  // Scroll to specific item
  const scrollToItem = useCallback((index, behavior = 'smooth') => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: targetScrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback((behavior = 'smooth') => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTo({
        top: 0,
        behavior
      });
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTo({
        top: totalHeight,
        behavior
      });
    }
  }, [totalHeight]);

  // Get current scroll position
  const getScrollPosition = useCallback(() => {
    return {
      scrollTop,
      scrollPercentage: totalHeight > 0 ? (scrollTop / totalHeight) * 100 : 0,
      visibleRange
    };
  }, [scrollTop, totalHeight, visibleRange]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ height: containerHeight }}
      {...props}
    >
      <div
        ref={scrollElementRef}
        className="overflow-y-auto overflow-x-hidden h-full"
        onScroll={handleScroll}
        style={{ height: '100%' }}
      >
        {/* Spacer to maintain scroll height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            const translateY = actualIndex * itemHeight;
            
            return (
              <div
                key={actualIndex}
                style={{
                  position: 'absolute',
                  top: translateY,
                  left: 0,
                  right: 0,
                  height: itemHeight,
                  transform: `translateY(${translateY}px)`
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Hook for virtual scrolling
export const useVirtualScroll = ({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  const handleScroll = useCallback(performanceUtils.throttle((event) => {
    setScrollTop(event.target.scrollTop);
  }, 16), []);

  const scrollToItem = useCallback((index, behavior = 'smooth') => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: targetScrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    scrollTop,
    handleScroll,
    scrollToItem,
    scrollElementRef
  };
};

// Specialized virtual list components
export const VirtualList = ({ items, renderItem, ...props }) => (
  <VirtualScroll
    items={items}
    renderItem={renderItem}
    itemHeight={50}
    {...props}
  />
);

export const VirtualGrid = ({ 
  items, 
  renderItem, 
  itemWidth = 200, 
  itemHeight = 200, 
  containerWidth = 800,
  containerHeight = 600,
  gap = 10,
  className = '',
  ...props 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  // Calculate columns
  const columns = useMemo(() => {
    return Math.floor((containerWidth + gap) / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const rows = Math.ceil(items.length / columns);
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)));
    const endRow = Math.min(
      rows - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + 1
    );
    
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);
    
    return { startIndex, endIndex, startRow, endRow };
  }, [scrollTop, itemHeight, gap, containerHeight, items.length, columns]);

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Total height
  const totalHeight = useMemo(() => {
    const rows = Math.ceil(items.length / columns);
    return rows * itemHeight + (rows - 1) * gap;
  }, [items.length, columns, itemHeight, gap]);

  const handleScroll = useCallback(performanceUtils.throttle((event) => {
    setScrollTop(event.target.scrollTop);
  }, 16), []);

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
      {...props}
    >
      <div
        ref={scrollElementRef}
        className="overflow-y-auto overflow-x-hidden h-full"
        onScroll={handleScroll}
        style={{ height: '100%' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            const row = Math.floor(actualIndex / columns);
            const col = actualIndex % columns;
            const translateY = row * (itemHeight + gap);
            const translateX = col * (itemWidth + gap);
            
            return (
              <div
                key={actualIndex}
                style={{
                  position: 'absolute',
                  top: translateY,
                  left: translateX,
                  width: itemWidth,
                  height: itemHeight,
                  transform: `translate(${translateX}px, ${translateY}px)`
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualScroll;
