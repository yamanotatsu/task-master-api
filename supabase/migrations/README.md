# Supabase Authentication Migration Guide

This directory contains SQL migration files for implementing the authentication system in Task Master.

## Migration Order

The migrations must be run in the following order due to dependencies:

1. **20250106000001_create_organizations_table.sql**

   - Creates the organizations table
   - Sets up basic indexes and RLS

2. **20250106000002_create_profiles_table.sql**

   - Creates profiles table linked to auth.users
   - Sets up automatic profile creation trigger
   - Creates function to handle new user signups

3. **20250106000003_create_organization_members_table.sql**

   - Creates the many-to-many relationship between users and organizations
   - Implements role-based membership (admin/member)

4. **20250106000004_create_invitations_table.sql**

   - Creates invitation system for adding new members
   - Includes token-based invitation links with expiration

5. **20250106000005_update_existing_tables.sql**

   - Adds organization_id to projects table
   - Updates existing tables to work with new auth system
   - Restructures project_members table

6. **20250106000006_create_audit_and_security_functions.sql**

   - Creates audit logging table
   - Sets up security functions and triggers
   - Creates secure views for data access

7. **20250106000007_row_level_security_policies.sql**

   - Implements comprehensive RLS policies
   - Replaces overly permissive policies with role-based access
   - Covers all tables with appropriate security rules

8. **20250106000008_data_migration.sql**

   - Migrates existing data to new schema
   - Creates default organization for existing data
   - Converts existing members to profiles
   - Updates all foreign key relationships

9. **20250106000009_create_helper_functions.sql**
   - Creates utility functions for authentication
   - Implements role checking functions
   - Provides invitation acceptance logic
   - Creates statistics functions

## Running Migrations

### Using Supabase CLI

```bash
# Apply all migrations
supabase db push

# Or apply specific migration
supabase db push --file migrations/20250106000001_create_organizations_table.sql
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order
4. Execute each migration

### Direct Database Connection

```bash
# Connect to your database and run migrations
psql -h your-db-host -U postgres -d your-db-name -f migrations/20250106000001_create_organizations_table.sql
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Order Matters**: Run migrations in numerical order
3. **Data Migration**: Migration #8 handles existing data - review before running
4. **Default Organization**: A default organization (ID: 00000000-0000-0000-0000-000000000001) is created for existing data
5. **Profile Creation**: New users automatically get profiles via trigger

## Post-Migration Steps

1. Verify all data migrated correctly:

   ```sql
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM organization_members;
   SELECT COUNT(*) FROM projects WHERE organization_id IS NOT NULL;
   ```

2. Test RLS policies:

   ```sql
   -- Test as a specific user
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claim.sub TO 'user-uuid-here';
   SELECT * FROM organizations;
   ```

3. Clean up backup table (after verification):
   ```sql
   DROP TABLE IF EXISTS members_backup;
   ```

## Rollback Plan

If you need to rollback:

1. Restore from backup
2. Or use the members_backup table to restore original data
3. Drop new tables in reverse order
4. Restore original table structures

## Schema Changes Summary

- **New Tables**: organizations, profiles, organization_members, invitations, audit_logs
- **Modified Tables**: projects (added organization_id), tasks (assignee_id now references profiles)
- **Renamed Tables**: members → project_members (with new structure)
- **New Views**: user_organizations, user_accessible_projects
- **New Functions**: Multiple helper functions for auth and role management
