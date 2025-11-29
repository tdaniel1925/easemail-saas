import { getTenantWithGrant } from '../lib/db.js';
import * as nylasLib from '../lib/nylas.js';
import * as ai from '../lib/ai.js';

// ===========================================
// DRAFT REPLY
// ===========================================
export async function draftReply(params: {
  tenant_id: string;
  email_id: string;
  instructions?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const message = await nylasLib.getMessage(tenant.nylasGrantId!, params.email_id);

    const reply = await ai.generateReply({
      originalEmail: {
        from: message.from?.[0]?.email || 'unknown',
        subject: message.subject || '',
        body: message.body || message.snippet || '',
      },
      instructions: params.instructions,
      tone: params.tone,
    });

    return {
      success: true,
      data: {
        draft: reply,
        replyToMessageId: message.id,
        subject: message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
        to: message.from || [],
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SUMMARIZE THREAD
// ===========================================
export async function summarizeThread(params: {
  tenant_id: string;
  thread_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const response = await nylasLib.nylas.messages.list({
      identifier: tenant.nylasGrantId!,
      queryParams: { threadId: params.thread_id, limit: 50 },
    });

    if (response.data.length === 0) {
      return { success: false, error: 'No messages found in thread' };
    }

    const emails = response.data.map(msg => ({
      from: msg.from?.[0]?.email || 'unknown',
      date: msg.date ? new Date(msg.date * 1000).toISOString() : 'unknown',
      body: msg.body || msg.snippet || '',
    }));

    emails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const summary = await ai.summarizeThread(emails);

    return {
      success: true,
      data: {
        summary,
        messageCount: emails.length,
        participants: [...new Set(emails.map(e => e.from))],
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// EXTRACT ACTION ITEMS
// ===========================================
export async function extractActionItems(params: {
  tenant_id: string;
  email_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const message = await nylasLib.getMessage(tenant.nylasGrantId!, params.email_id);

    const actionItems = await ai.extractActionItems(message.body || message.snippet || '');

    return {
      success: true,
      data: {
        actionItems,
        emailSubject: message.subject,
        from: message.from?.[0]?.email,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SMART COMPOSE
// ===========================================
export async function smartCompose(params: {
  tenant_id: string;
  prompt: string;
  context?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}) {
  try {
    await getTenantWithGrant(params.tenant_id); // Verify tenant

    const draft = await ai.smartCompose({
      prompt: params.prompt,
      context: params.context,
      tone: params.tone,
    });

    return { success: true, data: { draft } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
