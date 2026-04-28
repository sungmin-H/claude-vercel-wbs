import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const items: { id: string; order: number }[] = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 });
    }
    await Promise.all(
      items.map(({ id, order }) =>
        db.update(tasks).set({ order }).where(eq(tasks.id, id))
      )
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
