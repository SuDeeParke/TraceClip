const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { sliceTraceFile } = require("./slice-trace.js");

const app = express();
const HOST = "127.0.0.1";
const PORT = 3000;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const DOWNLOAD_TTL_MS = 10 * 60 * 1000;

const UPLOADS_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "output");
const RAW_DIR = path.join(__dirname, "raw");
const DIST_DIR = path.join(__dirname, "dist");
const INDEX_FILE = path.join(DIST_DIR, "index.html");

const requestLog = new Map();
const downloadTokens = new Map();

[UPLOADS_DIR, OUTPUT_DIR, RAW_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function isRateLimited(req) {
  const now = Date.now();
  const clientKey = getClientKey(req);
  const recentRequests = (requestLog.get(clientKey) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  recentRequests.push(now);
  requestLog.set(clientKey, recentRequests);

  return recentRequests.length > RATE_LIMIT_MAX_REQUESTS;
}

function isPathInside(parentDir, targetPath) {
  const resolvedParent = path.resolve(parentDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget === resolvedParent || resolvedTarget.startsWith(`${resolvedParent}${path.sep}`);
}

function sanitizeDownloadName(fileName) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseOptionalNumber(value) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateSliceWindow(start, end, duration) {
  if (!Number.isFinite(start)) {
    return "start must be a number";
  }

  if (end === undefined && duration === undefined) {
    return "end or duration is required";
  }

  if (end !== undefined && !Number.isFinite(end)) {
    return "end must be a number";
  }

  if (duration !== undefined && !Number.isFinite(duration)) {
    return "duration must be a number";
  }

  const resolvedEnd = end !== undefined ? end : start + duration;
  if (!Number.isFinite(resolvedEnd)) {
    return "end must be a number";
  }

  if (resolvedEnd <= start) {
    return "end must be greater than start";
  }

  if (resolvedEnd - start > MAX_WINDOW_MS) {
    return `duration must be ${MAX_WINDOW_MS} ms or less`;
  }

  return null;
}

function createDownloadUrl(filePath, downloadName) {
  const resolvedFilePath = path.resolve(filePath);
  if (!isPathInside(OUTPUT_DIR, resolvedFilePath)) {
    throw new Error("download file must be inside output directory");
  }

  const token = randomUUID();
  downloadTokens.set(token, {
    filePath: resolvedFilePath,
    downloadName: sanitizeDownloadName(downloadName),
    expiresAt: Date.now() + DOWNLOAD_TTL_MS,
  });
  return `/api/download/${token}`;
}

function getDownloadRecord(token) {
  const record = downloadTokens.get(token);
  if (!record) return null;

  downloadTokens.delete(token);

  if (record.expiresAt < Date.now()) {
    return null;
  }

  if (!isPathInside(OUTPUT_DIR, record.filePath)) {
    return null;
  }

  return record;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `trace-${ts}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".json") {
      cb(null, true);
    } else {
      cb(new Error("Only .json files are allowed"), false);
    }
  },
});

const serveStaticDir = fs.existsSync(DIST_DIR) ? DIST_DIR : path.join(__dirname, "public");
app.use(express.static(serveStaticDir));

app.post(
  "/api/slice",
  (req, res, next) => {
    if (isRateLimited(req)) {
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }
    next();
  },
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No file uploaded" });
      }

      const start = parseOptionalNumber(req.body.start);
      const end = parseOptionalNumber(req.body.end);
      const duration = parseOptionalNumber(req.body.duration);
      const validationError = validateSliceWindow(start, end, duration);

      if (validationError) {
        return res.status(400).json({ ok: false, error: validationError });
      }

      const options = {
        input: req.file.path,
        start,
        end,
        duration,
        cat: req.body.cat || undefined,
        name: req.body.name || undefined,
      };

      const result = await sliceTraceFile(options);
      const outputFile = path.basename(result.output);
      const summaryFile = path.basename(result.summaryOutput);
      const summaryPreview = result.summary.preview || [];

      res.json({
        ok: true,
        inputEvents: result.inputEvents,
        outputEvents: result.outputEvents,
        start: result.start,
        end: result.end,
        duration: result.duration,
        outputFile,
        downloadUrl: createDownloadUrl(result.output, outputFile),
        summaryFile,
        summaryUrl: createDownloadUrl(result.summaryOutput, summaryFile),
        summaryPreview,
        detectedTraceUnit: result.detectedTraceUnit,
      });
    } catch (err) {
      console.error("Slice error:", err);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  }
);

app.get("/api/download/:token", (req, res) => {
  const record = getDownloadRecord(req.params.token);
  if (!record) {
    return res.status(404).json({ ok: false, error: "Download not found or expired" });
  }

  if (!fs.existsSync(record.filePath)) {
    return res.status(404).json({ ok: false, error: "Download not found or expired" });
  }

  res.download(record.filePath, record.downloadName);
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(INDEX_FILE);
  });
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ ok: false, error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)` });
    }
    return res.status(400).json({ ok: false, error: err.message });
  }
  if (err.message === "Only .json files are allowed") {
    return res.status(400).json({ ok: false, error: err.message });
  }
  next(err);
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`traceClip server running at http://${HOST}:${PORT}`);
  });
}

module.exports = {
  app,
  createDownloadUrl,
  getDownloadRecord,
  isPathInside,
  sanitizeDownloadName,
};

