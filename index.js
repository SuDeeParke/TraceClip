// slice-trace.js
const fs = require("fs");

const input = "./raw/trace.json";
const output = "./output/frame.json";

// 👇 从 Perfetto 拿到
const START = 123456789000; // ts (μs)
const END = START + 16666; // 或 ts + dur

const trace = JSON.parse(fs.readFileSync(input, "utf-8"));

const filteredEvents = trace.traceEvents.filter((e) => {
  if (!e.ts) return false;

  // 处理 duration event
  if (e.dur) {
    const eventStart = e.ts;
    const eventEnd = e.ts + e.dur;
    return eventEnd >= START && eventStart <= END;
  }

  // instant event
  return e.ts >= START && e.ts <= END;
});

const result = {
  ...trace,
  traceEvents: filteredEvents,
};

fs.writeFileSync(output, JSON.stringify(result));
console.log(`slice done: ${filteredEvents.length} events`);
