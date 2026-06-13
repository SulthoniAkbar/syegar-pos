import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function handleError(error: unknown) {
  console.error(error);
  if (error instanceof ZodError) return fail(error.errors[0]?.message ?? "Data tidak valid", 422);
  if (error instanceof AppError) return fail(error.message, error.status);
  if (error instanceof Error) return fail(error.message, 400);
  return fail("Terjadi kesalahan", 500);
}
