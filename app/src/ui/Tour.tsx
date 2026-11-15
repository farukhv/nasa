import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { LANGUAGES, useI18n, type Lang } from '../i18n';

/** One entry per step of `tour.steps` in the dictionaries; null = centred card with no highlight. */
const TARGETS: (string | null)[] = [
  null,
  '[data-tour="scenes"]',
  '[data-tour="targets"]',
  '[data-tour="scenarios"]',
  '.mapwrap',
  '.layers',
  '[data-tour="decision"]',
  '.strip',
  '[data-tour="controls"]',
];

const CARD_W = 380, CARD_H = 250, GAP = 14, EDGE = 12;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Put the card beside the highlighted element, on whichever side has room; inside it when none has. */
function placeCard(r: DOMRect | null): { left: number; top: number } {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!r) return { left: (vw - CARD_W) / 2, top: Math.max(EDGE, (vh - CARD_H) / 2 - 40) };
  const midX = clamp(r.left + r.width / 2 - CARD_W / 2, EDGE, vw - CARD_W - EDGE), sideY = clamp(r.top, EDGE, vh - CARD_H - EDGE);
  const below = r.bottom + GAP + CARD_H <= vh ? { left: midX, top: r.bottom + GAP } : null;
  const above = r.top - GAP - CARD_H >= 0 ? { left: midX, top: r.top - GAP - CARD_H } : null;
  const right = r.right + GAP + CARD_W <= vw ? { left: r.right + GAP, top: sideY } : null;
  const left = r.left - GAP - CARD_W >= 0 ? { left: r.left - GAP - CARD_W, top: sideY } : null;
  const order = r.height < 80 ? [below, above, right, left] : [right, left, above, below];
  return order.find(Boolean) ?? { left: clamp(r.right - CARD_W - 24, EDGE, vw - CARD_W - EDGE), top: clamp(r.top + 64, EDGE, vh - CARD_H - EDGE) };
}

export default function Tour({ onClose, setLang }: { onClose: () => void; setLang: (l: Lang) => void }) {
  const { t, lang } = useI18n();
  const steps = t.tour.steps;
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const last = i === steps.length - 1;

  useLayoutEffect(() => {
    const selector = TARGETS[i];
    const find = () => (selector ? document.querySelector(selector) : null);
    find()?.scrollIntoView({ block: 'nearest' });
    const measure = () => setRect(find()?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [i, lang]);

  // the tour scrolls the side panels to reach its targets; put them back when it closes
  useEffect(() => () => { document.querySelectorAll('.rail, .side').forEach(el => el.scrollTo({ top: 0 })); }, []);

  const next = useCallback(() => { if (last) onClose(); else setI(k => k + 1); }, [last, onClose]);
  const back = useCallback(() => setI(k => Math.max(0, k - 1)), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, onClose]);

  const pos = placeCard(rect);
  const hole = rect && { left: Math.max(4, rect.left - 6), top: Math.max(4, rect.top - 6), width: Math.min(window.innerWidth - 8, rect.width + 12), height: Math.min(window.innerHeight - 8, rect.height + 12) };
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={steps[i].title}>
      {hole ? <div className="tour-hole" style={hole} /> : <div className="tour-dim" />}
      <div className="tour-card" style={{ left: pos.left, top: pos.top, width: CARD_W }}>
        <div className="tour-step">{t.tour.step(i + 1, steps.length)}</div>
        <h2>{steps[i].title}</h2>
        <p>{steps[i].body}</p>
        {i === 0 && (
          <div className="tour-lang">
            <span>{t.tour.chooseLanguage}</span>
            <div className="seg">{LANGUAGES.map(l => <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.name}</button>)}</div>
          </div>
        )}
        <div className="tour-dots" aria-hidden="true">{steps.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="tour-actions">
          <button className="btn tour-skip" onClick={onClose}>{t.tour.skip}</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="btn" onClick={back}>{t.tour.back}</button>}
          <button className="btn primary" autoFocus onClick={next}>{last ? t.tour.done : i === 0 ? t.tour.start : t.tour.next}</button>
        </div>
      </div>
    </div>
  );
}
