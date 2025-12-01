// ===========================================
// FILEVINE INTEGRATION
// Legal case management platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class FilevineIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'filevine',
    name: 'Filevine',
    description: 'Legal case management and workflow automation',
    category: 'crm',
    authType: 'api_key',
    requiredEnvVars: ['FILEVINE_API_KEY', 'FILEVINE_ORG_ID'],
  };

  private apiKey = process.env.FILEVINE_API_KEY;
  private orgId = process.env.FILEVINE_ORG_ID;
  private baseUrl = process.env.FILEVINE_BASE_URL || 'https://api.filevine.io';

  isConfigured(): boolean {
    return !!(this.apiKey && this.orgId);
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      // Projects (Cases)
      {
        name: 'filevine_list_projects',
        description: 'List projects/cases',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 50 },
          { name: 'offset', type: 'number', description: 'Offset for pagination', required: false },
          { name: 'project_type_id', type: 'string', description: 'Filter by project type', required: false },
        ],
      },
      {
        name: 'filevine_get_project',
        description: 'Get project details',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
        ],
      },
      {
        name: 'filevine_create_project',
        description: 'Create a new project/case',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_type_id', type: 'string', description: 'Project type ID', required: true },
          { name: 'project_name', type: 'string', description: 'Project name', required: true },
          { name: 'client_name', type: 'string', description: 'Client name', required: false },
          { name: 'phase_id', type: 'string', description: 'Initial phase ID', required: false },
        ],
      },
      {
        name: 'filevine_update_project',
        description: 'Update project details',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'project_name', type: 'string', description: 'Project name', required: false },
          { name: 'phase_id', type: 'string', description: 'Phase ID', required: false },
        ],
      },
      // Contacts
      {
        name: 'filevine_list_contacts',
        description: 'List contacts',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 50 },
          { name: 'search', type: 'string', description: 'Search query', required: false },
        ],
      },
      {
        name: 'filevine_get_contact',
        description: 'Get contact details',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
        ],
      },
      {
        name: 'filevine_create_contact',
        description: 'Create a new contact',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'first_name', type: 'string', description: 'First name', required: true },
          { name: 'last_name', type: 'string', description: 'Last name', required: true },
          { name: 'email', type: 'string', description: 'Email address', required: false },
          { name: 'phone', type: 'string', description: 'Phone number', required: false },
          { name: 'company', type: 'string', description: 'Company name', required: false },
        ],
      },
      // Tasks
      {
        name: 'filevine_list_tasks',
        description: 'List tasks for a project',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'status', type: 'string', description: 'Filter by status (open, completed)', required: false },
        ],
      },
      {
        name: 'filevine_create_task',
        description: 'Create a task',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'title', type: 'string', description: 'Task title', required: true },
          { name: 'description', type: 'string', description: 'Task description', required: false },
          { name: 'due_date', type: 'string', description: 'Due date (ISO 8601)', required: false },
          { name: 'assignee_id', type: 'string', description: 'Assignee user ID', required: false },
        ],
      },
      {
        name: 'filevine_complete_task',
        description: 'Mark a task as complete',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'task_id', type: 'string', description: 'Task ID', required: true },
        ],
      },
      // Notes
      {
        name: 'filevine_list_notes',
        description: 'List notes for a project',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
        ],
      },
      {
        name: 'filevine_create_note',
        description: 'Create a note on a project',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'body', type: 'string', description: 'Note content', required: true },
          { name: 'subject', type: 'string', description: 'Note subject', required: false },
        ],
      },
      // Documents
      {
        name: 'filevine_list_documents',
        description: 'List documents for a project',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
        ],
      },
      // Project Types
      {
        name: 'filevine_list_project_types',
        description: 'List available project types',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      // Phases
      {
        name: 'filevine_list_phases',
        description: 'List phases for a project type',
        category: 'crm',
        integration: 'filevine',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_type_id', type: 'string', description: 'Project type ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || this.apiKey;
    const orgId = (credentials.metadata?.orgId as string) || this.orgId;

    if (!apiKey || !orgId) {
      return { success: false, error: 'Filevine not configured. Missing API key or org ID.' };
    }

    const headers: Record<string, string> = {
      'x-fv-apikey': apiKey,
      'x-fv-orgid': orgId,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'filevine_list_projects': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.append('limit', String(params.limit));
          if (params.offset) queryParams.append('offset', String(params.offset));
          if (params.project_type_id) queryParams.append('projectTypeId', String(params.project_type_id));

          const response = await fetch(`${this.baseUrl}/core/projects?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        case 'filevine_get_project': {
          const response = await fetch(`${this.baseUrl}/core/projects/${params.project_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_create_project': {
          const body: Record<string, unknown> = {
            projectTypeId: params.project_type_id,
            projectName: params.project_name,
          };
          if (params.client_name) body.clientName = params.client_name;
          if (params.phase_id) body.phaseId = params.phase_id;

          const response = await fetch(`${this.baseUrl}/core/projects`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_update_project': {
          const body: Record<string, unknown> = {};
          if (params.project_name) body.projectName = params.project_name;
          if (params.phase_id) body.phaseId = params.phase_id;

          const response = await fetch(`${this.baseUrl}/core/projects/${params.project_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_list_contacts': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.append('limit', String(params.limit));
          if (params.search) queryParams.append('search', String(params.search));

          const response = await fetch(`${this.baseUrl}/core/contacts?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        case 'filevine_get_contact': {
          const response = await fetch(`${this.baseUrl}/core/contacts/${params.contact_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_create_contact': {
          const body: Record<string, unknown> = {
            firstName: params.first_name,
            lastName: params.last_name,
          };
          if (params.email) body.email = params.email;
          if (params.phone) body.phone = params.phone;
          if (params.company) body.companyName = params.company;

          const response = await fetch(`${this.baseUrl}/core/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_list_tasks': {
          const queryParams = new URLSearchParams();
          if (params.status) queryParams.append('status', String(params.status));

          const response = await fetch(`${this.baseUrl}/core/projects/${params.project_id}/tasks?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        case 'filevine_create_task': {
          const body: Record<string, unknown> = {
            projectId: params.project_id,
            title: params.title,
          };
          if (params.description) body.description = params.description;
          if (params.due_date) body.dueDate = params.due_date;
          if (params.assignee_id) body.assigneeId = params.assignee_id;

          const response = await fetch(`${this.baseUrl}/core/tasks`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_complete_task': {
          const response = await fetch(`${this.baseUrl}/core/tasks/${params.task_id}/complete`, {
            method: 'POST',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { completed: true } };
        }

        case 'filevine_list_notes': {
          const response = await fetch(`${this.baseUrl}/core/projects/${params.project_id}/notes`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        case 'filevine_create_note': {
          const body: Record<string, unknown> = {
            body: params.body,
          };
          if (params.subject) body.subject = params.subject;

          const response = await fetch(`${this.baseUrl}/core/projects/${params.project_id}/notes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'filevine_list_documents': {
          const response = await fetch(`${this.baseUrl}/core/projects/${params.project_id}/documents`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        case 'filevine_list_project_types': {
          const response = await fetch(`${this.baseUrl}/core/projecttypes`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        case 'filevine_list_phases': {
          const response = await fetch(`${this.baseUrl}/core/projecttypes/${params.project_type_id}/phases`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items || data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const filevineIntegration = new FilevineIntegration();
