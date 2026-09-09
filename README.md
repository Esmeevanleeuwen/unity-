# Unity

A light-mode operational ecosystem: one system, different views of its relationships.

**This is a frontend prototype with synthetic demonstration data.** No external provider, AI inference service, graph database, authentication service or live ingestion pipeline is connected. Source names and metrics in the interface are illustrative, not verified real-world observations.

## Available views

- **Field:** selectable system clusters, map/list presentation, domain filters and an inspector. Open a selected cluster's sample model in Perception.
- **Stream:** sample records and status filters. The weather example has an authored processing lineage. Other records show their own input rather than borrowing the weather example's metadata. Explicitly linked records can be traced into Perception.
- **Perception:** an interactive, inspectable relational model with **Structure**, **Evidence** and **Alternatives** views. Includes selectable nodes and edges, search, evidence-status filters, focus, zoom/pan/reset, an accessible list presentation, original-input dialogs and interpretation history.
- **Reality Anchor:** Perception has a selection-specific inspection dialog with U-01–U-06 prompts, model boundaries and known uncertainties. Checklist statuses are not a certification of truth; no audit decision is saved.

Selection is retained when navigating between views. Perception can open an exact source record in Stream or the associated cluster in Field.

State, Action, Feedback, Gateways, Sources, Memory and System remain planned views. The shell's global search, historical playback and several older Field controls are still placeholders. Perception's own search, filters and graph controls are functional. Its time rail explicitly shows a static sample snapshot.

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

React 19, TypeScript, Vite, Lucide icons and CSS/SVG. No extra runtime dependency was added for Perception.

The hand-authored graph is deliberately small. Its visual layout is not a causal inference algorithm or a replacement for a future graph backend.

See [Perception implementation notes](docs/PERCEPTION.md) for data contracts, limitations, document references and manual checks.
