import { config as dotenvConfig } from "dotenv";
import { join } from "node:path";
import { sendVerificationEmail, sendResetEmail } from "../lib/email";

dotenvConfig({ path: join(process.cwd(), ".env.local") });
dotenvConfig();

const email = process.argv[2] || process.env.TEST_EMAIL;

if (!email) {
  console.error("Usage: npm run test:email you@example.com");
  process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY not set in .env");
  process.exit(1);
}

console.log(`Sending test email to ${email} from ${process.env.EMAIL_FROM}...`);

sendVerificationEmail(email, "test-token").then(async () => {
  await sendResetEmail(email, "test-token");
  console.log("Done. Check your inbox (and spam folder).");
  process.exit(0);
});
