# Unity

Unity is being implemented as a light-mode operational ecosystem: one living system with multiple perceptual views over the same underlying state.

## Implemented in this first slice

- **Field** — interactive system map with system clusters, causal relations, uncertainty, current focus, system activity and an inspector.
- **Stream** — live information intake with status filtering, processing lineage from original input to system impact, source provenance, extracted entities and detected relations.
- **Reality Anchor** — an audit overlay that freezes the current interpretation and exposes observed, derived and missing information alongside the U-01–U-06 checks.
- Shared **navigation**, **search**, **timeline**, **light-mode design language** and responsive behavior.

The other Unity views are represented in navigation but intentionally remain placeholders until their interaction model is implemented.

## Design principles currently encoded

- relation before classification;
- observation stays separate from interpretation;
- temporary state stays separate from identity;
- uncertainty and missing information remain visible;
- routes should read as possibilities rather than commands;
- time and feedback are first-class interface dimensions;
- the interface reduces density when friction is high and reveals depth progressively.

## Run locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Current stack

- React 19
- TypeScript
- Vite
- Lucide icons
- CSS/SVG for the system visualization

The graph is intentionally implemented without a graph framework in the first prototype so the visual grammar can be proven before choosing a long-term graph rendering engine.
