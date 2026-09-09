# Perception v0.1

## Purpose and source basis

This implements the agreed Perception UX as a frontend view within Unity, not as a separate external data-collection platform.

The project documentation provides the principles, not this exact fixture or screen layout:

- **Unity operational logic**, pp. 40–50: visible relationships, progressive depth, reusable visual rules and the distinction between routes, uncertainty and established information.
- **Unity operational logic**, pp. 58–65: distinguish observations from interpretations, current states from identities, associations from causal explanations, and agreement from correspondence with external reality. Preserve different kinds of uncertainty.
- **Unity operational ecosystem**, pp. 11–12: the dual-graph canvas and the Reality Anchor within the Operations Command Hub.

The page layout, eight-node flood example, source-to-node mappings and evidence roles are implementation choices. They are not an assertion that the documentation supplies a validated causal model.

## Files

- `src/perception/model.ts`: typed nodes, relations, evidence, alternatives and selection; non-mutating selectors, filters and fixture validation.
- `src/perception/data.ts`: synthetic fixture and explicit entry mappings from Field and Stream.
- `src/perception/PerceptionPage.tsx`: three views, graph/list interaction, inspector, original-input dialog and selection-specific Anchor.
- `src/perception/perception.css`: light-mode styles, responsive layouts, visible focus, reduced-motion and forced-color support.
- `src/App.tsx`: shared selection and navigation. Existing Field/Stream remain the entry points.
- `tests/perception.test.mjs`: model, provenance, routing and filtering regression tests using the Node test runner.

## Contracts

`PerceptionNode.kind` distinguishes an observation, interpretation, hypothesis and contextual object. An observed forecast means the forecast record was received; it does not mean that forecast weather has occurred.

`Relation.kind` distinguishes association, causal hypothesis and context. An arrow on a causal hypothesis does not establish causation. Evidence roles are `supports`, `challenges` and `context`, with a reason attached to each use of a record.

Relation status is derived from the sample links: challenging evidence makes it contested; supporting evidence without a challenge makes it supported; context-only or empty evidence remains unresolved. This is a transparent display rule, not a scientific certainty score. Counts deduplicate a source record within each role, while preserving the possibility that it serves different roles for different relations.

Uncertainty retains four separate kinds: missing information, conflicting evidence, changing conditions and model limitations. There is no single confidence, psychological-alignment or energy score.

An unknown Stream id has no automatic trace. A filtered-out selection remains inspectable and can be restored with **Show selection**. Filters never mutate the original evidence.

## Working interactions

Structure supports node/edge selection, keyboard activation, source-aware text search, relation-status filtering, one-hop focus, graph/list switching, zoom, drag-to-pan and reset. Tabs support arrow, Home and End keys.

Evidence shows record-level provenance, role explanations, limitations, filtering and the exact stored original input. Linked inputs reopen the appropriate Stream record.

Alternatives preserve three sample explanations and link their stated relations back to Structure. They are not ranked as a single final answer.

The native dialogs close with Escape, restore normal page interaction, and explicitly wrap keyboard focus. Anchor uses the current selection. U-01–U-06 are inspection prompts with Recorded, Review or Not evaluated states, never hard-coded claims of verification.

## Not implemented

No actual source fetches, ingestion, automatic causal discovery, database persistence, replay of historical snapshots, live graph updates, consent/authentication backend, saved audit decisions, interventions, state decay or U-01–U-06 certification. History entries are hand-authored fixture revisions. The 14-day decay system belongs to a future backend and is not claimed by this page.

The sample uses a static SVG layout. Large-graph layout, pan boundaries, touch gesture refinements and full assistive-technology testing need subsequent work. The graph's list view preserves a readable alternative.

## Verification

`npm test` compiles the model/fixtures and runs 24 Node regression tests, without introducing another test framework. The normal application build remains `npm run build`.

Development verification in the restricted editing environment: 24 model tests passed; TS/TSX syntax transpilation passed; 15 Chromium interaction checks passed using an isolated offline harness with the installed React 19.1.1 runtime and local icon stand-ins. That harness is not shipped and is **not a substitute for the dependency-resolved production build**. Network access prevented installing the project dependencies in that environment.

## Manual acceptance checks

1. Select Resources in Field, then **Explore in Perception**. Soil saturation is selected. Switch away and back without selecting another object: the selection remains.
2. Select Sensor Network A in Stream, then **View in Perception**. River level is selected. Open its original evidence in Stream: the sensor record, not the weather record, appears.
3. Activate the Flood risk → Access routes relation with Enter. Supporting and challenging evidence both remain visible in its inspector.
4. Filter relationships to Supported. The selected contested relation stays in the inspector with **Show selection**, rather than being silently replaced.
5. Search for an unknown term, clear filters, switch to List, inspect a relation and return to Graph.
6. On Evidence, filter to Challenging and open the original local access check. Escape closes the dialog. Use the Alternatives tab to inspect the unmeasured drainage path.
7. Open Anchor from the top bar or inspector. Its title, evidence and uncertainty follow the current selection. Inspect U-04: no real-world outcome is claimed. Tab stays in the dialog; Escape closes it.
8. At a narrow viewport, scroll from the graph to the inspector. Check that the page has no horizontal overflow and that the bottom navigation does not cover the inspector's final action.
