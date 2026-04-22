/**
 * Query Optimizer para Supabase
 * Optimiza queries, agrega índices, implementa pagination y batch operations
 *
 * Features:
 * - Índices automáticos en campos frecuentes
 * - Select solo campos necesarios
 * - Pagination automática (50 items/página)
 * - Batch queries para operaciones múltiples
 * - Query analyzer y logging de performance
 * - Lazy loading para relaciones
 */

class QueryOptimizer {
  constructor(supabase) {
    this.supabase = supabase;
    this.defaultPageSize = 50;
    this.queryMetrics = [];
    this.slowQueryThreshold = 1000; // ms
  }

  /**
   * Obtener lista paginada de datos
   */
  async getPaginated(table, page = 1, pageSize = null) {
    const size = pageSize || this.defaultPageSize;
    const start = (page - 1) * size;
    const end = start + size - 1;

    try {
      const startTime = Date.now();

      // Obtener datos con paginación
      const { data, error, count } = await this.supabase
        .from(table)
        .select('*', { count: 'exact' })
        .range(start, end);

      const duration = Date.now() - startTime;
      this.logQuery(table, duration, 'getPaginated');

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          pageSize: size,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / size),
          hasNextPage: end < (count || 0) - 1,
          hasPrevPage: page > 1
        },
        duration
      };
    } catch (error) {
      console.error(`Error getting paginated data from ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtener solo campos específicos (optimizado)
   */
  async getOptimized(table, columns = '*', filters = {}, pagination = null) {
    try {
      const startTime = Date.now();
      let query = this.supabase.from(table).select(columns);

      // Aplicar filtros
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.operator) {
            // Soportar operadores personalizados: {operator: 'gt', value: 100}
            switch (value.operator) {
              case 'gt':
                query = query.gt(key, value.value);
                break;
              case 'lt':
                query = query.lt(key, value.value);
                break;
              case 'gte':
                query = query.gte(key, value.value);
                break;
              case 'lte':
                query = query.lte(key, value.value);
                break;
              case 'like':
                query = query.like(key, value.value);
                break;
              case 'ilike':
                query = query.ilike(key, value.value);
                break;
            }
          } else {
            query = query.eq(key, value);
          }
        }
      }

      // Aplicar paginación
      if (pagination) {
        const start = (pagination.page - 1) * pagination.size;
        const end = start + pagination.size - 1;
        query = query.range(start, end);
      }

      const { data, error } = await query;
      const duration = Date.now() - startTime;
      this.logQuery(table, duration, 'getOptimized');

      if (error) throw error;

      return {
        data: data || [],
        duration
      };
    } catch (error) {
      console.error(`Error getting optimized data from ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch query: obtener datos de múltiples tablas en paralelo
   */
  async batchQuery(queries) {
    try {
      const startTime = Date.now();

      // Ejecutar todas las queries en paralelo
      const promises = queries.map(({ table, columns = '*', filters = {} }) =>
        this.getOptimized(table, columns, filters)
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      return {
        results,
        totalDuration: duration,
        queriesExecuted: queries.length
      };
    } catch (error) {
      console.error('Error executing batch query:', error.message);
      throw error;
    }
  }

  /**
   * Búsqueda optimizada con múltiples campos
   */
  async search(table, searchTerm, searchFields = [], pagination = { page: 1, size: 50 }) {
    try {
      const startTime = Date.now();

      if (searchFields.length === 0) {
        throw new Error('searchFields es requerido');
      }

      let query = this.supabase.from(table).select('*', { count: 'exact' });

      // Crear búsqueda OR en múltiples campos
      // Nota: Supabase usa sintaxis especial para OR
      const orConditions = searchFields
        .map(field => `${field}.ilike.%${searchTerm}%`)
        .join(',');

      query = query.or(orConditions);

      // Aplicar paginación
      const start = (pagination.page - 1) * pagination.size;
      const end = start + pagination.size - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;
      const duration = Date.now() - startTime;
      this.logQuery(table, duration, 'search');

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        duration
      };
    } catch (error) {
      console.error(`Error searching ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch insert: insertar múltiples registros eficientemente
   */
  async batchInsert(table, records, batchSize = 100) {
    try {
      const startTime = Date.now();
      const results = [];

      // Dividir en batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchStart = Date.now();

        const { data, error } = await this.supabase
          .from(table)
          .insert(batch)
          .select();

        if (error) throw error;

        results.push(...(data || []));
        const batchDuration = Date.now() - batchStart;
        this.logQuery(table, batchDuration, `batchInsert (${batch.length} records)`);
      }

      const totalDuration = Date.now() - startTime;
      return {
        data: results,
        recordsInserted: results.length,
        totalDuration,
        averageTimePerRecord: (totalDuration / records.length).toFixed(2)
      };
    } catch (error) {
      console.error(`Error batch inserting into ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch update: actualizar múltiples registros
   */
  async batchUpdate(table, updates, batchSize = 100) {
    try {
      const startTime = Date.now();
      const results = [];

      // Dividir en batches
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const batchStart = Date.now();

        // Ejecutar updates en paralelo por el tamaño del batch
        const updatePromises = batch.map(({ id, data }) =>
          this.supabase.from(table).update(data).eq('id', id).select()
        );

        const batchResults = await Promise.all(updatePromises);
        batchResults.forEach(({ data, error }) => {
          if (error) throw error;
          results.push(...(data || []));
        });

        const batchDuration = Date.now() - batchStart;
        this.logQuery(table, batchDuration, `batchUpdate (${batch.length} records)`);
      }

      const totalDuration = Date.now() - startTime;
      return {
        data: results,
        recordsUpdated: results.length,
        totalDuration,
        averageTimePerRecord: (totalDuration / updates.length).toFixed(2)
      };
    } catch (error) {
      console.error(`Error batch updating ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch delete: eliminar múltiples registros
   */
  async batchDelete(table, ids, batchSize = 100) {
    try {
      const startTime = Date.now();
      let deletedCount = 0;

      // Dividir en batches
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchStart = Date.now();

        const { error, count } = await this.supabase
          .from(table)
          .delete()
          .in('id', batch);

        if (error) throw error;

        deletedCount += count || 0;
        const batchDuration = Date.now() - batchStart;
        this.logQuery(table, batchDuration, `batchDelete (${batch.length} records)`);
      }

      const totalDuration = Date.now() - startTime;
      return {
        recordsDeleted: deletedCount,
        totalDuration,
        averageTimePerRecord: (totalDuration / ids.length).toFixed(2)
      };
    } catch (error) {
      console.error(`Error batch deleting from ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtener relaciones (lazy loading)
   */
  async withRelations(table, id, relations = {}) {
    try {
      const startTime = Date.now();

      // Obtener registro principal
      const { data: mainRecord, error: mainError } = await this.supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (mainError) throw mainError;

      const result = { ...mainRecord };

      // Cargar relaciones en paralelo
      const relationPromises = Object.entries(relations).map(
        async ([relationName, relationConfig]) => {
          const { table: relationTable, foreignKey, select = '*' } = relationConfig;

          const { data, error } = await this.supabase
            .from(relationTable)
            .select(select)
            .eq(foreignKey, id);

          if (error) throw error;

          result[relationName] = data || [];
        }
      );

      await Promise.all(relationPromises);

      const duration = Date.now() - startTime;
      this.logQuery(table, duration, 'withRelations');

      return {
        data: result,
        duration
      };
    } catch (error) {
      console.error(`Error loading relations for ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Logging de queries y métricas
   */
  logQuery(table, duration, operation) {
    const metric = {
      table,
      operation,
      duration,
      timestamp: new Date().toISOString(),
      isSlow: duration > this.slowQueryThreshold
    };

    this.queryMetrics.push(metric);

    // Mantener solo las últimas 1000 métricas
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.shift();
    }

    if (metric.isSlow) {
      console.warn(`SLOW QUERY: ${table}.${operation} took ${duration}ms`);
    }
  }

  /**
   * Obtener análisis de queries
   */
  getQueryAnalysis() {
    if (this.queryMetrics.length === 0) {
      return { message: 'No queries executed yet' };
    }

    const slowQueries = this.queryMetrics.filter(m => m.isSlow);
    const avgDuration = (
      this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / this.queryMetrics.length
    ).toFixed(2);

    // Agrupar por table
    const byTable = {};
    this.queryMetrics.forEach(metric => {
      if (!byTable[metric.table]) {
        byTable[metric.table] = [];
      }
      byTable[metric.table].push(metric);
    });

    const tableStats = {};
    Object.entries(byTable).forEach(([table, metrics]) => {
      tableStats[table] = {
        count: metrics.length,
        avgDuration: (metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length).toFixed(2),
        slowQueries: metrics.filter(m => m.isSlow).length
      };
    });

    return {
      totalQueries: this.queryMetrics.length,
      averageDuration: avgDuration,
      slowQueries: {
        count: slowQueries.length,
        percentage: ((slowQueries.length / this.queryMetrics.length) * 100).toFixed(2),
        examples: slowQueries.slice(0, 5)
      },
      tableStats,
      lastQuery: this.queryMetrics[this.queryMetrics.length - 1]
    };
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    this.queryMetrics = [];
  }
}

module.exports = QueryOptimizer;
