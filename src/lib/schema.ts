import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  varchar,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    remindTime: text("remind_time").notNull().default("07:00"),
    dailyReminderEnabled: boolean("daily_reminder_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(false),
    telegramEnabled: boolean("telegram_enabled").notNull().default(false),
    telegramChatId: text("telegram_chat_id"),
    discordEnabled: boolean("discord_enabled").notNull().default(false),
    discordWebhookUrl: text("discord_webhook_url"),
  },
  (t) => [uniqueIndex("user_settings_user_idx").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    contact: text("contact"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("clients_user_idx").on(t.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#10b981"),
    status: text("status").notNull().default("aktif"),
    startDate: timestamp("start_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("projects_user_idx").on(t.userId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull().default("main"), // "main" | "side"
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    startDate: timestamp("start_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    priority: text("priority").notNull().default("medium"), // low | medium | high | urgent
    status: text("status").notNull().default("todo"), // todo | in_progress | done | cancelled
    tags: jsonb("tags").$type<string[]>().default([]),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    recurrenceId: integer("recurrence_id").references(() => recurrences.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("tasks_user_idx").on(t.userId),
    index("tasks_user_status_idx").on(t.userId, t.status),
    index("tasks_user_due_idx").on(t.userId, t.dueDate),
    index("tasks_recurrence_idx").on(t.recurrenceId),
  ],
);

export const recurrences = pgTable(
  "recurrences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull().default("main"), // "main" | "side"
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    priority: text("priority").notNull().default("medium"),
    tags: jsonb("tags").$type<string[]>().default([]),
    // recurrence config
    freq: text("freq").notNull().default("daily"), // "daily" | "weekly" | "cron"
    weekdays: jsonb("weekdays").$type<number[]>().default([]), // 1=Senin .. 7=Minggu (ISO)
    cron: text("cron"), // ekspresi cron (freq=cron)
    time: text("time").notNull().default("08:00"), // HH:mm untuk daily/weekly
    startsOn: timestamp("starts_on", { withTimezone: true }).notNull(),
    endsOn: timestamp("ends_on", { withTimezone: true }), // null = tidak berakhir
    active: boolean("active").notNull().default(true),
    lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("recurrences_user_idx").on(t.userId)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint)],
);

export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD (local tz user)
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reminder_logs_user_date_idx").on(t.userId, t.date)],
);

export const appSettings = pgTable(
  "app_settings",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    value: text("value"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("app_settings_key_idx").on(t.key)],
);

export const usersRelations = relations(users, ({ many }) => ({
  settings: many(userSettings),
  tasks: many(tasks),
  clients: many(clients),
  projects: many(projects),
  pushSubscriptions: many(pushSubscriptions),
  recurrences: many(recurrences),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  recurrence: one(recurrences, { fields: [tasks.recurrenceId], references: [recurrences.id] }),
}));

export const recurrencesRelations = relations(recurrences, ({ one, many }) => ({
  user: one(users, { fields: [recurrences.userId], references: [users.id] }),
  client: one(clients, { fields: [recurrences.clientId], references: [clients.id] }),
  project: one(projects, { fields: [recurrences.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));
