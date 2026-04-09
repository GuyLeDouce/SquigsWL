const http = require("http");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_PATH = path.join(DATA_DIR, "submissions.db");
const CSV_PATH = path.join(DATA_DIR, "submissions.csv");
const APPROVED_WALLETS_PATH = path.join(DATA_DIR, "approved-wallets.txt");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    favorite_collection TEXT NOT NULL,
    favorite_collection_reason TEXT NOT NULL,
    discord_handle TEXT NOT NULL,
    discord_duration TEXT NOT NULL,
    joined_discord TEXT NOT NULL,
    biggest_collection_count TEXT NOT NULL,
    biggest_collection_name TEXT NOT NULL,
    nft_uniqueness TEXT NOT NULL,
    squigs_contribution TEXT NOT NULL,
    ugly_behavior TEXT NOT NULL,
    participate_without_wl TEXT NOT NULL,
    follows_x TEXT NOT NULL,
    x_handle TEXT NOT NULL,
    wallet_address TEXT NOT NULL UNIQUE,
    admin_notes TEXT NOT NULL DEFAULT ''
  );
`);

const insertSubmission = db.prepare(`
  INSERT INTO submissions (
    created_at,
    updated_at,
    favorite_collection,
    favorite_collection_reason,
    discord_handle,
    discord_duration,
    joined_discord,
    biggest_collection_count,
    biggest_collection_name,
    nft_uniqueness,
    squigs_contribution,
    ugly_behavior,
    participate_without_wl,
    follows_x,
    x_handle,
    wallet_address
  ) VALUES (
    @created_at,
    @updated_at,
    @favorite_collection,
    @favorite_collection_reason,
    @discord_handle,
    @discord_duration,
    @joined_discord,
    @biggest_collection_count,
    @biggest_collection_name,
    @nft_uniqueness,
    @squigs_contribution,
    @ugly_behavior,
    @participate_without_wl,
    @follows_x,
    @x_handle,
    @wallet_address
  );
`);

const listSubmissions = db.prepare(`
  SELECT
    id,
    created_at,
    updated_at,
    status,
    favorite_collection,
    favorite_collection_reason,
    discord_handle,
    discord_duration,
    joined_discord,
    biggest_collection_count,
    biggest_collection_name,
    nft_uniqueness,
    squigs_contribution,
    ugly_behavior,
    participate_without_wl,
    follows_x,
    x_handle,
    wallet_address,
    admin_notes
  FROM submissions
  ORDER BY created_at DESC
`);

const updateSubmission = db.prepare(`
  UPDATE submissions
  SET
    status = @status,
    admin_notes = @admin_notes,
    updated_at = @updated_at
  WHERE id = @id
`);

function writeDerivedFiles() {
  const rows = listSubmissions.all();
  const headers = [
    "id",
    "created_at",
    "updated_at",
    "status",
    "favorite_collection",
    "favorite_collection_reason",
    "discord_handle",
    "discord_duration",
    "joined_discord",
    "biggest_collection_count",
    "biggest_collection_name",
    "nft_uniqueness",
    "squigs_contribution",
    "ugly_behavior",
    "participate_without_wl",
    "follows_x",
    "x_handle",
    "wallet_address",
    "admin_notes"
  ];

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, "\"\"");
    return `"${escaped}"`;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ].join("\n");

  fs.writeFileSync(CSV_PATH, csv, "utf8");

  const approvedWallets = rows
    .filter((row) => row.status === "approved")
    .map((row) => row.wallet_address.trim())
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(APPROVED_WALLETS_PATH, approvedWallets, "utf8");
}

writeDerivedFiles();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(payload);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
  };
  return types[ext] || "application/octet-stream";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeWallet(wallet) {
  return String(wallet || "").trim();
}

function validateSubmission(payload) {
  const wallet = normalizeWallet(payload.walletAddress);
  const errors = [];

  const requiredFields = [
    ["favoriteCollection", payload.favoriteCollection],
    ["favoriteCollectionReason", payload.favoriteCollectionReason],
    ["discordHandle", payload.discordHandle],
    ["discordDuration", payload.discordDuration],
    ["joinedDiscord", payload.joinedDiscord],
    ["biggestCollectionCount", payload.biggestCollectionCount],
    ["biggestCollectionName", payload.biggestCollectionName],
    ["nftUniqueness", payload.nftUniqueness],
    ["squigsContribution", payload.squigsContribution],
    ["uglyBehavior", payload.uglyBehavior],
    ["participateWithoutWl", payload.participateWithoutWl],
    ["followsX", payload.followsX],
    ["walletAddress", wallet]
  ];

  for (const [key, value] of requiredFields) {
    if (!String(value || "").trim()) {
      errors.push(`${key} is required`);
    }
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    errors.push("walletAddress must be a valid Ethereum address");
  }

  return { errors, wallet };
}

function isAuthorized(req, url) {
  const header = req.headers["x-admin-password"];
  const queryPassword = url.searchParams.get("password");
  return (
    (typeof header === "string" && header === ADMIN_PASSWORD) ||
    queryPassword === ADMIN_PASSWORD
  );
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const sanitizedPath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, sanitizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/submissions") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const { errors, wallet } = validateSubmission(payload);

      if (errors.length > 0) {
        sendJson(res, 400, { ok: false, errors });
        return;
      }

      const now = new Date().toISOString();

      try {
        insertSubmission.run({
          created_at: now,
          updated_at: now,
          favorite_collection: payload.favoriteCollection.trim(),
          favorite_collection_reason: payload.favoriteCollectionReason.trim(),
          discord_handle: payload.discordHandle.trim(),
          discord_duration: payload.discordDuration.trim(),
          joined_discord: payload.joinedDiscord.trim(),
          biggest_collection_count: payload.biggestCollectionCount.trim(),
          biggest_collection_name: payload.biggestCollectionName.trim(),
          nft_uniqueness: payload.nftUniqueness.trim(),
          squigs_contribution: payload.squigsContribution.trim(),
          ugly_behavior: payload.uglyBehavior.trim(),
          participate_without_wl: payload.participateWithoutWl.trim(),
          follows_x: payload.followsX.trim(),
          x_handle: String(payload.xHandle || "").trim(),
          wallet_address: wallet
        });
      } catch (error) {
        if (String(error.message || "").includes("UNIQUE")) {
          sendJson(res, 409, {
            ok: false,
            errors: ["This wallet address has already been submitted."]
          });
          return;
        }
        throw error;
      }

      writeDerivedFiles();
      sendJson(res, 201, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      if (payload.password === ADMIN_PASSWORD) {
        sendJson(res, 200, { ok: true });
        return;
      }
      sendJson(res, 401, { ok: false, error: "Invalid password" });
      return;
    }

    if (url.pathname.startsWith("/api/admin")) {
      if (!isAuthorized(req, url)) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/admin/submissions") {
        const rows = listSubmissions.all();
        const approvedWallets = rows
          .filter((row) => row.status === "approved")
          .map((row) => row.wallet_address);

        sendJson(res, 200, {
          ok: true,
          submissions: rows,
          approvedWallets
        });
        return;
      }

      if (req.method === "PATCH" && /^\/api\/admin\/submissions\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split("/").pop());
        const body = await readBody(req);
        const payload = JSON.parse(body || "{}");
        const status = String(payload.status || "").trim();
        const adminNotes = String(payload.adminNotes || "").trim();

        if (!["pending", "approved", "rejected"].includes(status)) {
          sendJson(res, 400, { ok: false, error: "Invalid status" });
          return;
        }

        updateSubmission.run({
          id,
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        });

        writeDerivedFiles();
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/admin/exports/submissions.csv") {
        sendText(res, 200, fs.readFileSync(CSV_PATH, "utf8"), "text/csv; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/admin/exports/approved-wallets.txt") {
        sendText(
          res,
          200,
          fs.readFileSync(APPROVED_WALLETS_PATH, "utf8"),
          "text/plain; charset=utf-8"
        );
        return;
      }
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
