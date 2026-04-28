import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, deliverables } from '@/lib/db/schema';
import { asc, eq, isNull } from 'drizzle-orm';

export async function GET() {
  try {
    const [taskRows, deliverableRows] = await Promise.all([
      db.select().from(tasks).orderBy(asc(tasks.order), asc(tasks.createdAt)),
      db.select().from(deliverables).orderBy(asc(deliverables.createdAt)),
    ]);
    const delivMap = new Map<string, typeof deliverableRows>();
    for (const d of deliverableRows) {
      const arr = delivMap.get(d.taskId) ?? [];
      arr.push(d);
      delivMap.set(d.taskId, arr);
    }
    const result = taskRows.map((t) => ({ ...t, deliverables: delivMap.get(t.id) ?? [] }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parentId = body.parentId ?? null;
    const siblings = await db.select({ id: tasks.id }).from(tasks).where(
      parentId === null ? isNull(tasks.parentId) : eq(tasks.parentId, parentId)
    );
    const [task] = await db
      .insert(tasks)
      .values({
        title: body.title,
        description: body.description ?? null,
        assignee: body.assignee ?? null,
        status: body.status ?? 'todo',
        progress: body.progress ?? 0,
        startDate: body.startDate ?? null,
        dueDate: body.dueDate ?? null,
        parentId,
        order: siblings.length,
      })
      .returning();
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
