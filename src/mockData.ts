export type SignalState = 'stable' | 'changing' | 'tension' | 'uncertain';
export type StreamStatus = 'new' | 'processed' | 'unresolved' | 'conflicting' | 'failed';

export type Cluster = {
  id: string;
  name: string;
  x: number;
  y: number;
  conditions: number;
  changing: number;
  state: SignalState;
  accent: string;
  stability: string;
  description: string;
};

export type FieldRelation = {
  from: string;
  to: string;
  label?: string;
  strength: number;
  uncertain?: boolean;
};

export const clusters: Cluster[] = [
  {
    id: 'environment',
    name: 'Environment',
    x: 280,
    y: 165,
    conditions: 12,
    changing: 4,
    state: 'stable',
    accent: '#69b982',
    stability: 'Stable',
    description: 'Environmental conditions, pressures and ecological dependencies.',
  },
  {
    id: 'economy',
    name: 'Economy',
    x: 690,
    y: 175,
    conditions: 10,
    changing: 3,
    state: 'uncertain',
    accent: '#73a5c6',
    stability: 'Moderate',
    description: 'Economic capacity, exchange, production and resource pressure.',
  },
  {
    id: 'society',
    name: 'Society',
    x: 145,
    y: 365,
    conditions: 14,
    changing: 5,
    state: 'changing',
    accent: '#d2a94d',
    stability: 'Changing',
    description: 'Population-level relations, needs, movement and social conditions.',
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    x: 475,
    y: 410,
    conditions: 16,
    changing: 6,
    state: 'stable',
    accent: '#2f7d62',
    stability: 'Moderate',
    description: 'Physical and digital systems through which capacity is distributed.',
  },
  {
    id: 'institutions',
    name: 'Institutions',
    x: 245,
    y: 520,
    conditions: 9,
    changing: 2,
    state: 'uncertain',
    accent: '#79a7c2',
    stability: 'Stable',
    description: 'Formal organizations, rules, public structures and coordination systems.',
  },
  {
    id: 'resources',
    name: 'Resources',
    x: 735,
    y: 475,
    conditions: 11,
    changing: 4,
    state: 'stable',
    accent: '#73bd84',
    stability: 'Moderate',
    description: 'Material conditions, supply dependencies and available capacity.',
  },
];

export const fieldRelations: FieldRelation[] = [
  { from: 'environment', to: 'infrastructure', label: 'Climate impact', strength: 0.8 },
  { from: 'environment', to: 'resources', label: 'Resource pressure', strength: 0.7 },
  { from: 'economy', to: 'resources', label: 'Supply dependency', strength: 0.7 },
  { from: 'economy', to: 'society', label: 'Market pressure', strength: 0.45, uncertain: true },
  { from: 'society', to: 'infrastructure', label: 'Demand', strength: 0.65 },
  { from: 'institutions', to: 'infrastructure', label: 'Policy response', strength: 0.55 },
  { from: 'institutions', to: 'economy', strength: 0.38, uncertain: true },
  { from: 'infrastructure', to: 'resources', label: 'Distribution', strength: 0.8 },
  { from: 'society', to: 'institutions', strength: 0.5 },
];

export type StreamItem = {
  id: string;
  time: string;
  source: string;
  sourceType: string;
  domain: string;
  summary: string;
  status: StreamStatus;
};

export const streamItems: StreamItem[] = [
  {
    id: 'weather-001',
    time: '14:04:13',
    source: 'Global Weather API',
    sourceType: 'Meteorological service',
    domain: 'Environment',
    summary: 'Extreme rainfall expected in northern regions over the next 48 hours.',
    status: 'new',
  },
  {
    id: 'research-104',
    time: '14:03:58',
    source: 'Research Publication',
    sourceType: 'Academic source',
    domain: 'Environment',
    summary: 'Study shows correlation between soil saturation and flood persistence.',
    status: 'processed',
  },
  {
    id: 'news-220',
    time: '14:03:42',
    source: 'News Feed',
    sourceType: 'Public reporting',
    domain: 'Institutions',
    summary: 'Government announces new emergency water-management measures.',
    status: 'unresolved',
  },
  {
    id: 'sensor-a',
    time: '14:03:21',
    source: 'Sensor Network A',
    sourceType: 'Sensor network',
    domain: 'Environment',
    summary: 'River level increased by 18% across monitored northern stations.',
    status: 'new',
  },
  {
    id: 'forum-88',
    time: '14:02:56',
    source: 'Social Forum',
    sourceType: 'Community signal',
    domain: 'Society',
    summary: 'Community reports water entering several low-lying access routes.',
    status: 'conflicting',
  },
  {
    id: 'economic-42',
    time: '14:02:11',
    source: 'Economic Dataset',
    sourceType: 'Dataset',
    domain: 'Economy',
    summary: 'Industrial output increased 2.4% in exposed logistics regions.',
    status: 'processed',
  },
  {
    id: 'policy-32',
    time: '14:01:39',
    source: 'Policy Update',
    sourceType: 'Institutional source',
    domain: 'Institutions',
    summary: 'New environmental regulation changes regional drainage requirements.',
    status: 'processed',
  },
  {
    id: 'satellite-18',
    time: '14:01:07',
    source: 'Satellite Imagery',
    sourceType: 'Remote sensing',
    domain: 'Environment',
    summary: 'Land-use change detected near two upstream catchment areas.',
    status: 'new',
  },
  {
    id: 'ngo-09',
    time: '14:00:28',
    source: 'NGO Report',
    sourceType: 'Field report',
    domain: 'Society',
    summary: 'Increased movement from low-lying settlements toward higher ground.',
    status: 'unresolved',
  },
  {
    id: 'market-77',
    time: '13:57:19',
    source: 'Market Data',
    sourceType: 'Market feed',
    domain: 'Economy',
    summary: 'Commodity transport prices rose 6.1% across affected corridors.',
    status: 'conflicting',
  },
];

export const selectedStreamDetails = {
  id: 'weather-001',
  raw: 'Extreme rainfall expected in northern regions over the next 48 hours, with potential risk of flooding in low-lying areas.',
  owner: 'World Weather Service',
  updateFrequency: 'Every 15 minutes',
  permission: 'Read (public)',
  reliability: 0.93,
  entities: [
    ['Extreme rainfall', 'Event'],
    ['Northern regions', 'Location'],
    ['48 hours', 'Time period'],
    ['Flooding', 'Potential consequence'],
    ['Low-lying areas', 'Location type'],
  ] as const,
  relations: [
    ['Extreme rainfall', 'Flood risk', 0.8],
    ['Flood risk', 'Infrastructure', 0.6],
    ['Northern regions', 'Population', 0.4],
  ] as const,
  pipeline: [
    ['Original input', 'Raw data from source', '14:04:13'],
    ['Normalization', 'Standardizing format and structure', '14:04:14'],
    ['Entity extraction', 'Identified key entities', '14:04:15'],
    ['Relation detection', 'Potential relationships found', '14:04:15'],
    ['Interpretation', 'Contextual meaning within Unity', '14:04:16'],
    ['System impact', 'Affected structures and states', '14:04:16'],
  ] as const,
};
