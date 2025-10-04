// Image optimization and compression utilities
import { performanceMonitor } from './performance-monitor';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
  stripMetadata?: boolean;
}

export interface OptimizedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

export interface ResponsiveImageSizes {
  small: string; // 320px
  medium: string; // 768px
  large: string; // 1200px
  xlarge: string; // 1920px
}

class ImageOptimizer {
  private static instance: ImageOptimizer;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d')!;
    }
  }

  public static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  // Optimize image file
  public async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const startTime = performance.now();
    
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        format = 'jpeg',
        progressive = true,
        stripMetadata = true,
      } = options;

      // Load image
      const img = await this.loadImage(file);
      
      // Calculate new dimensions
      const { width, height } = this.calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      // Set canvas size
      this.canvas.width = width;
      this.canvas.height = height;

      // Clear canvas and draw image
      this.ctx.clearRect(0, 0, width, height);
      
      // Apply image smoothing for better quality
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      this.ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = this.getMimeType(format);
      const blob = await this.canvasToBlob(this.canvas, mimeType, quality);
      
      // Generate data URL
      const dataUrl = await this.blobToDataUrl(blob);

      const optimizedImage: OptimizedImage = {
        blob,
        dataUrl,
        width,
        height,
        originalSize: file.size,
        optimizedSize: blob.size,
        compressionRatio: (1 - blob.size / file.size) * 100,
      };

      // Record performance metric
      const processingTime = performance.now() - startTime;
      performanceMonitor.recordMetric({
        imageLoadTime: processingTime,
        url: `image-optimization:${file.name}`,
      });

      return optimizedImage;
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error('Failed to optimize image');
    }
  }

  // Generate responsive image sizes
  public async generateResponsiveSizes(
    file: File,
    options: Omit<ImageOptimizationOptions, 'maxWidth' | 'maxHeight'> = {}
  ): Promise<ResponsiveImageSizes> {
    const sizes = {
      small: { maxWidth: 320, maxHeight: 240 },
      medium: { maxWidth: 768, maxHeight: 576 },
      large: { maxWidth: 1200, maxHeight: 900 },
      xlarge: { maxWidth: 1920, maxHeight: 1440 },
    };

    const results: Partial<ResponsiveImageSizes> = {};

    for (const [sizeName, dimensions] of Object.entries(sizes)) {
      try {
        const optimized = await this.optimizeImage(file, {
          ...options,
          ...dimensions,
        });
        results[sizeName as keyof ResponsiveImageSizes] = optimized.dataUrl;
      } catch (error) {
        console.error(`Failed to generate ${sizeName} size:`, error);
      }
    }

    return results as ResponsiveImageSizes;
  }

  // Create thumbnail
  public async createThumbnail(
    file: File,
    size: number = 150,
    quality: number = 0.7
  ): Promise<OptimizedImage> {
    return this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality,
      format: 'jpeg',
    });
  }

  // Compress image for upload
  public async compressForUpload(
    file: File,
    maxSizeMB: number = 5
  ): Promise<OptimizedImage> {
    let quality = 0.8;
    let optimized = await this.optimizeImage(file, { quality });

    // Reduce quality until file size is acceptable
    while (optimized.optimizedSize > maxSizeMB * 1024 * 1024 && quality > 0.1) {
      quality -= 0.1;
      optimized = await this.optimizeImage(file, { quality });
    }

    return optimized;
  }

  // Check if image needs optimization
  public shouldOptimize(file: File): boolean {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    return file.size > maxSize && supportedTypes.includes(file.type);
  }

  // Get optimal format for image
  public getOptimalFormat(file: File): 'jpeg' | 'png' | 'webp' {
    // Check WebP support
    if (this.supportsWebP()) {
      return 'webp';
    }
    
    // Use JPEG for photos, PNG for graphics with transparency
    if (file.type === 'image/png') {
      return 'png';
    }
    
    return 'jpeg';
  }

  // Private helper methods
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Calculate aspect ratio
    const aspectRatio = width / height;

    // Resize based on constraints
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
      reader.readAsDataURL(blob);
    });
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
}

// Export singleton instance
export const imageOptimizer = ImageOptimizer.getInstance();

// React hook for image optimization
export function useImageOptimizer() {
  const optimizeImage = React.useCallback(
    (file: File, options?: ImageOptimizationOptions) => {
      return imageOptimizer.optimizeImage(file, options);
    },
    []
  );

  const generateResponsiveSizes = React.useCallback(
    (file: File, options?: Omit<ImageOptimizationOptions, 'maxWidth' | 'maxHeight'>) => {
      return imageOptimizer.generateResponsiveSizes(file, options);
    },
    []
  );

  const createThumbnail = React.useCallback(
    (file: File, size?: number, quality?: number) => {
      return imageOptimizer.createThumbnail(file, size, quality);
    },
    []
  );

  const compressForUpload = React.useCallback(
    (file: File, maxSizeMB?: number) => {
      return imageOptimizer.compressForUpload(file, maxSizeMB);
    },
    []
  );

  return {
    optimizeImage,
    generateResponsiveSizes,
    createThumbnail,
    compressForUpload,
    shouldOptimize: imageOptimizer.shouldOptimize.bind(imageOptimizer),
    getOptimalFormat: imageOptimizer.getOptimalFormat.bind(imageOptimizer),
  };
}

// Utility components for optimized images
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (priority && imgRef.current) {
      // Preload high-priority images
      const img = new Image();
      img.src = src;
    }
  }, [src, priority]);

  const handleLoad = React.useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

// Progressive image loading component
export interface ProgressiveImageProps extends OptimizedImageProps {
  placeholder?: string;
  sizes?: ResponsiveImageSizes;
}

export function ProgressiveImage({
  src,
  placeholder,
  sizes,
  ...props
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = React.useState(placeholder || src);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (sizes) {
      // Load appropriate size based on viewport
      const width = window.innerWidth;
      let targetSrc = src;

      if (width <= 320 && sizes.small) {
        targetSrc = sizes.small;
      } else if (width <= 768 && sizes.medium) {
        targetSrc = sizes.medium;
      } else if (width <= 1200 && sizes.large) {
        targetSrc = sizes.large;
      } else if (sizes.xlarge) {
        targetSrc = sizes.xlarge;
      }

      if (targetSrc !== currentSrc) {
        const img = new Image();
        img.onload = () => {
          setCurrentSrc(targetSrc);
          setIsLoaded(true);
        };
        img.src = targetSrc;
      }
    } else if (src !== currentSrc) {
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(src);
        setIsLoaded(true);
      };
      img.src = src;
    }
  }, [src, sizes, currentSrc]);

  return (
    <OptimizedImage
      {...props}
      src={currentSrc}
      className={`${props.className} ${
        isLoaded ? 'filter-none' : 'filter blur-sm'
      }`}
    />
  );
}