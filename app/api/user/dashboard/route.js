"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.dynamic = void 0;
var server_1 = require("next/server");
var supabaseAdmin_1 = require("@/lib/supabaseAdmin");
var auth_1 = require("@/lib/auth");
exports.dynamic = 'force-dynamic';
var VALID_CLAIM_STATUSES = ['pending', 'accepted', 'rejected'];
var VALID_LOCATION_TYPES = ['physical', 'virtual'];
var VALID_VIRTUAL_CONTENT_TYPES = ['video', 'audio', 'image', 'text', 'link'];
var VALID_SPOT_STATUSES = ['active', 'empty', 'archived'];
var isClaimStatus = function (value) {
    return typeof value === 'string' && VALID_CLAIM_STATUSES.includes(value);
};
var isLocationSpotType = function (value) {
    return typeof value === 'string' && VALID_LOCATION_TYPES.includes(value);
};
var isVirtualSpotContent = function (value) {
    return typeof value === 'string' && VALID_VIRTUAL_CONTENT_TYPES.includes(value);
};
var isSpotStatus = function (value) {
    return typeof value === 'string' && VALID_SPOT_STATUSES.includes(value);
};
function normalizeClaimRow(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    var record = raw;
    var id = typeof record.id === 'string' ? record.id : null;
    var status = isClaimStatus(record.status);
    var createdAt = typeof record.created_at === 'string' ? record.created_at : null;
    if (!id || !status || !createdAt)
        return null;
    var stickerSpots;
    var stickerRaw = record.sticker_spots;
    if (stickerRaw && typeof stickerRaw === 'object') {
        var stickerRecord = stickerRaw;
        var title = typeof stickerRecord.title === 'string' ? stickerRecord.title : null;
        var type = isLocationSpotType(stickerRecord.type) ? stickerRecord.type : null;
        var contentType = isVirtualSpotContent(stickerRecord.content_type)
            ? stickerRecord.content_type
            : null;
        stickerSpots = { title: title, type: type, content_type: contentType };
    }
    return {
        id: id,
        status: status,
        created_at: createdAt,
        sticker_spots: stickerSpots,
    };
}
function normalizeSpotRow(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    var record = raw;
    var id = typeof record.id === 'string' ? record.id : null;
    var title = typeof record.title === 'string' ? record.title : null;
    var status = isSpotStatus(record.status);
    var createdAt = typeof record.created_at === 'string' ? record.created_at : null;
    if (!id || !title || !status || !createdAt)
        return null;
    var type = isLocationSpotType(record.type) ? record.type : null;
    return {
        id: id,
        title: title,
        type: type,
        status: status,
        created_at: createdAt,
    };
}
function GET(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    return __awaiter(this, void 0, void 0, function () {
        var token, user, db, _u, authUserRes, profileRes, claimsRes, spotsRes, authUser, nickname, createdAt, rawClaims, rawSpots, claims, spotsList, totalClaims, acceptedClaims, pendingClaims, rejectedClaims, physicalClaims, virtualClaims, createdSpots, activeCreatedSpots, physicalCreatedSpots, virtualCreatedSpots, recentClaims, recentSpots, payload;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    token = (0, auth_1.parseBearerToken)(req.headers);
                    if (!token) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'missing_token' }, { status: 401 })];
                    }
                    return [4 /*yield*/, (0, auth_1.getUserFromToken)(token)];
                case 1:
                    user = _v.sent();
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'unauthenticated' }, { status: 401 })];
                    }
                    db = (0, supabaseAdmin_1.supabaseAdmin)();
                    return [4 /*yield*/, Promise.all([
                            db.auth.admin.getUserById(user.id),
                            db.from('users').select('nickname, created_at').eq('id', user.id).maybeSingle(),
                            db
                                .from('claims')
                                .select('id, status, created_at, sticker_spots (title, type, content_type)')
                                .eq('user_id', user.id)
                                .order('created_at', { ascending: false })
                                .limit(12),
                            db
                                .from('sticker_spots')
                                .select('id, title, type, status, created_at')
                                .eq('creator_id', user.id)
                                .order('created_at', { ascending: false })
                                .limit(8),
                        ])];
                case 2:
                    _u = _v.sent(), authUserRes = _u[0], profileRes = _u[1], claimsRes = _u[2], spotsRes = _u[3];
                    if (authUserRes.error || profileRes.error || claimsRes.error || spotsRes.error) {
                        console.error('[user/dashboard] failed to compose response', {
                            auth: (_a = authUserRes.error) === null || _a === void 0 ? void 0 : _a.message,
                            profile: (_b = profileRes.error) === null || _b === void 0 ? void 0 : _b.message,
                            claims: (_c = claimsRes.error) === null || _c === void 0 ? void 0 : _c.message,
                            spots: (_d = spotsRes.error) === null || _d === void 0 ? void 0 : _d.message,
                        });
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'server_error' }, { status: 500 })];
                    }
                    authUser = authUserRes.data.user;
                    nickname = (_f = (_e = profileRes.data) === null || _e === void 0 ? void 0 : _e.nickname) !== null && _f !== void 0 ? _f : null;
                    createdAt = (_j = (_g = authUser === null || authUser === void 0 ? void 0 : authUser.created_at) !== null && _g !== void 0 ? _g : (_h = profileRes.data) === null || _h === void 0 ? void 0 : _h.created_at) !== null && _j !== void 0 ? _j : null;
                    rawClaims = (_k = claimsRes.data) !== null && _k !== void 0 ? _k : [];
                    rawSpots = (_l = spotsRes.data) !== null && _l !== void 0 ? _l : [];
                    claims = rawClaims
                        .map(normalizeClaimRow)
                        .filter(function (claim) { return Boolean(claim); });
                    spotsList = rawSpots
                        .map(normalizeSpotRow)
                        .filter(function (spot) { return Boolean(spot); });
                    totalClaims = claims.length;
                    acceptedClaims = claims.filter(function (row) { return row.status === 'accepted'; }).length;
                    pendingClaims = claims.filter(function (row) { return row.status === 'pending'; }).length;
                    rejectedClaims = claims.filter(function (row) { return row.status === 'rejected'; }).length;
                    physicalClaims = claims.filter(function (row) { var _a; return ((_a = row.sticker_spots) === null || _a === void 0 ? void 0 : _a.type) === 'physical'; }).length;
                    virtualClaims = claims.filter(function (row) { var _a; return ((_a = row.sticker_spots) === null || _a === void 0 ? void 0 : _a.type) === 'virtual'; }).length;
                    createdSpots = spotsList.length;
                    activeCreatedSpots = spotsList.filter(function (spot) { return spot.status === 'active'; }).length;
                    physicalCreatedSpots = spotsList.filter(function (spot) { return spot.type === 'physical'; }).length;
                    virtualCreatedSpots = spotsList.filter(function (spot) { return spot.type === 'virtual'; }).length;
                    recentClaims = claims.map(function (row) {
                        var _a, _b, _c, _d, _e, _f;
                        return ({
                            id: row.id,
                            created_at: row.created_at,
                            status: row.status,
                            spot_title: (_b = (_a = row.sticker_spots) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : 'ismeretlen pont',
                            type: (_d = (_c = row.sticker_spots) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : null,
                            content_type: (_f = (_e = row.sticker_spots) === null || _e === void 0 ? void 0 : _e.content_type) !== null && _f !== void 0 ? _f : null,
                        });
                    });
                    recentSpots = spotsList.map(function (spot) { return ({
                        id: spot.id,
                        title: spot.title,
                        type: spot.type,
                        status: spot.status,
                        created_at: spot.created_at,
                    }); });
                    payload = {
                        user: {
                            id: (_m = authUser === null || authUser === void 0 ? void 0 : authUser.id) !== null && _m !== void 0 ? _m : user.id,
                            nickname: nickname,
                            email: (_o = authUser === null || authUser === void 0 ? void 0 : authUser.email) !== null && _o !== void 0 ? _o : user.email,
                            avatar_url: (_q = (_p = authUser === null || authUser === void 0 ? void 0 : authUser.user_metadata) === null || _p === void 0 ? void 0 : _p.avatar_url) !== null && _q !== void 0 ? _q : null,
                            role: (0, auth_1.getUserRoleByEmail)((_r = authUser === null || authUser === void 0 ? void 0 : authUser.email) !== null && _r !== void 0 ? _r : user.email),
                            created_at: createdAt,
                            last_activity_at: (_t = (_s = claims[0]) === null || _s === void 0 ? void 0 : _s.created_at) !== null && _t !== void 0 ? _t : null,
                        },
                        stats: {
                            totalClaims: totalClaims,
                            acceptedClaims: acceptedClaims,
                            pendingClaims: pendingClaims,
                            rejectedClaims: rejectedClaims,
                            physicalClaims: physicalClaims,
                            virtualClaims: virtualClaims,
                            createdSpots: createdSpots,
                            activeCreatedSpots: activeCreatedSpots,
                            physicalCreatedSpots: physicalCreatedSpots,
                            virtualCreatedSpots: virtualCreatedSpots,
                        },
                        recentClaims: recentClaims,
                        recentSpots: recentSpots,
                    };
                    return [2 /*return*/, server_1.NextResponse.json(payload)];
            }
        });
    });
}
exports.GET = GET;
