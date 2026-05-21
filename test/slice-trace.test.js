const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { sliceTraceFile } = require("../slice-trace.js");
const {
  createDownloadUrl,
  getDownloadRecord,
  isPathInside,
  sanitizeDownloadName,
} = require("../server.js");

function makeTempPath(name) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "traceclip-")), name);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("slices wrapper traces in ms and preserves Chrome-importable shape", async () => {
  const output = makeTempPath("sample-basic-slice.json");
  const result = await sliceTraceFile({
    input: path.join(__dirname, "..", "raw", "sample-basic.json"),
    output,
    start: 1000,
    duration: 16.666,
  });

  assert.equal(result.inputEvents, 19);
  assert.equal(result.outputEvents, 13);
  assert.equal(result.detectedTraceUnit, "ms");

  const sliced = readJson(output);
  assert.ok(Array.isArray(sliced.traceEvents));
  assert.equal(sliced.traceEvents.filter((event) => event.ph === "M").length, 4);
  assert.ok(sliced.traceEvents.some((event) => event.name === "OverlappingStart"));
  assert.ok(sliced.traceEvents.some((event) => event.name === "OverlappingEnd"));
  assert.ok(!sliced.traceEvents.some((event) => event.name === "OutsideBefore"));
  assert.ok(!sliced.traceEvents.some((event) => event.name === "OutsideAfter"));
});

test("slices array traces and writes wrapped output plus summary sidecar", async () => {
  const output = makeTempPath("sample-array-slice.json");
  const result = await sliceTraceFile({
    input: path.join(__dirname, "..", "raw", "sample-array.json"),
    output,
    start: 3000,
    duration: 16.666,
  });

  const sliced = readJson(output);
  const summary = readJson(result.summaryOutput);

  assert.ok(Array.isArray(sliced.traceEvents));
  assert.equal(result.outputEvents, sliced.traceEvents.length);
  assert.equal(summary.traceUnit, "ms");
  assert.equal(summary.reportUnit, "ms");
  assert.equal(summary.window.startMs, 3000);
  assert.equal(summary.window.endMs, 3016.666);
  assert.ok(summary.events.some((event) => event.interactionEvent === "Layout"));
  assert.ok(summary.events.some((event) => event.interactionEvent === "Paint"));
});

test("converts ms input to microseconds for real Chrome-style traces", async () => {
  const output = makeTempPath("chrome-us-slice.json");
  const input = makeTempPath("chrome-us-input.json");

  fs.writeFileSync(
    input,
    JSON.stringify({
      metadata: {
        modifications: {
          initialBreadcrumb: {
            window: { range: 200000 },
          },
        },
      },
      traceEvents: [
        { name: "thread_name", cat: "__metadata", ph: "M", ts: 0, pid: 1, tid: 1, args: { name: "CrRendererMain" } },
        { name: "RunTask", cat: "devtools.timeline", ph: "X", ts: 1000000, dur: 16000, tdur: 12000, pid: 1, tid: 1 },
        { name: "Paint", cat: "devtools.timeline", ph: "X", ts: 1005000, dur: 2000, tdur: 1500, pid: 1, tid: 1 },
        { name: "Outside", cat: "devtools.timeline", ph: "X", ts: 1030000, dur: 1000, pid: 1, tid: 1 },
      ],
    })
  );

  const result = await sliceTraceFile({
    input,
    output,
    start: 1000,
    duration: 16.666,
  });

  assert.equal(result.detectedTraceUnit, "us");

  const sliced = readJson(output);
  const keptNames = sliced.traceEvents.map((event) => event.name);
  assert.deepEqual(keptNames, ["thread_name", "RunTask", "Paint"]);

  const summary = readJson(result.summaryOutput);
  const runTask = summary.events.find((event) => event.interactionEvent === "RunTask");
  assert.ok(runTask);
  assert.equal(runTask.startTime, 1000);
  assert.equal(runTask.selfTime, 12);
  assert.equal(runTask.totalDuration, 16);
});

test("uses a safe summary path when output has no extension", async () => {
  const output = makeTempPath("slice-noext");
  const result = await sliceTraceFile({
    input: path.join(__dirname, "..", "raw", "sample-basic.json"),
    output,
    start: 1000,
    duration: 16.666,
  });

  assert.equal(result.output, output);
  assert.equal(path.basename(result.summaryOutput), "slice-noext.summary.json");
  assert.notEqual(result.summaryOutput, result.output);
  assert.ok(fs.existsSync(result.output));
  assert.ok(fs.existsSync(result.summaryOutput));
});

test("server no longer exposes raw or output directories as static assets", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.equal(serverSource.includes('app.use("/raw", express.static('), false);
  assert.equal(serverSource.includes('app.use("/output", express.static('), false);
  assert.ok(serverSource.includes('app.get("/api/download/:token"'));
  assert.ok(serverSource.includes('createDownloadUrl(result.output, outputFile)'));
  assert.ok(serverSource.includes('createDownloadUrl(result.summaryOutput, summaryFile)'));
});

test("path guard only allows files inside the output directory", () => {
  const outputDir = path.join(__dirname, "..", "output");
  assert.equal(isPathInside(outputDir, path.join(outputDir, "safe.json")), true);
  assert.equal(isPathInside(outputDir, path.join(outputDir, "nested", "safe.json")), true);
  assert.equal(isPathInside(outputDir, path.join(__dirname, "..", "uploads", "trace.json")), false);
});

test("download names are sanitized before response use", () => {
  assert.equal(sanitizeDownloadName('trace summary?.json'), 'trace_summary_.json');
  assert.equal(sanitizeDownloadName('../weird\\name.json'), 'name.json');
});

test("download tokens are single-use and limited to output artifacts", async () => {
  const output = path.join(__dirname, "..", "output", `download-check-${Date.now()}.json`);
  const result = await sliceTraceFile({
    input: path.join(__dirname, "..", "raw", "sample-basic.json"),
    output,
    start: 1000,
    duration: 16.666,
  });

  const downloadUrl = createDownloadUrl(result.output, '../unsafe name?.json');
  const token = downloadUrl.split('/').pop();
  const firstRecord = getDownloadRecord(token);

  assert.ok(firstRecord);
  assert.equal(firstRecord.downloadName, 'unsafe_name_.json');
  assert.equal(isPathInside(path.join(__dirname, "..", "output"), firstRecord.filePath), true);
  assert.equal(getDownloadRecord(token), null);
  assert.throws(
    () => createDownloadUrl(path.join(__dirname, "..", "uploads", "trace.json"), 'trace.json'),
    /download file must be inside output directory/
  );
});

