const { pool } = require('./db');       

// Table creation SQL
const tables = [
    require('./tables/users'),
    require('./tables/elections'),
    require('./tables/positions'),
    require('./tables/candidates'),
    require('./tables/votes')
];

const seedData = require('./data/seedData');
const seedElections = require('./data/seedElection');

async function initDB() {
    console.log('Initializing database...');

    for (const tableSql of tables) {
        await pool.query(tableSql);
        console.log('Table checked/created');
    }

    await seedData(pool);
    await seedElections(pool);
    console.log('Database initialized with seed data!');

    await pool.end();
    process.exit(0);
}

initDB().catch(err => {
    console.error('DB Initialization failed:', err);
    process.exit(1);
});