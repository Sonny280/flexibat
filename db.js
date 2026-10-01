const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Railway (et la plupart des hébergeurs cloud) exigent SSL sur la connexion
// externe ; en local (postgres sur ta machine), on désactive SSL.
const useSSL = process.env.PGSSL === 'true' || (connectionString && connectionString.includes('railway'));

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

module.exports = pool;
