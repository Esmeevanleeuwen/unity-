# State — temporal influence, not identity

## Scope

The State view extends the existing Field / Stream / Perception frontend. It uses the same selected Perception node or relation and opens exact source records in Stream. It is still an entirely synthetic, local demonstration: no external data collection, psychological profiling, database, background expiry service or autonomous intervention is connected.

Five authored states cover three different lifecycle conditions at the demo snapshot:

- Regional flood pressure, river-level attention and access-route uncertainty: active assessments.
- Transport dependency watch: expired assessment, with a later raw record that does not silently reactivate it.
- Drainage capacity gap: context exists but no assessment; influence is `null`, not zero.

Unknown Perception selections produce an explicit empty state rather than inheriting another object's state. The list is a current registry; source visibility, assessments, values, counts and history follow the selected time cursor.

## Documentation basis versus implementation choices

The supplied **Unity operational logic (2).pdf**, printed pp. 60–61, separates state from cause, and history from current state and identity. Page 61 specifically distinguishes decay of current influence from deletion of history. Printed pp. 16 and 38 describe a 14-day state expiry protocol. The supplied **Unity operational ecosystem.pdf**, pp. 11–12, names a State Ephemerality & Decay Monitor and an oversight console.

The source documents do **not** provide a validated numerical decay curve. This prototype deliberately uses a simple, inspectable **linear decay over 14 elapsed UTC days**, with authored values. The UI and model comments explicitly mark this as a design choice, not a law of nature, confidence score, psychological assessment or measure of physical risk. The earlier documents also discuss cognitive variables; this first implementation does not implement those variables or infer them about people.

This implementation keeps the documents' 14-day window and history/state distinction while giving them a testable demonstration policy:

```
expiresAt = assessment.at + 14 * 24 hours
influence(at) = assessed value * max(0, expiresAt - at) / (14 * 24 hours)
```

Before the first assessment, influence is unknown. At and after expiry, current influence is zero, but the historical assessment and its sources remain unchanged. An explicitly assessed zero is distinct from an unassessed state.

Only a new **assessment** sets the current value and starts a new window. An observation, challenge, filter change, inspection or page visit does not renew it. A challenge remains visible and may support a separately recorded downward reassessment. The engine does not automatically treat new input as confirmation.

## UI behavior

- Search and lifecycle filters operate on the selected timestamp. A filtered-out selection remains inspectable and is clearly marked.
- The chart reconstructs past influence from authored assessments and the declared decay policy. It is not an observed hazard curve.
- Exact before/after event points avoid incorrectly interpolating a future assessment into an earlier state.
- The Values presentation is a readable alternative to the SVG chart. A seven-day comparison evaluates both times independently.
- Assessment history lets the operator seek to an event's exact timestamp. Original signal drawers retain source text and limitations, with exact Stream links where available.
- The shared footer is functional **for State**. It provides keyboard/pointer scrubbing, bounded historical replay, pause and return to the latest demo snapshot.
- A separate **Decay preview** mode spans the snapshot through 14 days later. It assumes no new assessments and never inserts future events. This is explicitly labelled a projection, not historical playback or a prediction of external outcomes.
- Anchor is a native modal dialog scoped to the selected state/time. It stops replay, keeps outside controls inactive, exposes six inspection prompts and restores focus on close. It does not produce PASS certifications or save decisions.
- Mobile retains the state selector, Inspector, raw evidence and time rail. Reduced-motion and forced-color styles preserve meaning.

## Files

`src/state/model.ts`: dependency-free deterministic evaluation, source visibility, series construction, cursor bounds and validation.

`src/state/data.ts`: authored timeline examples reusing the existing Perception evidence records; old historical examples are separately labelled and timestamped.

`src/state/StatePage.tsx`: view, chart/table, source drawers, Inspector, Anchor and State time rail.

`src/state/state.css`: light-mode and responsive styles, scoped to State.

`src/App.tsx`: enables State, passes the existing shared selection and retains the State cursor between view changes. Other views keep their existing time behavior.

`tests/state.test.mjs`: 42 deterministic regression tests, including exact expiry, unknown-versus-zero, non-renewing challenges, historical leakage, immutable history, source mapping and invalid provenance.

## Validation and limitations

`npm test` runs the model test files via the existing test script. `npm run build` performs the full application type check and Vite build when the dependencies are installed.

For this implementation, **42 State tests passed locally**, and TS/TSX syntax transpilation was checked. **23 browser checks passed in an isolated Chromium component harness**, using the installed React **18.2.0** runtime and a lightweight representative shell. That harness exercised the actual State module but did not run the project's React 19 / Vite production build or the full Perception page. The checks are not a production end-to-end certification. Earlier Perception tests were not rerun in this local harness.

Dependency installation was attempted and failed because the editing environment could not resolve registry.npmjs.org. The full application build remains unverified locally. No package dependency was added or upgraded by this feature.

State is read-only and ephemeral. Refresh resets the cursor to the demo snapshot; no state edit, audit outcome or projection is persisted. Expiry is evaluated on read, not enforced by a database job. Field / Stream historical playback, AI inference, real observations, authentication, storage retention rules and application-wide live time still require separate implementation.

## Manual acceptance checks

1. Open State from the default Field selection: flood pressure is 0.72 at the sample snapshot, with three active, one expired and one unassessed record.
2. Select drainage: the Inspector says Unknown / Not assessed, and the chart does not invent a zero measurement.
3. Select transport: influence is zero and the assessment is expired; the new market record is retained but does not extend expiry.
4. Open original signals: weather text is unchanged and its Stream link opens `weather-001`.
5. Scrub backward: later events and sources disappear. Home reaches the empty historical boundary; End restores the snapshot. Arrow keys move one hour.
6. Select an assessment's time: its exact value appears. Enable the seven-day comparison and switch to Values.
7. Open Decay preview and move to the end: influence reaches zero exactly after fourteen days. Returning to History does not change any source or assessment.
8. Start replay, open Anchor, and wait: time stops. Escape closes it and restores focus. U-01–U-06 remain review prompts, not certificates.
9. Enter from an unmapped Perception object: no unrelated temporal state is assigned. Choose a registered state to continue.
10. At a 320px viewport, verify no horizontal page overflow and that Inspector and timeline remain reachable.

## Browser implementation references

React effect cleanup: https://react.dev/reference/react/useEffect

Native modal dialog behavior: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog

Slider keyboard conventions: https://www.w3.org/WAI/ARIA/apg/patterns/slider/
