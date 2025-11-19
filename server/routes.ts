diff --git a/server/routes.ts b/server/routes.ts
index 1111111..2222222 100644
--- a/server/routes.ts
+++ b/server/routes.ts
@@ -1,6 +1,12 @@
 import express from "express";
 const router = express.Router();
 
-router.get("/", (req, res) => {
-  res.send("API is running");
+router.get("/", (req, res) => {
+  res.json({
+    ok: true,
+    message: "API running on Railway",
+    timestamp: Date.now(),
+  });
 });
 
 export default router;
