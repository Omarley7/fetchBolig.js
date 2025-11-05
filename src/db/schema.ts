import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Offers table - API `offer.id` is a string, use varchar primary key
export const offer = pgTable(
  "offer",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
    number: integer("number").notNull(),
    offer_text: text("offer_text"),
    showing_text: text("showing_text"),
    internal_note: text("internal_note"),
    deadline: timestamp("deadline", { withTimezone: true }),
    recipients: jsonb("recipients"),
    recipients_count: integer("recipients_count"),
    winner_id: varchar("winner_id", { length: 191 }),
    state: varchar("state", { length: 191 }),
    organization_id: varchar("organization_id", { length: 191 }),
    company_id: varchar("company_id", { length: 191 }),
    residence_id: varchar("residence_id", { length: 191 }),
    property_id: varchar("property_id", { length: 191 }),
    residence_address: varchar("residence_address", { length: 1024 }),
    has_unread_messages: boolean("has_unread_messages")
      .notNull()
      .default(false),
    unread_messages_count: integer("unread_messages_count")
      .notNull()
      .default(0),
    only_for_students: boolean("only_for_students").notNull().default(false),
  },
  (t) => [
    index("idx_offer_has_unread").on(t.has_unread_messages),
    index("idx_offer_created_at").on(t.created_at),
  ]
);

// Message threads table
export const message_thread = pgTable(
  "message_thread",
  {
    id: varchar("id").primaryKey(),
    related_entity: varchar("related_entity", { length: 191 }), // FK to offer.id
    related_entity_type: varchar("related_entity_type", { length: 191 }),
    related_entity_state: varchar("related_entity_state", { length: 191 }),
    title: varchar("title", { length: 1024 }),
    has_unread_messages: boolean("has_unread_messages")
      .notNull()
      .default(false),
    has_attachments: boolean("has_attachments").notNull().default(false),
    // keep last_message snapshot for convenience; messages will be normalized in `message` table
    last_message: jsonb("last_message"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("idx_message_thread_unread").on(t.has_unread_messages),
    index("idx_message_thread_created").on(t.created_at),
    index("idx_message_thread_rel_ent").on(t.related_entity),
  ]
);

// Messages table - API message ids are strings
export const message = pgTable("message", {
  id: varchar("id", { length: 191 }).primaryKey(),
  thread_id: varchar("thread_id")
    .notNull()
    .references(() => message_thread.id, { onDelete: "cascade" }),
  sender_id: varchar("sender_id", { length: 191 }),
  sender_name: varchar("sender_name", { length: 512 }),
  receiver_id: varchar("receiver_id", { length: 191 }),
  receiver_name: varchar("receiver_name", { length: 512 }),
  body: text("body"),
  status: varchar("status", { length: 191 }),
  attachments: jsonb("attachments"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});

// Export inferred types for rows / inserts
export type OfferRow = typeof offer.$inferSelect;
export type NewOfferRow = typeof offer.$inferInsert;
export type MessageThreadRow = typeof message_thread.$inferSelect;
export type NewMessageThreadRow = typeof message_thread.$inferInsert;
export type MessageRow = typeof message.$inferSelect;
export type NewMessageRow = typeof message.$inferInsert;

// Note: Foreign key relationships must be created in database migrations (not represented here).
// We intentionally keep DB column names snake_case while domain/API use camelCase.
