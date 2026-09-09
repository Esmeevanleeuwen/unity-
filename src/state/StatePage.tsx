import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { stateDataset } from './data';
import {
  DAY, DECAY_DAYS, bounds, clampCursor, findState, projectState, stateSeries,
  timestamp, validateStateDataset, visibleSources, visibleStates,
  type Lifecycle, type StateCursor, type StateFilter, type StateSnapshot,
  type StateSubject, type TemporalState,
} from './model';
import './state.css';

const snapshotAt = timestamp(stateDataset.snapshotAt);
const inputErrors = validateStateDataset(stateDataset);
const lifecycleLabels: Record<Lifecycle, string> = { active: 'Active', expired: 'Expired', unassessed: 'Unassessed' };
export const initialStateCursor: StateCursor = { at: snapshotAt, mode: 'history' };

function utc(at: number, short = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', day: '2-digit', month: 'short',
    ...(short ? {} : { hour: '2-digit', minute: '2-digit' }),
  }).format(at);
}
function duration(ms: number | null): string {
  if (ms === null) return 'Not started';
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  return hours < 1 ? 'Less than 1h' : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
function score(value: number | null): string { return value === null ? 'Unknown' : value.toFixed(2); }
function Icon({ kind = 'clock' }: { kind?: 'clock' | 'arrow' | 'play' | 'pause' | 'search' | 'shield' | 'close' | 'branch' }) {
  const paths: Record<string, ReactNode> = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><circle cx="12" cy="11" r="2" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10m0-3c8 0 12-2 12-6" /></>,
  };
  return <svg className="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
function Badge({ lifecycle }: { lifecycle: Lifecycle }) { return <span className={`st-badge st-${lifecycle}`}><i />{lifecycleLabels[lifecycle]}</span>; }

interface Props {
  selection: StateSubject;
  onSelect: (subject: StateSubject) => void;
  onOpenPerception: (subject: StateSubject) => void;
  onOpenStream: (id: string) => void;
  cursor: StateCursor;
  onCursorChange: (cursor: StateCursor) => void;
  anchorOpen: boolean;
  onOpenAnchor: () => void;
  onCloseAnchor: () => void;
}

export default function StatePage(props: Props) {
  const { selection, onSelect, cursor, onCursorChange, onOpenPerception, onOpenStream, anchorOpen, onOpenAnchor, onCloseAnchor } = props;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StateFilter>('all');
  const [windowDays, setWindowDays] = useState(28);
  const [tableView, setTableView] = useState(false);
  const [compare, setCompare] = useState(false);
  const [detail, setDetail] = useState<'history' | 'sources'>('history');
  if (inputErrors.length) return <main className="st-error" role="alert"><h1>State data needs review</h1><p>No timeline was drawn because its provenance is invalid.</p><ul>{inputErrors.map((error) => <li key={error}>{error}</li>)}</ul></main>;

  const safeCursor = clampCursor(stateDataset, cursor);
  const state = findState(stateDataset.states, selection);
  const at = safeCursor.at;
  const current = state ? projectState(state, at) : undefined;
  const states = visibleStates(stateDataset, at, query, filter);
  const counts = stateDataset.states.reduce((acc, item) => {
    acc[projectState(item, at).lifecycle]++; return acc;
  }, { active: 0, expired: 0, unassessed: 0 });
  const sources = state ? visibleSources(stateDataset, state, at) : [];
  const earlier = state ? projectState(state, at - 7 * DAY) : undefined;
  const seek = (time: number) => onCursorChange(clampCursor(stateDataset, { mode: 'history', at: time }));


  return <div className="state-page">
    <main className="state-main">
      <header className="st-page-heading">
        <div><div className="st-eyebrow">UNITY / TEMPORAL LAYER</div><h1>State</h1><p>What matters now. Not what something is forever.</p></div>
        <button className="st-button" onClick={onOpenAnchor}><Icon kind="shield" />Inspect with Anchor</button>
      </header>
      <div className={`st-context ${safeCursor.mode === 'preview' ? 'st-projection' : ''}`} role="status">
        <span><i />{safeCursor.mode === 'preview' ? 'Decay preview' : at === snapshotAt ? 'Demo snapshot' : 'Historical view'} <b>{utc(at)} UTC</b></span>
        <small>{safeCursor.mode === 'preview' ? 'Projection only · assumes no new assessments' : 'Synthetic records · no live providers connected'}</small>
      </div>
      <div className="st-workbench">
        <section className="st-state-list" aria-label="Temporary states">
          <header><h2>Temporary states <span>{stateDataset.states.length}</span></h2><p>Registry is current; values follow the time cursor.</p></header>
          <label className="st-search"><Icon kind="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a state…" aria-label="Search temporary states" /></label>
          <div className="st-filter-grid" role="group" aria-label="Filter states">
            {(['all', 'active', 'expired', 'unassessed'] as const).map((value) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All states' : lifecycleLabels[value]}<span>{value === 'all' ? stateDataset.states.length : counts[value]}</span></button>)}
          </div>
          <div className="st-records">
            {states.map((item) => {
              const result = projectState(item, at);
              return <button className={`st-record ${state?.id === item.id ? 'selected' : ''}`} aria-pressed={state?.id === item.id} key={item.id} onClick={() => onSelect(item.subject)}>
                <span className="st-record-top"><span>{item.domain}</span><span className={`st-tiny-dot st-${result.lifecycle}`} /></span>
                <strong>{item.title}</strong>
                <span className="st-record-bottom"><span>{lifecycleLabels[result.lifecycle]}</span><b>{score(result.influence)}</b></span>
                <span className="st-mini-track" aria-hidden="true"><i style={{ width: `${(result.influence ?? 0) * 100}%` }} /></span>
              </button>;
            })}
            {states.length === 0 && <div className="st-empty"><p>No states match these filters at this time.</p><button className="st-text-button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></div>}
          </div>
          <div className="st-list-note"><Icon kind="shield" /><p>Expiry removes present influence.<br /><strong>It does not erase history.</strong></p></div>
        </section>
        <div className="st-detail">
          {state && current ? <>
            {!states.some((item) => item.id === state.id) && <p className="st-notice">The selected state is outside the list filter. Its detail is still open.</p>}
            <section className="st-chart-card">
              <header><div><span className="st-eyebrow">{safeCursor.mode === 'preview' ? 'NO-NEW-ASSESSMENTS SCENARIO' : 'RECONSTRUCTED MODEL INFLUENCE'}</span><h2>{state.title}</h2></div><Badge lifecycle={current.lifecycle} /></header>
              <div className="st-chart-controls">
                <div className="st-segments" role="group" aria-label="Chart range">{[7, 14, 28].map((days) => <button key={days} disabled={safeCursor.mode === 'preview'} onClick={() => setWindowDays(days)} aria-pressed={windowDays === days}>{days}d</button>)}</div>
                <div className="st-segments" role="group" aria-label="Chart representation"><button aria-pressed={!tableView} onClick={() => setTableView(false)}>Chart</button><button aria-pressed={tableView} onClick={() => setTableView(true)}>Values</button></div>
              </div>
              <StateChart state={state} cursor={safeCursor} days={windowDays} table={tableView} compare={compare} />
              <div className="st-chart-foot"><span><i />Model influence <b>0–1</b> · not a risk probability</span><label><input type="checkbox" checked={compare} disabled={safeCursor.mode === 'preview'} onChange={(event) => setCompare(event.target.checked)} />Compare 7d earlier</label></div>
              {compare && safeCursor.mode === 'history' && earlier && <div className="st-comparison"><span>{utc(at - 7 * DAY)} UTC <strong>{score(earlier.influence)}</strong></span><Icon kind="arrow" /><span>{utc(at)} UTC <strong>{score(current.influence)}</strong></span><small>{earlier.influence === null ? 'No assessment existed at the comparison time.' : 'Change reflects the authored assessments and the decay rule.'}</small></div>}
            </section>
            <section className="st-record-detail">
              <div className="st-detail-switch" role="group" aria-label="State detail"><button aria-pressed={detail === 'history'} onClick={() => setDetail('history')}>Assessment history <span>{current.events.length}</span></button><button aria-pressed={detail === 'sources'} onClick={() => setDetail('sources')}>Original signals <span>{sources.length}</span></button></div>
              {detail === 'history' ? <div className="st-history">
                {current.events.slice().reverse().map((event) => <article key={event.id} className={`st-history-event st-event-${event.kind}`}>
                  <i className="st-event-mark" aria-hidden="true" /><div><div className="st-history-meta"><span>{event.kind}</span><button onClick={() => seek(timestamp(event.at))} aria-label={`View time of ${event.title}`}>{utc(timestamp(event.at))} UTC</button></div><h3>{event.title}{event.influence !== undefined && <b>{event.influence.toFixed(2)}</b>}</h3><p>{event.reason}</p><button className="st-text-button" onClick={() => setDetail('sources')}>Inspect original signals <Icon kind="arrow" /></button></div>
                </article>)}
                {current.events.length === 0 && <div className="st-empty"><Icon /><h3>No events at this time</h3><p>No assessment does not mean zero influence. Move the timeline forward to inspect later records.</p></div>}
              </div> : <div className="st-sources">
                {sources.map((source) => <details className="st-source" key={source.id}><summary><span><b>{source.source}</b><small>{utc(timestamp(source.receivedAt))} UTC</small></span><span>Show original</span></summary><h3>{source.title}</h3><blockquote>{source.original}</blockquote><p>{source.limitation}</p>{source.streamId && <button className="st-button" onClick={() => onOpenStream(source.streamId!)}>Open Stream record<Icon kind="arrow" /></button>}</details>)}
                {sources.length === 0 && <div className="st-empty"><p>No original signal is available at the selected time.</p></div>}
              </div>}
            </section>
          </> : <section className="st-no-selection"><Icon kind="branch" /><h2>No temporary state for this selection</h2><p>The selected Perception object has no authored state in this demo. Unity has not assigned it another object's state.</p><button className="st-button" onClick={() => { setQuery(''); setFilter('all'); onSelect(stateDataset.states[0].subject); }}>Explore regional flood pressure<Icon kind="arrow" /></button></section>}
        </div>
      </div>
    </main>
    <aside className="state-inspector" aria-label="State inspector">
      <header><h2>Inspector</h2><Icon /></header>
      {state && current ? <>
        <div className="st-inspector-title"><span className="st-orbit"><Icon /></span><div><strong>{state.title}</strong><small>Temporary model state</small></div></div>
        <div className="st-score-panel"><span>{safeCursor.mode === 'preview' ? 'Projected influence' : 'Influence at cursor'}</span><strong>{score(current.influence)}</strong><Badge lifecycle={current.lifecycle} /><p>{current.lifecycle === 'unassessed' ? 'No assessment exists at this time. Unknown is not zero.' : current.lifecycle === 'expired' ? 'No longer influences the model. This does not mean the real-world condition is resolved.' : 'Authored attention weight, reduced over time by the prototype policy.'}</p></div>
        <section className="st-inspector-section"><h3>Time & provenance</h3><dl><div><dt>Assessment</dt><dd>{current.assessment ? `${utc(timestamp(current.assessment.at))} UTC` : 'Not assessed'}</dd></div><div><dt>Expiry</dt><dd>{current.expiresAt === null ? 'Not started' : `${utc(current.expiresAt)} UTC`}</dd></div><div><dt>Remaining</dt><dd>{duration(current.remainingMs)}</dd></div><div><dt>Known signals</dt><dd>{sources.length}</dd></div></dl></section>
        <section className="st-inspector-section"><h3>Why this state?</h3><p>{current.assessment?.reason ?? 'No state interpretation has been authored for the available context.'}</p><button className="st-text-button" onClick={() => onOpenPerception(state.subject)}>Inspect in Perception<Icon kind="arrow" /></button></section>
        <section className="st-inspector-section"><h3>Scope, not identity</h3><p>{state.scope}</p><p className="st-limit">{state.limitation}</p></section>
        <section className="st-policy"><span className="st-eyebrow">EXPLICIT PROTOTYPE POLICY</span><h3>14-day linear decay</h3><p>Only a new assessment starts a new window. Raw signals, challenges and viewing this page do not renew it.</p><details><summary>How it is calculated</summary><code>influence = assessed value × remaining time / 14 days</code><p>At expiry: zero current influence. Before any assessment: unknown. The full history stays available.</p><p>This curve is a design choice, not a formula provided by the Unity documents or a validated physical model.</p></details><button className="st-text-button" onClick={() => onCursorChange({ mode: safeCursor.mode === 'preview' ? 'history' : 'preview', at: snapshotAt })}>{safeCursor.mode === 'preview' ? 'Return to history' : 'Preview decay without new signals'}<Icon kind="arrow" /></button></section>
      </> : <div className="st-empty"><p>Select a temporary state to inspect its history and scope.</p></div>}
    </aside>
    <StateAnchor open={anchorOpen} onClose={onCloseAnchor} state={state} current={current} cursor={safeCursor} />
  </div>;
}

function StateChart({ state, cursor, days, table, compare }: { state: TemporalState; cursor: StateCursor; days: number; table: boolean; compare: boolean }) {
  const id = useId().replace(/:/g, '');
  const start = cursor.mode === 'preview' ? snapshotAt : Math.max(timestamp(stateDataset.startsAt), cursor.at - days * DAY);
  const end = cursor.mode === 'preview' ? snapshotAt + DECAY_DAYS * DAY : cursor.at;
  const safeEnd = end > start ? end : start + 1;
  const series = useMemo(() => stateSeries(state, start, safeEnd), [state, start, safeEnd]);
  const current = projectState(state, cursor.at);
  const x = (at: number) => 52 + (at - start) / (safeEnd - start) * 568;
  const y = (value: number) => 225 - value * 182;
  let drawing = false;
  const path = series.map((point) => {
    if (point.influence === null) { drawing = false; return ''; }
    const command = drawing ? 'L' : 'M'; drawing = true;
    return `${command}${x(point.at).toFixed(2)},${y(point.influence).toFixed(2)}`;
  }).join(' ').trim();
  const events = state.events.filter((event) => event.kind === 'assessment' && timestamp(event.at) >= start && timestamp(event.at) <= Math.min(end, snapshotAt));
  const before = projectState(state, cursor.at - 7 * DAY);
  if (table) return <div className="st-value-table"><table><caption>Reconstructed model values · UTC · not physical measurements</caption><thead><tr><th scope="col">Time</th><th scope="col">Influence</th><th scope="col">Lifecycle</th></tr></thead><tbody>{[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
    const at = start + (safeEnd - start) * index / 7;
    const value = projectState(state, at);
    return <tr key={index}><td>{utc(at)}</td><td>{score(value.influence)}</td><td>{lifecycleLabels[value.lifecycle]}</td></tr>;
  })}<tr className="st-cursor-row"><td>Cursor · {utc(cursor.at)}</td><td>{score(current.influence)}</td><td>{lifecycleLabels[current.lifecycle]}</td></tr></tbody></table></div>;
  return <div className="st-chart-wrap"><svg className="st-chart" viewBox="0 0 660 285" role="img" aria-labelledby={`${id}-title ${id}-description`}>
    <title id={`${id}-title`}>{state.title} — {cursor.mode === 'preview' ? 'projected decay' : 'reconstructed influence'}</title>
    <desc id={`${id}-description`}>Authored model influence from {utc(start)} to {utc(end)} UTC. Value at the cursor: {score(current.influence)}. Lines show the linear prototype decay rule, not measured hazard. Use Values for a table.</desc>
    <defs><linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5f3ec" /><stop offset="100%" stopColor="#ffffff" /></linearGradient></defs>
    <rect x="52" y="35" width="568" height="190" rx="8" fill={`url(#${id}-wash)`} opacity={cursor.mode === 'preview' ? 0.5 : 0.7} />
    {[0, .25, .5, .75, 1].map((value) => <g key={value}><line x1="52" x2="620" y1={y(value)} y2={y(value)} className="st-gridline" /><text x="38" y={y(value) + 4} textAnchor="end">{value.toFixed(2)}</text></g>)}
    {[0, 1, 2, 3, 4].map((index) => <text key={index} x={52 + 568 * index / 4} y="254" textAnchor={index === 0 ? 'start' : index === 4 ? 'end' : 'middle'}>{utc(start + (safeEnd - start) * index / 4, true)}</text>)}
    {path && <path d={path} className={`st-curve ${cursor.mode === 'preview' ? 'projected' : ''}`} />}
    {events.map((event) => <circle key={event.id} cx={x(timestamp(event.at))} cy={y(event.influence!)} r="4.5" className="st-assessment-point"><title>{event.title}: {event.influence?.toFixed(2)}</title></circle>)}
    {compare && cursor.mode === 'history' && before.influence !== null && cursor.at - 7 * DAY >= start && <g><line x1={x(cursor.at - 7 * DAY)} x2={x(cursor.at - 7 * DAY)} y1="35" y2="225" className="st-compare-line" /><circle cx={x(cursor.at - 7 * DAY)} cy={y(before.influence)} r="6" className="st-compare-point" /></g>}
    <line x1={x(cursor.at)} x2={x(cursor.at)} y1="28" y2="231" className="st-cursor-line" />
    {current.influence !== null && <circle cx={x(cursor.at)} cy={y(current.influence)} r="6" className="st-cursor-point" />}
    <text x={x(cursor.at)} y="17" textAnchor={cursor.at >= safeEnd ? 'end' : 'start'} className="st-cursor-label">{cursor.mode === 'preview' ? 'PROJECTED' : 'CURSOR'} · {score(current.influence)}</text>
    {!path && <text x="335" y="134" textAnchor="middle" className="st-no-data-label">No assessment in this interval</text>}
  </svg><div className="st-chart-caption">{cursor.mode === 'preview' ? 'Dashed curve: a conditional projection. No future observation has been created.' : 'Each dot is an authored assessment. The connecting curve shows decay between assessments.'}</div></div>;
}

/** Shared-shell time rail. History and future preview have separate, bounded time domains. */
export function StateTimeline({ cursor, onChange, frozen }: { cursor: StateCursor; onChange: (cursor: StateCursor) => void; frozen: boolean }) {
  const [playing, setPlaying] = useState(false);
  const safe = clampCursor(stateDataset, cursor);
  const [min, max] = bounds(stateDataset, safe.mode);
  useEffect(() => {
    if (!playing || frozen || safe.mode !== 'history') return;
    const timer = window.setTimeout(() => {
      const next = Math.min(max, safe.at + DAY / 4);
      onChange({ mode: 'history', at: next });
      if (next >= max) setPlaying(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [playing, frozen, safe.at, safe.mode, max, onChange]);
  useEffect(() => { if (frozen) setPlaying(false); }, [frozen]);
  const seek = (at: number) => { setPlaying(false); onChange(clampCursor(stateDataset, { ...safe, at })); };
  return <footer className="timeline-bar state-timeline">
    <button className={`st-play ${playing ? 'selected' : ''}`} aria-label={playing ? 'Pause history replay' : 'Replay history'} disabled={safe.mode !== 'history' || frozen} onClick={() => {
      if (!playing && safe.at >= max) onChange({ mode: 'history', at: min });
      setPlaying((value) => !value);
    }}><Icon kind={playing ? 'pause' : 'play'} />{playing ? 'Pause' : 'Replay'}</button>
    <div className="st-segments st-time-modes" role="group" aria-label="Timeline mode">{(['history', 'preview'] as const).map((mode) => <button key={mode} aria-pressed={safe.mode === mode} disabled={frozen} onClick={() => { setPlaying(false); onChange({ mode, at: snapshotAt }); }}>{mode === 'history' ? 'History' : 'Decay preview'}</button>)}</div>
    <label className="st-time-slider"><span>{safe.mode === 'preview' ? 'Projection · no new assessments' : 'Synthetic history · UTC'}<b>{utc(safe.at)} UTC</b></span><input type="range" min={min} max={max} step="any" value={safe.at} disabled={frozen} onChange={(event) => seek(Number(event.target.value))} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault(); seek(safe.at + (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1) * 3_600_000);
      }
    }} aria-label="State time cursor" aria-valuetext={`${utc(safe.at)} UTC, ${safe.mode === 'preview' ? 'projection' : 'historical demo'}`} /><span className="st-range-labels">{utc(min, true)}<span>{utc(max, true)}</span></span></label>
    <button className="st-button st-latest" disabled={frozen} onClick={() => { setPlaying(false); onChange(initialStateCursor); }}>Latest snapshot<Icon kind="arrow" /></button>
  </footer>;
}

function StateAnchor({ open, onClose, state, current, cursor }: { open: boolean; onClose: () => void; state?: TemporalState; current?: StateSnapshot; cursor: StateCursor }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, [open]);
  return <dialog ref={dialog} className="st-anchor-dialog" aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><span className="st-orbit"><Icon kind="shield" /></span><div><h2 id={title}>Reality Anchor</h2><p>State inspection · {utc(cursor.at)} UTC · {cursor.mode}</p></div><button className="st-icon-button" onClick={onClose} aria-label="Close state Anchor" autoFocus><Icon kind="close" /></button></header>
    <div className="st-anchor-body"><span className="st-eyebrow">FROZEN SELECTION</span><h3>{state?.title ?? 'No authored temporary state'}</h3><p>{current ? `${lifecycleLabels[current.lifecycle]} · influence ${score(current.influence)}` : 'Select a state to inspect its lineage.'}</p><p className="st-limit">These are review prompts, not automated certifications. No audit decision is saved.</p>
      {[
        ['U-01 · Reduction', 'Original records remain separate', 'Inspect the Original signals section. Only retained demo records are recoverable; excluded outside information cannot be reconstructed.'],
        ['U-02 · Blindness', 'What is not observed?', state?.limitation ?? 'No temporal assessment has been authored for this selection.'],
        ['U-03 · Boundary', 'Current scope', state?.scope ?? 'The current demonstration model only.'],
        ['U-04 · Feedback', 'Where are the real outcomes?', 'No outcome service is connected. A falling influence curve is a policy calculation, not observed improvement in reality.'],
        ['U-05 · State / Identity', 'Temporary influence, preserved history', 'Expiry changes operational influence to zero. Source records and assessment history are not changed. No psychological identity is assigned.'],
        ['U-06 · Reality', 'Model weight is not truth', 'The numeric values are authored examples. They do not measure consensus, causal certainty, personal worth or physical risk.'],
      ].map(([code, label, description]) => <details key={code}><summary><span><b>{code}</b>{label}</span><small>Not evaluated</small></summary><p>{description}</p></details>)}
    </div><footer><Icon kind="shield" />Review never changes the source evidence or extends the expiry timer.</footer>
  </dialog>;
}
