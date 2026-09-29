import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
    user: 'postgres.klghymtzqkjbarysueas',
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    database: 'postgres',
    password: 'api-de-chamados',
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
});

export default pool;