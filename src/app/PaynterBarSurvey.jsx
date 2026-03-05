'use client';
import { useState, useEffect } from 'react';
import {
  supabase, isConnected,
  getDrinks, addDrink,
  castVotes, getVoteCounts,
  resetVotes, resetSuggestions,
} from '@/lib/supabase';

// ── Constants ─────────────────────────────────────────────────

const CATEGORIES = ['wine','sparkling','beer','cider','spirits','liqueur','premix','zerowine','zerobeer','zerospirits'];

const CAT_EMOJI  = { wine:'🍷', sparkling:'🥂', beer:'🍺', cider:'🍏', spirits:'🥃', liqueur:'🍯', premix:'🥤', zerowine:'🫧', zerobeer:'🥛', zerospirits:'🍹' };
const CAT_LABELS = { wine:'Wine', sparkling:'Sparkling', beer:'Beer', cider:'Cider', spirits:'Spirits', liqueur:'Liqueurs & Fortified', premix:'Premix', zerowine:'Zero Wine', zerobeer:'Zero Beer', zerospirits:'Zero Spirits' };

const CAT_GROUPS = [
  { label: 'Alcohol',      cats: ['wine','sparkling','beer','cider','spirits','liqueur','premix'] },
  { label: 'Zero Alcohol', cats: ['zerowine','zerobeer','zerospirits'] },
];

const PRICE_RANGES = {
  wine:        [{ label:'Budget', range:'$10–$18/btl', order:0 }, { label:'Mid-range', range:'$19–$28/btl', order:1 }, { label:'Premium', range:'$29–$45/btl', order:2 }],
  sparkling:   [{ label:'Budget', range:'$12–$20/btl', order:0 }, { label:'Mid-range', range:'$21–$35/btl', order:1 }, { label:'Premium', range:'$36–$60/btl', order:2 }],
  beer:        [{ label:'Value',  range:'$3–$4',       order:0 }, { label:'Standard',  range:'$4–$5',       order:1 }, { label:'Premium', range:'$5–$6',       order:2 }],
  cider:       [{ label:'Value',  range:'$3–$4',       order:0 }, { label:'Standard',  range:'$4–$5',       order:1 }, { label:'Premium', range:'$5–$6',       order:2 }],
  spirits:     [{ label:'Budget', range:'Up to $40/btl',order:0},{ label:'Mid-range', range:'$41–$65/btl',  order:1 }, { label:'Premium', range:'$66–$90/btl', order:2 }],
  liqueur:     [{ label:'Budget', range:'Up to $30/btl',order:0},{ label:'Mid-range', range:'$31–$55/btl',  order:1 }, { label:'Premium', range:'$56–$90/btl', order:2 }],
  premix:      [{ label:'Value',  range:'$5–$6',       order:0 }, { label:'Standard',  range:'$6–$7',       order:1 }, { label:'Premium', range:'$7–$8',       order:2 }],
  zerowine:    [{ label:'Budget', range:'$10–$18/btl', order:0 }, { label:'Mid-range', range:'$19–$28/btl', order:1 }, { label:'Premium', range:'$29–$40/btl', order:2 }],
  zerobeer:    [{ label:'Value',  range:'$3–$4',       order:0 }, { label:'Standard',  range:'$4–$5',       order:1 }, { label:'Premium', range:'$5–$6',       order:2 }],
  zerospirits: [{ label:'Budget', range:'Up to $30/btl',order:0},{ label:'Mid-range', range:'$31–$50/btl',  order:1 }, { label:'Premium', range:'$51–$70/btl', order:2 }],
};

const RANGE_COLORS = ['#8B6914','#6B3A2A','#4A1942'];

const TYPE_OPTIONS = {
  wine:        ['Cabernet Sauvignon','Shiraz / Syrah','Merlot','Pinot Noir','Sauvignon Blanc','Chardonnay','Riesling','Pinot Gris','Rosé','Other'],
  sparkling:   ['Champagne','Prosecco','Australian Sparkling','Sparkling Rosé','Moscato','Other'],
  beer:        ['Lager','Pale Ale','Craft Beer','Light Beer','Stout / Porter','IPA','Other'],
  cider:       ['Apple','Pear','Mixed Berry','Dry','Flavoured','Other'],
  spirits:     ['Whisky / Bourbon','Gin','Vodka','Rum','Tequila','Brandy / Cognac','Other'],
  liqueur:     ['Port','Sherry','Muscat','Irish Cream (e.g. Baileys)','Coffee Liqueur','Orange Liqueur','Limoncello','Other'],
  premix:      ['Bourbon & Cola','Gin & Tonic','Vodka Mix','Rum & Cola','Seltzer / Hard Soda','Ready-to-Drink Wine','Other'],
  zerowine:    ['Red','White','Rosé','Sparkling','Other'],
  zerobeer:    ['Lager','Pale Ale','IPA Style','Stout Style','Wheat Beer Style','Other'],
  zerospirits: ['Gin Alternative','Whisky Alternative','Vodka Alternative','Rum Alternative','Botanical / Aperitif','Other'],
};

const PLACEHOLDERS = {
  wine:'e.g. Penfolds Shiraz', sparkling:'e.g. Jansz Premium', beer:'e.g. XXXX Gold',
  cider:'e.g. Rekorderlig', spirits:'e.g. Hendrick\'s Gin', liqueur:'e.g. Baileys',
  premix:'e.g. Jack Daniel\'s & Cola', zerowine:'e.g. Giesen 0% Sauv Blanc',
  zerobeer:'e.g. Great Northern Zero', zerospirits:'e.g. Seedlip Spice 94',
};

const EMPTY_STATE = () => Object.fromEntries(CATEGORIES.map(c => [c, []]));
const isZero = (cat) => cat.startsWith('zero');

// ── Main Component ────────────────────────────────────────────

export default function PaynterBarSurvey() {
  const [phase, setPhase] = useState('home');
  const [activeCategory, setActiveCategory] = useState('wine');
  const [residentName, setResidentName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drink data from DB (grouped by category)
  const [drinksByCategory, setDrinksByCategory] = useState(EMPTY_STATE());
  const [voteCounts, setVoteCounts] = useState({});

  // Local suggestion form
  const [suggestions, setSuggestions] = useState(EMPTY_STATE());
  const [currentSuggestion, setCurrentSuggestion] = useState({ name:'', type:'', priceRange:'', notes:'' });

  // Local vote selections
  const [votes, setVotes] = useState(EMPTY_STATE());

  // Load drinks on mount
  useEffect(() => { loadDrinks(); }, []);

  async function loadDrinks() {
    if (!isConnected()) return;
    try {
      const data = await getDrinks();
      const grouped = EMPTY_STATE();
      (data || []).forEach(d => {
        if (!grouped[d.category]) grouped[d.category] = [];
        grouped[d.category].push(d);
      });
      setDrinksByCategory(grouped);
    } catch (e) {
      console.error('loadDrinks error:', e);
    }
  }

  async function loadVoteCounts() {
    if (!isConnected()) return;
    try {
      const counts = await getVoteCounts();
      setVoteCounts(counts || {});
    } catch (e) {
      console.error('loadVoteCounts error:', e);
    }
  }

  // ── Suggestions ─────────────────────────────────────────────

  function addLocalSuggestion() {
    const { name, type, priceRange, notes } = currentSuggestion;
    if (!name || !type || !priceRange) return;
    const rangeObj = PRICE_RANGES[activeCategory].find(r => r.label === priceRange);
    setSuggestions(prev => ({
      ...prev,
      [activeCategory]: [...prev[activeCategory], {
        id: `local-${Date.now()}`, name, type, priceRange,
        price: rangeObj?.range || '', notes, suggestedBy: residentName,
      }],
    }));
    setCurrentSuggestion({ name:'', type:'', priceRange:'', notes:'' });
  }

  async function submitSuggestions() {
    setLoading(true); setError('');
    try {
      for (const cat of CATEGORIES) {
        for (const s of suggestions[cat]) {
          const rangeObj = PRICE_RANGES[cat].find(r => r.label === s.priceRange);
          await addDrink({
            category: cat, name: s.name, type: s.type,
            price_range: s.priceRange, price_range_order: rangeObj?.order ?? 1,
            price: s.price, suggested_by: residentName,
            notes: s.notes || null, is_seed: false,
          });
        }
      }
      await loadDrinks();
      setSubmitted(true);
    } catch (e) {
      setError('Could not save suggestions. Please try again.');
    }
    setLoading(false);
  }

  // ── Votes ────────────────────────────────────────────────────

  function toggleVote(cat, id) {
    setVotes(prev => {
      const cv = prev[cat];
      return { ...prev, [cat]: cv.includes(id) ? cv.filter(v => v !== id) : [...cv, id] };
    });
  }

  async function submitVotes() {
    setLoading(true); setError('');
    try {
      const allIds = Object.values(votes).flat();
      if (allIds.length > 0) {
        await castVotes(residentName, allIds);
      }
      await loadVoteCounts();
      setVoteSubmitted(true);
    } catch (e) {
      setError('Could not save votes. Please try again.');
    }
    setLoading(false);
  }

  // ── Admin ────────────────────────────────────────────────────

  async function handleAdminReset(type) {
    if (!confirm(`Reset all ${type}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      if (type === 'votes') await resetVotes();
      if (type === 'suggestions') await resetSuggestions();
      await loadDrinks();
      await loadVoteCounts();
    } catch (e) {
      setError('Reset failed.');
    }
    setLoading(false);
  }

  // ── Enter results view ───────────────────────────────────────

  function enterResults() {
    loadVoteCounts();
    setPhase('results');
  }

  // ── Totals ───────────────────────────────────────────────────

  const totalSuggestions = Object.values(suggestions).flat().length;
  const totalVotes = Object.values(votes).flat().length;

  // ── Shared sub-components ────────────────────────────────────

  function GroupedTabs({ withBadgeFrom }) {
    return (
      <div style={S.tabsOuter}>
        {CAT_GROUPS.map(group => (
          <div key={group.label} style={S.tabGroup}>
            <div style={S.tabGroupLabel}>
              {group.label === 'Zero Alcohol' && <span style={S.zeroTag}>0%</span>}
              {group.label}
            </div>
            <div style={S.tabsScroll}>
              {group.cats.map(cat => {
                const count = withBadgeFrom ? (withBadgeFrom[cat]?.length || 0) : 0;
                return (
                  <button key={cat}
                    style={{ ...S.tab, ...(activeCategory===cat ? S.tabActive : {}), ...(isZero(cat) ? S.tabZero : {}), ...(activeCategory===cat && isZero(cat) ? S.tabZeroActive : {}) }}
                    onClick={() => setActiveCategory(cat)}>
                    <span>{CAT_EMOJI[cat]}</span>
                    <span style={S.tabLabel}>{CAT_LABELS[cat]}</span>
                    {count > 0 && <span style={S.badge}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function PriceBadges() {
    return (
      <div style={S.priceRow}>
        {isZero(activeCategory) && (
          <div style={S.zeroNotice}>🫧 Zero-alcohol options — all the flavour, none of the alcohol</div>
        )}
        {PRICE_RANGES[activeCategory].map((r, i) => (
          <div key={r.label} style={{ ...S.priceChip, background: RANGE_COLORS[i] }}>
            <strong>{r.label}</strong><br/><span style={{ fontSize:10 }}>{r.range}</span>
          </div>
        ))}
      </div>
    );
  }

  const dbWarning = !isConnected() && (
    <div style={S.demoBar}>⚠️ Demo mode — Supabase not connected. Votes won't be saved across devices.</div>
  );

  // ── HOME ──────────────────────────────────────────────────────

  if (phase === 'home') return (
    <div style={S.root}>
      {dbWarning}
      <div style={S.hero}>
        <div style={{ fontSize:56 }}>🍷</div>
        <h1 style={S.heroTitle}>Paynter Bar</h1>
        <p style={S.heroSub}>Drink Selection Survey</p>
        <p style={S.heroDesc}>Help us choose what to stock — your favourites, your price range, your call.</p>
        <div style={S.pillSection}>
          <div style={S.catPillRow}>
            {CAT_GROUPS[0].cats.map(c => <span key={c} style={S.catPill}>{CAT_EMOJI[c]} {CAT_LABELS[c]}</span>)}
          </div>
          <div style={{ ...S.catPillRow, marginTop:6 }}>
            <span style={S.zeroPillLabel}>0% Zero Alcohol:</span>
            {CAT_GROUPS[1].cats.map(c => <span key={c} style={{ ...S.catPill, ...S.catPillZero }}>{CAT_EMOJI[c]} {CAT_LABELS[c]}</span>)}
          </div>
        </div>
      </div>
      <div style={S.card}>
        <h2 style={S.cardTitle}>Let's get started</h2>
        <label style={S.label}>Your name or unit number</label>
        <input style={S.input} placeholder="e.g. Margaret · Unit 42..."
          value={residentName} onChange={e => setResidentName(e.target.value)}
          onKeyDown={e => e.key==='Enter' && residentName.trim() && setPhase('suggest')} />
        <div style={S.phaseBtns}>
          <button style={{ ...S.phaseBtn, ...(residentName.trim() ? {} : S.disabled) }}
            onClick={() => residentName.trim() && setPhase('suggest')}>
            <span style={{ fontSize:28 }}>✏️</span>
            <strong>Phase 1</strong>
            <small>Suggest drinks</small>
          </button>
          <button style={{ ...S.phaseBtn, ...(residentName.trim() ? {} : S.disabled) }}
            onClick={() => residentName.trim() && setPhase('vote')}>
            <span style={{ fontSize:28 }}>✅</span>
            <strong>Phase 2</strong>
            <small>Vote on the list</small>
          </button>
        </div>
        <div style={{ textAlign:'center', marginTop:14 }}>
          <button style={S.ghostBtn} onClick={() => setShowAdminLogin(v => !v)}>🔒 Admin / Results</button>
        </div>
        {showAdminLogin && (
          <div style={S.adminBox}>
            <label style={S.label}>Admin PIN</label>
            <input style={S.input} type="password" placeholder="Enter PIN..."
              value={adminPin} onChange={e => setAdminPin(e.target.value)} />
            <button style={S.primaryBtn} onClick={() => {
              if (adminPin === '1234') enterResults();
              else alert('Incorrect PIN');
            }}>View Results</button>
          </div>
        )}
      </div>
    </div>
  );

  // ── PHASE 1 — SUGGEST ─────────────────────────────────────────

  if (phase === 'suggest') {
    if (submitted) return (
      <div style={S.root}>
        <div style={S.successCard}>
          <div style={{ fontSize:64 }}>🎉</div>
          <h2 style={{ ...S.heroTitle, color:'#2C1A0E' }}>Thanks, {residentName}!</h2>
          <p style={{ color:'#666', marginBottom:24 }}>
            Your {totalSuggestions} suggestion{totalSuggestions !== 1 ? 's' : ''} have been saved. Keep an eye out for Phase 2 voting!
          </p>
          <button style={S.primaryBtn} onClick={() => { setSubmitted(false); setVoteSubmitted(false); setVotes(EMPTY_STATE()); setPhase('vote'); }}>
            Go to Voting →
          </button>
          <button style={{ ...S.primaryBtn, background:'transparent', color:'#8B6914', border:'1px solid #D4A96A', marginTop:8 }}
            onClick={() => { setPhase('home'); setSubmitted(false); setSuggestions(EMPTY_STATE()); setResidentName(''); }}>
            ← Back to start
          </button>
        </div>
      </div>
    );

    return (
      <div style={S.root}>
        {dbWarning}
        <div style={S.topBar}>
          <div>
            <h1 style={S.topTitle}>Paynter Bar Survey</h1>
            <p style={S.topSub}>Phase 1 — Suggest Your Drinks</p>
          </div>
          <div style={S.nameBadge}>👤 {residentName}</div>
        </div>

        <GroupedTabs withBadgeFrom={suggestions} />
        <PriceBadges />

        <div style={{ ...S.card, ...(isZero(activeCategory) ? S.cardZero : {}) }}>
          <h3 style={S.cardTitle}>Suggest a {CAT_LABELS[activeCategory]}</h3>
          <div style={S.formGrid}>
            <div>
              <label style={S.label}>Brand / Name *</label>
              <input style={S.input} value={currentSuggestion.name} placeholder={PLACEHOLDERS[activeCategory]}
                onChange={e => setCurrentSuggestion(p => ({ ...p, name:e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Type *</label>
              <select style={S.input} value={currentSuggestion.type}
                onChange={e => setCurrentSuggestion(p => ({ ...p, type:e.target.value }))}>
                <option value="">Select type...</option>
                {TYPE_OPTIONS[activeCategory].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Price Range *</label>
              <select style={S.input} value={currentSuggestion.priceRange}
                onChange={e => setCurrentSuggestion(p => ({ ...p, priceRange:e.target.value }))}>
                <option value="">Select range...</option>
                {PRICE_RANGES[activeCategory].map(r => (
                  <option key={r.label} value={r.label}>{r.label} — {r.range}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Notes (optional)</label>
              <input style={S.input} placeholder="e.g. great as a house pour..."
                value={currentSuggestion.notes}
                onChange={e => setCurrentSuggestion(p => ({ ...p, notes:e.target.value }))} />
            </div>
          </div>
          <button style={{ ...S.addBtn, ...(currentSuggestion.name && currentSuggestion.type && currentSuggestion.priceRange ? {} : S.disabled) }}
            onClick={addLocalSuggestion}>+ Add to my list</button>
        </div>

        {suggestions[activeCategory].length > 0 && (
          <div style={S.card}>
            <h3 style={S.cardTitle}>Your {CAT_LABELS[activeCategory]} suggestions</h3>
            {suggestions[activeCategory].map(s => (
              <div key={s.id} style={S.suggRow}>
                <div style={{ flex:1 }}>
                  <strong style={{ color:'#2C1A0E' }}>{s.name}</strong>
                  <Tag>{s.type}</Tag><Tag gold>{s.priceRange} · {s.price}</Tag>
                  {s.notes && <p style={{ margin:'3px 0 0', fontSize:12, color:'#888' }}>{s.notes}</p>}
                </div>
                <button style={S.removeBtn} onClick={() => setSuggestions(prev => ({ ...prev, [activeCategory]:prev[activeCategory].filter(x => x.id!==s.id) }))}>✕</button>
              </div>
            ))}
          </div>
        )}

        {error && <div style={S.errorBox}>{error}</div>}

        <div style={S.submitArea}>
          <p style={{ color:'#888', fontSize:13, margin:'0 0 10px' }}>
            {totalSuggestions === 0 ? 'Add at least one suggestion to submit' : `${totalSuggestions} suggestion${totalSuggestions!==1?'s':''} across all categories`}
          </p>
          <button style={{ ...S.primaryBtn, fontSize:15, padding:'14px 32px', ...(totalSuggestions===0||loading ? S.disabled : {}) }}
            onClick={submitSuggestions}>{loading ? 'Saving...' : 'Submit my suggestions →'}</button>
          <button style={{ ...S.ghostBtn, display:'block', margin:'12px auto 0' }} onClick={() => setPhase('home')}>← Back</button>
        </div>
      </div>
    );
  }

  // ── PHASE 2 — VOTE ────────────────────────────────────────────

  if (phase === 'vote') {
    if (voteSubmitted) return (
      <div style={S.root}>
        <div style={S.successCard}>
          <div style={{ fontSize:64 }}>🥂</div>
          <h2 style={{ ...S.heroTitle, color:'#2C1A0E' }}>Cheers, {residentName}!</h2>
          <p style={{ color:'#666', marginBottom:24 }}>
            Your {totalVotes} vote{totalVotes!==1?'s':''} have been recorded. We'll announce results at the bar soon!
          </p>
          <button style={S.primaryBtn} onClick={() => { setPhase('home'); setVoteSubmitted(false); setVotes(EMPTY_STATE()); setResidentName(''); }}>Done</button>
        </div>
      </div>
    );

    return (
      <div style={S.root}>
        {dbWarning}
        <div style={S.topBar}>
          <div>
            <h1 style={S.topTitle}>Paynter Bar Survey</h1>
            <p style={S.topSub}>Phase 2 — Vote for Your Favourites</p>
          </div>
          <div style={S.nameBadge}>👤 {residentName}</div>
        </div>
        <p style={{ color:'#666', fontSize:13, margin:'12px 16px 0', textAlign:'center' }}>
          Tick as many as you like — the most popular make it onto the menu!
        </p>

        <GroupedTabs withBadgeFrom={votes} />
        <PriceBadges />

        {PRICE_RANGES[activeCategory].map((range, ri) => {
          const items = (drinksByCategory[activeCategory] || []).filter(i => i.price_range === range.label);
          if (!items.length) return null;
          return (
            <div key={range.label} style={{ ...S.card, ...(isZero(activeCategory) ? S.cardZero : {}) }}>
              <h3 style={{ ...S.cardTitle, borderLeft:`4px solid ${RANGE_COLORS[ri]}`, paddingLeft:10, margin:'0 0 12px' }}>
                {range.label} · {range.range}
              </h3>
              {items.map(item => {
                const checked = (votes[activeCategory] || []).includes(item.id);
                return (
                  <div key={item.id} style={{ ...S.voteRow, ...(checked ? S.voteRowOn : {}) }} onClick={() => toggleVote(activeCategory, item.id)}>
                    <div style={{ ...S.checkbox, ...(checked ? S.checkOn : {}) }}>{checked ? '✓' : ''}</div>
                    <div style={{ flex:1 }}>
                      <strong style={{ color:'#2C1A0E' }}>{item.name}</strong>
                      <Tag>{item.type}</Tag>
                      {item.is_current_stock && <Tag onmenu>✓ On menu · {item.current_bar_price}</Tag>}
                      {!item.is_current_stock && item.current_bar_price && <Tag est>💡 {item.current_bar_price}</Tag>}
                      {item.suggested_by && !item.is_current_stock && <Tag green>suggested by {item.suggested_by}</Tag>}
                      {isZero(activeCategory) && <Tag teal>0% alc</Tag>}
                      {item.notes && <p style={{ margin:'3px 0 0', fontSize:12, color:'#888' }}>{item.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {error && <div style={S.errorBox}>{error}</div>}

        <div style={S.submitArea}>
          <p style={{ color:'#888', fontSize:13, margin:'0 0 10px' }}>
            {totalVotes === 0 ? 'Tick your favourites above' : `${totalVotes} vote${totalVotes!==1?'s':''} cast`}
          </p>
          <button style={{ ...S.primaryBtn, fontSize:15, padding:'14px 32px', ...(totalVotes===0||loading ? S.disabled : {}) }}
            onClick={submitVotes}>{loading ? 'Saving...' : 'Submit my votes →'}</button>
          <button style={{ ...S.ghostBtn, display:'block', margin:'12px auto 0' }} onClick={() => setPhase('home')}>← Back</button>
        </div>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────

  return (
    <div style={S.root}>
      {dbWarning}
      <div style={S.topBar}>
        <div>
          <h1 style={S.topTitle}>Paynter Bar — Results</h1>
          <p style={S.topSub}>Admin View · All Votes</p>
        </div>
        <button style={S.ghostBtn} onClick={() => { setPhase('home'); setAdminPin(''); setShowAdminLogin(false); }}>← Back</button>
      </div>

      <div style={S.tabsOuter}>
        {CAT_GROUPS.map(group => (
          <div key={group.label} style={S.tabGroup}>
            <div style={S.tabGroupLabel}>
              {group.label === 'Zero Alcohol' && <span style={S.zeroTag}>0%</span>}
              {group.label}
            </div>
            <div style={S.tabsScroll}>
              {group.cats.map(cat => (
                <button key={cat}
                  style={{ ...S.tab, ...(activeCategory===cat ? S.tabActive : {}), ...(isZero(cat) ? S.tabZero : {}), ...(activeCategory===cat && isZero(cat) ? S.tabZeroActive : {}) }}
                  onClick={() => setActiveCategory(cat)}>
                  {CAT_EMOJI[cat]} <span style={S.tabLabel}>{CAT_LABELS[cat]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, ...(isZero(activeCategory) ? S.cardZero : {}) }}>
        <h3 style={S.cardTitle}>{CAT_EMOJI[activeCategory]} {CAT_LABELS[activeCategory]} — Leaderboard</h3>
        {(() => {
          const items = [...(drinksByCategory[activeCategory] || [])];
          const sorted = items.sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));
          const max = Math.max(voteCounts[sorted[0]?.id] || 1, 1);
          return sorted.length === 0
            ? <p style={{ color:'#aaa', fontStyle:'italic' }}>No entries yet</p>
            : sorted.map((item, i) => {
              const count = voteCounts[item.id] || 0;
              return (
                <div key={item.id} style={S.resultRow}>
                  <div style={S.rank}>#{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:600, color:'#2C1A0E' }}>{item.name}</span>
                      <span style={{ fontWeight:700, color:'#8B6914', fontSize:14 }}>{count} vote{count!==1?'s':''}</span>
                    </div>
                    <div style={{ marginTop:3 }}>
                      <Tag>{item.type}</Tag>
                      <Tag gold>{item.price_range} · {item.price}</Tag>
                      {item.is_current_stock && <Tag onmenu>✓ On menu · {item.current_bar_price}</Tag>}
                      {!item.is_current_stock && item.current_bar_price && <Tag est>💡 {item.current_bar_price}</Tag>}
                      {!item.is_seed && item.suggested_by && <Tag green>by {item.suggested_by}</Tag>}
                      {isZero(activeCategory) && <Tag teal>0% alc</Tag>}
                    </div>
                    <div style={S.bar}><div style={{ ...S.barFill, width:`${(count/max)*100}%` }} /></div>
                  </div>
                </div>
              );
            });
        })()}
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={{ textAlign:'center', padding:'16px 16px 0', display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
        <button style={{ ...S.ghostBtn, color:'#cc3333' }} onClick={() => handleAdminReset('votes')}>
          {loading ? '...' : '🗑 Reset all votes'}
        </button>
        <button style={{ ...S.ghostBtn, color:'#cc3333' }} onClick={() => handleAdminReset('suggestions')}>
          {loading ? '...' : '🗑 Remove user suggestions'}
        </button>
      </div>
    </div>
  );
}

// ── Tag helper ────────────────────────────────────────────────

function Tag({ children, gold, green, teal, onmenu, est }) {
  const bg = onmenu ? '#e8f0e8' : est ? '#fef9e7' : gold ? '#f5e6c8' : green ? '#e8f4e8' : teal ? '#e0f4f4' : '#F0E0C8';
  const color = onmenu ? '#2d5a2d' : est ? '#7d6608' : gold ? '#8B4513' : green ? '#2d6a2d' : teal ? '#1a6b6b' : '#6B3A2A';
  const fw = onmenu ? 600 : 400;
  return <span style={{
    display:'inline-block', background: bg, color, fontWeight: fw,
    borderRadius:4, padding:'2px 6px', fontSize:11, marginLeft:6,
  }}>{children}</span>;
}

// ── Styles ────────────────────────────────────────────────────

const S = {
  root: { minHeight:'100vh', background:'linear-gradient(160deg,#FFF8F0 0%,#F5E6D0 100%)', fontFamily:"'Georgia','Times New Roman',serif", paddingBottom:60, maxWidth:960, margin:'0 auto' },
  demoBar: { background:'#fff3cd', color:'#856404', padding:'10px 16px', fontSize:13, textAlign:'center', borderBottom:'1px solid #ffd666' },
  hero: { background:'linear-gradient(135deg,#2C1A0E 0%,#6B3A2A 60%,#8B4513 100%)', padding:'44px 24px 36px', textAlign:'center', color:'#fff' },
  heroTitle: { fontFamily:"'Georgia',serif", fontSize:30, fontWeight:400, margin:'0 0 6px', color:'#F5C842', letterSpacing:1 },
  heroSub: { fontSize:12, color:'#D4A96A', margin:'0 0 10px', letterSpacing:2, textTransform:'uppercase' },
  heroDesc: { fontSize:14, color:'#E8D5B7', maxWidth:420, margin:'0 auto 16px' },
  pillSection: { marginTop:14 },
  catPillRow: { display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' },
  catPill: { background:'rgba(255,255,255,0.12)', color:'#F5E6C8', borderRadius:20, padding:'4px 10px', fontSize:12, border:'1px solid rgba(255,255,255,0.2)' },
  catPillZero: { background:'rgba(100,200,200,0.15)', color:'#a0e4e4', border:'1px solid rgba(100,200,200,0.3)' },
  zeroPillLabel: { color:'#a0e4e4', fontSize:11, alignSelf:'center', fontStyle:'italic' },
  topBar: { background:'linear-gradient(135deg,#2C1A0E 0%,#6B3A2A 100%)', padding:'18px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  topTitle: { fontFamily:"'Georgia',serif", fontSize:20, color:'#F5C842', margin:0, fontWeight:400 },
  topSub: { fontSize:11, color:'#D4A96A', margin:'3px 0 0', textTransform:'uppercase', letterSpacing:1.5 },
  nameBadge: { background:'rgba(255,255,255,0.1)', color:'#F5C842', padding:'5px 12px', borderRadius:20, fontSize:12, border:'1px solid rgba(245,200,66,0.3)', whiteSpace:'nowrap' },
  card: { background:'#fff', borderRadius:12, padding:'18px', margin:'14px 14px 0', boxShadow:'0 2px 12px rgba(44,26,14,0.07)', border:'1px solid #F0E0C8' },
  cardZero: { border:'1px solid #b2e0e0', boxShadow:'0 2px 12px rgba(0,120,120,0.06)' },
  cardTitle: { fontFamily:"'Georgia',serif", fontSize:17, color:'#2C1A0E', margin:'0 0 14px', fontWeight:400 },
  tabsOuter: { padding:'14px 14px 0' },
  tabGroup: { marginBottom:8 },
  tabGroupLabel: { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, color:'#aaa', marginBottom:5, display:'flex', alignItems:'center', gap:5 },
  zeroTag: { background:'#1a8a8a', color:'#fff', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700 },
  tabsScroll: { display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2 },
  tab: { padding:'7px 11px', borderRadius:8, border:'2px solid #E8D5B7', background:'#fff', cursor:'pointer', fontSize:12, fontFamily:"'Georgia',serif", color:'#8B6914', display:'flex', alignItems:'center', gap:4, position:'relative', whiteSpace:'nowrap', flexShrink:0, transition:'all 0.15s' },
  tabActive: { background:'#2C1A0E', border:'2px solid #2C1A0E', color:'#F5C842' },
  tabZero: { border:'2px solid #b2e0e0', color:'#1a8a8a' },
  tabZeroActive: { background:'#0d5f5f', border:'2px solid #0d5f5f', color:'#a0ffe0' },
  tabLabel: { fontWeight:500 },
  badge: { position:'absolute', top:-6, right:-6, background:'#F5C842', color:'#2C1A0E', borderRadius:'50%', width:17, height:17, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 },
  priceRow: { display:'flex', gap:6, padding:'10px 14px 0', flexWrap:'wrap' },
  priceChip: { flex:1, minWidth:80, padding:'6px 8px', borderRadius:6, color:'#fff', fontSize:11, textAlign:'center', lineHeight:1.5 },
  zeroNotice: { width:'100%', background:'#e0f8f8', color:'#0d6060', borderRadius:6, padding:'7px 12px', fontSize:12, fontStyle:'italic', marginBottom:4 },
  label: { fontSize:11, color:'#8B6914', fontWeight:600, textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:4 },
  input: { padding:'10px 12px', borderRadius:8, border:'2px solid #E8D5B7', fontSize:14, fontFamily:"'Georgia',serif", color:'#2C1A0E', background:'#FFFAF5', outline:'none', width:'100%', boxSizing:'border-box' },
  formGrid: { display:'flex', flexDirection:'column', gap:12, marginBottom:4 },
  primaryBtn: { background:'linear-gradient(135deg,#8B4513,#6B3A2A)', color:'#fff', border:'none', borderRadius:8, padding:'12px 24px', fontSize:14, fontFamily:"'Georgia',serif", cursor:'pointer', width:'100%', marginTop:12, letterSpacing:0.4 },
  addBtn: { background:'#f5e6c8', color:'#6B3A2A', border:'1px solid #D4A96A', borderRadius:8, padding:'10px 20px', fontSize:14, fontFamily:"'Georgia',serif", cursor:'pointer', width:'100%', marginTop:12 },
  ghostBtn: { background:'none', border:'none', color:'#8B6914', cursor:'pointer', fontSize:13, textDecoration:'underline', fontFamily:"'Georgia',serif" },
  disabled: { opacity:0.4, cursor:'not-allowed' },
  suggRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid #F0E0C8' },
  removeBtn: { background:'none', border:'none', color:'#cc3333', cursor:'pointer', fontSize:16, padding:'2px 6px', marginLeft:8 },
  voteRow: { display:'flex', alignItems:'flex-start', gap:12, padding:'10px', borderRadius:8, marginBottom:6, cursor:'pointer', border:'2px solid transparent', background:'#FFFAF5', transition:'all 0.12s' },
  voteRowOn: { background:'#FFF3D6', border:'2px solid #F5C842' },
  checkbox: { width:22, height:22, borderRadius:6, border:'2px solid #D4A96A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#fff', fontWeight:700, fontSize:13, marginTop:2 },
  checkOn: { background:'#8B6914', border:'2px solid #8B6914' },
  submitArea: { textAlign:'center', padding:'22px 16px 0' },
  errorBox: { background:'#fff0f0', color:'#cc3333', border:'1px solid #ffcccc', borderRadius:8, padding:'10px 14px', margin:'12px 14px 0', fontSize:13 },
  resultRow: { display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:'1px solid #F0E0C8' },
  rank: { width:26, color:'#bbb', fontWeight:700, fontSize:12, paddingTop:2 },
  bar: { height:6, background:'#F0E0C8', borderRadius:3, marginTop:7, overflow:'hidden' },
  barFill: { height:'100%', background:'linear-gradient(90deg,#8B6914,#F5C842)', borderRadius:3, transition:'width 0.4s' },
  phaseBtns: { display:'flex', gap:12, marginTop:18 },
  phaseBtn: { flex:1, padding:'14px 8px', borderRadius:10, border:'2px solid #D4A96A', background:'#FFFAF5', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, fontFamily:"'Georgia',serif", color:'#2C1A0E', fontSize:13 },
  adminBox: { background:'#F5F5F5', borderRadius:8, padding:16, marginTop:14, border:'1px solid #DDD' },
  successCard: { margin:'50px 20px', background:'#fff', borderRadius:16, padding:'36px 24px', textAlign:'center', boxShadow:'0 4px 24px rgba(44,26,14,0.1)', border:'1px solid #F0E0C8' },
};
