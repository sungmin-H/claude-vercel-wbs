import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deliverables } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.taskId, params.id))
      .orderBy(asc(deliverables.createdAt));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const [row] = await db
      .insert(deliverables)
      .values({
        taskId: params.id,
        name: body.name,
        type: body.type ?? 'other',
        status: body.status ?? 'pending',
        link: body.link ?? null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create deliverable' }, { status: 500 });
  }
}
