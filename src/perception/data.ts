import { streamItems, selectedStreamDetails } from '../mockData.js';
import type { Evidence, PerceptionModel, Revision, Selection, Uncertainty } from './model.js';

/** Hand-authored demonstration only. No provider is connected and no causal inference is running. */
const history = (change: string, reason: string): Revision[] => [
  { at: '2026-09-08T14:04:16Z', change, reason },
];
const missing = (detail: string): Uncertainty => ({ kind: 'missing', detail });
const limit = (detail: string): Uncertainty => ({ kind: 'model-limit', detail });
const sourceEvidence: Evidence[] = streamItems.map((item) => ({
  id: `e-${item.id}`,
  title: item.summary,
  source: item.source,
  sourceKind: item.sourceType,
  receivedAt: `2026-09-08T${item.time}Z`,
  original: item.id === selectedStreamDetails.id ? selectedStreamDetails.raw : item.summary,
  limitation: item.id === 'weather-001'
    ? 'A forecast is not an observation of rainfall. This is an unverified sample record.'
    : 'Synthetic record from the Stream fixture. Its accuracy, coverage and independence are not verified.',
  streamId: item.id,
}));

export const perceptionModel: PerceptionModel = {
  id: 'north-region-flood-demo',
  title: 'Northern region · Flood risk',
  snapshotAt: '2026-09-08T14:04:16Z',
  isDemo: true,
  boundary: 'Northern region, a 48-hour forecast and the listed sample records only. Private drainage systems, asset-level exposure and unmonitored locations are outside this model.',
  evidence: [
    ...sourceEvidence,
    {
      id: 'e-access-check', title: 'A local access check reports the eastern route remains open.',
      source: 'Local access check (sample)', sourceKind: 'Manual sample record',
      receivedAt: '2026-09-08T14:04:00Z',
      original: 'Eastern access route inspected at 14:00. No standing water was recorded at this location.',
      limitation: 'A single synthetic location check. Its place and timing may not match the community report.',
    },
  ],
  nodes: [
    { id: 'rainfall', title: 'Rainfall forecast', kind: 'observation', domain: 'environment', x: 155, y: 115,
      description: 'The source predicts heavy rain over the next 48 hours. The observation here is the received forecast, not rain already measured.',
      evidenceIds: ['e-weather-001'], uncertainty: [{ kind: 'changing', detail: 'The forecast may change before the predicted event.' }],
      history: history('Forecast record received.', 'Preserved separately from its later interpretation.') },
    { id: 'river', title: 'River level', kind: 'observation', domain: 'environment', x: 425, y: 75,
      description: 'The sample sensor record reports an 18% increase across monitored stations. Unmonitored stations are not represented.',
      evidenceIds: ['e-sensor-a'], uncertainty: [missing('Station-level values, baseline and calibration are unavailable.')],
      history: history('Sensor summary linked.', 'The received summary is retained without reconstructing missing measurements.') },
    { id: 'drainage', title: 'Drainage capacity', kind: 'hypothesis', domain: 'infrastructure', x: 690, y: 115,
      description: 'Insufficient drainage may contribute to flooding. No direct capacity measurement exists in this sample.',
      evidenceIds: ['e-policy-32'], uncertainty: [missing('Measured drainage capacity and maintenance records.'), limit('A regulation does not establish physical capacity.')],
      history: history('Capacity hypothesis added.', 'An alternative explanation is kept open rather than asserted as a cause.') },
    { id: 'soil', title: 'Soil saturation', kind: 'hypothesis', domain: 'resources', x: 165, y: 335,
      description: 'A research summary reports an association with flood persistence. Local soil saturation has not been observed.',
      evidenceIds: ['e-research-104'], uncertainty: [missing('Local soil measurements.'), limit('A general association may not transfer to this region.')],
      history: history('Research context attached.', 'Correlation is not treated as a demonstrated causal relationship.') },
    { id: 'flood-risk', title: 'Flood risk', kind: 'interpretation', domain: 'infrastructure', x: 425, y: 255,
      description: 'The sample suggests a possible regional flood risk. This is a revisable interpretation, not a verified event or quantified risk estimate.',
      evidenceIds: ['e-weather-001', 'e-sensor-a'],
      uncertainty: [missing('Local drainage and exposure data.'), { kind: 'conflicting', detail: 'Community and access-check reports differ in coverage.' }, { kind: 'changing', detail: 'Forecast and river conditions may change.' }, limit('No hydrological model has been run.')],
      history: history('Provisional interpretation assembled.', 'Forecast and sensor signals were related without calculating causal certainty.') },
    { id: 'routes', title: 'Access routes', kind: 'observation', domain: 'society', x: 695, y: 335,
      description: 'A community report describes water on some routes; another sample reports one route open. The difference is retained, not averaged away.',
      evidenceIds: ['e-forum-88', 'e-access-check'], uncertainty: [{ kind: 'conflicting', detail: 'Reports may refer to different locations or times.' }],
      history: history('Counter-evidence retained.', 'The local check prevents a blanket conclusion that all access routes are flooded.') },
    { id: 'response', title: 'Institutional response', kind: 'context', domain: 'institutions', x: 245, y: 465,
      description: 'A sample news item announces water-management measures. Announcement does not demonstrate execution or effectiveness.',
      evidenceIds: ['e-news-220'], uncertainty: [missing('Implementation and outcome records.')],
      history: history('Announcement added as context.', 'A proposed response is not stored as an observed result.') },
    { id: 'logistics', title: 'Transport dependency', kind: 'context', domain: 'economy', x: 595, y: 465,
      description: 'Sample market and output records describe exposed corridors. Their relationship to flood impacts remains unresolved.',
      evidenceIds: ['e-market-77', 'e-economic-42'], uncertainty: [limit('Other supply and demand changes could explain the market signal.')],
      history: history('Economic context connected.', 'A price movement alone cannot establish flood attribution.') },
  ],
  relations: [
    { id: 'rain-risk', from: 'rainfall', to: 'flood-risk', kind: 'causal-hypothesis', label: 'May increase risk',
      statement: 'Predicted rainfall may increase flood risk. A forecast and rising river levels support investigating this path, not declaring it proven.',
      evidence: [
        { evidenceId: 'e-weather-001', stance: 'supports', reason: 'The forecast explicitly includes a possible flood risk.' },
        { evidenceId: 'e-sensor-a', stance: 'context', reason: 'Rising river levels provide context, but do not verify future rainfall.' },
      ], uncertainty: [missing('Realized rainfall and local runoff measurements.'), limit('No causal effect has been estimated.')],
      history: history('Causal hypothesis proposed.', 'Keep the forecast-to-risk interpretation separate from source observations.') },
    { id: 'river-risk', from: 'river', to: 'flood-risk', kind: 'association', label: 'Co-occurring signal',
      statement: 'A river-level increase accompanies the risk interpretation. The summary does not identify the cause of that increase.',
      evidence: [{ evidenceId: 'e-sensor-a', stance: 'supports', reason: 'The source reports increasing river levels in the monitored area.' }],
      uncertainty: [missing('Station locations and flood thresholds.')], history: history('Association recorded.', 'No direction of causation is inferred from co-occurrence.') },
    { id: 'drain-risk', from: 'drainage', to: 'flood-risk', kind: 'causal-hypothesis', label: 'Unmeasured contribution',
      statement: 'Drainage capacity could affect local flood risk, but no direct capacity evidence is available in this model.',
      evidence: [{ evidenceId: 'e-policy-32', stance: 'context', reason: 'Drainage requirements are mentioned; actual capacity is not measured.' }],
      uncertainty: [missing('Capacity and maintenance measurements.'), limit('Policy text cannot substitute for a physical measurement.')],
      history: history('Unresolved path preserved.', 'Lack of evidence is shown as a gap, not evidence of no effect.') },
    { id: 'soil-risk', from: 'soil', to: 'flood-risk', kind: 'association', label: 'Research association',
      statement: 'The research summary associates soil saturation with flood persistence. Relevance to this event is not established.',
      evidence: [{ evidenceId: 'e-research-104', stance: 'context', reason: 'The source reports a general correlation, not local measurements.' }],
      uncertainty: [missing('Local soil data and the full study.'), limit('Transfer from research to this case has not been validated.')],
      history: history('Research association added.', 'Preserve the distinction between general context and case-specific evidence.') },
    { id: 'risk-routes', from: 'flood-risk', to: 'routes', kind: 'causal-hypothesis', label: 'Disruption disputed',
      statement: 'Flooding may disrupt some access routes. Available sample reports do not support a blanket claim about all routes.',
      evidence: [
        { evidenceId: 'e-forum-88', stance: 'supports', reason: 'Community reporting describes water entering several low-lying routes.' },
        { evidenceId: 'e-access-check', stance: 'challenges', reason: 'The eastern route was reported open, challenging a region-wide disruption claim.' },
      ], uncertainty: [{ kind: 'conflicting', detail: 'Place and timing are not harmonized across the reports.' }, missing('Route-level location and time matching.')],
      history: [
        { at: '2026-09-08T14:02:56Z', change: 'Disruption hypothesis recorded.', reason: 'Community sample described affected routes.' },
        { at: '2026-09-08T14:04:16Z', change: 'Interpretation marked contested.', reason: 'A local sample challenged the broader disruption claim; the original report was retained.' },
      ] },
    { id: 'response-risk', from: 'response', to: 'flood-risk', kind: 'context', label: 'Announced response',
      statement: 'Water-management measures have been announced in the sample. No outcome can yet be attributed to them.',
      evidence: [{ evidenceId: 'e-news-220', stance: 'context', reason: 'The announcement records intent, not implementation or consequence.' }],
      uncertainty: [missing('Implementation details and measured outcomes.')], history: history('Response linked as context.', 'Intent and observed effect remain separate.') },
    { id: 'routes-logistics', from: 'routes', to: 'logistics', kind: 'causal-hypothesis', label: 'Possible dependency',
      statement: 'Route disruption might influence logistics, but this model cannot attribute the sample price movement to it.',
      evidence: [{ evidenceId: 'e-market-77', stance: 'context', reason: 'A price increase is reported without isolating its causes.' }],
      uncertainty: [missing('Route-to-corridor dependency data.'), limit('Competing market explanations remain open.')],
      history: history('Dependency left unresolved.', 'A coincident market signal is not converted into a causal conclusion.') },
  ],
  alternatives: [
    { id: 'rain-led', title: 'Rainfall-led explanation', relationIds: ['rain-risk', 'river-risk'],
      explanation: 'The incoming forecast and river signal motivate a weather-led explanation. Local effects remain uncertain.',
      openQuestion: 'Will the predicted rain occur, and how will each catchment respond?',
      nextEvidence: 'Measured rainfall, station-level river readings and local thresholds.' },
    { id: 'capacity-led', title: 'Capacity-led explanation', relationIds: ['drain-risk', 'soil-risk'],
      explanation: 'Local drainage or soil conditions may be more important than the regional forecast for some locations.',
      openQuestion: 'Does local capacity explain the difference between affected and unaffected areas?',
      nextEvidence: 'Drainage tests, maintenance history and soil measurements.' },
    { id: 'coverage-led', title: 'Reporting and coverage explanation', relationIds: ['risk-routes'],
      explanation: 'Different places or reporting times may account for the apparent contradiction between route reports.',
      openQuestion: 'Do the reports actually describe the same route and time?',
      nextEvidence: 'Geolocated, time-matched checks from independent observers.' },
  ],
};

export const clusterSelections: Record<string, Selection> = {
  environment: { kind: 'node', id: 'rainfall' },
  infrastructure: { kind: 'node', id: 'flood-risk' },
  society: { kind: 'node', id: 'routes' },
  resources: { kind: 'node', id: 'soil' },
  institutions: { kind: 'node', id: 'response' },
  economy: { kind: 'node', id: 'logistics' },
};

/** Only explicitly mapped records have a trace; an unknown source must not inherit another source's graph. */
export const streamSelections: Record<string, Selection> = {
  'weather-001': { kind: 'node', id: 'rainfall' },
  'sensor-a': { kind: 'node', id: 'river' },
  'research-104': { kind: 'node', id: 'soil' },
  'policy-32': { kind: 'node', id: 'drainage' },
  'news-220': { kind: 'node', id: 'response' },
  'forum-88': { kind: 'node', id: 'routes' },
  'market-77': { kind: 'node', id: 'logistics' },
  'economic-42': { kind: 'node', id: 'logistics' },
};
