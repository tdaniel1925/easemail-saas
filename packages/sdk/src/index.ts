// ===========================================
// BOTMAKERS SDK
// Official SDK for BotMakers MCP Server
// ===========================================

// Export client
export { BotMakersClient } from './client.js';

// Export all types
export * from './types.js';

// Re-export commonly used types at top level
export type {
  BotMakersConfig,
  Integration,
  ConnectionInfo,
  Email,
  Calendar,
  CalendarEvent,
  Contact,
  Tool,
} from './types.js';

// ===========================================
// CONVENIENCE FACTORY FUNCTION
// ===========================================

import { BotMakersClient } from './client.js';
import type { BotMakersConfig } from './types.js';

/**
 * Create a new BotMakers client instance
 *
 * @example
 * ```typescript
 * import { createClient } from '@botmakers/sdk';
 *
 * const client = createClient({
 *   baseUrl: 'https://api.yourcompany.com',
 *   tenantId: 'your-tenant-id',
 *   apiKey: 'bm_live_xxxxx', // optional
 * });
 *
 * // List emails
 * const emails = await client.listEmails({ limit: 10 });
 *
 * // Send email
 * await client.sendEmail({
 *   to: 'recipient@example.com',
 *   subject: 'Hello',
 *   body: 'Hello from BotMakers!',
 * });
 * ```
 */
export function createClient(config: BotMakersConfig): BotMakersClient {
  return new BotMakersClient(config);
}

// Default export
export default createClient;
