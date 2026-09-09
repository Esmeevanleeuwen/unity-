import test from 'node:test';
import assert from 'node:assert/strict';
import { perceptionModel as model, clusterSelections, streamSelections } from '../.test-build/perception/data.js';
import { streamItems, clusters, selectedStreamDetails } from '../.test-build/mockData.js';
import { evidenceCounts, isSelectionVisible, relationStatus, resolveSelection, selectionEvidence,
  selectionRelations, selectionTitle, validateModel, visibleGraph } from '../.test-build/perception/model.js';

const relation = (id) => model.relations.find((item) => item.id === id);
test('fixture explicitly declares that it is a demo', () => assert.equal(model.isDemo, true));
test('all model references and coordinates are valid', () => assert.deepEqual(validateModel(model), []));
test('all field clusters have resolvable perception entry points', () => {
  for (const cluster of clusters) assert.ok(resolveSelection(model, clusterSelections[cluster.id]), cluster.id);
});
test('stream links only resolve to existing records and nodes', () => {
  for (const [id, selection] of Object.entries(streamSelections)) {
    assert.ok(streamItems.some((item) => item.id === id)); assert.ok(resolveSelection(model, selection));
  }
});
test('unmapped streams do not silently inherit the weather model', () => {
  assert.equal(streamSelections['satellite-18'], undefined);
  assert.equal(streamSelections['unknown-source'], undefined);
});
test('original weather input is retained verbatim', () => {
  assert.equal(model.evidence.find((item) => item.id === 'e-weather-001').original, selectedStreamDetails.raw);
});
test('non-weather evidence preserves its own stream summary and source', () => {
  for (const stream of streamItems.filter((item) => item.id !== 'weather-001')) {
    const evidence = model.evidence.find((item) => item.streamId === stream.id);
    assert.equal(evidence.original, stream.summary); assert.equal(evidence.source, stream.source);
  }
});
test('causal hypotheses stay hypotheses even when supported', () => {
  assert.equal(relationStatus(relation('rain-risk')), 'supported');
  assert.equal(relation('rain-risk').kind, 'causal-hypothesis');
});
test('counter-evidence takes precedence over supporting counts', () => {
  assert.equal(relationStatus(relation('risk-routes')), 'contested');
});
test('context-only sources do not make an unmeasured relation supported', () => {
  assert.equal(relationStatus(relation('drain-risk')), 'unresolved');
});
test('evidence totals deduplicate records within a role, not across roles', () => {
  const link = { evidenceId: 'one', stance: 'supports', reason: 'x' };
  assert.deepEqual(evidenceCounts([link, link, { ...link, stance: 'challenges' }]), { supports: 1, challenges: 1, context: 0 });
});
test('whole graph includes every node and relationship', () => {
  const graph = visibleGraph(model, '', 'all');
  assert.equal(graph.nodes.length, model.nodes.length); assert.equal(graph.relations.length, model.relations.length);
});
test('contested filter contains both ends of the contested edge', () => {
  const graph = visibleGraph(model, '', 'contested');
  assert.deepEqual(graph.relations.map((item) => item.id), ['risk-routes']);
  assert.deepEqual(new Set(graph.nodes.map((item) => item.id)), new Set(['flood-risk', 'routes']));
});
test('source search finds dependent relations and keeps graph endpoints', () => {
  const graph = visibleGraph(model, '  local ACCESS check  ', 'all');
  assert.equal(graph.relations[0].id, 'risk-routes'); assert.equal(graph.nodes.length, 2);
});
test('unmatched search produces a true empty state', () => {
  assert.deepEqual(visibleGraph(model, 'no-such-topic-xyz', 'all'), { nodes: [], relations: [] });
});
test('focus only retains relations adjacent to the selected node', () => {
  const graph = visibleGraph(model, '', 'all', { kind: 'node', id: 'rainfall' });
  assert.deepEqual(graph.relations.map((item) => item.id), ['rain-risk']);
});
test('focus on an edge includes its endpoints and adjacent relations', () => {
  const graph = visibleGraph(model, '', 'all', { kind: 'relation', id: 'routes-logistics' });
  assert.ok(graph.nodes.some((item) => item.id === 'logistics'));
  assert.ok(graph.relations.every((item) => ['routes', 'logistics'].includes(item.from) || ['routes', 'logistics'].includes(item.to)));
});
test('filtering does not destroy the selection or hide counter-evidence in its inspector', () => {
  const selection = { kind: 'relation', id: 'risk-routes' };
  assert.equal(isSelectionVisible(selection, visibleGraph(model, '', 'supported')), false);
  assert.ok(resolveSelection(model, selection));
  assert.ok(selectionEvidence(model, selection).some((item) => item.stance === 'challenges'));
});
test('standalone node evidence survives even without an outgoing direct evidence link', () => {
  assert.ok(selectionEvidence(model, { kind: 'node', id: 'logistics' }).some((item) => item.evidenceId === 'e-economic-42'));
});
test('relation title and evidence are scoped to the actual selection', () => {
  assert.equal(selectionTitle(model, { kind: 'relation', id: 'risk-routes' }), 'Flood risk → Access routes');
  assert.equal(selectionRelations(model, { kind: 'relation', id: 'risk-routes' }).length, 1);
  assert.equal(selectionEvidence(model, { kind: 'relation', id: 'risk-routes' }).length, 2);
});
test('all four types of uncertainty remain separate', () => {
  const node = resolveSelection(model, { kind: 'node', id: 'flood-risk' });
  assert.deepEqual(new Set(node.uncertainty.map((item) => item.kind)), new Set(['missing', 'conflicting', 'changing', 'model-limit']));
});
test('model operations do not mutate observations or history', () => {
  const before = JSON.stringify(model);
  visibleGraph(model, 'rain', 'supported'); selectionEvidence(model, { kind: 'node', id: 'flood-risk' });
  assert.equal(JSON.stringify(model), before);
});
test('bad references and duplicate ids are rejected', () => {
  const invalid = structuredClone(model);
  invalid.nodes.push(invalid.nodes[0]); invalid.nodes[1].x = NaN;
  invalid.relations[0].to = 'missing'; invalid.relations[0].evidence[0].evidenceId = 'not-found';
  invalid.alternatives[0].relationIds.push('not-a-relation');
  const errors = validateModel(invalid);
  assert.ok(errors.some((item) => item.startsWith('Duplicate node')));
  assert.ok(errors.some((item) => item.startsWith('Invalid position')));
  assert.ok(errors.some((item) => item.startsWith('Orphaned relation')));
  assert.ok(errors.some((item) => item.startsWith('Missing evidence')));
  assert.ok(errors.some((item) => item.startsWith('Missing relation')));
});
test('unknown selection is unresolved rather than fabricated', () => {
  assert.equal(resolveSelection(model, { kind: 'node', id: 'unknown' }), undefined);
  assert.equal(selectionTitle(model, { kind: 'relation', id: 'unknown' }), 'Unknown relation');
});
