/**
 * Generate an Ed25519 keypair for mobile-release manifest signing.
 * Usage: pnpm gen:release-keys
 * - Prints RELEASE_SIGNING_PRIVATE_KEY (server, secret) and
 *   EXPO_PUBLIC_RELEASE_PUBLIC_KEY (baked into the app, public).
 * - Re-running rotates keys: publish a manifest signed with the NEW key only
 *   after the app build containing the NEW public key is widely adopted,
 *   or ship dual-signed transition manually.
 */
async function main() {
  const mod = (await import("tweetnacl")) as unknown as {
    default?: typeof import("tweetnacl");
    sign: typeof import("tweetnacl").sign;
  };
  const nacl = (mod.default ?? mod) as typeof import("tweetnacl");
  const kp = nacl.sign.keyPair();
  const pub = Buffer.from(kp.publicKey).toString("base64");
  const priv = Buffer.from(kp.secretKey).toString("base64");
  console.log("Add to myanify/.env.local (server, SECRET):");
  console.log(`RELEASE_SIGNING_PRIVATE_KEY=${priv}`);
  console.log(`RELEASE_SIGNING_PUBLIC_KEY=${pub}`);
  console.log("\nAdd to myanify-app/.env + .env.production (public, baked into APK):");
  console.log(`EXPO_PUBLIC_RELEASE_PUBLIC_KEY=${pub}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
