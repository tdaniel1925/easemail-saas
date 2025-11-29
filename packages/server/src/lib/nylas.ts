import Nylas from 'nylas';
import 'dotenv/config';

// Initialize Nylas
export const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

// ===========================================
// EMAIL HELPERS
// ===========================================

export async function listMessages(grantId: string, options?: {
  limit?: number;
  pageToken?: string;
  folderId?: string;
  unread?: boolean;
}) {
  const queryParams: Record<string, unknown> = {
    limit: options?.limit || 50,
  };

  if (options?.pageToken) queryParams.pageToken = options.pageToken;
  if (options?.folderId) queryParams.folders = [options.folderId];
  if (options?.unread !== undefined) queryParams.unread = options.unread;

  return nylas.messages.list({
    identifier: grantId,
    queryParams,
  });
}

export async function getMessage(grantId: string, messageId: string) {
  const response = await nylas.messages.find({
    identifier: grantId,
    messageId,
  });
  return response.data;
}

export async function sendMessage(grantId: string, params: {
  to: { email: string; name?: string }[];
  subject: string;
  body: string;
  replyToMessageId?: string;
  cc?: { email: string; name?: string }[];
}) {
  const response = await nylas.messages.send({
    identifier: grantId,
    requestBody: {
      to: params.to,
      subject: params.subject,
      body: params.body,
      ...(params.replyToMessageId && { replyToMessageId: params.replyToMessageId }),
      ...(params.cc && { cc: params.cc }),
    },
  });
  return response.data;
}

export async function updateMessage(grantId: string, messageId: string, updates: {
  unread?: boolean;
  starred?: boolean;
  folders?: string[];
}) {
  const response = await nylas.messages.update({
    identifier: grantId,
    messageId,
    requestBody: updates,
  });
  return response.data;
}

export async function trashMessage(grantId: string, messageId: string) {
  return nylas.messages.destroy({
    identifier: grantId,
    messageId,
  });
}

export async function listFolders(grantId: string) {
  const response = await nylas.folders.list({
    identifier: grantId,
  });
  return response.data;
}

// ===========================================
// CALENDAR HELPERS
// ===========================================

export async function listEvents(grantId: string, options?: {
  calendarId?: string;
  start?: number; // Unix timestamp
  end?: number;
  limit?: number;
}) {
  const queryParams: Record<string, unknown> = {
    limit: options?.limit || 50,
  };

  if (options?.calendarId) queryParams.calendarId = options.calendarId;
  if (options?.start) queryParams.start = options.start;
  if (options?.end) queryParams.end = options.end;

  return nylas.events.list({
    identifier: grantId,
    queryParams,
  });
}

export async function getEvent(grantId: string, eventId: string, calendarId: string) {
  const response = await nylas.events.find({
    identifier: grantId,
    eventId,
    queryParams: { calendarId },
  });
  return response.data;
}

export async function createEvent(grantId: string, params: {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  when: {
    startTime: number;
    endTime: number;
  };
  participants?: { email: string; name?: string }[];
}) {
  const response = await nylas.events.create({
    identifier: grantId,
    queryParams: { calendarId: params.calendarId },
    requestBody: {
      title: params.title,
      description: params.description,
      location: params.location,
      when: {
        startTime: params.when.startTime,
        endTime: params.when.endTime,
      },
      participants: params.participants?.map(p => ({
        email: p.email,
        name: p.name,
      })),
    },
  });
  return response.data;
}

export async function listCalendars(grantId: string) {
  const response = await nylas.calendars.list({
    identifier: grantId,
  });
  return response.data;
}

// ===========================================
// CONTACTS HELPERS
// ===========================================

export async function listContacts(grantId: string, options?: {
  limit?: number;
  pageToken?: string;
  email?: string;
}) {
  const queryParams: Record<string, unknown> = {
    limit: options?.limit || 50,
  };

  if (options?.pageToken) queryParams.pageToken = options.pageToken;
  if (options?.email) queryParams.email = options.email;

  return nylas.contacts.list({
    identifier: grantId,
    queryParams,
  });
}

export async function getContact(grantId: string, contactId: string) {
  const response = await nylas.contacts.find({
    identifier: grantId,
    contactId,
  });
  return response.data;
}

export async function createContact(grantId: string, params: {
  givenName?: string;
  surname?: string;
  emails?: { email: string; type?: string }[];
  phoneNumbers?: { number: string; type?: string }[];
  companyName?: string;
  jobTitle?: string;
}) {
  const response = await nylas.contacts.create({
    identifier: grantId,
    requestBody: {
      givenName: params.givenName,
      surname: params.surname,
      emails: params.emails,
      phoneNumbers: params.phoneNumbers,
      companyName: params.companyName,
      jobTitle: params.jobTitle,
    },
  });
  return response.data;
}
