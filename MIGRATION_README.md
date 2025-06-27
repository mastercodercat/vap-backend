# Database Migrations

This project uses TypeORM migrations for database schema management.

## Quick Start

### For New Devices/Environments

1. **Set up environment variables**:

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=password
   DB_NAME=vap
   ```

2. **Run the initial migration**:
   ```bash
   npm run db:migrate
   ```

This will create all necessary tables:

- `users` - User authentication
- `developers` - Developer profiles
- `resumes` - Resume data with title, skills, and PDF support

## Available Commands

```bash
# Run migrations (recommended)
npm run db:migrate

# Generate new migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations using TypeORM CLI
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run typeorm -- migration:show -d src/config/data-source.ts
```

## Migration Files

- `src/migrations/1700000000000-InitialSchema.ts` - Complete initial database schema

## Troubleshooting

### If migration fails:

1. Check database connection
2. Ensure PostgreSQL is running
3. Verify environment variables
4. Check logs for specific error messages

### For existing databases:

If you have an existing database with data, you may need to:

1. Backup your data
2. Drop existing tables
3. Run the initial migration
4. Restore your data

## Production Deployment

For production deployments:

1. Always backup the database before running migrations
2. Test migrations on staging environment first
3. Use `npm run db:migrate` to run migrations safely
