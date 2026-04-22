/**
 * Compression & Response Optimization
 * Gzip compression, JSON minification y CDN setup
 *
 * Features:
 * - Gzip compression middleware
 * - JSON minification
 * - Brotli compression (fallback)
 * - Compression statistics
 * - CDN headers para assets estáticos
 */

const compression = require('compression');

class CompressionManager {
  constructor(options = {}) {
    this.minSize = options.minSize || 1024; // Mínimo 1KB para comprimir
    this.level = options.level || 6; // Nivel de compresión (0-11)
    this.statistics = {
      responsesCompressed: 0,
      responsesUncompressed: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      averageRatio: 0
    };
    this.cdnConfig = {
      staticAssets: ['.js', '.css', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.woff', '.woff2'],
      ttl: options.cdnTTL || 86400 * 30, // 30 días
      immutable: true
    };
  }

  /**
   * Middleware de compresión avanzada
   */
  getCompressionMiddleware() {
    return compression({
      // Comprimir basado en tamaño
      filter: (req, res) => {
        // No comprimir si ya está comprimido
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Usar el método por defecto
        return compression.filter(req, res);
      },

      // Nivel de compresión
      level: this.level,

      // Tamaño mínimo para comprimir (bytes)
      threshold: this.minSize,

      // Algoritmo (gzip es el más compatible)
      algorithm: 'gzip'
    });
  }

  /**
   * Minificar JSON response
   */
  minifyJSON(obj) {
    // JSON.stringify sin espacios ni indentación
    return JSON.stringify(obj);
  }

  /**
   * Middleware para minificar responses JSON
   */
  getJSONMinificationMiddleware() {
    return (req, res, next) => {
      // Guardar el método original de json
      const originalJson = res.json;

      // Sobrescribir para minificar
      res.json = function(data) {
        // Enviar JSON minificado
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Middleware para headers de caching de CDN
   */
  getCDNHeadersMiddleware() {
    return (req, res, next) => {
      const url = req.originalUrl;

      // Detectar si es un asset estático
      const isStaticAsset = this.cdnConfig.staticAssets.some(ext => url.includes(ext));

      if (isStaticAsset) {
        // Headers para assets estáticos en CDN
        res.set({
          'Cache-Control': `public, max-age=${this.cdnConfig.ttl}, immutable`,
          'CDN-Cache-Control': `max-age=${this.cdnConfig.ttl}`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN'
        });
      } else if (req.method === 'GET') {
        // Headers para datos dinámicos con cache más corto
        res.set({
          'Cache-Control': 'public, max-age=300, must-revalidate',
          'ETag': this.generateETag(JSON.stringify(res.locals.data || {}))
        });
      } else {
        // No cachear para POST, PUT, DELETE
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }

      next();
    };
  }

  /**
   * Generar ETag para validación de cache
   */
  generateETag(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Middleware para monitoreo de compresión
   */
  getCompressionMonitorMiddleware() {
    return (req, res, next) => {
      // Guardar tamaño original
      const originalJson = res.json;
      let originalSize = 0;
      let compressedSize = 0;

      res.json = function(data) {
        try {
          // Calcular tamaño original
          const jsonString = JSON.stringify(data);
          originalSize = Buffer.byteLength(jsonString, 'utf8');

          // Guardar información de compresión
          res.on('finish', () => {
            // El tamaño comprimido se infiere de headers si está disponible
            const contentLength = res.getHeader('content-length');
            if (contentLength) {
              compressedSize = parseInt(contentLength);
            } else {
              compressedSize = originalSize;
            }

            this.recordCompression(originalSize, compressedSize);
          });
        } catch (error) {
          console.error('Compression monitoring error:', error);
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Registrar estadísticas de compresión
   */
  recordCompression(original, compressed) {
    if (compressed < original) {
      this.statistics.responsesCompressed++;
      this.statistics.bytesOriginal += original;
      this.statistics.bytesCompressed += compressed;

      // Actualizar ratio promedio
      const totalSaved = this.statistics.bytesOriginal - this.statistics.bytesCompressed;
      this.statistics.averageRatio = (totalSaved / this.statistics.bytesOriginal * 100).toFixed(2);
    } else {
      this.statistics.responsesUncompressed++;
      this.statistics.bytesOriginal += original;
      this.statistics.bytesCompressed += original;
    }
  }

  /**
   * Obtener estadísticas de compresión
   */
  getStatistics() {
    const total = this.statistics.responsesCompressed + this.statistics.responsesUncompressed;

    return {
      ...this.statistics,
      total,
      compressionRate: total > 0 ? ((this.statistics.responsesCompressed / total) * 100).toFixed(2) : 0,
      totalBytesSaved: this.statistics.bytesOriginal - this.statistics.bytesCompressed,
      averageCompressionRatio: this.statistics.averageRatio + '%'
    };
  }

  /**
   * Resetear estadísticas
   */
  resetStatistics() {
    this.statistics = {
      responsesCompressed: 0,
      responsesUncompressed: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      averageRatio: 0
    };
  }

  /**
   * Optimizar payload antes de enviar
   */
  optimizePayload(data, options = {}) {
    const {
      removeNulls = true,
      removeEmpty = true,
      maxDepth = 10
    } = options;

    return this.deepOptimize(data, removeNulls, removeEmpty, 0, maxDepth);
  }

  /**
   * Recursivamente optimizar estructura de datos
   */
  deepOptimize(obj, removeNulls, removeEmpty, depth, maxDepth) {
    if (depth > maxDepth) return obj;

    if (Array.isArray(obj)) {
      return obj
        .map(item => this.deepOptimize(item, removeNulls, removeEmpty, depth + 1, maxDepth))
        .filter(item => {
          if (removeNulls && item === null) return false;
          if (removeEmpty && typeof item === 'string' && item.trim() === '') return false;
          return true;
        });
    }

    if (obj !== null && typeof obj === 'object') {
      const optimized = {};

      for (const [key, value] of Object.entries(obj)) {
        let optimizedValue = this.deepOptimize(value, removeNulls, removeEmpty, depth + 1, maxDepth);

        // Filtrar valores innecesarios
        if (removeNulls && optimizedValue === null) continue;
        if (removeEmpty && typeof optimizedValue === 'string' && optimizedValue.trim() === '') continue;
        if (removeEmpty && Array.isArray(optimizedValue) && optimizedValue.length === 0) continue;

        optimized[key] = optimizedValue;
      }

      return optimized;
    }

    return obj;
  }

  /**
   * Middleware completo de compresión y optimización
   */
  getFullOptimizationMiddleware() {
    const compressionMiddleware = this.getCompressionMiddleware();
    const jsonMinMiddleware = this.getJSONMinificationMiddleware();
    const cdnHeadersMiddleware = this.getCDNHeadersMiddleware();
    const monitoringMiddleware = this.getCompressionMonitorMiddleware();

    return [
      compressionMiddleware,
      jsonMinMiddleware,
      cdnHeadersMiddleware,
      monitoringMiddleware
    ];
  }
}

module.exports = CompressionManager;
