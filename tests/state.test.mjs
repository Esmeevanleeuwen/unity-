import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY, DECAY_DAYS, timestamp, projectState, stateSeries, findState, visibleStates,
  visibleSources, bounds, clampCursor, validateStateDataset,
} from '../.test-build/state/model.js';
import { stateDataset as dataset } from '../.test-build/state/data.js';
import { perceptionModel } from '../.test-build/perception/data.js';
import { streamItems, selectedStreamDetails } from '../.test-build/mockData.js';
const now = timestamp(dataset.snapshotAt);
const state = dataset.states[0];
const first = timestamp(state.events[0].at);
const clone = () => structuredClone(dataset);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('the authored dataset passes boundary validation', () => assert.deepEqual(validateStateDataset(dataset), []));
test('all state subjects resolve to exact Perception objects', () => {
  for (const state of dataset.states) {
    const records = state.subject.kind === 'node' ? perceptionModel.nodes : perceptionModel.relations;
    assert.ok(records.some((record) => record.id === state.subject.id));
  }
});
test('the State and Perception snapshots are identical', () => assert.equal(dataset.snapshotAt, perceptionModel.snapshotAt));
test('linked source originals remain identical to Perception originals', () => {
  for (const source of perceptionModel.evidence) assert.equal(dataset.sources.find((item) => item.id === source.id)?.original, source.original);
});
test('Stream links point to real records and preserve original weather text', () => {
  for (const source of dataset.sources.filter((item) => item.streamId)) assert.ok(streamItems.some((item) => item.id === source.streamId));
  assert.equal(dataset.sources.find((item) => item.streamId === 'weather-001').original, selectedStreamDetails.raw);
});
test('no assessment is unknown, not zero', () => {
  const result = projectState(state, first - 1);
  assert.equal(result.influence, null); assert.equal(result.lifecycle, 'unassessed'); assert.equal(result.expiresAt, null);
});
test('an assessment begins at the exact recorded instant', () => near(projectState(state, first).influence, .48));
test('influence decreases linearly without new assessments', () => near(projectState(state, first + DAY).influence, .48 * 13 / 14));
test('a new explicit assessment renews the 14-day window', () => {
  const at = timestamp(state.events[1].at); const result = projectState(state, at);
  near(result.influence, .82); assert.equal(result.expiresAt, at + 14 * DAY);
});
test('counter-evidence alone does not renew a state', () => {
  const at = timestamp(state.events[2].at); const result = projectState(state, at);
  assert.equal(result.assessment.id, 'f-2'); assert.equal(result.expiresAt, timestamp(state.events[1].at) + 14 * DAY);
});
test('a downward revision is not overwritten by an older, higher value', () => {
  const at = timestamp(state.events[3].at); near(projectState(state, at).influence, .52);
});
test('later assessments do not leak into historical values', () => {
  const result = projectState(state, timestamp('2026-08-23T10:05:00Z'));
  assert.equal(result.assessment.id, 'f-1'); assert.equal(result.events.length, 1); near(result.influence, .48 * 11 / 14);
});
test('known state at the latest snapshot is the authored .72, not a random metric', () => near(projectState(state, now).influence, .72));
test('the midpoint of the no-new-assessment preview is half the authored value', () => near(projectState(state, now + 7 * DAY).influence, .36));
test('one millisecond before expiry is still active', () => {
  const value = projectState(state, now + 14 * DAY - 1); assert.equal(value.lifecycle, 'active'); assert.ok(value.influence > 0);
});
test('expiry is inclusive and influence is exactly zero', () => {
  const value = projectState(state, now + 14 * DAY); assert.equal(value.lifecycle, 'expired'); assert.equal(value.influence, 0); assert.equal(value.remainingMs, 0);
});
test('influence never becomes negative after expiry', () => assert.equal(projectState(state, now + 99 * DAY).influence, 0));
test('reading a state repeatedly neither renews it nor mutates history', () => {
  const original = JSON.stringify(dataset); const expiry = projectState(state, now).expiresAt;
  for (let i = 0; i < 25; i++) projectState(state, now + i * 1000);
  assert.equal(projectState(state, now).expiresAt, expiry); assert.equal(JSON.stringify(dataset), original);
});
test('observation ingestion cannot silently reactivate expired logistics attention', () => {
  const value = projectState(dataset.states.find((item) => item.id === 'logistics-watch'), now);
  assert.equal(value.lifecycle, 'expired'); assert.equal(value.events.length, 2); assert.equal(value.assessment.id, 'l-1');
});
test('a context-only state remains unknown even far in the future', () => {
  const value = projectState(dataset.states.find((item) => item.id === 'drainage-gap'), now + 100 * DAY);
  assert.equal(value.lifecycle, 'unassessed'); assert.equal(value.influence, null);
});
test('an explicitly assessed zero remains distinct from an unassessed state', () => {
  const item = structuredClone(state); item.events = [{...item.events[0], influence: 0}];
  assert.equal(projectState(item, first).influence, 0); assert.equal(projectState(item, first).lifecycle, 'active');
});
test('filter counts are derived from the selected timestamp', () => {
  assert.equal(visibleStates(dataset, now, '', 'active').length, 3);
  assert.equal(visibleStates(dataset, now, '', 'expired').length, 1);
  assert.equal(visibleStates(dataset, now, '', 'unassessed').length, 1);
  assert.equal(visibleStates(dataset, timestamp(dataset.startsAt), '', 'unassessed').length, 5);
});
test('search combines case-insensitive text and lifecycle filters', () => {
  assert.deepEqual(visibleStates(dataset, now, ' TRANSPORT ', 'expired').map((item) => item.id), ['logistics-watch']);
  assert.equal(visibleStates(dataset, now, 'river', 'expired').length, 0);
});
test('node and relation IDs cannot be confused during selection', () => {
  assert.equal(findState(dataset.states, {kind:'node',id:'risk-routes'}), undefined);
  assert.equal(findState(dataset.states, {kind:'relation',id:'risk-routes'}).id, 'route-review');
});
test('unmapped selection never inherits another object state', () => assert.equal(findState(dataset.states, {kind:'node',id:'rainfall'}), undefined));
test('future source records are hidden during historical reconstruction', () => {
  const sources = visibleSources(dataset, state, timestamp('2026-08-23T12:00:00Z'));
  assert.deepEqual(sources.map((source) => source.id), ['s-aug20']);
});
test('expiry retains original signals and assessment history', () => {
  assert.equal(projectState(state, now + 14 * DAY).events.length, state.events.length);
  assert.deepEqual(visibleSources(dataset, state, now + 14 * DAY), visibleSources(dataset, state, now));
});
test('historical and projection timeline domains never overlap beyond their boundary', () => {
  assert.deepEqual(bounds(dataset, 'history'), [timestamp(dataset.startsAt), now]);
  assert.deepEqual(bounds(dataset, 'preview'), [now, now + DECAY_DAYS * DAY]);
});
test('cursor clamping prevents historical future leakage', () => assert.deepEqual(clampCursor(dataset, {mode:'history',at:now + DAY}), {mode:'history',at:now}));
test('cursor clamping handles old and nonfinite values', () => {
  assert.equal(clampCursor(dataset, {mode:'preview',at:NaN}).at, now);
  assert.equal(clampCursor(dataset, {mode:'history',at:0}).at, timestamp(dataset.startsAt));
});
test('chart points include both sides of an exact assessment boundary', () => {
  const next = timestamp(state.events[1].at); const points = stateSeries(state, first, now);
  assert.ok(points.some((point) => point.at === next - 1));
  near(points.find((point) => point.at === next).influence, .82);
});
test('chart samples preserve unknown gaps and exact expiry', () => {
  const points = stateSeries(state, first - DAY, now + 14 * DAY);
  assert.equal(points[0].influence, null); assert.equal(points.at(-1).influence, 0);
  assert.ok(points.every((point) => point.influence === null || point.influence >= 0 && point.influence <= 1));
});
test('chart intervals and evaluation times reject invalid input', () => {
  assert.throws(() => stateSeries(state, now, now)); assert.throws(() => stateSeries(state, first, now, 0));
  assert.throws(() => stateSeries(state, first, now, 3000)); assert.throws(() => projectState(state, NaN));
});
test('event sorting is deterministic without mutating the input array', () => {
  const copy = structuredClone(state); copy.events.reverse(); const original = JSON.stringify(copy);
  assert.equal(projectState(copy, now).assessment.id, 'f-5'); assert.equal(JSON.stringify(copy), original);
});
test('timestamps require a timezone and accept equivalent UTC offsets', () => {
  assert.throws(() => timestamp('2026-09-08T14:04:16')); assert.throws(() => timestamp('nonsense'));
  assert.equal(timestamp('2026-09-08T16:04:16+02:00'), now);
});
test('duplicate states and duplicate subjects are rejected', () => {
  const copy = clone(); copy.states.push({...copy.states[0], events:[]}); const errors = validateStateDataset(copy);
  assert.ok(errors.includes('Duplicate state id.')); assert.ok(errors.includes('Duplicate state subject.'));
});
test('duplicate event and source IDs are rejected', () => {
  const copy = clone(); copy.states[0].events.push({...copy.states[0].events[0]}); copy.sources.push({...copy.sources[0]});
  const errors = validateStateDataset(copy); assert.ok(errors.some((error) => error.startsWith('Duplicate event'))); assert.ok(errors.includes('Duplicate source id.'));
});
test('an assessment requires a finite value in the closed interval zero to one', () => {
  for (const influence of [NaN, -1, 1.01, Infinity, undefined]) {
    const copy = clone(); copy.states[0].events[0].influence = influence;
    assert.ok(validateStateDataset(copy).some((error) => error.startsWith('Invalid influence')));
  }
});
test('only assessments may set influence and must carry provenance', () => {
  const copy = clone(); copy.states[0].events[0].sourceIds = []; copy.states[0].events[2].influence = .5;
  const errors = validateStateDataset(copy); assert.ok(errors.some((error) => error.startsWith('Assessment without'))); assert.ok(errors.some((error) => error.startsWith('Non-assessment')));
});
test('missing or future evidence cannot justify an earlier assessment', () => {
  const copy = clone(); copy.states[0].events[0].sourceIds = ['e-weather-001', 'missing'];
  const errors = validateStateDataset(copy); assert.ok(errors.some((error) => error.startsWith('Future evidence used'))); assert.ok(errors.some((error) => error.startsWith('Missing source')));
});
test('future events and missing reasons are rejected', () => {
  const copy = clone(); copy.states[0].events[0].at = '2026-09-30T00:00:00Z'; copy.states[0].events[0].reason = ' ';
  const errors = validateStateDataset(copy); assert.ok(errors.some((error) => error.startsWith('Future event'))); assert.ok(errors.some((error) => error.startsWith('Missing reason')));
});
test('two assessments at exactly the same time are ambiguous', () => {
  const copy = clone(); copy.states[0].events[1].at = copy.states[0].events[0].at;
  assert.ok(validateStateDataset(copy).some((error) => error.startsWith('Ambiguous assessment')));
});
