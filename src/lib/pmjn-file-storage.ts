/** Vercel serverless has no persistent local filesystem for `public/uploads`. */
export function pmjnCanPersistUploadedFiles(): boolean {
  return process.env.VERCEL !== "1";
}

/** Maps client-provided stored paths to DB values (null on Vercel). */
export function pmjnPersistedFilePathFromClient(
  value: string | null | undefined,
): string | null {
  if (!pmjnCanPersistUploadedFiles()) return null;
  if (value == null || value === "") return null;
  return value;
}
