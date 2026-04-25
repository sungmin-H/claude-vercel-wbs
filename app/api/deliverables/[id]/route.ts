import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deliverables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) fields.name = body.name;
    if (body.type !== undefined) fields.type = body.type;
    if (body.status !== undefined) fields.status = body.status;
    if (body.link !== undefined) fields.link = body.link;

    const [row] = await db
      .update(deliverables)
      .set(fields as any)
      .where(eq(deliverables.id, params.id))
      .returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(deliverables).where(eq(deliverables.id, params.id));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete deliverable' }, { status: 500 });
  }
}
