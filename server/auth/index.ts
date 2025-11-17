/**
 * Authentication router - supports both Replit Auth and Google OAuth
 * - Replit Auth: Used when ISSUER_URL and REPL_ID are present (Replit platform)
 * - Google OAuth: Used when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are present (Railway, local)
 */

import type { Express, RequestHandler } from "express";

// Check which auth provider to use based on environment variables
const useGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

let setupAuth: (app: Express) => Promise<void>;
let isAuthenticated: RequestHandler;
let getSession: () => any;

async function initializeAuth() {
  if (useGoogleAuth) {
    console.log("🔐 Using Google OAuth");
    const googleAuth = await import("./googleAuth");
    setupAuth = googleAuth.setupGoogleAuth;
    isAuthenticated = googleAuth.isAuthenticated;
    getSession = googleAuth.getSession;
  } else {
    // Default to Replit Auth (works on Replit platform and local development)
    console.log("🔐 Using Replit Auth (default)");
    const replitAuth = await import("../replitAuth");
    setupAuth = replitAuth.setupAuth;
    isAuthenticated = replitAuth.isAuthenticated;
    getSession = replitAuth.getSession;
  }
}

// Initialize auth providers
await initializeAuth();

export { setupAuth, isAuthenticated, getSession };
