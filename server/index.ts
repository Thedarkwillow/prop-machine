diff --git a/server/index.ts b/server/index.ts
index 1111111..2222222 100644
--- a/server/index.ts
+++ b/server/index.ts
@@ -1,12 +1,15 @@
 import express from "express";
 import dotenv from "dotenv";
 import cors from "cors";
+import authRoutes from "./auth/index.js";
+import router from "./routes.js";
 
 dotenv.config();
 
 const app = express();
 app.use(cors());
 app.use(express.json());
 
+app.use("/auth", authRoutes);
+app.use("/", router);
 
 const port = process.env.PORT || 3000;
 app.listen(port, () => {
   console.log("Server running on port", port);
 });
