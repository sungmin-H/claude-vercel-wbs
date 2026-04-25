import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(tasks).orderBy(asc(tasks.createdAt));
    return NextResponse.json(rows);
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
