import { perceptionModel } from '../perception/data.js';
import type { StateDataset } from './model.js';

/** All numbers, old records and assessments below are synthetic UI fixtures. */
export const stateDataset: StateDataset = {
  snapshotAt: perceptionModel.snapshotAt,
  startsAt: '2026-08-11T14:04:16Z',
  isDemo: true,
  sources: [
    ...perceptionModel.evidence,
    { id: 's-aug20', title: 'Earlier catchment note', source: 'Catchment log · historical demo', receivedAt: '2026-08-20T10:00:00Z', original: 'DEMO: Upstream water accumulation noted in the example catchment. Local capacity was not measured.', limitation: 'Invented historical record, not a connected sensor.' },
    { id: 's-aug26', title: 'Catchment follow-up', source: 'Catchment log · historical demo', receivedAt: '2026-08-26T10:00:00Z', original: 'DEMO: A second example note describes increased upstream accumulation. The locations are not independently verified.', limitation: 'An authored continuation, not independent verification.' },
    { id: 's-sep02', title: 'Local coverage check', source: 'Coverage log · historical demo', receivedAt: '2026-09-02T10:00:00Z', original: 'DEMO: Coverage is uneven. Two example locations did not show the earlier reported accumulation.', limitation: 'An illustrative challenge, not evidence of regional safety.' },
    { id: 's-aug24', title: 'Earlier corridor note', source: 'Logistics log · historical demo', receivedAt: '2026-08-24T09:00:00Z', original: 'DEMO: An example transport corridor was marked for review. No further assessment was recorded in the following fourteen days.', limitation: 'Synthetic history used to demonstrate expiry, not a transport report.' },
  ],
  states: [
    {
      id: 'flood-pressure', title: 'Regional flood pressure', domain: 'Infrastructure', subject: { kind: 'node', id: 'flood-risk' },
      scope: 'Temporary attention within the northern-region demonstration model.',
      limitation: 'Influence is an authored routing weight, not flood probability, severity or verified causality.',
      events: [
        { id: 'f-1', at: '2026-08-20T10:05:00Z', kind: 'assessment', title: 'Initial attention assigned', influence: 0.48, reason: 'The example catchment note motivates a provisional review. Value is authored for this demo.', sourceIds: ['s-aug20'] },
        { id: 'f-2', at: '2026-08-26T10:05:00Z', kind: 'assessment', title: 'Assessment renewed', influence: 0.82, reason: 'A follow-up note prompts a new, explicitly authored assessment and a new 14-day window.', sourceIds: ['s-aug26'] },
        { id: 'f-3', at: '2026-09-02T10:01:00Z', kind: 'challenge', title: 'Coverage difference recorded', reason: 'The challenge is preserved without automatically changing or renewing the assessment.', sourceIds: ['s-sep02'] },
        { id: 'f-4', at: '2026-09-02T10:05:00Z', kind: 'assessment', title: 'Interpretation revised downward', influence: 0.52, reason: 'An explicit review lowers the demo influence after the coverage challenge; original records remain intact.', sourceIds: ['s-aug26', 's-sep02'] },
        { id: 'f-5', at: '2026-09-08T14:04:16Z', kind: 'assessment', title: 'New signals, provisional reassessment', influence: 0.72, reason: 'The sample forecast and river summary prompt a new review. This does not verify a flood or establish a cause.', sourceIds: ['e-weather-001', 'e-sensor-a'] },
      ],
    },
    {
      id: 'river-attention', title: 'River-level attention', domain: 'Environment', subject: { kind: 'node', id: 'river' },
      scope: 'Only the monitored stations mentioned by the sample sensor summary.',
      limitation: 'The 18% source statement is not the influence score. Baselines and station calibration remain unknown.',
      events: [
        { id: 'r-1', at: '2026-09-08T14:03:21Z', kind: 'observation', title: 'Sensor summary received', reason: 'Store what the source reported separately from its interpretation.', sourceIds: ['e-sensor-a'] },
        { id: 'r-2', at: '2026-09-08T14:04:16Z', kind: 'assessment', title: 'Temporary review priority assigned', influence: 0.56, reason: 'An authored priority for investigating the sample river signal, not a measured hazard score.', sourceIds: ['e-sensor-a'] },
      ],
    },
    {
      id: 'route-review', title: 'Access-route uncertainty', domain: 'Society', subject: { kind: 'relation', id: 'risk-routes' },
      scope: 'The proposed link between flood risk and access-route disruption.',
      limitation: 'The two reports may concern different places. Review attention does not label a source or person as hostile.',
      events: [
        { id: 'a-1', at: '2026-09-08T14:03:00Z', kind: 'assessment', title: 'Disruption interpretation opened', influence: 0.68, reason: 'The community sample motivates checking possible route disruption.', sourceIds: ['e-forum-88'] },
        { id: 'a-2', at: '2026-09-08T14:04:00Z', kind: 'challenge', title: 'Counter-report retained', reason: 'The local check challenges a blanket disruption claim. It does not itself renew the decay clock.', sourceIds: ['e-access-check'] },
        { id: 'a-3', at: '2026-09-08T14:04:16Z', kind: 'assessment', title: 'Broader claim narrowed', influence: 0.42, reason: 'The authored reassessment narrows the interpretation while keeping both reports accessible.', sourceIds: ['e-forum-88', 'e-access-check'] },
      ],
    },
    {
      id: 'logistics-watch', title: 'Transport dependency watch', domain: 'Economy', subject: { kind: 'node', id: 'logistics' },
      scope: 'An earlier watch on the example transport corridor.',
      limitation: 'Expiry ends influence, not the underlying condition. Later raw records require a new review before renewal.',
      events: [
        { id: 'l-1', at: '2026-08-24T09:05:00Z', kind: 'assessment', title: 'Corridor watch created', influence: 0.60, reason: 'Temporary attention assigned to a historical demo note.', sourceIds: ['s-aug24'] },
        { id: 'l-2', at: '2026-09-08T13:57:19Z', kind: 'observation', title: 'New market record, review pending', reason: 'Ingestion alone does not renew an expired assessment or prove attribution.', sourceIds: ['e-market-77'] },
      ],
    },
    {
      id: 'drainage-gap', title: 'Drainage capacity gap', domain: 'Infrastructure', subject: { kind: 'node', id: 'drainage' },
      scope: 'The unmeasured drainage-capacity hypothesis in Perception.',
      limitation: 'A policy mention is not a capacity measurement. Unknown influence must not appear as zero.',
      events: [
        { id: 'd-1', at: '2026-09-08T14:01:39Z', kind: 'observation', title: 'Policy context received', reason: 'Context is retained, but no influence assessment has been authored.', sourceIds: ['e-policy-32'] },
      ],
    },
  ],
};
