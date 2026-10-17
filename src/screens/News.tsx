import { useState } from 'react';
import { useCareer } from '../store/store';
import { seasonLabel } from '../engine/schedule';
import { Card, Empty, PageHead } from '../ui/common';
import type { NewsItem } from '../engine/types';

const KIND: Record<NewsItem['kind'], string> = { event: 'Vestuario', game: 'Partidos', award: 'Premios', contract: 'Contratos', injury: 'Lesiones', league: 'Liga', milestone: 'Hitos', training: 'Desarrollo', draft: 'Draft' };

export function News() {
  const c = useCareer()!;
  const [kind, setKind] = useState<NewsItem['kind'] | 'all' | 'decisions'>('all');
  const items = c.news.filter((n) => kind === 'all' || n.kind === kind);
  return (
    <>
      <PageHead eyebrow="Noticias y acontecimientos" title="Noticias">
        <select className="input" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as never)} aria-label="Filtrar noticias">
          <option value="all">Todas</option>
          <option value="decisions">Decisiones tomadas</option>
          {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </PageHead>
      {kind === 'decisions' ? (
        <Card title={`Decisiones (${c.decisions.length})`} icon="flag">
          {c.decisions.length === 0 ? <Empty title="Todavía no has tomado decisiones" /> : (
            <div className="list">{[...c.decisions].reverse().map((d, i) => <div key={i} className="li"><span className="chip">{seasonLabel(d.season)}</span><div><b className="small">{d.title}</b><div className="small muted">{d.choice}</div></div></div>)}</div>
          )}
        </Card>
      ) : (
        <div className="stack">
          {items.length === 0 && <Card><Empty icon="📰" title="Sin noticias" /></Card>}
          {items.map((n) => (
            <article key={n.id} className="card flat anim-in" style={{ borderLeft: `3px solid ${n.tone === 'good' ? 'var(--good)' : n.tone === 'bad' ? 'var(--bad)' : 'var(--line-2)'}` }}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span className="chip">{KIND[n.kind]}</span>
                <span className="tiny dim">{n.date}</span>
              </div>
              <h3 style={{ textTransform: 'none', fontSize: '1.2rem', letterSpacing: 0 }}>{n.title}</h3>
              <p className="small muted" style={{ marginTop: 4 }}>{n.body}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
