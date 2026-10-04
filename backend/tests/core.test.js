import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { calculateDistance, normalizeLocation } from "../utils/geofence.js";
import { summarizeAttendance } from "../utils/attendanceMetrics.js";
import Section from "../models/Section.js";

test("normalizes valid coordinates and rejects out-of-range or inaccurate locations", () => {
    assert.deepEqual(normalizeLocation("37.5", "-122.2", "5"), {
        latitude: 37.5,
        longitude: -122.2,
        accuracy: 5
    });
    assert.equal(normalizeLocation(91, 0, 5), null);
    assert.equal(normalizeLocation(37.5, -122.2, 21), null);
    assert.equal(normalizeLocation(undefined, 0, 5), null);
    assert.equal(calculateDistance(37.5, -122.2, 37.5, -122.2), 0);
});

test("attendance percentages include expected and unmarked student sessions", () => {
    assert.deepEqual(summarizeAttendance({
        studentCount: 30,
        sessionCount: 2,
        totalMarked: 48,
        presentCount: 45
    }), {
        totalExpected: 60,
        absentCount: 15,
        unmarkedCount: 12,
        averageAttendance: 75
    });
    assert.equal(summarizeAttendance({
        studentCount: 0,
        sessionCount: 0,
        totalMarked: 0,
        presentCount: 0
    }).averageAttendance, 0);
});

test("sections support semester-specific names", () => {
    const semesterPath = Section.schema.path("semester");
    assert.equal(semesterPath.instance, "String");
    assert.deepEqual(semesterPath.enumValues, ["1", "2", "3", "4", "5", "6", "7", "8"]);

    const [keys, options] = Section.schema.indexes().find(([index]) =>
        index.name === 1 && index.department === 1 && index.semester === 1
    );
    assert.deepEqual(keys, { name: 1, department: 1, semester: 1 });
    assert.equal(options.unique, true);
});

test("runtime API config ignores untrusted query overrides", () => {
    const configPath = new URL("../../frontend/config.js", import.meta.url);
    const source = readFileSync(configPath, "utf8");
    const resolveBase = (hostname, protocol, search) => {
        const window = { location: { hostname, protocol, search } };
        const document = {
            body: { dataset: {} },
            querySelector: () => ({ content: "" })
        };
        vm.runInNewContext(source, { window, document });
        return window.__APP_API_BASE__;
    };

    assert.equal(
        resolveBase("localhost", "http:", "?api_base=https://attacker.invalid"),
        "http://localhost:5000"
    );
    assert.equal(
        resolveBase("smart.vercel.app", "https:", ""),
        "https://smart-attendance-backend.onrender.com"
    );
});

test("apiPatch sends the PATCH method and authorization header", async () => {
    const originals = {
        window: globalThis.window,
        sessionStorage: globalThis.sessionStorage,
        fetch: globalThis.fetch
    };
    const existed = {
        window: Object.hasOwn(globalThis, "window"),
        sessionStorage: Object.hasOwn(globalThis, "sessionStorage"),
        fetch: Object.hasOwn(globalThis, "fetch")
    };
    let request;

    globalThis.window = {
        __APP_API_BASE__: "",
        location: { origin: "http://localhost:5000" }
    };
    globalThis.sessionStorage = {
        getItem: (key) => key === "token" ? "test-token" : null
    };
    globalThis.fetch = async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ success: true }) };
    };

    try {
        const { apiPatch } = await import("../../frontend/assets/js/api.js?patch-test");
        await apiPatch("/api/admin/face-registrations/123/disable", { disabled: true });
        assert.equal(request.options.method, "PATCH");
        assert.equal(request.options.headers.Authorization, "Bearer test-token");
        assert.deepEqual(JSON.parse(request.options.body), { disabled: true });
    } finally {
        for (const key of Object.keys(originals)) {
            if (existed[key]) globalThis[key] = originals[key];
            else delete globalThis[key];
        }
    }
});

test("registration requires authentication and the admin role", async () => {
    process.env.MONGO_URI ||= "mongodb://127.0.0.1:1/test";
    process.env.JWT_SECRET ||= "node-test-only";
    process.env.DEFAULT_ADMIN_EMAIL ||= "node-test@example.invalid";
    process.env.DEFAULT_ADMIN_PASSWORD ||= "node-test-only";
    const { default: authRoutes } = await import("../routes/authRoutes.js");
    const registration = authRoutes.stack.find((layer) => layer.route?.path === "/register")?.route;
    assert.ok(registration);

    const response = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    let nextCalled = false;
    await registration.stack[0].handle(
        { headers: {}, originalUrl: "/api/auth/register", method: "POST" },
        response,
        () => { nextCalled = true; }
    );
    assert.equal(response.statusCode, 401);
    assert.equal(nextCalled, false);

    registration.stack[1].handle(
        { user: { role: "student" } },
        response,
        () => { nextCalled = true; }
    );
    assert.equal(response.statusCode, 403);
    assert.equal(nextCalled, false);
});