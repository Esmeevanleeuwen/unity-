# Unity

A light-mode operational ecosystem: one system, different views of its relationships.

**This is a frontend prototype with synthetic demonstration data.** No external provider, AI inference service, graph database, authentication service or live ingestion pipeline is connected. Source names and metrics in the interface are illustrative, not verified real-world observations.

## Available views

- **Field:** selectable system clusters, map/list presentation, domain filters and an inspector. Open a selected cluster's sample model in Perception.
- **Stream:** sample records and status filters. The weather example has an authored processing lineage. Other records show their own input rather than borrowing the weather example's metadata. Explicitly linked records can be traced into Perception.
- **Perception:** an interactive, inspectable relational model with **Structure**, **Evidence** and **Alternatives** views. Includes selectable nodes and edges, search, evidence-status filters, focus, zoom/pan/reset, an accessible list presentation, original-input dialogs and interpretation history.
- **State:** temporary influence with an inspectable 14-day prototype decay policy, historical scrubbing/replay, a separately labelled decay preview, chart/table presentation, seven-day comparisons, original signal drawers and exact Perception/Stream links. Unassessed is not zero; expiry preserves history. Uses the same selected object as Perception.
- **Reality Anchor:** Perception and State have selection-specific inspection dialogs with U-01–U-06 prompts, model boundaries and known uncertainties. Checklist statuses are not a certification of truth; no audit decision is saved.

Selection is retained when navigating between views. Perception can open an exact source record in Stream or the associated cluster in Field. State preserves its local time cursor when leaving the view; the other views do not inherit a historical reconstruction they cannot yet provide.

Action, Feedback, Gateways, Sources, Memory and System remain planned views. The shell's global search and several older Field controls are still placeholders. Perception's own search, filters and graph controls are functional; its time rail shows a static sample snapshot. **Historical replay is currently implemented only in State**, not across the entire ecosystem.

## Run locally

Use Node.js 22 and npm.

```bash
npm install
npm run dev
```

```bash
npm test          # compile and run the dependency-light model regression tests
npm run build     # full application type check and Vite production build
npm run preview   # serve the production build
```

The GitHub Actions workflow runs tests followed by the production build. A failed runner startup is not evidence that these commands ran successfully.

## Implementation

React 19, TypeScript, Vite, Lucide icons and CSS/SVG. No extra runtime dependency was added for Perception or State.

The hand-authored graph is deliberately small. Its visual layout is not a causal inference algorithm or a replacement for a future graph backend. State's linear curve is an explicit prototype policy over authored weights, not a probability or physical measurement.

See [Perception implementation notes](docs/PERCEPTION.md) and [State implementation notes](docs/STATE.md) for data contracts, limitations, document references, validation scope and manual checks.
