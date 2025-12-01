// ===========================================
// PINECONE INTEGRATION
// Vector database for AI applications
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class PineconeIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'pinecone',
    name: 'Pinecone',
    description: 'Vector database for AI/ML applications',
    category: 'ai',
    authType: 'api_key',
    requiredEnvVars: ['PINECONE_API_KEY'],
  };

  isConfigured(): boolean {
    return !!process.env.PINECONE_API_KEY;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'pinecone_list_indexes',
        description: 'List all Pinecone indexes',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'pinecone_describe_index',
        description: 'Get index statistics and info',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'index_name', type: 'string', description: 'Index name', required: true },
        ],
      },
      {
        name: 'pinecone_query',
        description: 'Query vectors in an index',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'index_host', type: 'string', description: 'Index host URL', required: true },
          { name: 'vector', type: 'array', description: 'Query vector', required: true },
          { name: 'top_k', type: 'number', description: 'Number of results', required: false, default: 10 },
          { name: 'namespace', type: 'string', description: 'Namespace', required: false },
          { name: 'include_metadata', type: 'boolean', description: 'Include metadata', required: false },
          { name: 'include_values', type: 'boolean', description: 'Include values', required: false },
        ],
      },
      {
        name: 'pinecone_upsert',
        description: 'Upsert vectors into an index',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'index_host', type: 'string', description: 'Index host URL', required: true },
          { name: 'vectors', type: 'array', description: 'Vectors to upsert [{id, values, metadata}]', required: true },
          { name: 'namespace', type: 'string', description: 'Namespace', required: false },
        ],
      },
      {
        name: 'pinecone_delete',
        description: 'Delete vectors from an index',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'index_host', type: 'string', description: 'Index host URL', required: true },
          { name: 'ids', type: 'array', description: 'Vector IDs to delete', required: false },
          { name: 'namespace', type: 'string', description: 'Namespace', required: false },
          { name: 'delete_all', type: 'boolean', description: 'Delete all vectors in namespace', required: false },
        ],
      },
      {
        name: 'pinecone_fetch',
        description: 'Fetch vectors by IDs',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'index_host', type: 'string', description: 'Index host URL', required: true },
          { name: 'ids', type: 'array', description: 'Vector IDs', required: true },
          { name: 'namespace', type: 'string', description: 'Namespace', required: false },
        ],
      },
      {
        name: 'pinecone_describe_index_stats',
        description: 'Get index statistics',
        category: 'ai',
        integration: 'pinecone',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'index_host', type: 'string', description: 'Index host URL', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || process.env.PINECONE_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure Pinecone.' };
    }

    const controlPlaneUrl = 'https://api.pinecone.io';
    const headers = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'pinecone_list_indexes': {
          const response = await fetch(`${controlPlaneUrl}/indexes`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.indexes };
        }

        case 'pinecone_describe_index': {
          const response = await fetch(`${controlPlaneUrl}/indexes/${params.index_name}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'pinecone_query': {
          const indexHost = params.index_host as string;
          const body: Record<string, unknown> = {
            vector: params.vector,
            topK: params.top_k || 10,
          };
          if (params.namespace) body.namespace = params.namespace;
          if (params.include_metadata) body.includeMetadata = params.include_metadata;
          if (params.include_values) body.includeValues = params.include_values;

          const response = await fetch(`${indexHost}/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.matches };
        }

        case 'pinecone_upsert': {
          const indexHost = params.index_host as string;
          const body: Record<string, unknown> = {
            vectors: params.vectors,
          };
          if (params.namespace) body.namespace = params.namespace;

          const response = await fetch(`${indexHost}/vectors/upsert`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'pinecone_delete': {
          const indexHost = params.index_host as string;
          const body: Record<string, unknown> = {};
          if (params.ids) body.ids = params.ids;
          if (params.namespace) body.namespace = params.namespace;
          if (params.delete_all) body.deleteAll = params.delete_all;

          const response = await fetch(`${indexHost}/vectors/delete`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        case 'pinecone_fetch': {
          const indexHost = params.index_host as string;
          const ids = (params.ids as string[]).join('&ids=');
          let url = `${indexHost}/vectors/fetch?ids=${ids}`;
          if (params.namespace) url += `&namespace=${params.namespace}`;

          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.vectors };
        }

        case 'pinecone_describe_index_stats': {
          const indexHost = params.index_host as string;
          const response = await fetch(`${indexHost}/describe_index_stats`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const pineconeIntegration = new PineconeIntegration();
