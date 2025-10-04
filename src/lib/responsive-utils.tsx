// Responsive design utilities and mobile optimization helpers
import { useState, useEffect, useCallback } from 'react';

export interface BreakpointConfig {
  xs: number; // 0px
  sm: number; // 640px
  md: number; // 768px
  lg: number; // 1024px
  xl: number; // 1280px
  '2xl': number; // 1536px
}

export const breakpoints: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type BreakpointKey = keyof BreakpointConfig;

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: BreakpointKey;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  touchSupport: boolean;
}

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

// Custom hook for viewport information
export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape',
        pixelRatio: 1,
        touchSupport: false,
      };
    }

    return getViewportInfo();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewport(getViewportInfo());
    };

    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(() => {
        setViewport(getViewportInfo());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return viewport;
}

// Get current viewport information
function getViewportInfo(): ViewportInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Determine breakpoint
  let breakpoint: BreakpointKey = 'xs';
  if (width >= breakpoints['2xl']) breakpoint = '2xl';
  else if (width >= breakpoints.xl) breakpoint = 'xl';
  else if (width >= breakpoints.lg) breakpoint = 'lg';
  else if (width >= breakpoints.md) breakpoint = 'md';
  else if (width >= breakpoints.sm) breakpoint = 'sm';

  // Determine device type
  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;

  // Determine orientation
  const orientation = width > height ? 'landscape' : 'portrait';

  // Get pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;

  // Check touch support
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    pixelRatio,
    touchSupport,
  };
}

// Custom hook for responsive values
export function useResponsiveValue<T>(values: ResponsiveValue<T>): T | undefined {
  const { breakpoint } = useViewport();
  
  // Find the appropriate value for current breakpoint
  const breakpointOrder: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  // Look for value starting from current breakpoint and going down
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
}

// Custom hook for media queries
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addListener(handler);
    setMatches(mediaQuery.matches);

    return () => {
      mediaQuery.removeListener(handler);
    };
  }, [query]);

  return matches;
}

// Touch gesture utilities
export interface TouchGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
}

export function useTouchGestures(handlers: TouchGestureHandlers) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    // Check for swipe gestures
    if (deltaTime < maxSwipeTime) {
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical swipe
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        // Tap gesture
        const now = Date.now();
        if (now - lastTap < 300) {
          // Double tap
          handlers.onDoubleTap?.();
        } else {
          // Single tap
          handlers.onTap?.();
        }
        setLastTap(now);
      }
    }

    setTouchStart(null);
  }, [touchStart, lastTap, handlers]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// Responsive grid utilities
export function getResponsiveColumns(
  viewport: ViewportInfo,
  config: ResponsiveValue<number>
): number {
  const breakpointOrder: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(viewport.breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (config[bp] !== undefined) {
      return config[bp]!;
    }
  }
  
  return 1; // Default to 1 column
}

// Mobile-specific utilities
export const MobileUtils = {
  // Check if device is iOS
  isIOS: (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Check if device is Android
  isAndroid: (): boolean => {
    return /Android/.test(navigator.userAgent);
  },

  // Check if running in standalone mode (PWA)
  isStandalone: (): boolean => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  },

  // Get safe area insets for notched devices
  getSafeAreaInsets: (): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    };
  },

  // Vibrate device (if supported)
  vibrate: (pattern: number | number[]): void => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  // Request device orientation lock
  lockOrientation: (orientation: 'portrait' | 'landscape'): Promise<void> => {
    if ('screen' in window && 'orientation' in window.screen && 'lock' in window.screen.orientation) {
      return (window.screen.orientation as any).lock(orientation);
    }
    return Promise.resolve();
  },

  // Share content using Web Share API
  share: async (data: {
    title?: string;
    text?: string;
    url?: string;
  }): Promise<boolean> => {
    if ('share' in navigator) {
      try {
        await (navigator as any).share(data);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
        return false;
      }
    }
    return false;
  },

  // Copy to clipboard
  copyToClipboard: async (text: string): Promise<boolean> => {
    if ('clipboard' in navigator) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Clipboard write failed:', error);
        return false;
      }
    }
    
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (error) {
      console.error('Fallback copy failed:', error);
      return false;
    }
  },

  // Request notification permission
  requestNotificationPermission: async (): Promise<NotificationPermission> => {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  },

  // Check if app can be installed (PWA)
  canInstall: (): boolean => {
    return 'beforeinstallprompt' in window;
  },
};

// CSS-in-JS utilities for responsive design
export const ResponsiveStyles = {
  // Generate responsive padding/margin
  spacing: (config: ResponsiveValue<string>): string => {
    let styles = '';
    Object.entries(config).forEach(([breakpoint, value]) => {
      if (breakpoint === 'xs') {
        styles += `padding: ${value}; `;
      } else {
        const minWidth = breakpoints[breakpoint as BreakpointKey];
        styles += `@media (min-width: ${minWidth}px) { padding: ${value}; } `;
      }
    });
    return styles;
  },

  // Generate responsive grid
  grid: (config: ResponsiveValue<number>): string => {
    let styles = '';
    Object.entries(config).forEach(([breakpoint, columns]) => {
      const gridTemplate = `repeat(${columns}, minmax(0, 1fr))`;
      if (breakpoint === 'xs') {
        styles += `grid-template-columns: ${gridTemplate}; `;
      } else {
        const minWidth = breakpoints[breakpoint as BreakpointKey];
        styles += `@media (min-width: ${minWidth}px) { grid-template-columns: ${gridTemplate}; } `;
      }
    });
    return styles;
  },

  // Generate responsive font sizes
  fontSize: (config: ResponsiveValue<string>): string => {
    let styles = '';
    Object.entries(config).forEach(([breakpoint, size]) => {
      if (breakpoint === 'xs') {
        styles += `font-size: ${size}; `;
      } else {
        const minWidth = breakpoints[breakpoint as BreakpointKey];
        styles += `@media (min-width: ${minWidth}px) { font-size: ${size}; } `;
      }
    });
    return styles;
  },
};

// Performance-optimized responsive image component
export interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: ResponsiveValue<string>;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function ResponsiveImage({
  src,
  alt,
  sizes,
  className = '',
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
}: ResponsiveImageProps) {
  const viewport = useViewport();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Generate srcset for different screen densities
  const generateSrcSet = useCallback((baseSrc: string): string => {
    const srcSet = [
      `${baseSrc} 1x`,
      `${baseSrc.replace(/\.(jpg|jpeg|png|webp)$/, '@2x.$1')} 2x`,
    ];
    
    if (viewport.pixelRatio >= 3) {
      srcSet.push(`${baseSrc.replace(/\.(jpg|jpeg|png|webp)$/, '@3x.$1')} 3x`);
    }
    
    return srcSet.join(', ');
  }, [viewport.pixelRatio]);

  // Generate sizes attribute
  const generateSizes = useCallback((): string => {
    if (!sizes) return '100vw';
    
    const sizeQueries: string[] = [];
    
    Object.entries(sizes).forEach(([breakpoint, size]) => {
      if (breakpoint !== 'xs') {
        const minWidth = breakpoints[breakpoint as BreakpointKey];
        sizeQueries.push(`(min-width: ${minWidth}px) ${size}`);
      }
    });
    
    // Add default size (xs)
    sizeQueries.push(sizes.xs || '100vw');
    
    return sizeQueries.join(', ');
  }, [sizes]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        srcSet={generateSrcSet(src)}
        sizes={generateSizes()}
        alt={alt}
        loading={loading}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

// Mobile-optimized form input component
export interface MobileInputProps {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url';
  className?: string;
}

export function MobileInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  required = false,
  disabled = false,
  autoComplete,
  inputMode,
  className = '',
}: MobileInputProps) {
  const viewport = useViewport();
  const [isFocused, setIsFocused] = useState(false);

  // Adjust input size for mobile
  const inputSize = viewport.isMobile ? 'text-base' : 'text-sm';
  const inputPadding = viewport.isMobile ? 'px-4 py-3' : 'px-3 py-2';

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            block w-full ${inputSize} ${inputPadding}
            border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
            ${isFocused && viewport.isMobile ? 'transform scale-105' : ''}
            transition-all duration-200
          `}
        />
        
        {/* Mobile-specific enhancements */}
        {viewport.isMobile && isFocused && (
          <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-md animate-pulse" />
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Mobile-optimized button component
export interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function MobileButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
}: MobileButtonProps) {
  const viewport = useViewport();

  // Adjust button size for mobile
  const buttonSize = viewport.isMobile ? 'lg' : size;
  
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-md
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
    ${fullWidth ? 'w-full' : ''}
    ${viewport.touchSupport ? 'active:scale-95' : 'hover:scale-105'}
  `;

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${sizeClasses[buttonSize]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}