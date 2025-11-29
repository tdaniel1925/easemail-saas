import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export { anthropic };

// Strip HTML for AI processing
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export { stripHtml };

// Generate email reply
export async function generateReply(params: {
  originalEmail: { from: string; subject: string; body: string };
  instructions?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}) {
  const { originalEmail, instructions, tone = 'professional' } = params;

  const prompt = `You are an email assistant. Generate a reply to the following email.

Original email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body:
${stripHtml(originalEmail.body)}

${instructions ? `User instructions: ${instructions}` : ''}
Tone: ${tone}

Generate only the email body text. Do not include subject line or signature. Keep it concise and natural.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

// Summarize email thread
export async function summarizeThread(emails: { from: string; date: string; body: string }[]) {
  const threadContent = emails
    .map(e => `From: ${e.from}\nDate: ${e.date}\n${stripHtml(e.body)}`)
    .join('\n\n---\n\n');

  const prompt = `Summarize this email thread concisely. Focus on:
1. Main topic/purpose
2. Key points discussed
3. Any decisions made or action items
4. Current status/next steps

Email thread:
${threadContent}

Provide a brief summary (3-5 sentences).`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

// Extract action items
export async function extractActionItems(emailBody: string) {
  const prompt = `Extract any action items, tasks, or to-dos from this email. List them as bullet points. If there are no clear action items, say "No action items found."

Email:
${stripHtml(emailBody)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

// Smart compose
export async function smartCompose(params: {
  prompt: string;
  context?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}) {
  const { prompt: userPrompt, context, tone = 'professional' } = params;

  const prompt = `You are an email assistant. Write an email based on the user's request.

User request: ${userPrompt}
${context ? `Additional context: ${context}` : ''}
Tone: ${tone}

Generate the email body only. Do not include subject line or signature. Keep it concise and natural.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}
