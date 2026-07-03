// Shared error-control layer for BCUTZ edge functions.
//
// Two capabilities:
//   1. logError(...)  — structured, NEVER-throwing error logging. Writes to the
//      `error_logs` table (via service role) AND console. Safe to call from any
//      catch block; if the DB insert itself fails it only logs to console.
//   2. withRetry(...) — "self-healing" wrapper: retries a transient/idempotent
//      operation with exponential backoff. Retries ONLY when isRetryable() says
//      the error looks transient, so non-idempotent operations (e.g. a Stripe
//      charge) are never blindly re-run.
//
// SAFETY: only wrap idempotent / safe-to-repeat work in withRetry (sending an
// email, a push notification, a read). Never wrap money movement or any write
// that would duplicate an effect on retry.

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

export type Severity = "info" | "warning" | "error" | "critical";

export interface LogErrorParams {
  functionName: string;
  error: unknown;
  severity?: Severity;
  context?: Record<string, unknown>;
  /** Reuse an existing service-role client if the caller already has one. */
  supabase?: SupabaseClient;
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function toStack(e: unknown): string | null {
  return e instanceof Error ? (e.stack ?? null) : null;
}

/**
 * Log an error to console + the error_logs table. Guaranteed not to throw:
 * a failure to persist is itself only logged to console, so error handling
 * never masks the original error or crashes the function.
 */
export async function logError(params: LogErrorParams): Promise<void> {
  const { functionName, error, severity = "error", context } = params;

  // Console first — this always works, even if the DB is unreachable.
  console.error(
    `[${functionName}] ${severity.toUpperCase()}: ${toMessage(error)}`,
    context ? JSON.stringify(context) : "",
  );

  try {
    const supabase =
      params.supabase ??
      createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

    await supabase.from("error_logs").insert({
      function_name: functionName,
      error_message: toMessage(error),
      error_stack: toStack(error),
      severity,
      context: context ?? {},
    });
  } catch (loggingError) {
    // Never let the logger itself break the caller.
    console.error(
      `[${functionName}] error_logs insert failed:`,
      toMessage(loggingError),
    );
  }
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  label?: string;
  /** Decide whether a given error is worth retrying. Default: transient-only. */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Heuristic: treat network / timeout / rate-limit / 5xx as transient (retry),
 * treat everything else (validation, auth, "not found") as permanent (fail fast).
 *
 * This predicate is the key tuning knob for self-heal behavior — widen it and
 * you retry more aggressively (risking wasted work on permanent failures),
 * narrow it and you heal fewer transient blips.
 */
export function defaultIsRetryable(error: unknown): boolean {
  const m = toMessage(error).toLowerCase();
  return [
    "timeout",
    "timed out",
    "network",
    "connection",
    "econnreset",
    "econnrefused",
    "socket",
    "dns",
    "temporarily",
    "rate limit",
    "too many requests",
    "429",
    "500",
    "502",
    "503",
    "504",
  ].some((needle) => m.includes(needle));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn`, retrying on transient failure with exponential backoff
 * (baseDelayMs * 2^(attempt-1)). Throws the LAST error if all attempts fail
 * or the error is non-retryable, so the caller's catch block still runs.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 300,
    label = "operation",
    isRetryable = defaultIsRetryable,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryable(error)) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[retry] ${label} failed (attempt ${attempt}/${attempts}), retrying in ${delay}ms: ${toMessage(error)}`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
