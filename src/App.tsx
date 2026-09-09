import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Activity, Anchor as AnchorIcon, ArrowRight, Bell, BookOpen, Box, BrainCircuit,
  CalendarDays, ChevronRight, CircleDot, CloudRain, Database, ExternalLink,
  FileText, Gavel, GitBranch, HardDrive, History, Layers, LineChart, Maximize2,
  MoreHorizontal, Newspaper, Pause, Play, Plus, Radio, Search, Settings2,
  ShieldCheck, Sparkles, Target, Users, Waves, X, ZoomIn, ZoomOut, type LucideIcon,
} from 'lucide-react';
import { clusters, fieldRelations, selectedStreamDetails, streamItems, type Cluster, type StreamItem, type StreamStatus } from './mockData';
import PerceptionPage from './perception/PerceptionPage';
import { clusterSelections, streamSelections } from './perception/data';
import type { Selection } from './perception/model';
import StatePage, { StateTimeline, initialStateCursor } from './state/StatePage';
import type { StateCursor } from './state/model';

type ViewId = 'field' | 'stream' | 'perception' | 'state' | 'action' | 'feedback' | 'gateways' | 'sources' | 'memory' | 'system';
type NavItem = { id: ViewId; label: string; description: string; icon: LucideIcon; enabled: boolean };
const primaryNav: NavItem[] = [
  { id: 'field', label: 'Field', description: 'Live system view', icon: Box, enabled: true },
  { id: 'stream', label: 'Stream', description: 'Incoming information', icon: Waves, enabled: true },
  { id: 'perception', label: 'Perception', description: 'Causal understanding', icon: BrainCircuit, enabled: true },
  { id: 'state', label: 'State', description: 'Temporal state & change', icon: Activity, enabled: true },
  { id: 'action', label: 'Action', description: 'Possible interventions', icon: Target, enabled: false },
  { id: 'feedback', label: 'Feedback', description: 'Reality and response', icon: History, enabled: false },
];
const infrastructureNav: NavItem[] = [
  { id: 'gateways', label: 'Gateways', description: 'System boundaries', icon: Box, enabled: false },
  { id: 'sources', label: 'Sources', description: 'External inputs', icon: Database, enabled: false },
  { id: 'memory', label: 'Memory', description: 'Decisions and evolution', icon: FileText, enabled: false },
  { id: 'system', label: 'System', description: 'Configuration and health', icon: Settings2, enabled: false },
];
function UnityMark() {
  return <span className="unity-mark" aria-hidden="true"><span className="unity-mark-ring" /><span className="unity-mark-dot" /></span>;
}
function Topbar({ onAnchor }: { onAnchor: () => void }) {
  return <header className="topbar">
    <div className="brand"><UnityMark /><strong>UNITY</strong><span>A LIVING SYSTEM FOR A REAL WORLD</span></div>
    <label className="global-search"><Search size={16} /><input placeholder="Search conditions, relations, sources..." aria-label="Search Unity" /><kbd>/</kbd></label>
    <div className="topbar-actions"><button className="anchor-button" onClick={onAnchor}><AnchorIcon size={16} />Anchor</button><div className="online-state" title="All views currently use sample records. No external data source is connected."><span />Demo workspace</div><div className="avatar">U</div></div>
  </header>;
}
function Sidebar({ activeView, onSelect }: { activeView: ViewId; onSelect: (view: ViewId) => void }) {
  const renderNav = (item: NavItem) => {
    const Icon = item.icon;
    return <button key={item.id} aria-label={item.label} aria-current={activeView === item.id ? 'page' : undefined} className={`nav-item ${activeView === item.id ? 'active' : ''} ${!item.enabled ? 'muted' : ''}`} onClick={() => onSelect(item.id)}>
      <Icon size={21} strokeWidth={1.65} /><span><strong>{item.label}</strong><small>{item.description}</small></span>{!item.enabled && <span className="soon-dot" title="Planned" />}
    </button>;
  };
  return <aside className="sidebar"><nav aria-label="Unity views">{primaryNav.map(renderNav)}</nav><div className="nav-separator" /><nav aria-label="Infrastructure">{infrastructureNav.map(renderNav)}</nav><div className="sidebar-equation"><span>Many</span><b>+</b><span>Relation</span><b>=</b><span>Unity</span></div></aside>;
}
function Timeline({ perception }: { perception: boolean }) {
  if (perception) return <footer className="timeline-bar timeline-snapshot"><div className="timeline-live"><History size={14} />Snapshot</div><span className="p-small">Sample model · Historical playback is not connected</span><div className="timeline-date"><CalendarDays size={16} />8 Sep 2026 · 14:04 UTC</div><div className="real-time">Not live</div></footer>;
  return <footer className="timeline-bar"><div className="timeline-live"><Play size={14} fill="currentColor" />Demo</div><button>7d</button><button>24h</button><button>1h</button><div className="timeline-track-wrap"><div className="timeline-track">{[8, 21, 36, 47, 58, 75, 88].map((left, index) => <span key={left} className={`timeline-event e-${index % 4}`} style={{ left: `${left}%` }} />)}<span className="timeline-now" style={{ left: '56%' }}><b>SAMPLE</b><i /></span></div><div className="timeline-dates"><span>2 Sep</span><span>4 Sep</span><span>6 Sep</span><span>8 Sep</span><span>10 Sep</span><span>12 Sep</span></div></div><div className="timeline-date"><CalendarDays size={16} />8 Sep 2026&nbsp;&nbsp;14:04</div><div className="real-time">Sample data</div></footer>;
}
function SectionHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return <div className="section-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="section-actions">{actions}</div>}</div>;
}
function FieldPage({ selectedId, onSelect, onPerception }: { selectedId: string; onSelect: (id: string) => void; onPerception: () => void }) {
  const [domainFilter, setDomainFilter] = useState('All');
  const [mapView, setMapView] = useState(true);
  const selected = clusters.find((cluster) => cluster.id === selectedId) ?? clusters[0];
  return <div className="page page-field"><main className="page-main">
    <SectionHeader title="Field" subtitle="Current system state and active structures" actions={<><div className="segmented-control"><button className={mapView ? 'active' : ''} onClick={() => setMapView(true)}>Map</button><button className={!mapView ? 'active' : ''} onClick={() => setMapView(false)}>List</button></div><button className="icon-button" aria-label="More Field options"><MoreHorizontal size={18} /></button></>} />
    <div className="filters-row">{['All', 'Environment', 'Society', 'Economy', 'Infrastructure', 'Institutions', 'Resources'].map((filter) => <button key={filter} onClick={() => setDomainFilter(filter)} className={`filter-button ${domainFilter === filter ? 'active' : ''}`}>{filter}</button>)}</div>
    {mapView ? <div className="field-canvas-card"><FieldLegend /><FieldCanvas selectedId={selectedId} onSelect={onSelect} domainFilter={domainFilter} /><div className="map-tools"><button aria-label="Zoom in Field"><ZoomIn size={17} /></button><button aria-label="Zoom out Field"><ZoomOut size={17} /></button><button aria-label="Fit Field"><Maximize2 size={17} /></button><button aria-label="Field layers"><Layers size={17} /></button></div></div>
      : <div className="cluster-list">{clusters.filter((cluster) => domainFilter === 'All' || cluster.name === domainFilter).map((cluster) => <button key={cluster.id} onClick={() => onSelect(cluster.id)} className={selectedId === cluster.id ? 'selected' : ''}><span className="cluster-list-dot" style={{ background: cluster.accent }} /><span><strong>{cluster.name}</strong><small>{cluster.description}</small></span><span>{cluster.conditions} conditions</span><ChevronRight size={17} /></button>)}</div>}
    <div className="field-summary-grid"><article className="summary-card system-overview"><header><Activity size={17} />System overview</header><div className="metric-row"><Metric value="42" label="active conditions" /><Metric value="7" label="emerging relations" /><Metric value="3" label="unresolved contradictions" tone="danger" /><Metric value="11" label="actions receiving feedback" /></div></article><article className="summary-card activity-card"><header><Sparkles size={17} />System activity</header><div className="activity-value">+12%<small>Past 24 hours</small></div><svg viewBox="0 0 260 70" aria-label="Sample activity trend"><path d="M2 57 C22 53 24 39 45 44 S73 22 92 31 S124 14 140 24 S166 6 181 22 S209 4 224 19 S243 10 258 8" fill="none" stroke="currentColor" strokeWidth="2" /></svg></article><article className="summary-card focus-card"><header><CircleDot size={17} />Current focus</header><div className="focus-body"><span className="focus-alert" /><span><strong>Resource pressure</strong><small>Increasing tension detected between Environment and Resources.</small></span><ChevronRight size={18} /></div></article></div>
  </main><FieldInspector cluster={selected} onPerception={onPerception} /></div>;
}
function FieldLegend() {
  return <div className="map-legend"><LegendDot color="#2d8a64" label="Stable" /><LegendDot color="#e2ad43" label="Changing" /><LegendDot color="#dd625e" label="High tension" /><LegendDot color="#91a6b4" label="Uncertain" /><div className="legend-divider" /><span><i className="legend-node" />Condition</span><span><i className="legend-line" />Relation</span><span><ArrowRight size={15} />Causal flow</span><span><i className="legend-boundary" />Boundary</span></div>;
}
function LegendDot({ color, label }: { color: string; label: string }) { return <span><i className="legend-dot" style={{ background: color }} />{label}</span>; }
function FieldCanvas({ selectedId, onSelect, domainFilter }: { selectedId: string; onSelect: (id: string) => void; domainFilter: string }) {
  const clusterMap = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster])), []);
  const visible = (cluster: Cluster) => domainFilter === 'All' || cluster.name === domainFilter;
  return <svg className="field-map" viewBox="0 0 900 620" role="group" aria-label="Unity system relation map"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#52786b" /></marker></defs><g className="map-grid-lines"><path d="M80 102 C220 28 434 26 816 124" /><path d="M50 465 C282 355 586 603 850 480" /><path d="M153 78 C225 250 637 315 824 225" /></g>
    {fieldRelations.map((relation) => {
      const from = clusterMap.get(relation.from)!; const to = clusterMap.get(relation.to)!;
      const active = selectedId === from.id || selectedId === to.id;
      if ((!visible(from) || !visible(to)) && domainFilter !== 'All') return null;
      return <g key={`${relation.from}-${relation.to}`} className={`map-relation ${active ? 'active' : ''}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeDasharray={relation.uncertain ? '7 7' : undefined} markerEnd="url(#arrow)" style={{ opacity: Math.max(.28, relation.strength) }} />{relation.label && active && <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8}>{relation.label}</text>}</g>;
    })}
    <g className="unknown-node"><circle cx="518" cy="274" r="18" /><text x="518" y="280">?</text></g>
    {clusters.map((cluster, clusterIndex) => {
      const selected = selectedId === cluster.id; const style = { '--accent': cluster.accent } as CSSProperties;
      const satellites = Array.from({ length: 7 }, (_, index) => { const angle = Math.PI * 2 / 7 * index + clusterIndex * .3; const radius = 65 + index % 2 * 11; return { x: cluster.x + Math.cos(angle) * radius, y: cluster.y + Math.sin(angle) * radius }; });
      return <g key={cluster.id} className={`cluster-group ${selected ? 'selected' : ''} ${!visible(cluster) ? 'dimmed' : ''}`} style={style} onClick={() => onSelect(cluster.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(cluster.id); } }} tabIndex={visible(cluster) ? 0 : -1} role="button" aria-label={`Inspect ${cluster.name}`}><circle className="cluster-boundary" cx={cluster.x} cy={cluster.y} r="98" />{satellites.map((node, index) => <g key={index}><line className="satellite-line" x1={cluster.x} y1={cluster.y} x2={node.x} y2={node.y} /><circle className={`satellite-node s-${index % 4}`} cx={node.x} cy={node.y} r={index % 3 === 0 ? 8 : 6} /></g>)}<circle className="cluster-halo" cx={cluster.x} cy={cluster.y} r="38" /><circle className="cluster-core" cx={cluster.x} cy={cluster.y} r={selected ? 28 : 24} /><text className="cluster-name" x={cluster.x} y={cluster.y + 54}>{cluster.name}</text><text className="cluster-meta" x={cluster.x} y={cluster.y + 72}>{cluster.conditions} conditions · {cluster.changing} changing</text></g>;
    })}
  </svg>;
}
function Metric({ value, label, tone }: { value: string; label: string; tone?: string }) { return <div className={`metric ${tone ?? ''}`}><strong>{value}</strong><span>{label}</span></div>; }
function FieldInspector({ cluster, onPerception }: { cluster: Cluster; onPerception: () => void }) {
  const related = fieldRelations.filter((relation) => relation.from === cluster.id || relation.to === cluster.id).map((relation) => ({ cluster: clusters.find((item) => item.id === (relation.from === cluster.id ? relation.to : relation.from))!, strength: relation.strength })).sort((a, b) => b.strength - a.strength);
  return <aside className="inspector"><InspectorHeader /><div className="inspector-entity"><span className="entity-symbol" style={{ '--accent': cluster.accent } as CSSProperties}><CircleDot size={18} /></span><div><strong>{cluster.name}</strong><small>System cluster</small></div><MoreHorizontal size={18} /></div><div className="inspector-tabs"><button className="active">Overview</button><button>Relations</button><button>Evidence</button><button>State</button><button>Actions</button></div>
    <div className="inspector-actions perception-entry"><button onClick={onPerception}><GitBranch size={16} />Explore in Perception</button></div>
    <InspectorSection title="Key information"><InfoRow label="Type" value="System cluster" /><InfoRow label="Conditions" value={String(cluster.conditions)} /><InfoRow label="Changing" value={String(cluster.changing)} /><div className="info-row"><span>Stability</span><div className="stability"><i style={{ width: cluster.stability === 'Stable' ? '75%' : '55%' }} /></div><b>{cluster.stability}</b></div><InfoRow label="Last updated" value="8 Sep 2026, 14:04" /></InspectorSection>
    <InspectorSection title="Recent changes"><ChangeItem tone="green" text="Increased energy demand" time="2h ago" /><ChangeItem tone="amber" text="New transport disruption" time="5h ago" /><ChangeItem tone="blue" text="Policy adjustment detected" time="8h ago" /><button className="section-link">View all changes<ChevronRight size={16} /></button></InspectorSection>
    <InspectorSection title="Related systems">{related.slice(0, 5).map(({ cluster: item, strength }) => <div className="relation-meter" key={item.id}><span className="relation-color" style={{ background: item.accent }} /><span>{item.name}</span><div><i style={{ width: `${strength * 100}%` }} /></div><b>{strength.toFixed(1)}</b></div>)}<button className="section-link" onClick={onPerception}>Explore related model<ChevronRight size={16} /></button></InspectorSection>
  </aside>;
}
function InspectorHeader() { return <div className="inspector-header"><h2>Inspector</h2><span><Bell size={16} /><X size={17} /></span></div>; }
function InspectorSection({ title, children }: { title: string; children: ReactNode }) { return <section className="inspector-section"><h3>{title}</h3>{children}</section>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="info-row"><span>{label}</span><b>{value}</b></div>; }
function ChangeItem({ tone, text, time }: { tone: string; text: string; time: string }) { return <div className="change-item"><i className={tone} /><span>{text}</span><small>{time}</small></div>; }

function StreamPage({ selectedId, onSelect, onPerception }: { selectedId: string; onSelect: (id: string) => void; onPerception: () => void }) {
  const [filter, setFilter] = useState<'all' | StreamStatus>('all'); const [paused, setPaused] = useState(false);
  const selected = streamItems.find((item) => item.id === selectedId) ?? streamItems[0];
  const filtered = streamItems.filter((item) => filter === 'all' || item.status === filter);
  return <div className="page page-stream"><main className="stream-main"><SectionHeader title="Stream" subtitle="Sample incoming information and processing pipeline" actions={<><button className="secondary-button" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume demo' : 'Pause demo'}</button><button className="icon-button" aria-label="More Stream options"><MoreHorizontal size={18} /></button></>} />
    <div className="stream-filter-row"><div className="filters-row compact">{(['all', 'new', 'unresolved', 'processed', 'conflicting', 'failed'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`filter-button ${filter === value ? 'active' : ''}`}>{value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className="stream-dropdowns"><button>Source<ChevronRight size={14} /></button><button>Type<ChevronRight size={14} /></button><button>Domain<ChevronRight size={14} /></button><button>Time<ChevronRight size={14} /></button></div></div>
    <div className="stream-workspace"><section className="live-stream-column"><header><h2>Sample Stream</h2><span><i />{paused ? 'Paused' : 'Demo records'}</span></header><div className="stream-list">{filtered.map((item) => <StreamRow key={item.id} item={item} active={selectedId === item.id} onClick={() => onSelect(item.id)} />)}{filtered.length === 0 && <p className="p-modal-note">No sample records match this filter.</p>}</div></section><PipelinePanel selected={selected} onPerception={onPerception} /></div>
  </main><StreamInspector selected={selected} onPerception={onPerception} /></div>;
}
function streamIcon(item: StreamItem): LucideIcon {
  const bySource: Array<[RegExp, LucideIcon]> = [[/Weather/i, CloudRain], [/Research|Academic/i, BookOpen], [/News/i, Newspaper], [/Sensor/i, Radio], [/Forum|NGO/i, Users], [/Economic|Market/i, LineChart], [/Policy/i, Gavel], [/Satellite/i, HardDrive]];
  return bySource.find(([pattern]) => pattern.test(item.source))?.[1] ?? FileText;
}
function StreamRow({ item, active, onClick }: { item: StreamItem; active: boolean; onClick: () => void }) { const Icon = streamIcon(item); return <button className={`stream-row ${active ? 'active' : ''}`} onClick={onClick}><time>{item.time}</time><span className={`source-icon ${item.status}`}><Icon size={17} /></span><span className="stream-copy"><strong>{item.source}</strong><small>{item.summary}</small></span><StatusPill status={item.status} /></button>; }
function StatusPill({ status }: { status: StreamStatus }) { return <span className={`status-pill ${status}`}><i />{status[0].toUpperCase() + status.slice(1)}</span>; }
function PipelinePanel({ selected, onPerception }: { selected: StreamItem; onPerception: () => void }) {
  const details = selectedStreamDetails; const Icon = streamIcon(selected); const [showRaw, setShowRaw] = useState(false);
  // Never reuse the weather pipeline as the processing history of a different source.
  const hasPipeline = selected.id === details.id;
  return <section className="pipeline-panel"><header className="pipeline-source-header"><span className="big-source-icon"><Icon size={26} /></span><div><h2>{selected.source}</h2><p>{selected.sourceType} · {selected.domain}</p></div><StatusPill status={selected.status} /><time><strong>{selected.time}</strong><small>8 Sep 2026</small></time></header><blockquote>“{hasPipeline ? details.raw : selected.summary}”</blockquote>
    {hasPipeline ? <div className="pipeline-steps">{details.pipeline.map(([title, description, time], index) => <div className="pipeline-step" key={title}><span className="pipeline-number">{index + 1}</span><div><strong>{title}</strong><small>{description}</small><time>{time}</time></div>{index === 0 && <button onClick={() => setShowRaw((value) => !value)}>{showRaw ? 'Hide raw' : 'View raw'}</button>}{index === 2 && <span className="pipeline-result">5 entities<ChevronRight size={14} /></span>}{index === 3 && <span className="pipeline-result">3 relations<ChevronRight size={14} /></span>}{index === 4 && <span className="pipeline-badge warning">Increased risk: flooding</span>}{index === 5 && <span className="pipeline-badge">4 nodes affected</span>}</div>)}</div>
      : <div className="inspector-section"><h3>Original sample record</h3><p className="p-modal-note">The stored source summary is shown above. Detailed extraction and processing history have not been authored for this sample. No weather-source metadata is reused.</p></div>}
    {showRaw && hasPipeline && <pre className="p-original">{details.raw}</pre>}
    <div className="linked-knowledge"><strong>Linked to existing knowledge</strong>{hasPipeline && <div><span>North Region</span><span>Flood risk</span><span>Infrastructure</span><span>Population</span></div>}{streamSelections[selected.id] ? <button onClick={onPerception}><GitBranch size={16} />View in Perception</button> : <p className="p-modal-note">No linked model has been established for this record.</p>}</div>
  </section>;
}
function StreamInspector({ selected, onPerception }: { selected: StreamItem; onPerception: () => void }) {
  const details = selectedStreamDetails; const Icon = streamIcon(selected); const hasDetails = selected.id === details.id;
  return <aside className="inspector stream-inspector"><InspectorHeader /><div className="inspector-tabs stream-tabs"><button className="active">Source</button>{hasDetails && <><button>Entities (5)</button><button>Relations (3)</button><button>Impact</button><button>History</button></>}</div><div className="stream-source-title"><span className="big-source-icon"><Icon size={22} /></span><div><strong>{selected.source}</strong><small>{selected.sourceType}</small></div></div>
    <div className="source-details"><InfoRow label="Type" value={selected.sourceType} /><InfoRow label="Domain" value={selected.domain} />{hasDetails ? <><InfoRow label="Owner" value={details.owner} /><InfoRow label="Update frequency" value={details.updateFrequency} /><InfoRow label="Permission" value={details.permission} /></> : <InfoRow label="Provenance" value="Sample record only" />}<InfoRow label="Connection" value="Not connected (demo)" /></div>
    {hasDetails && <><InspectorSection title="Extracted entities (5)"><div className="entity-list">{details.entities.map(([name, type], index) => <div key={name}><span className={`entity-type e-${index}`}><CircleDot size={13} /></span><strong>{name}</strong><small>{type}</small></div>)}</div></InspectorSection><InspectorSection title="Detected relations (3)">{details.relations.map(([from, to, strength]) => <div className="detected-relation" key={`${from}-${to}`}><span>{from}<ArrowRight size={12} />{to}</span><b>{strength}</b><div><i style={{ width: `${strength * 100}%` }} /></div></div>)}</InspectorSection></>}
    <div className="inspector-actions">{streamSelections[selected.id] ? <button onClick={onPerception}><GitBranch size={16} />Trace in graph</button> : <p className="p-modal-note">No linked Perception model for this sample.</p>}</div>
  </aside>;
}
function PlaceholderPage({ view }: { view: ViewId }) { const nav = [...primaryNav, ...infrastructureNav].find((item) => item.id === view)!; const Icon = nav.icon; return <div className="placeholder-page"><span><Icon size={28} /></span><h1>{nav.label}</h1><p>{nav.description}</p><small>This view is next in the Unity interface build.</small></div>; }
function AnchorOverlay({ onClose }: { onClose: () => void }) {
  return <div className="anchor-overlay" role="dialog" aria-modal="true" aria-label="Reality Anchor" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}><div className="anchor-modal"><header><div><span className="anchor-symbol"><AnchorIcon size={20} /></span><span><strong>Reality Anchor</strong><small>Sample checklist. Open Perception for a selection-specific audit.</small></span></div><button aria-label="Close Reality Anchor" onClick={onClose}><X size={19} /></button></header><div className="anchor-grid"><section><h3>Current interpretation</h3><p>Infrastructure pressure is increasing through combined environmental, resource and demand relations.</p></section><section><h3>Observed (sample)</h3><ul><li>Multiple incoming environmental signals</li><li>Resource availability has changed</li><li>Demand signal strengthened over 24h</li></ul></section><section><h3>Derived (sample)</h3><ul><li>Infrastructure is acting as a convergence point</li><li>Resource pressure may amplify secondary effects</li></ul></section><section><h3>Not observed</h3><ul><li>Several local conditions remain outside current source coverage</li><li>Two relationships contain conflicting evidence</li></ul></section></div><div className="anchor-tests">{['U-01 Reduction', 'U-02 Blindness', 'U-03 Boundary', 'U-04 Feedback', 'U-05 State / Identity', 'U-06 Reality'].map((test) => <button key={test}><span>{test}</span><b className="review">NOT EVALUATED</b><ChevronRight size={15} /></button>)}</div><footer><ShieldCheck size={16} />This sample checklist does not certify external truth or persist audit decisions.</footer></div></div>;
}
export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('field');
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [stateCursor, setStateCursor] = useState<StateCursor>(initialStateCursor);
  const [selectedCluster, setSelectedCluster] = useState('infrastructure');
  const [selectedStream, setSelectedStream] = useState('weather-001');
  const [perceptionSelection, setPerceptionSelection] = useState<Selection>({ kind: 'node', id: 'flood-risk' });
  const navigate = (view: ViewId) => { setAnchorOpen(false); setActiveView(view); };
  const fromField = () => { setPerceptionSelection(clusterSelections[selectedCluster]); navigate('perception'); };
  const fromStream = () => { const selection = streamSelections[selectedStream]; if (selection) { setPerceptionSelection(selection); navigate('perception'); } };
  return <div className={`app-shell ${activeView === 'state' ? 'has-state-view' : ''}`}><Topbar onAnchor={() => setAnchorOpen(true)} /><Sidebar activeView={activeView} onSelect={navigate} /><div className="content-shell">
    {activeView === 'field' && <FieldPage selectedId={selectedCluster} onSelect={(id) => { setSelectedCluster(id); setPerceptionSelection(clusterSelections[id]); }} onPerception={fromField} />}
    {activeView === 'stream' && <StreamPage selectedId={selectedStream} onSelect={(id) => { setSelectedStream(id); const selection = streamSelections[id]; if (selection) setPerceptionSelection(selection); }} onPerception={fromStream} />}
    {activeView === 'perception' && <PerceptionPage selection={perceptionSelection} onSelect={setPerceptionSelection} onOpenField={(id) => { setSelectedCluster(id); navigate('field'); }} onOpenStream={(id) => { setSelectedStream(id); navigate('stream'); }} anchorOpen={anchorOpen} onOpenAnchor={() => setAnchorOpen(true)} onCloseAnchor={() => setAnchorOpen(false)} />}
    {activeView === 'state' && <StatePage selection={perceptionSelection} onSelect={setPerceptionSelection} onOpenPerception={(subject) => { setPerceptionSelection(subject); navigate('perception'); }} onOpenStream={(id) => { setSelectedStream(id); navigate('stream'); }} cursor={stateCursor} onCursorChange={setStateCursor} anchorOpen={anchorOpen} onOpenAnchor={() => setAnchorOpen(true)} onCloseAnchor={() => setAnchorOpen(false)} />}
    {!['field', 'stream', 'perception', 'state'].includes(activeView) && <PlaceholderPage view={activeView} />}
  </div>{activeView === 'state' ? <StateTimeline cursor={stateCursor} onChange={setStateCursor} frozen={anchorOpen} /> : <Timeline perception={activeView === 'perception'} />}{anchorOpen && activeView !== 'perception' && activeView !== 'state' && <AnchorOverlay onClose={() => setAnchorOpen(false)} />}</div>;
}
