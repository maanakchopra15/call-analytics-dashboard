import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import part1 from "../data/cdr-part-01.json" with { type: "json" };
import part2 from "../data/cdr-part-02.json" with { type: "json" };
import part3 from "../data/cdr-part-03.json" with { type: "json" };
import part4 from "../data/cdr-part-04.json" with { type: "json" };
import part5 from "../data/cdr-part-05.json" with { type: "json" };
import part6 from "../data/cdr-part-06.json" with { type: "json" };
import part7 from "../data/cdr-part-07.json" with { type: "json" };
import part8 from "../data/cdr-part-08.json" with { type: "json" };
import part9 from "../data/cdr-part-09.json" with { type: "json" };
import part10 from "../data/cdr-part-10.json" with { type: "json" };
import part11 from "../data/cdr-part-11.json" with { type: "json" };
import part12 from "../data/cdr-part-12.json" with { type: "json" };
import part13 from "../data/cdr-part-13.json" with { type: "json" };
import part14 from "../data/cdr-part-14.json" with { type: "json" };
import part15 from "../data/cdr-part-15.json" with { type: "json" };
import part16 from "../data/cdr-part-16.json" with { type: "json" };
import part17 from "../data/cdr-part-17.json" with { type: "json" };
import part18 from "../data/cdr-part-18.json" with { type: "json" };
import part19 from "../data/cdr-part-19.json" with { type: "json" };
import part20 from "../data/cdr-part-20.json" with { type: "json" };

const SECRET = process.env.JWT_SECRET || "week3-call-analytics-demo-secret";
const cdrData = [part1, part2, part3, part4, part5, part6, part7, part8, part9, part10, part11, part12, part13, part14, part15, part16, part17, part18, part19, part20].flat();

const users = globalThis.__cdrUsers || (globalThis.__cdrUsers = [
  { id: 1, username: "admin", role: "Admin", passwordHash: bcrypt.hashSync("Admin123!", 10) },
  { id: 2, username: "analyst", role: "Analyst", passwordHash: bcrypt.hashSync("Analyst123!", 10) }
]);

function send(res, status, data) {
  res.status(status).json(data);
}

function token(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "2h" }
  );
}

function cookie(value, maxAge = 7200) {
  return `token=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function getToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;)\\s*token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function auth(req, res) {
  try {
    const tokenValue = getToken(req);
    if (!tokenValue) {
      send(res, 401, { error: { status: 401, message: "Authentication required" } });
      return null;
    }
    return jwt.verify(tokenValue, SECRET);
  } catch {
    send(res, 401, { error: { status: 401, message: "Invalid or expired token" } });
    return null;
  }
}

function role(req, res, allowed) {
  const user = auth(req, res);
  if (!user) return null;
  if (!allowed.includes(user.role)) {
    send(res, 403, { error: { status: 403, message: "Insufficient permissions" } });
    return null;
  }
  return user;
}

function filteredData(req) {
  const q = new URL(req.url, "https://example.com").searchParams;
  const city = (q.get("city") || "").trim().toLowerCase();
  const caller = (q.get("caller") || "").trim().toLowerCase();
  const receiver = (q.get("receiver") || "").trim().toLowerCase();
  const from = q.get("from") || "";
  const to = q.get("to") || "";

  return cdrData.filter((record) => {
    const cityMatch = !city || String(record.city || "").toLowerCase().includes(city);
    const callerMatch =
      !caller || String(record.callerNumber || "").toLowerCase().includes(caller);
    const receiverMatch =
      !receiver || String(record.receiverNumber || "").toLowerCase().includes(receiver);

    const recordDate = String(record.callStartTime || "").slice(0, 10);
    const fromMatch = !from || recordDate >= from;
    const toMatch = !to || recordDate <= to;

    return cityMatch && callerMatch && receiverMatch && fromMatch && toMatch;
  });
}

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url, "https://example.com");
    const path = requestUrl.searchParams.get("route") || requestUrl.pathname.replace(/^\\/api\\/?/, "");

    if (req.method === "GET" && path === "health") {
      return send(res, 200, { status: "ok", records: cdrData.length, source: "assignment PDF dataset" });
    }

    if (req.method === "POST" && path === "auth/login") {
      const { username = "", password = "" } = req.body || {};
      const user = users.find(
        (item) => item.username.toLowerCase() === String(username).trim().toLowerCase()
      );

      if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
        return send(res, 401, {
          error: { status: 401, message: "Invalid credentials" }
        });
      }

      res.setHeader("Set-Cookie", cookie(token(user)));
      return send(res, 200, {
        user: { username: user.username, role: user.role }
      });
    }

    if (req.method === "POST" && path === "auth/signup") {
      const { username = "", password = "" } = req.body || {};

      if (String(username).trim().length < 3 || String(password).length < 8) {
        return send(res, 400, {
          error: {
            status: 400,
            message: "Username must be 3+ characters and password 8+ characters"
          }
        });
      }

      if (
        users.some(
          (item) =>
            item.username.toLowerCase() === String(username).trim().toLowerCase()
        )
      ) {
        return send(res, 409, {
          error: { status: 409, message: "Username already exists" }
        });
      }

      users.push({
        id: Date.now(),
        username: String(username).trim(),
        role: "Analyst",
        passwordHash: await bcrypt.hash(String(password), 10)
      });

      return send(res, 201, { message: "Analyst account created" });
    }

    if (req.method === "POST" && path === "auth/logout") {
      res.setHeader("Set-Cookie", cookie("", 0));
      return send(res, 200, { message: "Logged out" });
    }

    if (req.method === "GET" && path === "auth/me") {
      const user = auth(req, res);
      if (!user) return;
      return send(res, 200, {
        user: { username: user.username, role: user.role }
      });
    }

    if (req.method === "GET" && path === "analytics") {
      if (!role(req, res, ["Admin", "Analyst"])) return;

      const data = filteredData(req);
      const incoming = data.filter((record) => record.callDirection === true).length;
      const callers = {};
      const cities = {};

      data.forEach((record) => {
        const caller = record.callerNumber || record.callerName || "Unknown";
        callers[caller] = (callers[caller] || 0) + 1;

        const city = record.city || "Unknown";
        cities[city] = (cities[city] || 0) + 1;
      });

      return send(res, 200, {
        totalCalls: data.length,
        totalDuration: data.reduce(
          (sum, record) => sum + Number(record.callDuration || 0),
          0
        ),
        incoming,
        outgoing: data.length - incoming,
        topCallers: Object.entries(callers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([caller, count]) => ({ caller, count })),
        cities
      });
    }

    if (req.method === "GET" && path === "cdr") {
      if (!role(req, res, ["Admin"])) return;

      const q = new URL(req.url, "https://example.com").searchParams;
      const page = Math.max(1, Number(q.get("page") || 1));
      const limit = Math.min(100, Math.max(1, Number(q.get("limit") || 15)));
      const data = filteredData(req);
      const start = (page - 1) * limit;

      return send(res, 200, {
        data: data.slice(start, start + limit),
        pagination: {
          page,
          limit,
          total: data.length,
          totalPages: Math.max(1, Math.ceil(data.length / limit))
        }
      });
    }

    return send(res, 404, {
      error: { status: 404, message: "Endpoint not found" }
    });
  } catch (error) {
    console.error(error);
    return send(res, 500, {
      error: { status: 500, message: "Internal server error" }
    });
  }
}
