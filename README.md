# traceClip

traceClip is a Chrome Performance Trace slicing tool.
It lets you extract a focused time window from a large trace, keep the result Chrome-compatible, and generate a compact summary sidecar for quick hotspot inspection.

## What it does

- Slice a Chrome trace by time window
- Keep output importable in Chrome trace viewers
- Generate a summary sidecar with hotspot rows
- Preview summary rows in the web UI
- Filter by event category and event name
- Work with traces reported in `ms` or `us`

## Project structure

- `slice-trace.js` — core slicer CLI and summary generation
- `server.js` — local Express server and API
- `src/` — React + Vite frontend demo
- `raw/` — local sample traces for testing
- `test/` — regression tests

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Run the app

Start the local server:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:3000
```

## Run tests

```bash
npm test
```

## Build the frontend

```bash
npm run client:build
```

## CLI usage

Run the slicer directly:

```bash
npm run slice -- --input raw/sample-basic.json --output output/frame.json --start 1000 --end 1016.666
```

Or via Node:

```bash
node slice-trace.js --input raw/sample-basic.json --output output/frame.json --start 1000 --end 1016.666
```

### CLI options

- `--input` — input trace JSON
- `--output` — output sliced trace path
- `--start` — slice start time in milliseconds
- `--end` — slice end time in milliseconds
- `--duration` — alternative to `--end`
- `--cat` — comma-separated category filter
- `--name` — comma-separated event name filter

The CLI writes:
- a sliced trace JSON
- a `.summary.json` sidecar next to the output file

## Web UI workflow

The web demo is designed for first-time users:

1. Upload a Chrome trace JSON file
2. Read the detected trace range
3. Enter `Start at (ms)` and `End at (ms)` relative to trace start
4. Optionally choose category and name filters from multi-select lists
5. Slice the trace
6. Download the sliced trace and summary
7. Inspect the summary preview table in the page

## API

### `POST /api/trace-metadata`

Accepts multipart form data with a `file` field and returns:

- detected trace range
- built-in category/name options
- trace-derived category/name options

### `POST /api/slice`

Accepts multipart form data with:

- `file`
- `start`
- `end` or `duration`
- optional `cat`
- optional `name`

Returns:

- input/output event counts
- relative start/end/duration
- detected trace unit
- tokenized download URLs
- summary preview rows

### `GET /api/download/:token`

Downloads a generated artifact through a single-use token.

## Notes

- The server is local-only by default: `127.0.0.1:3000`
- Upload size is limited to 100 MB
- Slice duration is limited to 60,000 ms in the API
- Download URLs are tokenized and short-lived

## Sample files

You can test with the sample traces in `raw/`, for example:

- `raw/sample-basic.json`
- `raw/sample-array.json`
- `raw/sample-webgl.json`

## License

ISC
