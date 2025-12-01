// ===========================================
// INTEGRATIONS INDEX
// Register all integrations here
// ===========================================

import { integrationRegistry } from './registry.js';
import { nylasIntegration } from './nylas/index.js';
import { msGraphIntegration } from './msgraph/index.js';
import { googleCalendarIntegration } from './google-calendar/index.js';
import { calComIntegration } from './cal-com/index.js';
import { dialpadIntegration } from './dialpad/index.js';

// Register all integrations
integrationRegistry.register(nylasIntegration);
integrationRegistry.register(msGraphIntegration);
integrationRegistry.register(googleCalendarIntegration);
integrationRegistry.register(calComIntegration);
integrationRegistry.register(dialpadIntegration);

// Export registry and integrations
export { integrationRegistry };
export { nylasIntegration } from './nylas/index.js';
export { msGraphIntegration } from './msgraph/index.js';
export { googleCalendarIntegration } from './google-calendar/index.js';
export { calComIntegration } from './cal-com/index.js';
export { dialpadIntegration } from './dialpad/index.js';

// Export types
export * from './types.js';
