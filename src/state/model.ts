/**
 * Temporal state is a revisable interpretation, never an entity's identity.
 * Linear 14-day decay is an explicit prototype policy, not a measured law.
 * Only a new assessment renews influence. Reading, filtering and challenges do not.
 */
export const DAY = 86_400_000;
export const DECAY_DAYS = 14;
export type Lifecycle = 'unassessed' | 'active' | 'expired';
export type StateFilter = 'all' | Lifecycle;
export type StateSubject = { kind: 'node' | 'relation'; id: string };
export type StateSource = {
  id: string;
  title: string;
  source: string;
  receivedAt: string;
  original: string;
  limitation: string;
  streamId?: string;
};
export type StateEvent = {
  id: string;
  at: string;
  kind: 'assessment' | 'observation' | 'challenge';
  title: string;
  reason: string;
  sourceIds: string[];
  influence?: number;
};
export type TemporalState = {
  id: string;
  title: string;
  domain: string;
  subject: StateSubject;
  scope: string;
  limitation: string;
  events: StateEvent[];
};
export type StateDataset = {
  snapshotAt: string;
  startsAt: string;
  isDemo: true;
  states: TemporalState[];
  sources: StateSource[];
};
export type StateSnapshot = {
  lifecycle: Lifecycle;
  influence: number | null;
  assessment?: StateEvent;
  expiresAt: number | null;
  remainingMs: number | null;
  events: StateEvent[];
};
export type StateCursor = { at: number; mode: 'history' | 'preview' };
export type SeriesPoint = { at: number; influence: number | null };

export function timestamp(value: string): number {
  // Reject timezone-free strings; the model must not depend on the viewer's timezone.
  if (!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)) throw new Error('Expected an explicit timezone.');
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw new Error('Invalid timestamp.');
  return result;
}

export function projectState(state: TemporalState, at: number): StateSnapshot {
  if (!Number.isFinite(at)) throw new Error('Invalid evaluation time.');
  const events = state.events.filter((event) => timestamp(event.at) <= at)
    .slice().sort((a, b) => timestamp(a.at) - timestamp(b.at));
  const assessment = events.filter((event) => event.kind === 'assessment').at(-1);
  if (!assessment) return { lifecycle: 'unassessed', influence: null, expiresAt: null, remainingMs: null, events };
  const value = assessment.influence;
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid assessment influence.');
  const expiresAt = timestamp(assessment.at) + DECAY_DAYS * DAY;
  const remainingMs = Math.max(0, expiresAt - at);
  return {
    lifecycle: at >= expiresAt ? 'expired' : 'active',
    influence: value * remainingMs / (DECAY_DAYS * DAY),
    assessment, expiresAt, remainingMs, events,
  };
}

export function findState(states: TemporalState[], subject: StateSubject): TemporalState | undefined {
  return states.find((state) => state.subject.kind === subject.kind && state.subject.id === subject.id);
}

export function visibleStates(dataset: StateDataset, at: number, query: string, filter: StateFilter) {
  const text = query.trim().toLocaleLowerCase('en');
  return dataset.states.filter((state) => {
    const snapshot = projectState(state, at);
    return (filter === 'all' || snapshot.lifecycle === filter)
      && `${state.title} ${state.domain} ${state.scope}`.toLocaleLowerCase('en').includes(text);
  });
}

/** Historical rows and source drawers may only contain information available at the cursor. */
export function visibleSources(dataset: StateDataset, state: TemporalState, at: number): StateSource[] {
  const ids = new Set(projectState(state, at).events.flatMap((event) => event.sourceIds));
  return dataset.sources.filter((source) => ids.has(source.id) && timestamp(source.receivedAt) <= at);
}

export function bounds(dataset: StateDataset, mode: StateCursor['mode']): [number, number] {
  const end = timestamp(dataset.snapshotAt);
  return mode === 'history' ? [timestamp(dataset.startsAt), end] : [end, end + DECAY_DAYS * DAY];
}

export function clampCursor(dataset: StateDataset, cursor: StateCursor): StateCursor {
  const [min, max] = bounds(dataset, cursor.mode);
  return { mode: cursor.mode, at: Math.min(max, Math.max(min, Number.isFinite(cursor.at) ? cursor.at : min)) };
}

/** Include exact assessment boundaries, so a later assessment never ramps up early. */
export function stateSeries(state: TemporalState, start: number, end: number, steps = 112): SeriesPoint[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isInteger(steps) || steps < 1 || steps > 2000) {
    throw new Error('Invalid chart interval.');
  }
  const times = new Set<number>([start, end]);
  for (let index = 1; index < steps; index++) times.add(start + (end - start) * index / steps);
  for (const event of state.events) {
    if (event.kind !== 'assessment') continue;
    for (const time of [timestamp(event.at) - 1, timestamp(event.at), timestamp(event.at) + DECAY_DAYS * DAY]) {
      if (time >= start && time <= end) times.add(time);
    }
  }
  return [...times].sort((a, b) => a - b).map((at) => ({ at, influence: projectState(state, at).influence }));
}

/** Reject broken provenance and ambiguous assessments before rendering a timeline. */
export function validateStateDataset(dataset: StateDataset): string[] {
  const errors: string[] = [];
  const parse = (date: string, label: string) => {
    try { return timestamp(date); } catch { errors.push(`Invalid timestamp: ${label}`); return NaN; }
  };
  const start = parse(dataset.startsAt, 'start');
  const end = parse(dataset.snapshotAt, 'snapshot');
  if (start >= end) errors.push('Empty history interval.');
  const sourceIds = dataset.sources.map((source) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length) errors.push('Duplicate source id.');
  const stateIds = dataset.states.map((state) => state.id);
  if (new Set(stateIds).size !== stateIds.length) errors.push('Duplicate state id.');
  const subjects = dataset.states.map((state) => `${state.subject.kind}:${state.subject.id}`);
  if (new Set(subjects).size !== subjects.length) errors.push('Duplicate state subject.');
  const sources = new Map(dataset.sources.map((source) => [source.id, source]));
  for (const source of dataset.sources) {
    if (parse(source.receivedAt, source.id) > end) errors.push(`Future source: ${source.id}`);
  }
  const eventIds = new Set<string>();
  for (const state of dataset.states) {
    const assessments = new Set<number>();
    for (const event of state.events) {
      if (eventIds.has(event.id)) errors.push(`Duplicate event id: ${event.id}`);
      eventIds.add(event.id);
      const at = parse(event.at, event.id);
      if (at > end) errors.push(`Future event: ${event.id}`);
      if (!event.reason.trim()) errors.push(`Missing reason: ${event.id}`);
      if (event.kind === 'assessment') {
        if (event.influence === undefined || !Number.isFinite(event.influence) || event.influence < 0 || event.influence > 1) errors.push(`Invalid influence: ${event.id}`);
        if (assessments.has(at)) errors.push(`Ambiguous assessment time: ${event.id}`);
        assessments.add(at);
        if (!event.sourceIds.length) errors.push(`Assessment without provenance: ${event.id}`);
      } else if (event.influence !== undefined) errors.push(`Non-assessment changes influence: ${event.id}`);
      for (const id of event.sourceIds) {
        const source = sources.get(id);
        if (!source) errors.push(`Missing source: ${id}`);
        else if (parse(source.receivedAt, id) > at) errors.push(`Future evidence used: ${event.id}`);
      }
    }
  }
  return errors;
}
