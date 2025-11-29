// ===========================================
// INTEGRATION REGISTRY
// Central registry for all integrations
// ===========================================

import { Integration, IntegrationConfig, ToolDefinition, IntegrationCategory } from './types.js';

class IntegrationRegistry {
  private integrations: Map<string, Integration> = new Map();
  private initialized = false;

  // Register a new integration
  register(integration: Integration): void {
    const id = integration.config.id;
    if (this.integrations.has(id)) {
      console.warn(`Integration ${id} is already registered, overwriting...`);
    }
    this.integrations.set(id, integration);
    console.log(`Registered integration: ${integration.config.name} (${id})`);
  }

  // Initialize all registered integrations
  async initializeAll(): Promise<void> {
    if (this.initialized) return;

    console.log('\nInitializing integrations...');
    for (const [id, integration] of this.integrations) {
      try {
        if (integration.isConfigured()) {
          await integration.initialize();
          console.log(`  ✓ ${integration.config.name}`);
        } else {
          console.log(`  ○ ${integration.config.name} (not configured)`);
        }
      } catch (error) {
        console.error(`  ✗ ${integration.config.name}:`, error);
      }
    }
    this.initialized = true;
    console.log('');
  }

  // Get an integration by ID
  get(id: string): Integration | undefined {
    return this.integrations.get(id);
  }

  // Get all integrations
  getAll(): Integration[] {
    return Array.from(this.integrations.values());
  }

  // Get integrations by category
  getByCategory(category: IntegrationCategory): Integration[] {
    return this.getAll().filter(i => i.config.category === category);
  }

  // Get all configured integrations
  getConfigured(): Integration[] {
    return this.getAll().filter(i => i.isConfigured());
  }

  // Get all tools from all integrations
  getAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const integration of this.integrations.values()) {
      if (integration.isConfigured()) {
        tools.push(...integration.getTools());
      }
    }
    return tools;
  }

  // Get tool by name
  getTool(toolName: string): { integration: Integration; tool: ToolDefinition } | undefined {
    for (const integration of this.integrations.values()) {
      const tool = integration.getTools().find(t => t.name === toolName);
      if (tool) {
        return { integration, tool };
      }
    }
    return undefined;
  }

  // List all integration configs (for API response)
  listIntegrations(): IntegrationConfig[] {
    return this.getAll().map(i => ({
      ...i.config,
      configured: i.isConfigured(),
    }));
  }
}

// Singleton instance
export const integrationRegistry = new IntegrationRegistry();
