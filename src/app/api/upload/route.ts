import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireGestor } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { error } = await requireGestor();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
  }

  const max = 15 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ error: "Arquivo acima de 15MB." }, { status: 400 });
  }

  const orig = file.name || "upload";
  const ext = path.extname(orig).toLowerCase() || ".bin";
  const allowed = [".pdf", ".xml", ".png", ".jpg", ".jpeg"];
  if (!allowed.includes(ext)) {
    return NextResponse.json(
      { error: "Extensão não permitida (use PDF, XML ou imagem)." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);

  const url = `/uploads/${name}`;
  return NextResponse.json({ url });
}
