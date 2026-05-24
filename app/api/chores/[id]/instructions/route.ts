import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamChoreInstructions } from "@/lib/ai-instructions";

type Params = { params: Promise<{ id: string }> };

function err(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[API instructions]", message);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const instructions = await prisma.choreInstructions.findUnique({
      where: { choreId: parseInt(id) },
    });
    return NextResponse.json(instructions ?? null);
  } catch (e) { return err(e); }
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const choreId = parseInt(id);
    const chore = await prisma.chore.findUnique({ where: { id: choreId } });
    if (!chore) return NextResponse.json({ error: "Chore not found" }, { status: 404 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of streamChoreInstructions(
            chore.name,
            chore.category,
            chore.ageMin,
            chore.ageMax
          )) {
            fullText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          const parsed = JSON.parse(fullText);
          await prisma.choreInstructions.upsert({
            where: { choreId },
            create: {
              choreId,
              steps: JSON.stringify(parsed.steps ?? []),
              tips: JSON.stringify(parsed.tips ?? []),
              safetyNotes: JSON.stringify(parsed.safetyNotes ?? []),
              aiGenerated: true,
            },
            update: {
              steps: JSON.stringify(parsed.steps ?? []),
              tips: JSON.stringify(parsed.tips ?? []),
              safetyNotes: JSON.stringify(parsed.safetyNotes ?? []),
              aiGenerated: true,
            },
          });
        } catch {
          // stream error handled silently; client retries
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) { return err(e); }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const choreId = parseInt(id);
    const body = await req.json();
    const instructions = await prisma.choreInstructions.upsert({
      where: { choreId },
      create: {
        choreId,
        steps: JSON.stringify(body.steps ?? []),
        tips: JSON.stringify(body.tips ?? []),
        safetyNotes: JSON.stringify(body.safetyNotes ?? []),
        aiGenerated: false,
      },
      update: {
        steps: JSON.stringify(body.steps ?? []),
        tips: JSON.stringify(body.tips ?? []),
        safetyNotes: JSON.stringify(body.safetyNotes ?? []),
        aiGenerated: false,
      },
    });
    return NextResponse.json(instructions);
  } catch (e) { return err(e); }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.choreInstructions.delete({ where: { choreId: parseInt(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) { return err(e); }
}
