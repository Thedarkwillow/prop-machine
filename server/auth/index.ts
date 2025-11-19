diff --git a/server/auth/index.ts b/server/auth/index.ts
index 1111111..2222222 100644
--- a/server/auth/index.ts
+++ b/server/auth/index.ts
@@ -1,6 +1,18 @@
-import express from "express";
-const router = express.Router();
+import express from "express";
+import {
+  startGoogleAuth,
+  handleGoogleCallback,
+} from "./googleAuth.js";
+
+const router = express.Router();
 
-router.get("/", (req, res) => {
-  res.send("auth works");
+router.get("/google", async (req, res) => {
+  const url = await startGoogleAuth();
+  res.redirect(url);
 });
+
+router.get("/google/callback", async (req, res) => {
+  const { code } = req.query;
+  const jwt = await handleGoogleCallback(code as string);
+  res.redirect(`/auth/success?jwt=${jwt}`);
+});
 
 export default router;
