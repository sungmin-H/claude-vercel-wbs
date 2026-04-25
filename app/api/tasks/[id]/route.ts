import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(tasks).where(eq(tasks.id, params.id));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const fields: Record<string, unknown> = {};

    if (body.title !== undefined) fields.title = body.title;
    if (body.description !== undefined) fields.description = body.description;
    if (body.assignee !== undefined) fields.assignee = body.assignee;
    if (body.status !== undefined) fields.status = body.status;
    if (body.progress !== undefined) fields.progress = body.progress;
    if (body.startDate !== undefined) fields.startDate = body.startDate;
    if (body.dueDate !== undefined) fields.dueDate = body.dueDate;
    if (body.parentId !== undefined) fields.parentId = body.parentId;
    fields.updatedAt = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [task] = await db
      .update(tasks)
      .set(fields as any)
      .where(eq(tasks.id, params.id))
      .returning();

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
