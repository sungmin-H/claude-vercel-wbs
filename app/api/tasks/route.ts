import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, deliverables } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const [taskRows, deliverableRows] = await Promise.all([
      db.select().from(tasks).orderBy(asc(tasks.createdAt)),
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
        parentId: body.parentId ?? null,
      })
      .returning();
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
