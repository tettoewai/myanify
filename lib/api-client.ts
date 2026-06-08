import { toast } from "sonner";

export const RATE_LIMIT_TOAST_ID = "rate-limit";

export class RateLimitError extends Error {
  readonly status = 429;
  readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function getRetryAfterSeconds(response: Response): number | undefined {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  return Number.isFinite(seconds) ? seconds : undefined;
}

export function formatRateLimitMessage(retryAfterSeconds?: number): string {
  if (retryAfterSeconds && retryAfterSeconds >= 60) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `Too many requests. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
  }

  if (retryAfterSeconds && retryAfterSeconds > 0) {
    return `Too many requests. Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"} and try again.`;
  }

  return "Too many requests. Please slow down and try again.";
}

export function notifyRateLimitError(retryAfterSeconds?: number): void {
  toast.error(formatRateLimitMessage(retryAfterSeconds), {
    id: RATE_LIMIT_TOAST_ID,
    duration: 5000,
  });
}

export async function parseApiErrorBody(
  response: Response,
): Promise<{ error?: string; retryAfterSeconds?: number }> {
  const retryAfterSeconds = getRetryAfterSeconds(response);

  try {
    const data = await response.json();
    return {
      error: typeof data?.error === "string" ? data.error : undefined,
      retryAfterSeconds,
    };
  } catch {
    return { retryAfterSeconds };
  }
}

export async function checkApiResponse(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const { error, retryAfterSeconds } = await parseApiErrorBody(response);

  if (response.status === 429) {
    throw new RateLimitError(
      error || formatRateLimitMessage(retryAfterSeconds),
      retryAfterSeconds,
    );
  }

  throw new ApiError(error || "Something went wrong", response.status);
}

export async function swrFetcher(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const { error, retryAfterSeconds } = await parseApiErrorBody(response);

    if (response.status === 429) {
      notifyRateLimitError(retryAfterSeconds);
      throw new RateLimitError(
        error || formatRateLimitMessage(retryAfterSeconds),
        retryAfterSeconds,
      );
    }

    throw new ApiError(error || "Failed to fetch data", response.status);
  }

  return response.json();
}

export async function handleMutationResponse<T = unknown>(
  response: Response,
  options?: { successMessage?: string; fallbackError?: string },
): Promise<T> {
  if (response.ok) {
    if (options?.successMessage) {
      toast.success(options.successMessage);
    }

    try {
      return (await response.json()) as T;
    } catch {
      return undefined as T;
    }
  }

  const { error, retryAfterSeconds } = await parseApiErrorBody(response);

  if (response.status === 429) {
    notifyRateLimitError(retryAfterSeconds);
    throw new RateLimitError(
      error || formatRateLimitMessage(retryAfterSeconds),
      retryAfterSeconds,
    );
  }

  const message = error || options?.fallbackError || "Something went wrong";
  toast.error(message);
  throw new ApiError(message, response.status);
}

export function handleFetchError(
  error: unknown,
  fallbackMessage = "Something went wrong",
): void {
  if (isRateLimitError(error)) {
    notifyRateLimitError(error.retryAfterSeconds);
    return;
  }

  if (error instanceof ApiError) {
    toast.error(error.message);
    return;
  }

  toast.error(fallbackMessage);
}
