import { NextResponse } from "next/server";
import { pmjnCanPersistUploadedFiles } from "@/lib/pmjn-file-storage";

/** Public flags for the client (no secrets). Not behind auth middleware. */
export function GET() {
  return NextResponse.json({
    persistUploadedFiles: pmjnCanPersistUploadedFiles(),
  });
}
