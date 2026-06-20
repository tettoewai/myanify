import { UserRole } from "@prisma/client";
import { toast } from "sonner";

export function getAuthRedirectUrl(
  callbackUrl: string | null,
  role: UserRole,
): string {
  if (callbackUrl?.startsWith("/admin") && role !== UserRole.ADMIN) {
    toast.error("Staff access required for the admin dashboard");
    return "/home";
  }
  if (callbackUrl) {
    return callbackUrl;
  }
  return "/home";
}
