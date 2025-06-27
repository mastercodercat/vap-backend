import { AppDataSource } from '../src/config/data-source';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...');

    // Initialize the data source
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Run migrations
    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('✅ No pending migrations. Database is up to date.');
    } else {
      console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close the data source connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
