/** Observations, interpretations and causal hypotheses intentionally remain separate. */
export type NodeKind = 'observation' | 'interpretation' | 'hypothesis' | 'context';
export type Stance = 'supports' | 'challenges' | 'context';
export type RelationStatus = 'supported' | 'contested' | 'unresolved';
export type RelationFilter = 'all' | RelationStatus;
export type PerceptionMode = 'structure' | 'evidence' | 'alternatives';
export type Selection = { kind: 'node' | 'relation'; id: string };
export type UncertaintyKind = 'missing' | 'conflicting' | 'changing' | 'model-limit';
export type Uncertainty = { kind: UncertaintyKind; detail: string };
export type Revision = { at: string; change: string; reason: string };

export interface Evidence {
  id: string;
  title: string;
  source: string;
  sourceKind: string;
  receivedAt: string;
  original: string;
  limitation: string;
  streamId?: string;
}
export interface PerceptionNode {
  id: string;
  title: string;
  kind: NodeKind;
  domain: string;
  x: number;
  y: number;
  description: string;
  evidenceIds: string[];
  uncertainty: Uncertainty[];
  history: Revision[];
}
export interface EvidenceLink {
  evidenceId: string;
  stance: Stance;
  reason: string;
}
export interface Relation {
  id: string;
  from: string;
  to: string;
  kind: 'association' | 'causal-hypothesis' | 'context';
  label: string;
  statement: string;
  evidence: EvidenceLink[];
  uncertainty: Uncertainty[];
  history: Revision[];
}
export interface Alternative {
  id: string;
  title: string;
  explanation: string;
  relationIds: string[];
  openQuestion: string;
  nextEvidence: string;
}
export interface PerceptionModel {
  id: string;
  title: string;
  snapshotAt: string;
  isDemo: true;
  boundary: string;
  nodes: PerceptionNode[];
  relations: Relation[];
  evidence: Evidence[];
  alternatives: Alternative[];
}

export const uncertaintyLabels: Record<UncertaintyKind, string> = {
  missing: 'Missing information',
  conflicting: 'Conflicting evidence',
  changing: 'Changing conditions',
  'model-limit': 'Model limitation',
};
export const nodeKindLabels: Record<NodeKind, string> = {
  observation: 'Observation', interpretation: 'Interpretation',
  hypothesis: 'Hypothesis', context: 'Context',
};
export const relationKindLabels: Record<Relation['kind'], string> = {
  association: 'Association', 'causal-hypothesis': 'Causal hypothesis', context: 'Context link',
};

/** Support is a description of this model's evidence, never a truth or consensus score. */
export function relationStatus(relation: Relation): RelationStatus {
  if (relation.evidence.some((link) => link.stance === 'challenges')) return 'contested';
  return relation.evidence.some((link) => link.stance === 'supports') ? 'supported' : 'unresolved';
}

export function evidenceCounts(links: EvidenceLink[]): Record<Stance, number> {
  const count = (stance: Stance) => new Set(links.filter((link) => link.stance === stance).map((link) => link.evidenceId)).size;
  return { supports: count('supports'), challenges: count('challenges'), context: count('context') };
}

export function resolveSelection(model: PerceptionModel, selection: Selection) {
  return selection.kind === 'node'
    ? model.nodes.find((node) => node.id === selection.id)
    : model.relations.find((relation) => relation.id === selection.id);
}

export function selectionRelations(model: PerceptionModel, selection: Selection): Relation[] {
  return model.relations.filter((relation) => selection.kind === 'relation'
    ? relation.id === selection.id : relation.from === selection.id || relation.to === selection.id);
}

/** The same source may support one relation and challenge another. Keep both explanations. */
export function selectionEvidence(model: PerceptionModel, selection: Selection): EvidenceLink[] {
  const links = selectionRelations(model, selection).flatMap((relation) => relation.evidence);
  if (selection.kind === 'node') {
    const node = model.nodes.find((item) => item.id === selection.id);
    for (const evidenceId of node?.evidenceIds ?? []) {
      if (!links.some((link) => link.evidenceId === evidenceId)) {
        links.push({ evidenceId, stance: 'context', reason: 'Original record linked to this node.' });
      }
    }
  }
  return links.filter((link, index) => links.findIndex((item) =>
    item.evidenceId === link.evidenceId && item.stance === link.stance && item.reason === link.reason) === index);
}

export function selectionTitle(model: PerceptionModel, selection: Selection): string {
  if (selection.kind === 'node') return model.nodes.find((node) => node.id === selection.id)?.title ?? 'Unknown node';
  const relation = model.relations.find((item) => item.id === selection.id);
  if (!relation) return 'Unknown relation';
  const title = (id: string) => model.nodes.find((node) => node.id === id)?.title ?? id;
  return `${title(relation.from)} → ${title(relation.to)}`;
}

export function visibleGraph(model: PerceptionModel, query: string, filter: RelationFilter, focus?: Selection) {
  const text = query.trim().toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(text);
  const matchingNodes = new Set(model.nodes.filter((node) =>
    matches(`${node.title} ${node.description} ${node.domain} ${nodeKindLabels[node.kind]}`)).map((node) => node.id));
  const focusedRelation = focus?.kind === 'relation' ? model.relations.find((item) => item.id === focus.id) : undefined;
  const focusNodes = focus?.kind === 'node' ? [focus.id] : focusedRelation ? [focusedRelation.from, focusedRelation.to] : [];
  const relations = model.relations.filter((relation) => {
    const sourceText = relation.evidence.map((link) => {
      const evidence = model.evidence.find((item) => item.id === link.evidenceId);
      return `${evidence?.title ?? ''} ${evidence?.source ?? ''}`;
    }).join(' ');
    return (filter === 'all' || relationStatus(relation) === filter)
      && (!text || matchingNodes.has(relation.from) || matchingNodes.has(relation.to)
        || matches(`${relation.label} ${relation.statement} ${sourceText}`))
      && (!focus || focusNodes.includes(relation.from) || focusNodes.includes(relation.to));
  });
  const connectedIds = new Set(relations.flatMap((relation) => [relation.from, relation.to]));
  const nodes = model.nodes.filter((node) => connectedIds.has(node.id)
    || (filter === 'all' && matchingNodes.has(node.id) && (!focus || focusNodes.includes(node.id))));
  return { nodes, relations };
}

export function isSelectionVisible(selection: Selection, graph: ReturnType<typeof visibleGraph>): boolean {
  return selection.kind === 'node' ? graph.nodes.some((node) => node.id === selection.id)
    : graph.relations.some((relation) => relation.id === selection.id);
}

/** Validate input at the boundary, rather than silently drawing orphaned or duplicate records. */
export function validateModel(model: PerceptionModel): string[] {
  const errors: string[] = [];
  for (const [label, records] of [['node', model.nodes], ['relation', model.relations], ['evidence', model.evidence], ['alternative', model.alternatives]] as const) {
    const ids = records.map((record) => record.id);
    if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${label} id.`);
  }
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const evidenceIds = new Set(model.evidence.map((evidence) => evidence.id));
  const relationIds = new Set(model.relations.map((relation) => relation.id));
  for (const node of model.nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) errors.push(`Invalid position: ${node.id}`);
    for (const id of node.evidenceIds) if (!evidenceIds.has(id)) errors.push(`Missing evidence: ${id}`);
  }
  for (const relation of model.relations) {
    if (!nodeIds.has(relation.from) || !nodeIds.has(relation.to)) errors.push(`Orphaned relation: ${relation.id}`);
    for (const link of relation.evidence) if (!evidenceIds.has(link.evidenceId)) errors.push(`Missing evidence: ${link.evidenceId}`);
  }
  for (const alternative of model.alternatives) {
    for (const id of alternative.relationIds) if (!relationIds.has(id)) errors.push(`Missing relation: ${id}`);
  }
  return errors;
}
