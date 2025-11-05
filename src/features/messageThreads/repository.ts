import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { message, message_thread } from "../../db/schema.js";
import type { Message, MessageThread } from "./domain.js";
import { domainThreadToDb } from "./domain.js";

/**
 * Upsert a single thread (and its last message if present).
 */
export async function upsertThread(t: MessageThread): Promise<void> {
  const row = domainThreadToDb(t);
  try {
    const existing = await findThreadById(row.id);
    if ((existing as any[]).length === 0) {
      await db.insert(message_thread).values(row);
      console.log(`Inserted thread ${row.id}`);
    } else {
      await updateThreadRow(row);
      console.log(`Updated thread ${row.id}`);
    }

    if (t.lastMessage) {
      // Delegate message persistence to a reusable function that accepts domain messages
      await upsertMessages([t.lastMessage]);
    }
  } catch (err) {
    console.error(`DB error for thread ${row.id}:`, err);
  }
}

/**
 * Upsert an array of messages into the database.
 * Re-uses the existing helpers for find/insert/update.
 */
export async function upsertMessages(messages: Message[]): Promise<void> {
  for (const m of messages) {
    const msgRow = buildMessageRow(m.threadId, m);
    try {
      const existingMsg = await findMessageById(msgRow.id);
      if ((existingMsg as any[]).length === 0) {
        await insertMessageRow(msgRow);
        console.log(`Inserted message ${msgRow.id}`);
      } else {
        await updateMessageRow(msgRow);
        console.log(`Updated message ${msgRow.id}`);
      }
    } catch (err) {
      console.error(`DB error for message ${msgRow.id}:`, err);
    }
  }
}

/**
 * Upsert an array of threads.
 */
export async function upsertThreads(threads: MessageThread[]): Promise<void> {
  for (const t of threads) {
    await upsertThread(t);
  }
}

async function findThreadById(id: string) {
  return db.select().from(message_thread).where(eq(message_thread.id, id));
}

async function updateThreadRow(row: any) {
  await db
    .update(message_thread)
    .set({
      related_entity: row.related_entity,
      related_entity_type: row.related_entity_type,
      related_entity_state: row.related_entity_state,
      title: row.title,
      has_unread_messages: row.has_unread_messages,
      has_attachments: row.has_attachments,
      last_message: row.last_message,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
    .where(eq(message_thread.id, row.id));
}

async function findMessageById(id: string) {
  return db.select().from(message).where(eq(message.id, id));
}

async function insertMessageRow(row: any) {
  await db.insert(message).values(row);
}

async function updateMessageRow(row: any) {
  await db
    .update(message)
    .set({
      thread_id: row.thread_id,
      sender_id: row.sender_id,
      sender_name: row.sender_name,
      receiver_id: row.receiver_id,
      receiver_name: row.receiver_name,
      body: row.body,
      status: row.status,
      attachments: row.attachments,
      created_at: row.created_at,
    })
    .where(eq(message.id, row.id));
}

function buildMessageRow(threadId: string, msg: Message) {
  return {
    id: msg.id,
    thread_id: threadId,
    sender_id: null,
    sender_name: msg.author ?? null,
    receiver_id: null,
    receiver_name: null,
    body: msg.body,
    status: null,
    attachments: null,
    created_at: msg.createdAt,
  };
}
