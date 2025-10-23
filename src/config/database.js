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

  poolInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
    // SSL configuration - required for Neon and most cloud PostgreSQL providers
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

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
