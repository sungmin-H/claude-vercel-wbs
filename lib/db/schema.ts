import { pgTable, uuid, text, integer, date, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references((): any => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    assignee: text('assignee'),
    status: text('status').notNull().default('todo'),
    progress: integer('progress').notNull().default(0),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusCheck: check('tasks_status_check', sql`${t.status} in ('todo','doing','done')`),
    progressCheck: check('tasks_progress_check', sql`${t.progress} between 0 and 100`),
  })
);

export const deliverables = pgTable(
  'deliverables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull().default('other'), // doc|design|code|spec|data|other
    status: text('status').notNull().default('pending'), // pending|in-progress|done
    link: text('link'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeCheck: check('deliverables_type_check', sql`${t.type} in ('doc','design','code','spec','data','other')`),
    statusCheck: check('deliverables_status_check', sql`${t.status} in ('pending','in-progress','done')`),
  })
);
