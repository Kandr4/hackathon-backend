import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Singleton pool instance
let poolInstance = null;

// Create pool with optimized settings
const createPool = () => {
  if (poolInstance) {
    return poolInstance;
  }

  // Checking environment
  const isProduction = process.env.NODE_ENV === 'production';

  // Define base configuration
  const commonConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
  
  // Define specific configuration based on environment
  const environmentConfig = isProduction
    ? {
        // --- Production Configuration (NeonDB) ---
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        // --- Local Development Configuration ---
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: false // Important: SSL disabled for local
      };

  // Merge configurations
  const poolConfig = { ...commonConfig, ...environmentConfig };

  poolInstance = new Pool(poolConfig);

  // Connection event handlers
  poolInstance.on('connect', (client) => {
    console.log('✓ New database client connected');
  });

  poolInstance.on('acquire', (client) => {
    // Client is checked out from the pool
  });

  poolInstance.on('remove', (client) => {
    console.log('Database client removed from pool');
  });

  poolInstance.on('error', (err, client) => {
    console.error('Unexpected error on idle database client:', err);
    // Don't exit the process, let the pool handle reconnection
  });

  return poolInstance;
};

// Initialize the pool
const pool = createPool();

// Graceful shutdown
const closePool = async () => {
  if (poolInstance) {
    console.log('Closing database connection pool...');
    await poolInstance.end();
    poolInstance = null;
    console.log('✓ Database pool closed');
  }
};

// Handle application shutdown
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

export { closePool };
export default pool;
