#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

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

  const catSet = catInput
    ? new Set(catInput.split(",").map((s) => s.trim()).filter(Boolean))
    : null;
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

  const total = events.length;
  const filteredEvents = events.filter((e) => {
    if (e.ph === "M") return true;
    if (e.ts == null) return false;

    let inTime = false;
    if (e.dur != null && e.dur > 0) {
      const eventEnd = e.ts + e.dur;
      inTime = eventEnd >= start && e.ts <= end;
    } else {
      inTime = e.ts >= start && e.ts <= end;
    }
    if (!inTime) return false;

    if (catSet && !catSet.has(e.cat)) return false;
    if (nameSet && !nameSet.has(e.name)) return false;

    return true;
  });

  const result = wrapper
    ? { ...wrapper, traceEvents: filteredEvents }
    : { traceEvents: filteredEvents };

  let outputPath;
  if (output) {
    outputPath = path.resolve(output);
  } else {
    outputPath = path.resolve(
      __dirname,
      "output",
      `sliced-${Date.now()}.json`
    );
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(result));

  return {
    inputEvents: total,
    outputEvents: filteredEvents.length,
    start,
    end,
    duration: end - start,
    output: outputPath,
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
  console.log(
    `Done: ${result.outputEvents}/${result.inputEvents} events kept -> ${result.output}`
  );
  console.log(
    `Range: ${result.start} - ${result.end} (duration: ${result.duration} ms)`
  );
}

module.exports = { sliceTraceFile };

if (require.main === module) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
