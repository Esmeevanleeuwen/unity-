import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import {
  Anchor, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleDot,
  FileText, GitBranch, HelpCircle, Info, List, Maximize2, Network,
  Search, ShieldCheck, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import { perceptionModel as model } from './data.js';
import {
  evidenceCounts, isSelectionVisible, nodeKindLabels, relationKindLabels, relationStatus,
  resolveSelection, selectionEvidence, selectionRelations, selectionTitle, uncertaintyLabels, visibleGraph,
  type Evidence, type EvidenceLink, type PerceptionMode, type Relation, type RelationFilter,
  type Selection, type Stance, type Uncertainty,
} from './model.js';
import './perception.css';

interface Props {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onOpenField: (clusterId: string) => void;
  onOpenStream: (streamId: string) => void;
  anchorOpen: boolean;
  onOpenAnchor: () => void;
  onCloseAnchor: () => void;
}
const modes: Array<{ id: PerceptionMode; label: string; icon: typeof Network }> = [
  { id: 'structure', label: 'Structure', icon: Network },
  { id: 'evidence', label: 'Evidence', icon: BookOpen },
  { id: 'alternatives', label: 'Alternatives', icon: GitBranch },
];
const stanceLabels: Record<Stance, string> = { supports: 'Supports', challenges: 'Challenges', context: 'Context only' };
const formatTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
}).format(new Date(value));

function Modal({ open, title, onDismiss, children }: { open: boolean; title: string; onDismiss: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  return (
    <dialog ref={ref} className="p-dialog" aria-label={title}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const stops = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]')].filter((element) => element.getClientRects().length > 0);
        const first = stops[0], last = stops[stops.length - 1];
        if (!first || !last) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}>
      <div className="p-dialog-inner">
        <header><h2>{title}</h2><button className="p-icon" aria-label={`Close ${title}`} onClick={onDismiss} autoFocus><X size={18} /></button></header>
        {open && children}
      </div>
    </dialog>
  );
}

function UncertaintyList({ items }: { items: Uncertainty[] }) {
  return <div className="p-uncertainties">{items.map((item, index) => (
    <div key={`${item.kind}-${index}`}><HelpCircle size={14} aria-hidden="true" /><div><strong>{uncertaintyLabels[item.kind]}</strong><p>{item.detail}</p></div></div>
  ))}</div>;
}

function EvidenceCounts({ links }: { links: EvidenceLink[] }) {
  const counts = evidenceCounts(links);
  return <div className="p-evidence-counts" aria-label="Evidence by role">
    <span><b>{counts.supports}</b> supporting</span><span><b>{counts.challenges}</b> challenging</span><span><b>{counts.context}</b> contextual</span>
  </div>;
}

function Graph({ graph, selection, onSelect }: {
  graph: ReturnType<typeof visibleGraph>; selection: Selection; onSelect: Props['onSelect'];
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; factor: number } | null>(null);
  const selectedRelation = selection.kind === 'relation' ? model.relations.find((relation) => relation.id === selection.id) : undefined;
  const selectedIds = selectedRelation ? [selectedRelation.from, selectedRelation.to] : [selection.id];
  const activate = (event: KeyboardEvent<SVGGElement>, next: Selection) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(next); }
  };
  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('[data-selectable]')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y,
      factor: Math.max(850 / rect.width, 550 / rect.height) / zoom };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="p-graph-frame">
    <div className="p-canvas-caption"><span className="p-kicker">RELATIONAL MODEL</span><span>North region / 48-hour window</span></div>
    <div className="p-graph-tools" role="group" aria-label="Graph controls">
      <button className="p-icon" aria-label="Zoom in" disabled={zoom >= 1.8} onClick={() => setZoom((value) => Math.min(1.8, value + .2))}><ZoomIn size={17} /></button>
      <button className="p-icon" aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom((value) => Math.max(.8, value - .2))}><ZoomOut size={17} /></button>
      <button className="p-icon" aria-label="Fit graph" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 size={16} /></button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
    </div>
    <svg className="p-graph" viewBox={`${425 - 425 / zoom - pan.x} ${275 - 275 / zoom - pan.y} ${850 / zoom} ${550 / zoom}`}
      role="group" aria-label="Perception relationship graph. Tab to a node or relation and press Enter to inspect."
      onPointerDown={onPointerDown} onPointerUp={endDrag} onPointerCancel={endDrag}
      onPointerMove={(event) => {
        if (drag.current) setPan({ x: drag.current.panX + (event.clientX - drag.current.x) * drag.current.factor,
          y: drag.current.panY + (event.clientY - drag.current.y) * drag.current.factor });
      }}>
      <defs><marker id="p-hypothesis-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="none" stroke="currentColor" /></marker></defs>
      <ellipse className="p-model-boundary" cx="425" cy="275" rx="365" ry="220" />
      {graph.relations.map((relation) => {
        const from = model.nodes.find((node) => node.id === relation.from)!;
        const to = model.nodes.find((node) => node.id === relation.to)!;
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const ux = (to.x - from.x) / length, uy = (to.y - from.y) / length;
        const start = { x: from.x + ux * 35, y: from.y + uy * 35 };
        const end = { x: to.x - ux * 41, y: to.y - uy * 41 };
        const path = `M${start.x} ${start.y} L${end.x} ${end.y}`;
        const active = selection.kind === 'relation' ? relation.id === selection.id : from.id === selection.id || to.id === selection.id;
        const status = relationStatus(relation);
        // Fixed layout for this small sample: keep edge labels clear of node captions.
        const label = relation.id === 'river-risk' ? { x: 495, y: 185 }
          : relation.id === 'drain-risk' ? { x: 570, y: 205 }
          : relation.id === 'routes-logistics' ? { x: 710, y: 435 }
          : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 11 };
        return <g key={relation.id} data-selectable="relation" role="button" tabIndex={0}
          aria-label={`Inspect relation: ${from.title} to ${to.title}. ${relationKindLabels[relation.kind]}, ${status}.`}
          aria-pressed={selection.kind === 'relation' && selection.id === relation.id}
          className={`p-edge ${active ? 'is-active' : ''} ${status} ${relation.kind}`}
          onClick={() => onSelect({ kind: 'relation', id: relation.id })}
          onKeyDown={(event) => activate(event, { kind: 'relation', id: relation.id })}>
          <path className="p-edge-hit" d={path} />
          <path className="p-edge-line" d={path} markerEnd={relation.kind === 'causal-hypothesis' ? 'url(#p-hypothesis-arrow)' : undefined} />
          <text x={label.x} y={label.y}>{relation.label}</text>
        </g>;
      })}
      {graph.nodes.map((node) => {
        const selected = selection.kind === 'node' && selection.id === node.id;
        const related = selectedIds.includes(node.id);
        return <g key={node.id} data-selectable="node" transform={`translate(${node.x} ${node.y})`}
          className={`p-node ${node.kind} ${selected ? 'is-selected' : ''} ${related ? 'is-related' : ''}`}
          role="button" tabIndex={0} aria-label={`Inspect ${node.title}. ${nodeKindLabels[node.kind]}.`} aria-pressed={selected}
          onClick={() => onSelect({ kind: 'node', id: node.id })}
          onKeyDown={(event) => activate(event, { kind: 'node', id: node.id })}>
          <circle className="p-node-halo" r="43" />
          {node.kind === 'context' ? <rect className="p-node-body" x="-26" y="-26" width="52" height="52" rx="12" /> : <circle className="p-node-body" r={node.kind === 'interpretation' ? 32 : 25} />}
          {node.kind === 'interpretation' && <circle className="p-node-inner" r="24" />}
          {node.kind === 'hypothesis' ? <text className="p-node-symbol" y="6">?</text> : <circle className="p-node-dot" r="5" />}
          <text className="p-node-title" y="59">{node.title}</text>
          <text className="p-node-kind" y="76">{nodeKindLabels[node.kind]}</text>
        </g>;
      })}
    </svg>
    <div className="p-graph-legend" aria-label="Graph legend">
      <span><i className="observed" /> Observation</span><span><i className="derived" /> Interpretation</span><span><i className="hypothesis" /> Hypothesis</span><span><i className="context" /> Context</span>
    </div>
    <p className="p-canvas-footnote">Dashed arrows are causal hypotheses, not established causes. Drag empty space to pan.</p>
  </div>;
}

export default function PerceptionPage({ selection, onSelect, onOpenField, onOpenStream, anchorOpen, onOpenAnchor, onCloseAnchor }: Props) {
  const [mode, setMode] = useState<PerceptionMode>('structure');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RelationFilter>('all');
  const [asList, setAsList] = useState(false);
  const [focused, setFocused] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | Stance>('all');
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const [raw, setRaw] = useState<Evidence | null>(null);
  const selected = resolveSelection(model, selection);
  const selectedNode = selection.kind === 'node' ? model.nodes.find((node) => node.id === selection.id) : undefined;
  const selectedRelation = selection.kind === 'relation' ? model.relations.find((relation) => relation.id === selection.id) : undefined;
  const links = selectionEvidence(model, selection);
  const related = selectionRelations(model, selection);
  const title = selectionTitle(model, selection);
  const graph = visibleGraph(model, query, filter, focused ? selection : undefined);
  const shown = isSelectionVisible(selection, graph);
  const evidenceIds = [...new Set(links.map((link) => link.evidenceId))];
  const records = evidenceIds.map((id) => model.evidence.find((evidence) => evidence.id === id)!).filter(Boolean);
  const visibleRecords = records.filter((record) =>
    (evidenceFilter === 'all' || links.some((link) => link.evidenceId === record.id && link.stance === evidenceFilter))
    && `${record.title} ${record.source} ${record.original}`.toLowerCase().includes(evidenceQuery.trim().toLowerCase()));
  useEffect(() => { setEvidenceFilter('all'); setEvidenceQuery(''); }, [selection.id, selection.kind]);
  const resetFilters = () => { setQuery(''); setFilter('all'); setFocused(false); };
  const openEvidence = () => { setMode('evidence'); setEvidenceFilter('all'); setEvidenceQuery(''); };
  const openRelation = (id: string) => { onSelect({ kind: 'relation', id }); setMode('structure'); resetFilters(); };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % modes.length : event.key === 'ArrowLeft'
      ? (index + modes.length - 1) % modes.length : event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); setMode(modes[next].id);
    document.getElementById(`p-tab-${modes[next].id}`)?.focus();
  };

  if (!selected) return <main className="p-empty"><HelpCircle size={28} /><h1>No model for this selection</h1><p>The current sample has no record with this identifier.</p><button className="p-button" onClick={() => onSelect({ kind: 'node', id: 'flood-risk' })}>Open sample model</button></main>;

  return <div className="perception-page">
    <main className="p-main">
      <div className="p-breadcrumb"><span>Unity</span><ChevronRight size={12} /><span>Understanding</span><ChevronRight size={12} /><strong>Perception</strong></div>
      <header className="p-page-header"><div><h1>Perception<span className="p-demo">Sample model</span></h1><p>See the relationships. Understand the evidence.</p></div><button className="p-button" onClick={onOpenAnchor}><Anchor size={15} /> Examine in Anchor</button></header>
      <div className="p-model-strip"><span className="p-model-icon"><Network size={17} /></span><div><strong>{model.title}</strong><span>{model.nodes.length} nodes · {model.relations.length} relations · {formatTime(model.snapshotAt)} UTC</span></div><span className="p-snapshot">Not live</span></div>
      <div className="p-mode-row"><div role="tablist" aria-label="Perception views" className="p-tabs">{modes.map(({ id, label, icon: Icon }, index) => <button key={id} id={`p-tab-${id}`} role="tab" aria-selected={mode === id} aria-controls={`p-panel-${id}`} tabIndex={mode === id ? 0 : -1} onKeyDown={(event) => onTabKeyDown(event, index)} onClick={() => setMode(id)}><Icon size={16} />{label}</button>)}</div><span className="p-mode-hint">One model, different perspectives</span></div>
      <section role="tabpanel" id={`p-panel-${mode}`} aria-labelledby={`p-tab-${mode}`} className="p-panel">
        {mode === 'structure' && <>
          <div className="p-toolbar"><label className="p-search"><Search size={15} /><input aria-label="Search this model" placeholder="Find a node, relation or source…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear model search" onClick={() => setQuery('')}><X size={14} /></button>}</label>
            <label className="p-select"><span>Evidence status</span><select value={filter} onChange={(event) => setFilter(event.target.value as RelationFilter)} aria-label="Filter relationships"><option value="all">All relations</option><option value="supported">Supported</option><option value="contested">Contested</option><option value="unresolved">Unresolved</option></select></label>
            <div className="p-view-toggle" role="group" aria-label="Structure presentation"><button aria-pressed={!asList} aria-label="Graph view" onClick={() => setAsList(false)}><Network size={16} /></button><button aria-pressed={asList} aria-label="List view" onClick={() => setAsList(true)}><List size={16} /></button></div>
          </div>
          <div className="p-focus-row"><span><b>{graph.nodes.length}</b> nodes · <b>{graph.relations.length}</b> relations</span><button aria-pressed={focused} onClick={() => setFocused((value) => !value)}>{focused ? 'Show whole model' : 'Focus on selection'}<CircleDot size={14} /></button></div>
          {graph.nodes.length === 0 ? <div className="p-empty"><Search size={28} /><h2>No matching structure</h2><p>No nodes or relations match these filters. The selected record is still available in the Inspector.</p><button className="p-button" onClick={resetFilters}>Clear filters</button></div>
            : asList ? <div className="p-structure-list"><h2>Nodes</h2>{graph.nodes.map((node) => <button className={selection.id === node.id ? 'is-selected' : ''} key={node.id} onClick={() => onSelect({ kind: 'node', id: node.id })}><span className={`p-kind-dot ${node.kind}`} /><strong>{node.title}</strong><span>{nodeKindLabels[node.kind]}</span><ChevronRight size={15} /></button>)}<h2>Relations</h2>{graph.relations.map((relation) => <button className={selection.id === relation.id ? 'is-selected' : ''} key={relation.id} onClick={() => onSelect({ kind: 'relation', id: relation.id })}><GitBranch size={15} /><strong>{selectionTitle(model, { kind: 'relation', id: relation.id })}</strong><span>{relationStatus(relation)}</span><ChevronRight size={15} /></button>)}</div>
              : <Graph graph={graph} selection={selection} onSelect={onSelect} />}
          <div className="p-reading-note"><Info size={16} /><p><strong>A model, not a final answer.</strong> All records here are demonstration data. Evidence support is not proof of cause, and missing data does not mean no effect.</p></div>
        </>}
        {mode === 'evidence' && <div className="p-evidence-view">
          <header className="p-subheading"><div><span className="p-kicker">EVIDENCE FOR</span><h2>{title}</h2><p>Original records stay separate from the way they are interpreted.</p></div><span className="p-count-badge">{records.length} records</span></header>
          <EvidenceCounts links={links} />
          <div className="p-toolbar"><label className="p-search"><Search size={15} /><input aria-label="Search evidence" placeholder="Search records or sources…" value={evidenceQuery} onChange={(event) => setEvidenceQuery(event.target.value)} /></label><label className="p-select"><span>Role</span><select aria-label="Filter evidence" value={evidenceFilter} onChange={(event) => setEvidenceFilter(event.target.value as 'all' | Stance)}><option value="all">All evidence</option><option value="supports">Supporting</option><option value="challenges">Challenging</option><option value="context">Context only</option></select></label></div>
          {visibleRecords.length === 0 && <div className="p-empty"><BookOpen size={28} /><h2>No matching evidence</h2><p>Try another filter. No source has been removed.</p><button className="p-button" onClick={() => { setEvidenceFilter('all'); setEvidenceQuery(''); }}>Clear evidence filters</button></div>}
          {visibleRecords.map((record) => <article className="p-evidence-card" key={record.id}>
            <header><span className="p-source-icon"><FileText size={17} /></span><div><strong>{record.source}</strong><small>{record.sourceKind} · {formatTime(record.receivedAt)} UTC</small></div><span className="p-demo">Sample</span></header>
            <h3>{record.title}</h3>
            <div className="p-evidence-roles">{links.filter((link) => link.evidenceId === record.id).map((link, index) => <div key={`${link.stance}-${index}`}><span className={`p-stance ${link.stance}`}>{stanceLabels[link.stance]}</span><p>{link.reason}</p></div>)}</div>
            <p className="p-record-limit"><Info size={14} />{record.limitation}</p>
            <footer><button className="p-text-button" onClick={() => setRaw(record)}>Show original input<ArrowRight size={14} /></button>{record.streamId && <button className="p-text-button" onClick={() => onOpenStream(record.streamId!)}>Open in Stream<ChevronRight size={14} /></button>}</footer>
          </article>)}
        </div>}
        {mode === 'alternatives' && <div className="p-alternatives-view"><header className="p-subheading"><div><span className="p-kicker">KEEP OTHER EXPLANATIONS VISIBLE</span><h2>What else could explain this?</h2><p>These sample explanations can coexist. None has been selected as the single truth.</p></div></header>
          {model.alternatives.map((alternative, index) => {
            const relations = model.relations.filter((relation) => alternative.relationIds.includes(relation.id));
            return <article className="p-alternative" key={alternative.id}><span className="p-alternative-index">0{index + 1}</span><div><header><h3>{alternative.title}</h3><span className="p-stance context">Not established</span></header><p>{alternative.explanation}</p><EvidenceCounts links={relations.flatMap((relation) => relation.evidence)} /><div className="p-alternative-questions"><section><strong>Open question</strong><p>{alternative.openQuestion}</p></section><section><strong>Evidence needed next</strong><p>{alternative.nextEvidence}</p></section></div><div className="p-alternative-paths">{relations.map((relation) => <button className="p-text-button" key={relation.id} onClick={() => openRelation(relation.id)}><GitBranch size={14} />{relation.label}<ChevronRight size={14} /></button>)}</div></div></article>;
          })}
        </div>}
      </section>
    </main>
    <aside className="p-inspector" aria-label="Perception inspector">
      <header className="p-inspector-header"><h2>Inspector</h2><span>Selected {selection.kind}</span></header>
      <div className="p-inspector-scroll">
        <div className="p-inspector-title"><span className="p-selection-icon">{selection.kind === 'relation' ? <GitBranch size={20} /> : <CircleDot size={20} />}</span><div><span className="p-kicker">{selectedNode ? nodeKindLabels[selectedNode.kind] : relationKindLabels[selectedRelation!.kind]}</span><h3>{title}</h3></div></div>
        {!shown && mode === 'structure' && <div className="p-selection-hidden"><Info size={14} /><span>This selection is outside the current filters.</span><button className="p-text-button" onClick={resetFilters}>Show selection</button></div>}
        <section className="p-inspector-section"><h4>Current understanding</h4><p>{selectedNode?.description ?? selectedRelation?.statement}</p>{selectedRelation && <span className={`p-status ${relationStatus(selectedRelation)}`}>{relationStatus(selectedRelation)} in this sample</span>}</section>
        <section className="p-inspector-section"><div className="p-section-title"><h4>Evidence & origin</h4><button className="p-text-button" onClick={openEvidence}>View all<ChevronRight size={13} /></button></div><EvidenceCounts links={links} /><p className="p-small">Roles describe the selected relationship{selectedNode ? 's around this node' : ''}, not the reliability of a person or source.</p>{records.slice(0, 3).map((record) => <button className="p-origin-row" key={record.id} onClick={() => setRaw(record)}><FileText size={15} /><span><strong>{record.source}</strong><small>{formatTime(record.receivedAt)} UTC · Original input</small></span><ChevronRight size={14} /></button>)}</section>
        <section className="p-inspector-section"><h4>Why uncertainty remains</h4><UncertaintyList items={selected.uncertainty} /></section>
        <section className="p-inspector-section"><h4>Connected relations</h4>{related.map((relation) => <button key={relation.id} className="p-related-row" onClick={() => openRelation(relation.id)}><span><strong>{relation.label}</strong><small>{relationKindLabels[relation.kind]}</small></span><span className={`p-status ${relationStatus(relation)}`}>{relationStatus(relation)}</span></button>)}</section>
        <details className="p-history"><summary><span><GitBranch size={15} /> Interpretation history</span><ChevronRight size={14} /></summary>{[...selected.history].reverse().map((revision, index) => <div key={index}><time>{formatTime(revision.at)} UTC</time><strong>{revision.change}</strong><p>{revision.reason}</p></div>)}</details>
        <button className="p-back-field p-text-button" onClick={() => onOpenField(selectedNode?.domain ?? model.nodes.find((node) => node.id === selectedRelation?.to)?.domain ?? 'infrastructure')}><ArrowLeft size={14} />See context in Field</button>
      </div>
      <footer className="p-inspector-footer"><button className="p-button primary" onClick={onOpenAnchor}><ShieldCheck size={16} />Question this interpretation</button><small>Original evidence is never overwritten.</small></footer>
    </aside>
    <Modal title="Original input" open={raw !== null} onDismiss={() => setRaw(null)}>{raw && <><div className="p-modal-meta"><span className="p-demo">Demonstration record</span><h3>{raw.source}</h3><p>{raw.sourceKind} · Received {formatTime(raw.receivedAt)} UTC</p></div><pre className="p-original">{raw.original}</pre><p className="p-modal-note">{raw.limitation}</p><div className="p-modal-lineage"><strong>Lineage</strong><span>{raw.streamId ? `Stream / ${raw.streamId}` : 'Manual sample fixture'}<ArrowRight size={13} />{raw.id}<ArrowRight size={13} />{title}</span></div>{raw.streamId && <button className="p-button" onClick={() => { const id = raw.streamId!; setRaw(null); onOpenStream(id); }}>Open original in Stream<ArrowRight size={14} /></button>}</>}</Modal>
    <Modal title="Reality Anchor" open={anchorOpen} onDismiss={onCloseAnchor}>
      <div className="p-modal-meta"><span className="p-kicker">EXAMINING THE SELECTED {selection.kind.toUpperCase()}</span><h3>{title}</h3><p>{selectedNode?.description ?? selectedRelation?.statement}</p></div>
      <div className="p-audit-boundary"><strong>Current model boundary</strong><p>{model.boundary}</p></div>
      <UncertaintyList items={selected.uncertainty} />
      <div className="p-audit-tests">{[
        ['U-01', 'Reduction', 'Recorded', `${records.length} original sample records are inspectable. This does not prove that all context was collected.`],
        ['U-02', 'Blindness', 'Review', 'Known missing inputs are listed. Unknown blind spots cannot be certified away by this interface.'],
        ['U-03', 'Boundary', 'Recorded', 'The geographic, temporal and source boundaries are declared above.'],
        ['U-04', 'Feedback', 'Not evaluated', 'No intervention or measured real-world outcome is connected to this sample.'],
        ['U-05', 'State / identity', 'Not evaluated', 'This graph models conditions, not psychological identities. Lifecycle enforcement belongs to the future backend.'],
        ['U-06', 'Reality', 'Review', 'Source evidence and interpretation are separate. No independent external verification has been performed.'],
      ].map(([id, label, status, description]) => <details key={id}><summary><span><b>{id}</b> {label}</span><span className={`p-audit-status ${status === 'Recorded' ? 'recorded' : ''}`}>{status === 'Recorded' && <Check size={12} />}{status}</span></summary><p>{description}</p></details>)}</div>
      <p className="p-modal-note">This is an inspection checklist, not an automated certification of truth. No audit decision is saved in this frontend prototype.</p><button className="p-button primary" onClick={() => { onCloseAnchor(); openEvidence(); }}>Inspect the evidence<ArrowRight size={14} /></button>
    </Modal>
  </div>;
}
