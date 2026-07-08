import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/errors";
import { log } from "@/lib/logger";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown) {
  const publicError = toPublicError(error);
  if (publicError.status >= 500) {
    log("error", "Unhandled request error", { error: error instanceof Error ? error.message : error });
  }
  return NextResponse.json(publicError.body, { status: publicError.status });
}
