import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, initializeDatabase } from './database.js';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
// Read and execute SQL schema file
const runMigration = async () => {
  try {
    console.log('🔄 Starting database migration...');
 
    // Initialize database connection
    await initializeDatabase();
 
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
 
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
 
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
 
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await query(statement, [], true);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist, that's okay
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.code === 'ER_DUP_KEYNAME' || 
            error.code === 'ER_KEY_COLUMN_DOES_NOT_EXITS') {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          throw error;
        }
      }
    }
 
    console.log('🎉 Database migration completed successfully!');
 
    // Verify tables were created
    const tables = await query('SHOW TABLES');
    console.log(`📊 Created ${tables.length} tables:`, tables.map(t => Object.values(t)[0]));
 
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};
 
// Seed database with sample data
const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with sample data...');
 
    // Check if admin user exists
    const adminExists = await query('SELECT COUNT(*) as count FROM User WHERE email = ?', ['admin@voting.app']);
 
    if (adminExists[0].count === 0) {
      // Insert admin user (password: admin123)
      const adminPassword = '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ';
      await query(
        'INSERT INTO User (vin, fullname, email, password, role, emailVerified) VALUES (?, ?, ?, ?, ?, ?)',
        ['ADMIN001', 'System Administrator', 'admin@voting.app', adminPassword, 'admin', 1],
        true
      );
      console.log('👤 Admin user created');
    }

    // Check if sample election exists
    const electionExists = await query('SELECT COUNT(*) as count FROM Election WHERE title = ?', ['Student Council Election 2026']);

    if (electionExists[0].count === 0) {
      // Insert sample election
      const electionResult = await query(
        'INSERT INTO Election (title, description, type, status, startTime, endTime, maxVotesPerVoter) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Student Council Election 2026', 'Annual student council election for the academic year 2024-2025', 'general', 'upcoming', '2024-03-01 09:00:00', '2024-03-01 17:00:00', 1],
        true
      );

      const electionId = electionResult.insertId;

      // Insert sample candidates
      await query(
        'INSERT INTO Candidate (electionId, name, description, party) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
        [
          electionId, 'John Smith', 'Computer Science major, focused on academic excellence and student welfare', 'Tech Party',
          electionId, 'Jane Doe', 'Business Administration major, advocating for student rights and campus improvements', 'Progressive Party'
        ],
        true
      );

      console.log('🗳️  Sample election and candidates created');
    }

    // Create Barangay Election
    const barangayElectionExists = await query('SELECT COUNT(*) as count FROM Election WHERE title = ?', ['Barangay Election 2026']);

    if (barangayElectionExists[0].count === 0) {
      // Insert barangay election
      const barangayElectionResult = await query(
        'INSERT INTO Election (title, description, type, status, startTime, endTime, maxVotesPerVoter) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Barangay Election 2026', 'Barangay-level election for Barangay Captain and Councilors', 'local', 'upcoming', '2026-05-15 07:00:00', '2026-05-15 15:00:00', 1],
        true
      );

      const barangayElectionId = barangayElectionResult.insertId;

      // Insert barangay candidates
      await query(
        'INSERT INTO Candidate (electionId, name, description, party) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
        [
          barangayElectionId, 'Juan Dela Cruz', 'Experienced community leader with 10+ years service', 'Partido ng Barangay',
          barangayElectionId, 'Maria Santos', 'Education advocate and youth development champion', 'Barangay Progressive Party',
          barangayElectionId, 'Carlos Reyes', 'Infrastructure and public services expert', 'Citizens Action Party',
          barangayElectionId, 'Elena Garcia', 'Healthcare and senior citizens welfare advocate', 'Community First Party'
        ],
        true
      );

      console.log('🏘️  Barangay election and candidates created');
    }

    // Create SK Chairman Election
    const skElectionExists = await query('SELECT COUNT(*) as count FROM Election WHERE title = ?', ['SK Chairman Election 2026']);

    if (skElectionExists[0].count === 0) {
      // Insert SK election
      const skElectionResult = await query(
        'INSERT INTO Election (title, description, type, status, startTime, endTime, maxVotesPerVoter) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['SK Chairman Election 2026', 'Sangguniang Kabataan Chairman election for youth representation', 'special', 'upcoming', '2026-05-15 07:00:00', '2026-05-15 15:00:00', 1],
        true
      );

      const skElectionId = skElectionResult.insertId;

      // Insert SK candidates
      await query(
        'INSERT INTO Candidate (electionId, name, description, party) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
        [
          skElectionId, 'Antonio "Tony" Santos', 'Youth empowerment and education reform advocate', 'Youth Alliance Party',
          skElectionId, 'Patricia "Pat" Reyes', 'Sports development and skills training champion', 'Kabataan First Movement'
        ],
        true
      );

      console.log('👥 SK Chairman election and candidates created');
    }

    console.log('✅ Database seeding completed!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
};
 
// Run migration and seeding
const setupDatabase = async () => {
  try {
    await runMigration();
    await seedDatabase();
    console.log('🎊 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    process.exit(1);
  }
};
 
// Export functions for use in other modules
export { runMigration, seedDatabase, setupDatabase };
 
// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}
