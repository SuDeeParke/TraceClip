#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const IMPORTANT_NAMES = new Set([
  "TracingStartedInBrowser",
  "RunTask",
  "EvaluateScript",
  "EventDispatch",
  "FunctionCall",
  "TimerFire",
  "FireAnimationFrame",
  "RequestAnimationFrame",
  "Layout",
  "UpdateLayoutTree",
  "Paint",
  "CompositeLayers",
  "BeginFrame",
  "DroppedFrame",
  "RequestMainThreadFrame",
  "GPUTask",
  "Screenshot",
  "MouseDown",
  "MouseUp",
  "Click",
  "PointerDown",
  "PointerUp",
  "PointerMove",
  "KeyDown",
  "KeyUp",
  "GestureTap",
  "GestureScrollBegin",
  "GestureScrollUpdate",
  "GestureScrollEnd",
]);

const IMPORTANT_CATS = new Set([
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-devtools.screenshot",
  "v8",
  "v8.execute",
  "devtools.timeline",
  "disabled-by-default-v8.gc",
  "input",
  "latencyInfo",
]);

const SUMMARY_PREVIEW_LIMIT = 8;

function parseCategorySet(value) {
  return value
    ? new Set(value.split(",").map((s) => s.trim()).filter(Boolean))
    : null;
}

function matchesCategoryFilter(eventCat, filterSet) {
  if (!filterSet) return true;
  const categories = String(eventCat || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return categories.some((cat) => filterSet.has(cat));
}

function matchesHotspotWhitelist(event) {
  if (IMPORTANT_NAMES.has(event.name) || String(event.name || "").startsWith("V8.")) {
    return true;
  }

  const categories = String(event.cat || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return categories.some((cat) => IMPORTANT_CATS.has(cat));
}

function detectTraceUnit(wrapper, events) {
  const range = wrapper?.metadata?.modifications?.initialBreadcrumb?.window?.range;
  if (Number.isFinite(range)) {
    return range > 100000 ? "us" : "ms";
  }

  const sampleTs = events
    .filter((event) => event.ph !== "M" && Number.isFinite(event.ts))
    .slice(0, 200)
    .map((event) => Math.abs(event.ts));

  const maxTs = sampleTs.length ? Math.max(...sampleTs) : 0;
  return maxTs > 10000000 ? "us" : "ms";
}

function buildSummary(events, startMs, endMs, detectedTraceUnit) {
  const divisor = detectedTraceUnit === "us" ? 1000 : 1;
  const summaryEvents = events
    .filter((event) => event.ph !== "M")
    .filter(
      (event) =>
        matchesHotspotWhitelist(event) ||
        Number.isFinite(event.dur) ||
        Number.isFinite(event.tdur)
    )
    .map((event) => ({
      interactionEvent: event.name,
      functionName: event.name,
      startTime: Number((event.ts / divisor).toFixed(3)),
      selfTime: Number.isFinite(event.tdur)
        ? Number((event.tdur / divisor).toFixed(3))
        : null,
      totalDuration: Number.isFinite(event.dur)
        ? Number((event.dur / divisor).toFixed(3))
        : 0,
      pid: event.pid,
      tid: event.tid,
      cat: event.cat || "",
    }))
    .sort((a, b) => {
      if (b.totalDuration !== a.totalDuration) {
        return b.totalDuration - a.totalDuration;
      }
      return a.startTime - b.startTime;
    });

  return {
    traceUnit: detectedTraceUnit,
    reportUnit: "ms",
    window: {
      startMs,
      endMs,
      durationMs: Number((endMs - startMs).toFixed(3)),
    },
    events: summaryEvents,
    preview: summaryEvents.slice(0, SUMMARY_PREVIEW_LIMIT),
  };
}

function getSummaryOutputPath(outputPath) {
  const parsed = path.parse(outputPath);
  const extension = parsed.ext || ".json";
  const baseName = parsed.ext ? parsed.name : parsed.base;
  return path.join(parsed.dir, `${baseName}.summary${extension}`);
}

async function sliceTraceFile(options) {
  const {
    input,
    output,
    start,
    end: endInput,
    duration: durationInput,
    cat: catInput,
    name: nameInput,
  } = options;

  if (!Number.isFinite(start)) {
    throw new Error("start must be a number");
  }

  let end = endInput;
  if (end == null && durationInput != null) {
    end = start + Number(durationInput);
  }
  if (end == null) {
    throw new Error("end or duration is required");
  }
  if (!Number.isFinite(end)) {
    throw new Error("end must be a number");
  }
  if (end <= start) {
    throw new Error("end must be greater than start");
  }

  const catSet = parseCategorySet(catInput);
  const nameSet = nameInput
    ? new Set(nameInput.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  let trace;
  try {
    trace = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in input file: ${e.message}`);
  }

  let events;
  let wrapper;
  if (Array.isArray(trace)) {
    events = trace;
    wrapper = null;
  } else if (trace.traceEvents && Array.isArray(trace.traceEvents)) {
    events = trace.traceEvents;
    wrapper = trace;
  } else {
    throw new Error("Unrecognized trace format (expected array or {traceEvents:[...]})");
  }

  const detectedTraceUnit = detectTraceUnit(wrapper, events);
  const inputFactor = detectedTraceUnit === "us" ? 1000 : 1;
  const startInTraceUnit = start * inputFactor;
  const endInTraceUnit = end * inputFactor;

  const total = events.length;
  const filteredEvents = events.filter((event) => {
    if (event.ph === "M") return true;
    if (event.name === "TracingStartedInBrowser") return true;
    if (event.ts == null) return false;

    let inTime = false;
    if (Number.isFinite(event.dur) && event.dur > 0) {
      const eventEnd = event.ts + event.dur;
      inTime = eventEnd >= startInTraceUnit && event.ts <= endInTraceUnit;
    } else {
      inTime = event.ts >= startInTraceUnit && event.ts <= endInTraceUnit;
    }
    if (!inTime) return false;

    if (catSet && !matchesCategoryFilter(event.cat, catSet)) return false;
    if (nameSet && !nameSet.has(event.name)) return false;

    return true;
  });

  const result = wrapper
    ? { ...wrapper, traceEvents: filteredEvents }
    : { traceEvents: filteredEvents };

  let outputPath;
  if (output) {
    outputPath = path.resolve(output);
  } else {
    outputPath = path.resolve(__dirname, "output", `sliced-${Date.now()}.json`);
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(result));

  const summary = buildSummary(filteredEvents, start, end, detectedTraceUnit);
  const summaryOutput = getSummaryOutputPath(outputPath);
  fs.writeFileSync(summaryOutput, JSON.stringify(summary, null, 2));

  return {
    inputEvents: total,
    outputEvents: filteredEvents.length,
    start,
    end,
    duration: Number((end - start).toFixed(3)),
    output: outputPath,
    summaryOutput,
    summary,
    detectedTraceUnit,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1];
      if (!val || val.startsWith("--")) {
        console.error(`Missing value for --${key}`);
        process.exit(1);
      }
      args[key] = val;
      i++;
    }
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node slice-trace.js --input <trace.json> --output <out.json> --start <ts> [--end <ts> | --duration <dur>] [--cat cat1,cat2] [--name name1,name2]

Options:
  --input     Path to Chrome trace JSON file (required)
  --output    Path to write the sliced trace JSON (required)
  --start     Start timestamp in milliseconds (required)
  --end       End timestamp in milliseconds (one of end/duration required)
  --duration  Duration in milliseconds (alternative to --end)
  --cat       Comma-separated category filter (optional)
  --name      Comma-separated event name filter (optional)

Examples:
  node slice-trace.js --input trace.json --output frame.json --start 1000 --end 1016.666
  node slice-trace.js --input trace.json --output frame.json --start 1000 --duration 16.666
  node slice-trace.js --input trace.json --output frame.json --start 1000 --duration 16.666 --cat gpu,webgl --name Frame`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.input || !args.output || args.start == null) {
    printUsage();
    process.exit(1);
  }

  if (!args.end && !args.duration) {
    console.error("Error: --end or --duration is required");
    process.exit(1);
  }

  const options = {
    input: args.input,
    output: args.output,
    start: Number(args.start),
    end: args.end ? Number(args.end) : undefined,
    duration: args.duration ? Number(args.duration) : undefined,
    cat: args.cat || undefined,
    name: args.name || undefined,
  };

  const result = await sliceTraceFile(options);
  console.log(`Done: ${result.outputEvents}/${result.inputEvents} events kept -> ${result.output}`);
  console.log(`Range: ${result.start} - ${result.end} (duration: ${result.duration} ms)`);
  console.log(`Detected trace unit: ${result.detectedTraceUnit}`);
  console.log(`Summary: ${result.summaryOutput}`);
}

module.exports = { sliceTraceFile };

if (require.main === module) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
