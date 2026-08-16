import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "student:import")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, requestId, error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) || [];

    const requiredHeaders = ["firstname", "lastname", "email", "studentnumber"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { success: false, requestId, error: `Missing required columns: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    const results = { imported: 0, failed: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row = headers.reduce((obj, header, index) => {
        obj[header] = values[index] || "";
        return obj;
      }, {} as any);

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: row.email },
        });

        if (existingUser) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: User ${row.email} already exists`);
          continue;
        }

        // Create user with student profile
        const passwordHash = await bcrypt.hash("password123", 12);
        
        await prisma.user.create({
          data: {
            email: row.email,
            passwordHash,
            firstName: row.firstname,
            lastName: row.lastname,
            role: "STUDENT",
            status: "ACTIVE",
            studentProfile: {
              create: {
                firstName: row.firstname,
                lastName: row.lastname,
                studentNumber: row.studentnumber,
              },
            },
          },
        });

        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      imported: results.imported,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to process import" }, { status: 500 });
  }
}
