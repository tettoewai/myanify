import { auth } from "@/auth";
import { enforceMiddlewareRateLimit } from "@/lib/rate-limit";

export default auth(async (req) => {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const limited = await enforceMiddlewareRateLimit(req);
    if (limited) {
      return limited;
    }
  }
});
