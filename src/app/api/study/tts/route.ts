import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "en-US-AriaNeural", rate = "+0%" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const scriptPath = path.resolve(process.cwd(), "scripts", "neural_tts_synthesizer.py");
    const pythonExecutable = process.env.PYTHON_PATH || "python";

    const py = spawn(pythonExecutable, [
      scriptPath,
      "--text",
      text,
      "--voice",
      voice,
      "--rate",
      rate,
    ]);

    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    py.stdout.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    py.stderr.on("data", (errChunk) => {
      errorChunks.push(Buffer.from(errChunk));
    });

    const exitCode = await new Promise<number>((resolve) => {
      py.on("close", resolve);
    });

    if (exitCode !== 0) {
      const errMsg = Buffer.concat(errorChunks).toString("utf-8");
      return NextResponse.json(
        { error: "Neural TTS synthesis failed", details: errMsg },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.concat(chunks);
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message },
      { status: 500 }
    );
  }
}
