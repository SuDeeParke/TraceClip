const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sliceTraceFile } = require("./slice-trace.js");

const app = express();
const PORT = 3000;

const UPLOADS_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "output");
const RAW_DIR = path.join(__dirname, "raw");

[UPLOADS_DIR, OUTPUT_DIR, RAW_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".json") {
      cb(null, true);
    } else {
      cb(new Error("Only .json files are allowed"), false);
    }
  },
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/output", express.static(OUTPUT_DIR));
app.use("/raw", express.static(RAW_DIR));

app.post("/api/slice", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const start = Number(req.body.start);
    const end = req.body.end ? Number(req.body.end) : undefined;
    const duration = req.body.duration ? Number(req.body.duration) : undefined;

    if (!Number.isFinite(start)) {
      return res.status(400).json({ ok: false, error: "start must be a number" });
    }
    if (end === undefined && duration === undefined) {
      return res.status(400).json({ ok: false, error: "end or duration is required" });
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

    res.json({
      ok: true,
      inputEvents: result.inputEvents,
      outputEvents: result.outputEvents,
      start: result.start,
      end: result.end,
      duration: result.duration,
      outputFile,
      downloadUrl: `/output/${outputFile}`,
    });
  } catch (err) {
    console.error("Slice error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ ok: false, error: "File too large (max 500MB)" });
    }
    return res.status(400).json({ ok: false, error: err.message });
  }
  if (err.message === "Only .json files are allowed") {
    return res.status(400).json({ ok: false, error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`traceClip server running at http://localhost:${PORT}`);
});
