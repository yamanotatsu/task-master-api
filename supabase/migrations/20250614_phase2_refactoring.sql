-- Phase 2 Refactoring: Database Schema Updates
-- This migration adds missing columns and standardizes the schema

-- 1. Add missing columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'organization' CHECK (visibility IN ('organization', 'private', 'public')),
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- 2. Add estimated_effort and actual_effort to tasks table (currently only in API)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS estimated_effort VARCHAR(100),
ADD COLUMN IF NOT EXISTS actual_effort VARCHAR(100);

-- 3. Create project_members table (referenced in helper functions but doesn't exist)
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 4. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assignee_id ON public.subtasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON public.subtasks(status);

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- 5. Add RLS policies for project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view project members if they belong to the same organization
CREATE POLICY "Users can view project members" ON public.project_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = project_members.project_id
        AND om.user_id = auth.uid()
    )
);

-- Policy: Project admins and organization admins can manage project members
CREATE POLICY "Project admins can manage members" ON public.project_members
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = project_members.project_id
        AND om.user_id = auth.uid()
        AND (om.role = 'admin' OR project_members.user_id = auth.uid())
    )
);

-- 6. Add helpful views

-- View: Project statistics with member count
CREATE OR REPLACE VIEW public.project_stats AS
SELECT 
    p.id,
    p.name,
    p.project_path,
    p.organization_id,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status IN ('completed', 'done') THEN t.id END) AS completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in-progress' THEN t.id END) AS in_progress_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END) AS blocked_tasks,
    COUNT(DISTINCT pm.user_id) AS member_count,
    CASE 
        WHEN COUNT(DISTINCT t.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN t.status IN ('completed', 'done') THEN t.id END)::FLOAT / COUNT(DISTINCT t.id)::FLOAT * 100)
        ELSE 0 
    END AS progress_percentage
FROM public.projects p
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.project_members pm ON p.id = pm.project_id
GROUP BY p.id, p.name, p.project_path, p.organization_id;

-- 7. Status value normalization function
CREATE OR REPLACE FUNCTION normalize_task_status(status_value TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE status_value
        WHEN 'todo' THEN 'pending'
        WHEN 'in_progress' THEN 'in-progress'
        WHEN 'done' THEN 'completed'
        ELSE status_value
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Note: Actual status value migration should be done carefully with a data migration script
-- Example (DO NOT RUN automatically):
-- UPDATE public.tasks SET status = 'pending' WHERE status = 'todo';
-- UPDATE public.tasks SET status = 'in-progress' WHERE status = 'in_progress';
-- UPDATE public.tasks SET status = 'completed' WHERE status = 'done';