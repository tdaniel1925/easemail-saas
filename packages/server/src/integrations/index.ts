// ===========================================
// INTEGRATIONS INDEX
// Register all integrations here
// ===========================================

import { integrationRegistry } from './registry.js';
import { nylasIntegration } from './nylas/index.js';
import { msGraphIntegration } from './msgraph/index.js';

// Register all integrations
integrationRegistry.register(nylasIntegration);
integrationRegistry.register(msGraphIntegration);

// Export registry and integrations
export { integrationRegistry };
export { nylasIntegration } from './nylas/index.js';
export { msGraphIntegration } from './msgraph/index.js';

// Export types
export * from './types.js';
