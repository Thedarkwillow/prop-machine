var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";
import { webcrypto } from "crypto";
var ISSUER_URL = (_a = process.env.ISSUER_URL) !== null && _a !== void 0 ? _a : "https://replit.com/oidc";
var CLIENT_ID = process.env.REPL_ID;
// Generate PKCE verifier and challenge
function generatePKCE() {
    return __awaiter(this, void 0, void 0, function () {
        var verifier, challenge;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    verifier = base64URLEncode(webcrypto.getRandomValues(new Uint8Array(32)));
                    return [4 /*yield*/, createChallenge(verifier)];
                case 1:
                    challenge = _a.sent();
                    return [2 /*return*/, { verifier: verifier, challenge: challenge }];
            }
        });
    });
}
function base64URLEncode(buffer) {
    return Buffer.from(buffer)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function createChallenge(verifier) {
    return __awaiter(this, void 0, void 0, function () {
        var encoder, data, hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    encoder = new TextEncoder();
                    data = encoder.encode(verifier);
                    return [4 /*yield*/, webcrypto.subtle.digest('SHA-256', data)];
                case 1:
                    hash = _a.sent();
                    return [2 /*return*/, base64URLEncode(new Uint8Array(hash))];
            }
        });
    });
}
export function getSession() {
    var sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    // Use in-memory store (sessions lost on restart, but login works)
    var MemoryStore = createMemoryStore(session);
    var sessionStore = new MemoryStore({
        checkPeriod: sessionTtl,
    });
    console.log("Using in-memory session store (sessions will be lost on restart)");
    return session({
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: true,
            maxAge: sessionTtl,
        },
    });
}
export function setupAuth(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.set("trust proxy", 1);
            app.use(getSession());
            app.get("/api/login", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, verifier, challenge, redirectUri, authUrl, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, generatePKCE()];
                        case 1:
                            _a = _b.sent(), verifier = _a.verifier, challenge = _a.challenge;
                            req.session.code_verifier = verifier;
                            redirectUri = "https://".concat(req.hostname, "/api/callback");
                            authUrl = new URL("".concat(ISSUER_URL, "/auth"));
                            authUrl.searchParams.set("client_id", CLIENT_ID);
                            authUrl.searchParams.set("redirect_uri", redirectUri);
                            authUrl.searchParams.set("response_type", "code");
                            authUrl.searchParams.set("scope", "openid email profile offline_access");
                            authUrl.searchParams.set("code_challenge", challenge);
                            authUrl.searchParams.set("code_challenge_method", "S256");
                            res.redirect(authUrl.toString());
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _b.sent();
                            console.error("Login error:", error_1);
                            res.status(500).send("Login failed");
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/callback", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var code, code_verifier, redirectUri, tokenUrl, tokenResponse, errorText, tokens, idToken, claims, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            code = req.query.code;
                            code_verifier = req.session.code_verifier;
                            if (!code || !code_verifier) {
                                return [2 /*return*/, res.status(400).send("Invalid callback")];
                            }
                            redirectUri = "https://".concat(req.hostname, "/api/callback");
                            tokenUrl = "".concat(ISSUER_URL, "/token");
                            return [4 /*yield*/, fetch(tokenUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded",
                                    },
                                    body: new URLSearchParams({
                                        grant_type: "authorization_code",
                                        code: code,
                                        redirect_uri: redirectUri,
                                        client_id: CLIENT_ID,
                                        code_verifier: code_verifier,
                                    }),
                                })];
                        case 1:
                            tokenResponse = _a.sent();
                            if (!!tokenResponse.ok) return [3 /*break*/, 3];
                            return [4 /*yield*/, tokenResponse.text()];
                        case 2:
                            errorText = _a.sent();
                            console.error("Token exchange failed:", errorText);
                            return [2 /*return*/, res.status(500).send("Authentication failed")];
                        case 3: return [4 /*yield*/, tokenResponse.json()];
                        case 4:
                            tokens = _a.sent();
                            idToken = tokens.id_token;
                            claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                            // Save user to database
                            return [4 /*yield*/, storage.upsertUser({
                                    id: claims.sub,
                                    email: claims.email || "",
                                    firstName: claims.first_name || "",
                                    lastName: claims.last_name || "",
                                    profileImageUrl: claims.profile_image_url || "",
                                })];
                        case 5:
                            // Save user to database
                            _a.sent();
                            // Save user info to session
                            req.session.user = {
                                claims: claims,
                                access_token: tokens.access_token,
                                refresh_token: tokens.refresh_token,
                                expires_at: claims.exp,
                            };
                            delete req.session.code_verifier;
                            res.redirect("/");
                            return [3 /*break*/, 7];
                        case 6:
                            error_2 = _a.sent();
                            console.error("Callback error:", error_2);
                            res.status(500).send("Authentication failed");
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/logout", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var session;
                var _a;
                return __generator(this, function (_b) {
                    session = req.session;
                    (_a = req.session) === null || _a === void 0 ? void 0 : _a.destroy(function () {
                        res.redirect("/");
                    });
                    return [2 /*return*/];
                });
            }); });
            app.get("/api/auth/user", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, user, error_3;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                            }
                            return [4 /*yield*/, storage.getUser(userId)];
                        case 1:
                            user = _d.sent();
                            if (!user) {
                                return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                            }
                            res.json(user);
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _d.sent();
                            console.error("Error fetching user:", error_3);
                            res.status(500).json({ message: "Failed to fetch user" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
export var isAuthenticated = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionUser, now, refreshToken, tokenUrl, tokenResponse, tokens, idToken, claims, error_4;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                sessionUser = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user;
                if (!((_b = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.claims) === null || _b === void 0 ? void 0 : _b.sub)) {
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                }
                now = Math.floor(Date.now() / 1000);
                if (sessionUser.expires_at && now <= sessionUser.expires_at) {
                    return [2 /*return*/, next()];
                }
                refreshToken = sessionUser.refresh_token;
                if (!refreshToken) {
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                tokenUrl = "".concat(ISSUER_URL, "/token");
                return [4 /*yield*/, fetch(tokenUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            grant_type: "refresh_token",
                            refresh_token: refreshToken,
                            client_id: CLIENT_ID,
                        }),
                    })];
            case 2:
                tokenResponse = _c.sent();
                if (!tokenResponse.ok) {
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                }
                return [4 /*yield*/, tokenResponse.json()];
            case 3:
                tokens = _c.sent();
                idToken = tokens.id_token;
                claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                // Update session with refreshed tokens
                req.session.user = {
                    claims: claims,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token || refreshToken,
                    expires_at: claims.exp,
                };
                return [2 /*return*/, next()];
            case 4:
                error_4 = _c.sent();
                console.error("Token refresh failed:", error_4);
                return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
            case 5: return [2 /*return*/];
        }
    });
}); };
