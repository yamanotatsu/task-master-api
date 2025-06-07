-- Phase 1: Authentication and Organization Management Tables
-- Task 1.1: Create core authentication tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table (linked to Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization members table (many-to-many relationship)
CREATE TABLE organization_members (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (organization_id, profile_id)
);

-- Add organization_id to projects table
ALTER TABLE projects 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Update tasks table foreign key for assignee_id
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_assignee_id_fkey 
FOREIGN KEY (assignee_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Update subtasks table foreign key for assignee_id
ALTER TABLE subtasks 
DROP CONSTRAINT IF EXISTS subtasks_assignee_id_fkey;

ALTER TABLE subtasks
ADD CONSTRAINT subtasks_assignee_id_fkey 
FOREIGN KEY (assignee_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX idx_profiles_full_name ON profiles(full_name);
CREATE INDEX idx_organization_members_profile_id ON organization_members(profile_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);

-- Composite index for faster member lookups
CREATE INDEX idx_org_members_profile_role ON organization_members(profile_id, role);

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();