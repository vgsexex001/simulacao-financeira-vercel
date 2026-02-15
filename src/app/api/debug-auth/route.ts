"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check env vars
  checks.hasDbUrl = !!process.env.DATABASE_URL;
  checks.hasAuthSecret = !!process.env.AUTH_SECRET;
  checks.dbUrlPrefix = process.env.DATABASE_URL?.substring(0, 30) + "...";

  // Check database connection
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@finpulse.com" },
      select: { id: true, email: true, hashedPassword: true },
    });
    checks.userFound = !!user;
    if (user) {
      checks.passwordValid = await bcrypt.compare("admin123", user.hashedPassword);
      checks.hashPreview = user.hashedPassword.substring(0, 10) + "...";
    }
  } catch (e) {
    checks.dbError = String(e);
  }

  return NextResponse.json(checks);
}
