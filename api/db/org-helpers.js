import { supabase } from './supabase.js';

/**
 * Get a project by ID with organization check
 */
export async function getProjectByIdWithOrgCheck(projectId, userId) {
  // First check if user has access to this project's organization
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      *,
      organization_id,
      project_members (
        profile:profiles (*)
      )
    `)
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;
  if (!project) return null;

  // Check if user is member of the organization
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('profile_id', userId)
    .single();

  if (memberError || !membership) {
    throw new Error('Access denied: User is not a member of this organization');
  }

  // Transform the data to include member profiles
  if (project) {
    project.members = project.project_members?.map(pm => pm.profile) || [];
    delete project.project_members;
  }

  return project;
}

/**
 * Get all projects for user's organizations
 */
export async function getAllProjectsForUser(userId) {
  // First get user's organizations
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', userId);

  if (memberError) throw memberError;
  
  const orgIds = memberships.map(m => m.organization_id);
  
  if (orgIds.length === 0) {
    return [];
  }

  // Get projects for those organizations
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      organization:organizations!projects_organization_id_fkey (
        id,
        name
      ),
      project_members (
        profile:profiles (*)
      )
    `)
    .in('organization_id', orgIds)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Calculate progress for each project
  const projectsWithProgress = await Promise.all(projects.map(async (project) => {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', project.id);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => 
      t.status === 'completed' || t.status === 'done'
    ).length || 0;
    
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...project,
      totalTasks,
      completedTasks,
      progress,
      members: project.project_members?.map(pm => pm.profile) || []
    };
  }));

  return projectsWithProgress;
}

/**
 * Get tasks with organization filtering
 */
export async function getTasksForUser(userId, projectId = null, filters = {}) {
  // If projectId is provided, verify access
  if (projectId) {
    const project = await getProjectByIdWithOrgCheck(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }
  }

  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects!tasks_project_id_fkey (
        id,
        name,
        organization_id
      ),
      assignee:profiles!tasks_assignee_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      subtasks (
        *,
        assignee:profiles!subtasks_assignee_id_fkey (
          id,
          full_name
        )
      ),
      dependencies:task_dependencies!task_dependencies_task_id_fkey (
        depends_on_task_id
      )
    `);

  // Apply project filter if provided
  if (projectId) {
    query = query.eq('project_id', projectId);
  } else {
    // Get all tasks from user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', userId);

    const orgIds = memberships?.map(m => m.organization_id) || [];
    
    if (orgIds.length === 0) {
      return [];
    }

    // Filter by organization via project
    query = query.in('project.organization_id', orgIds);
  }

  // Apply additional filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.assignee_id) {
    query = query.eq('assignee_id', filters.assignee_id);
  }

  // Sort by ID (original order)
  query = query.order('id', { ascending: true });

  const { data: tasks, error } = await query;

  if (error) throw error;

  // Transform dependencies to include task info
  const tasksWithDependencyInfo = await Promise.all(tasks.map(async (task) => {
    if (task.dependencies && task.dependencies.length > 0) {
      const dependsOnIds = task.dependencies.map(d => d.depends_on_task_id);
      
      const { data: dependencyTasks } = await supabase
        .from('tasks')
        .select('id, title, status')
        .in('id', dependsOnIds);

      task.dependsOn = dependencyTasks || [];
    } else {
      task.dependsOn = [];
    }
    
    delete task.dependencies;
    return task;
  }));

  return tasksWithDependencyInfo;
}

/**
 * Create a project with organization
 */
export async function createProjectWithOrg(projectData, organizationId, userId) {
  // Verify user is member of the organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('profile_id', userId)
    .single();

  if (!membership) {
    throw new Error('User is not a member of this organization');
  }

  // Create the project
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      organization_id: organizationId
    })
    .select()
    .single();

  if (error) throw error;

  return project;
}

/**
 * Update a project with organization check
 */
export async function updateProjectWithOrgCheck(projectId, updates, userId) {
  // First verify access
  const project = await getProjectByIdWithOrgCheck(projectId, userId);
  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Update the project
  const { data: updatedProject, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;

  return updatedProject;
}

/**
 * Delete a project with organization check (admin only)
 */
export async function deleteProjectWithOrgCheck(projectId, userId) {
  // Get project and check admin status
  const project = await getProjectByIdWithOrgCheck(projectId, userId);
  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('profile_id', userId)
    .single();

  if (!membership || membership.role !== 'admin') {
    throw new Error('Only organization admins can delete projects');
  }

  // Delete the project (cascades to tasks, etc.)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;

  return true;
}