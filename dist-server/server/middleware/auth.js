export function requireAuth(req, res, next) {
    var _a, _b;
    var sessionUser = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user;
    if (!((_b = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.claims) === null || _b === void 0 ? void 0 : _b.sub)) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    next();
}
export function optionalAuth(req, res, next) {
    // Allow both authenticated and unauthenticated access
    next();
}
