import express from "express";
import {
  startGoogleAuth,
  handleGoogleCallback,
} from "./googleAuth.js";

const router = express.Router();

router.get("/google", async (req, res) => {
  const url = await startGoogleAuth();
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  const jwt = await handleGoogleCallback(code as string);
  res.redirect(`/auth/success?jwt=${jwt}`);
});

export default router;
