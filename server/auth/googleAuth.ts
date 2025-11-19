diff --git a/server/auth/googleAuth.ts b/server/auth/googleAuth.ts
new file mode 100644
index 0000000..9999999
--- /dev/null
+++ b/server/auth/googleAuth.ts
@@ -0,0 +1,146 @@
+import { Issuer, generators } from "openid-client";
+import jwt from "jsonwebtoken";
+import dotenv from "dotenv";
+dotenv.config();
+
+const redirectUri =
+  process.env.GOOGLE_REDIRECT_URI ||
+  "https://your-railway-domain.up.railway.app/auth/google/callback";
+
+let googleClient: any = null;
+let codeVerifier: string | null = null;
+
+export async function getGoogleClient() {
+  if (googleClient) return googleClient;
+
+  const GoogleIssuer = await Issuer.discover(
+    "https://accounts.google.com"
+  );
+
+  googleClient = new GoogleIssuer.Client({
+    client_id: process.env.GOOGLE_CLIENT_ID!,
+    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
+    redirect_uris: [redirectUri],
+    response_types: ["code"],
+  });
+
+  return googleClient;
+}
+
+export async function startGoogleAuth() {
+  const client = await getGoogleClient();
+
+  codeVerifier = generators.codeVerifier();
+  const codeChallenge = generators.codeChallenge(codeVerifier);
+
+  return client.authorizationUrl({
+    scope: "openid email profile",
+    code_challenge: codeChallenge,
+    code_challenge_method: "S256",
+    redirect_uri: redirectUri,
+  });
+}
+
+export async function handleGoogleCallback(code: string) {
+  const client = await getGoogleClient();
+
+  const tokenSet = await client.callback(
+    redirectUri,
+    { code },
+    { code_verifier: codeVerifier! }
+  );
+
+  const userInfo = await client.userinfo(tokenSet.access_token!);
+
+  const appJwt = jwt.sign(
+    {
+      email: userInfo.email,
+      name: userInfo.name,
+      picture: userInfo.picture,
+    },
+    process.env.JWT_SECRET!,
+    { expiresIn: "7d" }
+  );
+
+  return appJwt;
+}
