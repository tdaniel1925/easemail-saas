// ===========================================
// INTEGRATIONS INDEX
// Register all integrations here
// ===========================================

import { integrationRegistry } from './registry.js';

// Email & Calendar
import { nylasIntegration } from './nylas/index.js';
import { msGraphIntegration } from './msgraph/index.js';
import { googleCalendarIntegration } from './google-calendar/index.js';
import { calComIntegration } from './cal-com/index.js';

// Communication
import { dialpadIntegration } from './dialpad/index.js';
import { slackIntegration } from './slack/index.js';
import { discordIntegration } from './discord/index.js';
import { zoomIntegration } from './zoom/index.js';
import { teamsIntegration } from './teams/index.js';
import { whatsappIntegration } from './whatsapp/index.js';

// Productivity
import { notionIntegration } from './notion/index.js';
import { airtableIntegration } from './airtable/index.js';
import { trelloIntegration } from './trello/index.js';
import { asanaIntegration } from './asana/index.js';
import { mondayIntegration } from './monday/index.js';
import { linearIntegration } from './linear/index.js';
import { jiraIntegration } from './jira/index.js';

// CRM
import { hubspotIntegration } from './hubspot/index.js';
import { salesforceIntegration } from './salesforce/index.js';
import { pipedriveIntegration } from './pipedrive/index.js';
import { gohighlevelIntegration } from './gohighlevel/index.js';
import { closeIntegration } from './close/index.js';

// Finance
import { stripeIntegration } from './stripe/index.js';
import { quickbooksIntegration } from './quickbooks/index.js';
import { xeroIntegration } from './xero/index.js';
import { plaidIntegration } from './plaid/index.js';

// Developer
import { githubIntegration } from './github/index.js';
import { gitlabIntegration } from './gitlab/index.js';

// AI
import { pineconeIntegration } from './pinecone/index.js';
import { openaiIntegration } from './openai/index.js';
import { anthropicIntegration } from './anthropic/index.js';

// ===========================================
// REGISTER ALL INTEGRATIONS
// ===========================================

// Email & Calendar
integrationRegistry.register(nylasIntegration);
integrationRegistry.register(msGraphIntegration);
integrationRegistry.register(googleCalendarIntegration);
integrationRegistry.register(calComIntegration);

// Communication
integrationRegistry.register(dialpadIntegration);
integrationRegistry.register(slackIntegration);
integrationRegistry.register(discordIntegration);
integrationRegistry.register(zoomIntegration);
integrationRegistry.register(teamsIntegration);
integrationRegistry.register(whatsappIntegration);

// Productivity
integrationRegistry.register(notionIntegration);
integrationRegistry.register(airtableIntegration);
integrationRegistry.register(trelloIntegration);
integrationRegistry.register(asanaIntegration);
integrationRegistry.register(mondayIntegration);
integrationRegistry.register(linearIntegration);
integrationRegistry.register(jiraIntegration);

// CRM
integrationRegistry.register(hubspotIntegration);
integrationRegistry.register(salesforceIntegration);
integrationRegistry.register(pipedriveIntegration);
integrationRegistry.register(gohighlevelIntegration);
integrationRegistry.register(closeIntegration);

// Finance
integrationRegistry.register(stripeIntegration);
integrationRegistry.register(quickbooksIntegration);
integrationRegistry.register(xeroIntegration);
integrationRegistry.register(plaidIntegration);

// Developer
integrationRegistry.register(githubIntegration);
integrationRegistry.register(gitlabIntegration);

// AI
integrationRegistry.register(pineconeIntegration);
integrationRegistry.register(openaiIntegration);
integrationRegistry.register(anthropicIntegration);

// ===========================================
// EXPORTS
// ===========================================

// Export registry
export { integrationRegistry };

// Email & Calendar
export { nylasIntegration } from './nylas/index.js';
export { msGraphIntegration } from './msgraph/index.js';
export { googleCalendarIntegration } from './google-calendar/index.js';
export { calComIntegration } from './cal-com/index.js';

// Communication
export { dialpadIntegration } from './dialpad/index.js';
export { slackIntegration } from './slack/index.js';
export { discordIntegration } from './discord/index.js';
export { zoomIntegration } from './zoom/index.js';
export { teamsIntegration } from './teams/index.js';
export { whatsappIntegration } from './whatsapp/index.js';

// Productivity
export { notionIntegration } from './notion/index.js';
export { airtableIntegration } from './airtable/index.js';
export { trelloIntegration } from './trello/index.js';
export { asanaIntegration } from './asana/index.js';
export { mondayIntegration } from './monday/index.js';
export { linearIntegration } from './linear/index.js';
export { jiraIntegration } from './jira/index.js';

// CRM
export { hubspotIntegration } from './hubspot/index.js';
export { salesforceIntegration } from './salesforce/index.js';
export { pipedriveIntegration } from './pipedrive/index.js';
export { gohighlevelIntegration } from './gohighlevel/index.js';
export { closeIntegration } from './close/index.js';

// Finance
export { stripeIntegration } from './stripe/index.js';
export { quickbooksIntegration } from './quickbooks/index.js';
export { xeroIntegration } from './xero/index.js';
export { plaidIntegration } from './plaid/index.js';

// Developer
export { githubIntegration } from './github/index.js';
export { gitlabIntegration } from './gitlab/index.js';

// AI
export { pineconeIntegration } from './pinecone/index.js';
export { openaiIntegration } from './openai/index.js';
export { anthropicIntegration } from './anthropic/index.js';

// Export types
export * from './types.js';
