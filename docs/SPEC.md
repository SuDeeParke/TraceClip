# SPEC: traceClip Direction A UI Refactor

## 1. Objective

### Product objective
Refactor traceClip's current static frontend into a **single-page product demo** that gives open-source visitors a strong first impression that **"this is a Chrome trace slicing tool"**.

### Target users
- Primary: open-source project visitors
- Secondary: potential evaluators who judge project quality from the first page view

### Success criteria
The refactor is successful when all of the following are true:
- **A. Professional demo feel**: the page feels like a polished product demo rather than a utilitarian internal tool
- **B. Clear information hierarchy**: first-time visitors can understand what the tool does and how to use it without explanation
- **C. No regression in existing functionality**: current slicing, download, and summary flows still work
- **D. Better extensibility**: the new frontend provides a solid React component foundation for future trace-analysis features

### Chosen direction
**Direction A: single-page upgraded demo**
- Keep the experience centered on one page
- Use modern component architecture and styling
- Do not introduce multi-page product shell complexity in this iteration

---

## 2. Commands

### Development commands
- `npm install` — install dependencies
- `npm run dev` — run the development environment for the frontend and backend
- `npm test` — run regression tests
- `npm run slice` — run the CLI slicer

### Expected additions
The UI refactor may introduce frontend-specific commands, but they must remain simple and explicit. Likely additions:
- `npm run client:dev` — run Vite dev server
- `npm run client:build` — build production frontend assets
- `npm run client:preview` — preview built frontend locally
- `npm run dev` may be updated to coordinate frontend + backend locally

If new scripts are added, they must stay clear, minimal, and discoverable in `package.json`.

---

## 3. Project Structure

### Current backend constraint
Keep the current Express API and backend processing contract intact.
- Do not change trace slicing behavior
- Do not change backend processing logic unless strictly required for frontend compatibility
- Do not break current API routes or response semantics

### Required frontend direction
Replace the current static UI layer with:
- **Vite**
- **React**
- **Tailwind CSS**
- **shadcn/ui**
- **lucide-react** (or equivalent icon library)

### Expected frontend structure
Recommended high-level structure:

```text
src/
  app/
  components/
    ui/
    traceclip/
  lib/
  hooks/
  styles/
public/
```

### Recommended component boundaries
The frontend should be composed from small, clear components, likely including:
- `AppShell`
- `HeroSection`
- `SliceFormCard`
- `FileUploadField`
- `TimeWindowFields`
- `FilterFields`
- `SubmissionState`
- `ResultSummaryCard`
- `DownloadActions`
- `SummaryPreviewTable`
- `ErrorAlert`

### API compatibility layer
A small frontend-side compatibility layer is allowed and encouraged.
Purpose:
- map existing Express API responses into frontend view models
- avoid leaking raw response structure directly into presentation components
- preserve backend contract while allowing UI evolution

This layer should live in a focused client module, for example:
- `src/lib/api.ts`
- `src/lib/traceclip-adapter.ts`

---

## 4. Core Features and Acceptance Criteria

### Must-have features
The first UI refactor release must include:
- Upload trace file
- Configure `start`, `end`, and `duration`
- Configure `category` and `name` filters
- Display result statistics
- Download sliced trace
- Download summary
- Show clearer loading / error / success states
- Add a **summary preview table** in the page

### UX acceptance criteria
- The page immediately communicates what the tool does
- The form is easier to scan than the current static layout
- The primary action is visually obvious
- The result area feels like a product output panel, not raw debug text
- Summary preview adds visible product value rather than acting as filler

### Functional acceptance criteria
- Submitting the form still calls the existing Express API contract
- Existing download flows continue to work
- Summary preview is derived from current API-compatible outputs
- No backend slicing logic is changed as part of the UI refactor

---

## 5. Code Style

### General style
- Prefer simple, explicit React components
- Keep component responsibilities narrow
- Prefer composition over clever abstractions
- Avoid over-engineering for hypothetical future features
- Default to no comments unless the rationale is non-obvious

### UI implementation style
- Use shadcn/ui primitives consistently
- Use Tailwind utility classes consistently rather than mixing multiple styling systems
- Keep spacing, typography, and hierarchy deliberate and minimal
- Use icons only where they improve scanability or affordance

### State management
- Keep state local unless there is a clear reason to lift it
- Use a thin API adapter layer instead of coupling components directly to fetch response shape
- Avoid introducing a global state library in this iteration

### Backward compatibility principles
- Preserve existing backend API behavior
- Any compatibility adaptation must happen in the frontend layer, not by changing backend logic

---

## 6. Testing Strategy

### Must preserve existing regression safety
Current backend and slicer tests must keep passing.
- `npm test` remains required

### Add frontend-focused verification
The UI refactor should add tests appropriate to the new layer, such as:
- component rendering for the main page shell
- form submission state transitions
- summary preview rendering from adapted API data
- error state rendering
- success state rendering
- compatibility adapter mapping tests

### Minimum verification before completion
Before the UI refactor is considered done:
- backend regression tests pass
- frontend build passes
- the single-page demo is manually tested in browser
- upload → slice → result → download sliced trace → download summary all work
- summary preview displays correctly from real API output

### Manual QA expectations
Because this is a UI/demo-facing change, manual browser verification is required for:
- golden path
- invalid input states
- loading state visibility
- result and download visibility
- layout quality at common desktop viewport sizes

---

## 7. Boundaries

### Always do
- Keep the current backend processing logic intact
- Keep the current Express API contract intact
- Restrict scope to the UI layer refactor
- Build a single-page demo, not a multi-page application
- Allow a frontend compatibility layer that adapts API data for presentation
- Allow a summary preview table in the UI

### Ask first before doing
- changing API response fields or route behavior
- adding major new product features beyond the current slicing flow
- introducing multi-page routing
- embedding complex visual analytics or charts
- changing download semantics beyond what the current API already supports

### Never do in this spec
- do not refactor backend slicing logic
- do not redesign the server-side processing pipeline
- do not add auth, database, or history features
- do not turn this into a multi-page SaaS shell
- do not introduce unnecessary frontend architecture beyond what Direction A requires

---

## 8. Recommended Implementation Shape

### Page layout
The page should likely contain:
1. **Hero / intro area**
   - product name
   - concise description
   - optional trust-building hint about Chrome-compatible output

2. **Main form card**
   - file upload
   - time window fields
   - filter inputs
   - primary CTA

3. **Result area**
   - stats summary
   - detected trace unit
   - download actions
   - success / error / loading states

4. **Summary preview area**
   - compact preview table of summary events
   - enough detail to make the product feel richer without becoming a full trace explorer

### Positioning guidance
The page should feel like:
- a focused product demo
- a lightweight analysis tool
- a polished open-source landing experience

It should not feel like:
- an internal admin form
- a raw developer test harness
- a full analytics dashboard

---

## 9. Open Questions

These are intentionally left open for implementation planning:
- exact Vite + Express integration strategy during development
- whether built frontend assets are served by Express in production mode
- exact columns for the summary preview table
- whether the result stats remain text-like or become card-based
