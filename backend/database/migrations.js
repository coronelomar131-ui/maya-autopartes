/**
 * Database Migrations Manager
 * Gestiona la ejecución automática de migraciones SQL
 *
 * Uso:
 * const migrations = require('./database/migrations');
 * await migrations.runAll();
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Inicializa el cliente de Supabase
 */
const initSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Crea la tabla de migraciones si no existe
 */
const ensureMigrationsTable = async (client) => {
  try {
    const { error } = await client.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (error) throw error;
    console.log('✓ Tabla de migraciones verificada');
  } catch (error) {
    console.error('Error al crear tabla de migraciones:', error);
    throw error;
  }
};

/**
 * Obtiene las migraciones ya ejecutadas
 */
const getExecutedMigrations = async (client) => {
  try {
    const { data, error } = await client
      .from(MIGRATIONS_TABLE)
      .select('name')
      .order('name');

    if (error) throw error;
    return data.map(row => row.name);
  } catch (error) {
    console.error('Error al obtener migraciones ejecutadas:', error);
    return [];
  }
};

/**
 * Obtiene la lista de archivos de migraciones disponibles
 */
const getMigrationFiles = () => {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.match(/^migration_\d{3}_.*\.sql$/))
      .sort();
    return files;
  } catch (error) {
    console.error('Error al leer directorio de migraciones:', error);
    return [];
  }
};

/**
 * Lee el contenido de un archivo de migración
 */
const readMigration = (filename) => {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  try {
    return fs.readFileSync(filepath, 'utf8');
  } catch (error) {
    console.error(`Error al leer ${filename}:`, error);
    throw error;
  }
};

/**
 * Ejecuta una migración individual
 */
const executeMigration = async (client, filename, sql) => {
  try {
    console.log(`▶ Ejecutando migración: ${filename}`);

    // Ejecutar el SQL de la migración
    const { error } = await client.rpc('exec', { sql });

    if (error) throw error;

    // Registrar la migración como ejecutada
    await client
      .from(MIGRATIONS_TABLE)
      .insert({ name: filename });

    console.log(`✓ Migración completada: ${filename}`);
    return true;
  } catch (error) {
    console.error(`✗ Error en migración ${filename}:`, error.message);
    throw error;
  }
};

/**
 * Ejecuta todas las migraciones pendientes
 */
const runAll = async () => {
  console.log('\n=== Iniciando Migraciones de Base de Datos ===\n');

  let client;
  try {
    client = initSupabaseClient();

    // Verificar tabla de migraciones
    await ensureMigrationsTable(client);

    // Obtener migraciones ya ejecutadas
    const executed = await getExecutedMigrations(client);
    console.log(`Migraciones ya ejecutadas: ${executed.length}`);

    // Obtener lista de archivos
    const files = getMigrationFiles();
    console.log(`Migraciones disponibles: ${files.length}\n`);

    // Filtrar migraciones pendientes
    const pending = files.filter(file => !executed.includes(file));

    if (pending.length === 0) {
      console.log('✓ Base de datos está actualizada, ninguna migración pendiente.\n');
      return { success: true, executed: 0, skipped: executed.length };
    }

    // Ejecutar migraciones pendientes
    let successCount = 0;
    for (const filename of pending) {
      const sql = readMigration(filename);
      await executeMigration(client, filename, sql);
      successCount++;
    }

    console.log(`\n✓ Todas las migraciones completadas exitosamente!`);
    console.log(`  Ejecutadas: ${successCount}, Saltadas: ${executed.length}\n`);

    return { success: true, executed: successCount, skipped: executed.length };
  } catch (error) {
    console.error('\n✗ Error durante las migraciones:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Ejecuta una migración específica
 */
const runSpecific = async (migrationName) => {
  console.log(`\n=== Ejecutando Migración: ${migrationName} ===\n`);

  let client;
  try {
    client = initSupabaseClient();

    // Verificar tabla de migraciones
    await ensureMigrationsTable(client);

    // Verificar si la migración ya fue ejecutada
    const executed = await getExecutedMigrations(client);
    if (executed.includes(migrationName)) {
      console.log(`⚠ La migración ${migrationName} ya fue ejecutada\n`);
      return { success: false, message: 'Migration already executed' };
    }

    // Ejecutar la migración
    const sql = readMigration(migrationName);
    await executeMigration(client, migrationName, sql);

    console.log(`\n✓ Migración completada exitosamente!\n`);
    return { success: true };
  } catch (error) {
    console.error(`\n✗ Error:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Muestra el estado de las migraciones
 */
const status = async () => {
  console.log('\n=== Estado de Migraciones ===\n');

  let client;
  try {
    client = initSupabaseClient();

    // Obtener migraciones ejecutadas
    const executed = await getExecutedMigrations(client);
    const files = getMigrationFiles();
    const pending = files.filter(file => !executed.includes(file));

    console.log('Migraciones Ejecutadas:');
    executed.forEach(name => console.log(`  ✓ ${name}`));

    if (pending.length > 0) {
      console.log('\nMigraciones Pendientes:');
      pending.forEach(name => console.log(`  ▶ ${name}`));
    } else {
      console.log('\n✓ Todas las migraciones han sido ejecutadas');
    }

    console.log(`\nResumen: ${executed.length}/${files.length} migraciones completadas\n`);
    return { executed, pending };
  } catch (error) {
    console.error('Error al obtener estado:', error.message);
    return null;
  }
};

// Exportar funciones
module.exports = {
  runAll,
  runSpecific,
  status,
  getMigrationFiles,
  getExecutedMigrations
};

// Si se ejecuta directamente desde línea de comando
if (require.main === module) {
  const command = process.argv[2] || 'run';

  (async () => {
    try {
      if (command === 'run') {
        await runAll();
      } else if (command === 'status') {
        await status();
      } else if (command === 'specific') {
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error('Por favor especifique el nombre de la migración');
          process.exit(1);
        }
        await runSpecific(migrationName);
      } else {
        console.log('Comandos disponibles: run, status, specific <nombre>');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
