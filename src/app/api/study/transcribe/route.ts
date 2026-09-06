import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let tempFilePath = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload_${Date.now()}_${file.name}`);
    await fs.writeFile(tempFilePath, buffer);

    const scriptPath = path.resolve(process.cwd(), "scripts", "doc_ppt_pdf_transcriber.py");
    const pythonExecutable = process.env.PYTHON_PATH || "python";

    const py = spawn(pythonExecutable, [scriptPath, "--json", tempFilePath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (chunk) => {
      output += chunk.toString("utf-8");
    });

    py.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString("utf-8");
    });

    const exitCode = await new Promise<number>((resolve) => {
      py.on("close", resolve);
    });

    if (exitCode !== 0) {
      return NextResponse.json(
        { error: "Transcription failed", details: errorOutput },
        { status: 500 }
      );
    }

    const result = JSON.parse(output || '{"text": "", "images": []}');
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message },
      { status: 500 }
    );
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}
