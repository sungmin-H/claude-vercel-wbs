import * as z from 'zod';
import { asc, eq, isNull } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';

const statusEnum = z.enum(['todo', 'doing', 'done']);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

const createInput = z
  .object({
    title: z.string().min(1, '제목은 필수입니다.'),
    description: z.string().optional(),
    assignee: z.string().optional(),
    status: statusEnum.optional(),
    progress: z.number().int().min(0).max(100).optional(),
    startDate: dateString.optional(),
    dueDate: dateString.optional(),
    parentId: z.string().uuid().optional(),
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate,
    { message: '시작일은 목표 기한보다 늦을 수 없습니다.', path: ['dueDate'] }
  );

const updateInput = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    assignee: z.string().nullable().optional(),
    status: statusEnum.optional(),
    progress: z.number().int().min(0).max(100).optional(),
    startDate: dateString.nullable().optional(),
    dueDate: dateString.nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) =>
      !v.startDate ||
      !v.dueDate ||
      (typeof v.startDate === 'string' && typeof v.dueDate === 'string'
        ? v.startDate <= v.dueDate
        : true),
    { message: '시작일은 목표 기한보다 늦을 수 없습니다.', path: ['dueDate'] }
  );

const json = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

export function registerTaskTools(server: McpServer) {
  server.registerTool(
    'list_tasks',
    {
      description: '모든 Task 를 평면 배열로 반환합니다 (order asc, createdAt asc).',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      const rows = await db
        .select()
        .from(tasks)
        .orderBy(asc(tasks.order), asc(tasks.createdAt));
      return json(rows);
    }
  );

  server.registerTool(
    'get_task',
    {
      description: 'id 로 Task 단건을 조회합니다. 없으면 null 을 반환합니다.',
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
      return json(row ?? null);
    }
  );

  server.registerTool(
    'create_task',
    {
      description:
        '새 Task 를 만듭니다. 제목 필수, parent_id 지정 시 하위 작업으로 생성됩니다. order 는 같은 부모의 형제 수로 자동 채움.',
      inputSchema: createInput,
    },
    async (input) => {
      const parentId = input.parentId ?? null;
      const siblings = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(parentId === null ? isNull(tasks.parentId) : eq(tasks.parentId, parentId));

      const progress = input.progress ?? 0;
      const status = progress === 100 ? 'done' : input.status ?? 'todo';

      const [row] = await db
        .insert(tasks)
        .values({
          title: input.title,
          description: input.description ?? null,
          assignee: input.assignee ?? null,
          status,
          progress,
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
          parentId,
          order: siblings.length,
        })
        .returning();
      return json(row);
    }
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Task 를 부분 업데이트합니다. progress 를 100 으로 설정하면 status 가 자동으로 done 이 됩니다 (역방향 동기화는 없음).',
      inputSchema: updateInput,
    },
    async (input) => {
      const { id, ...rest } = input;
      const fields: Record<string, unknown> = {};

      if (rest.title !== undefined) fields.title = rest.title;
      if (rest.description !== undefined) fields.description = rest.description;
      if (rest.assignee !== undefined) fields.assignee = rest.assignee;
      if (rest.status !== undefined) fields.status = rest.status;
      if (rest.progress !== undefined) {
        fields.progress = rest.progress;
        if (rest.progress === 100) fields.status = 'done';
      }
      if (rest.startDate !== undefined) fields.startDate = rest.startDate;
      if (rest.dueDate !== undefined) fields.dueDate = rest.dueDate;
      if (rest.parentId !== undefined) fields.parentId = rest.parentId;
      fields.updatedAt = new Date();

      const [row] = await db
        .update(tasks)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(fields as any)
        .where(eq(tasks.id, id))
        .returning();

      if (!row) {
        return {
          content: [{ type: 'text' as const, text: `Task ${id} 를 찾을 수 없습니다.` }],
          isError: true,
        };
      }
      return json(row);
    }
  );

  server.registerTool(
    'delete_task',
    {
      description: 'id 로 Task 를 삭제합니다. 자식 작업은 DB FK on delete cascade 로 함께 제거됩니다.',
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      const deleted = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
      return json({ deleted: deleted.length > 0, id });
    }
  );
}
