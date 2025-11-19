import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API running",
    timestamp: Date.now(),
  });
});

export default router;
