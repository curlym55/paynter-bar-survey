'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase ──────────────────────────────────────────────────
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

// ── Survey Categories ─────────────────────────────────────────
const CATEGORIES = [
  { id: 'white_wine',  label: 'White Wine',           emoji: '🥂', options: ['Chardonnay', 'Sauvignon Blanc', 'Pinot Gris/Grigio', 'Riesling'] },
  { id: 'red_wine',    label: 'Red Wine',              emoji: '🍷', options: ['Shiraz', 'Cabernet Sauvignon', 'Merlot', 'Pinot Noir'] },
  { id: 'rose',        label: 'Rosé',                  emoji: '🌸', options: ['Rosé'] },
  { id: 'sparkling',   label: 'Sparkling',             emoji: '🍾', options: ['Prosecco', 'Champagne/Méthode', 'Brut/Dry', 'Piccolo (single serve)'] },
  { id: 'beer',        label: 'Beer',                  emoji: '🍺', options: ['Mid-strength lager', 'Full-strength lager', 'Pale ale', 'Dark/stout', 'Ginger beer'] },
  { id: 'cider',       label: 'Cider',                 emoji: '🍏', options: ['Apple', 'Pear', 'Berry/flavoured'] },
  { id: 'spirits',     label: 'Spirits',               emoji: '🥃', options: ['Gin', 'Rum', 'Whisky/Scotch', 'Bourbon', 'Vodka'] },
  { id: 'liqueurs',    label: 'Liqueurs & Fortified',  emoji: '🍫', options: ['Baileys/cream liqueur', 'Port'] },
  { id: 'premix',      label: 'Premix / RTD',          emoji: '🥤', options: ['Bourbon & cola', 'Gin & tonic', 'Vodka mix', 'Rum & cola'] },
  { id: 'zero',        label: 'Zero Alcohol',          emoji: '0️⃣', options: ['Zero beer', 'Zero wine', 'Zero spirits'] },
];

const EMPTY_SELECTIONS = () => Object.fromEntries(CATEGORIES.map(c => [c.id, []]));
const EMPTY_SUGGESTIONS = () => Object.fromEntries(CATEGORIES.map(c => [c.id, '']));

// ── DB helpers ────────────────────────────────────────────────
async function saveResponse(selections, suggestions, comment) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('responses')
    .insert([{ selections, suggestions, comment: comment || null }])
    .select().single();
  if (error) throw error;
  return data;
}

async function getResponseCount() {
  if (!supabase) return 0;
  const { count } = await supabase.from('responses').select('*', { count: 'exact', head: true });
  return count || 0;
}

async function getAllResponses() {
  if (!supabase) return [];
  const { data } = await supabase.from('responses').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function getSurveyOpen() {
  if (!supabase) return true;
  const { data } = await supabase.from('settings').select('value').eq('key', 'survey_open').single();
  return data?.value !== 'false';
}

async function setSurveyOpen(open) {
  if (!supabase) return;
  await supabase.from('settings').upsert({ key: 'survey_open', value: open ? 'true' : 'false' });
}

// ── Main Component ────────────────────────────────────────────
export default function PaynterBarSurvey() {
  const [screen, setScreen]           = useState('home');
  const [selections, setSelections]   = useState(EMPTY_SELECTIONS());
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTIONS());
  const [comment, setComment]         = useState('');
  const [responseCount, setResponseCount] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [surveyOpen, setSurveyOpenState] = useState(true);
  const [adminPin, setAdminPin]       = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminData, setAdminData]     = useState(null);

  useEffect(() => {
    getResponseCount().then(setResponseCount);
    getSurveyOpen().then(setSurveyOpenState);
  }, []);

  function toggleOption(catId, option) {
    setSelections(prev => {
      const current = prev[catId] || [];
      return { ...prev, [catId]: current.includes(option) ? current.filter(o => o !== option) : [...current, option] };
    });
  }

  const totalSelections = Object.values(selections).flat().length;

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      await saveResponse(selections, suggestions, comment);
      const count = await getResponseCount();
      setResponseCount(count);
      setScreen('success');
    } catch (e) {
      setError('Could not save your response. Please try again.');
    }
    setLoading(false);
  }

  async function enterAdmin() {
    if (adminPin !== '1234') { alert('Incorrect PIN'); return; }
    setLoading(true);
    const responses = await getAllResponses();
    setAdminData(responses);
    setLoading(false);
    setScreen('admin');
  }

  // ── HOME ──────────────────────────────────────────────────────
  if (screen === 'home') return (
    <div style={S.root}>
      <div style={S.hero}>
        <div style={S.heroIcon}>🍷</div>
        <h1 style={S.heroTitle}>Paynter Bar</h1>
        <p style={S.heroSub}>Drink Preference Survey</p>
        <p style={S.heroDesc}>Help us choose what to stock. Tick everything you enjoy — we want to hear from you.</p>
        {responseCount > 0 && (
          <div style={S.countBadge}>👥 {responseCount} resident{responseCount !== 1 ? 's' : ''} have responded</div>
        )}
      </div>

      <div style={S.card}>
        <h2 style={S.cardTitle}>How it works</h2>
        <p style={S.instrText}>Browse each drink category and tick the styles you enjoy or would like to see at the bar. You can also suggest specific brands. Anonymous — no name needed.</p>
        <div style={S.catPreview}>
          {CATEGORIES.map(c => (
            <span key={c.id} style={S.catChip}>{c.emoji} {c.label}</span>
          ))}
        </div>
      </div>

      <div style={S.card}>
        {surveyOpen ? (
          <button style={S.startBtn} onClick={() => setScreen('survey')}>Start Survey →</button>
        ) : (
          <div style={{ textAlign:'center', color:'#aaa', padding:'16px 0' }}>
            <div style={{ fontSize:32 }}>🔒</div>
            <p style={{ fontFamily:'sans-serif', fontSize:14 }}>The survey is currently closed.</p>
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button style={S.ghostBtn} onClick={() => setShowAdminLogin(v => !v)}>🔒 Admin</button>
        </div>
        {showAdminLogin && (
          <div style={S.adminBox}>
            <input style={{ ...S.input, marginBottom:0 }} type="password" placeholder="PIN" value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enterAdmin()} />
            <button style={{ ...S.primaryBtn, width:'auto', padding:'10px 20px' }} onClick={enterAdmin}>Enter</button>
          </div>
        )}
      </div>
    </div>
  );

  // ── SURVEY ────────────────────────────────────────────────────
  if (screen === 'survey') return (
    <div style={S.root}>
      <div style={S.topBar}>
        <div>
          <h1 style={S.topTitle}>Paynter Bar Survey</h1>
          <p style={S.topSub}>Tick everything you enjoy or would like to see stocked</p>
        </div>
        <div style={S.progressBadge}>{totalSelections} selected</div>
      </div>

      {CATEGORIES.map(cat => {
        const catSelections = selections[cat.id] || [];
        const catSuggestion = suggestions[cat.id] || '';
        const hasActivity = catSelections.length > 0 || catSuggestion;
        return (
          <div key={cat.id} style={{ ...S.catCard, ...(hasActivity ? S.catCardActive : {}) }}>
            <div style={S.catHeader}>
              <span style={S.catEmoji}>{cat.emoji}</span>
              <span style={S.catLabel}>{cat.label}</span>
              {catSelections.length > 0 && (
                <span style={S.catBadge}>{catSelections.length} ✓</span>
              )}
            </div>
            <div style={S.optionsGrid}>
              {cat.options.map(opt => {
                const checked = catSelections.includes(opt);
                return (
                  <label key={opt} style={{ ...S.optionLabel, ...(checked ? S.optionLabelChecked : {}) }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleOption(cat.id, opt)} style={{ display:'none' }} />
                    <span style={{ ...S.optionCheck, ...(checked ? S.optionCheckChecked : {}) }}>{checked ? '✓' : ''}</span>
                    <span style={{ ...S.optionText, ...(checked ? { color:'#F5E6C8' } : {}) }}>{opt}</span>
                  </label>
                );
              })}
            </div>
            <input style={S.suggInput}
              placeholder={`Any specific brands or styles to suggest?`}
              value={catSuggestion}
              onChange={e => setSuggestions(prev => ({ ...prev, [cat.id]: e.target.value }))} />
          </div>
        );
      })}

      <div style={S.commentCard}>
        <label style={S.commentLabel}>💬 Anything else you'd like us to know? (optional)</label>
        <textarea style={S.commentArea}
          placeholder="e.g. Would love a happy hour on Fridays, or more low-alcohol options..."
          value={comment}
          onChange={e => setComment(e.target.value)} />
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.submitArea}>
        <p style={S.submitHint}>
          {totalSelections === 0 ? 'Tick at least one option to continue' : `${totalSelections} preference${totalSelections !== 1 ? 's' : ''} selected`}
        </p>
        <button style={{ ...S.primaryBtn, ...(totalSelections === 0 ? S.disabled : {}) }}
          onClick={() => totalSelections > 0 && setScreen('review')}>
          Review &amp; Submit →
        </button>
        <button style={{ ...S.ghostBtn, display:'block', margin:'10px auto 0' }} onClick={() => setScreen('home')}>← Back</button>
      </div>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────────
  if (screen === 'review') return (
    <div style={S.root}>
      <div style={S.topBar}>
        <div>
          <h1 style={S.topTitle}>Review your responses</h1>
          <p style={S.topSub}>Check everything looks right before submitting</p>
        </div>
      </div>

      {CATEGORIES.map(cat => {
        const catSels = selections[cat.id] || [];
        const catSugg = suggestions[cat.id];
        if (!catSels.length && !catSugg) return null;
        return (
          <div key={cat.id} style={S.reviewCat}>
            <div style={S.reviewCatHead}>{cat.emoji} {cat.label}</div>
            {catSels.length > 0 && (
              <div style={S.reviewTags}>
                {catSels.map(s => <span key={s} style={S.reviewTag}>{s}</span>)}
              </div>
            )}
            {catSugg && <p style={S.reviewSugg}>💡 {catSugg}</p>}
          </div>
        );
      })}

      {comment && (
        <div style={S.reviewComment}><strong>💬</strong> {comment}</div>
      )}

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.submitArea}>
        <button style={{ ...S.primaryBtn, ...(loading ? S.disabled : {}) }} onClick={handleSubmit}>
          {loading ? 'Saving...' : '✓ Submit my responses'}
        </button>
        <button style={{ ...S.ghostBtn, display:'block', margin:'10px auto 0' }} onClick={() => setScreen('survey')}>← Go back and edit</button>
      </div>
    </div>
  );

  // ── SUCCESS ───────────────────────────────────────────────────
  if (screen === 'success') return (
    <div style={S.root}>
      <div style={S.successCard}>
        <div style={{ fontSize:64 }}>🎉</div>
        <h2 style={{ fontFamily:"'Georgia',serif", fontSize:28, color:'#2C1A0E', margin:'12px 0 8px' }}>Thanks!</h2>
        <p style={{ color:'#666', marginBottom:8, fontFamily:'sans-serif' }}>Your preferences have been saved.</p>
        {responseCount > 0 && (
          <p style={{ color:'#D4A96A', fontSize:14, fontFamily:'sans-serif' }}>
            {responseCount} resident{responseCount !== 1 ? 's' : ''} have now responded.
          </p>
        )}
        <button style={{ ...S.primaryBtn, marginTop:20 }}
          onClick={() => { setSelections(EMPTY_SELECTIONS()); setSuggestions(EMPTY_SUGGESTIONS()); setComment(''); setScreen('home'); }}>
          ← Back to start
        </button>
      </div>
    </div>
  );

  // ── ADMIN ─────────────────────────────────────────────────────
  if (screen === 'admin') {
    const tally = {};
    CATEGORIES.forEach(cat => {
      tally[cat.id] = {};
      cat.options.forEach(opt => { tally[cat.id][opt] = 0; });
    });
    (adminData || []).forEach(r => {
      if (!r.selections) return;
      CATEGORIES.forEach(cat => {
        (r.selections[cat.id] || []).forEach(opt => {
          if (tally[cat.id][opt] !== undefined) tally[cat.id][opt]++;
        });
      });
    });

    const totalResponses = adminData?.length || 0;
    const allSuggestions = [];
    const allComments = [];
    (adminData || []).forEach(r => {
      if (r.comment) allComments.push({ text: r.comment, date: r.created_at });
      CATEGORIES.forEach(cat => {
        const s = r.suggestions?.[cat.id];
        if (s) allSuggestions.push({ cat: cat.label, text: s });
      });
    });

    function downloadCSV() {
      const rows = [['Category', 'Option', 'Votes', 'Percentage']];
      CATEGORIES.forEach(cat => {
        cat.options.forEach(opt => {
          const votes = tally[cat.id][opt] || 0;
          const pct = totalResponses > 0 ? Math.round((votes / totalResponses) * 100) : 0;
          rows.push([cat.label, opt, votes, `${pct}%`]);
        });
      });
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'paynter-bar-survey-results.csv';
      a.click();
    }

    return (
      <div style={S.root}>
        <div style={S.topBar}>
          <div>
            <h1 style={S.topTitle}>Admin — Results</h1>
            <p style={S.topSub}>{totalResponses} response{totalResponses !== 1 ? 's' : ''} received</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={S.smallBtn} onClick={downloadCSV}>⬇ CSV</button>
            <button style={{ ...S.smallBtn, background: surveyOpen ? '#cc3333' : '#2d7a2d', color:'#fff', border:'none' }}
              onClick={async () => { const next = !surveyOpen; await setSurveyOpen(next); setSurveyOpenState(next); }}>
              {surveyOpen ? '🔒 Close' : '✅ Open'}
            </button>
          </div>
        </div>

        {CATEGORIES.map(cat => {
          const catTally = tally[cat.id];
          const max = Math.max(...Object.values(catTally), 1);
          const sorted = [...cat.options].sort((a, b) => (catTally[b] || 0) - (catTally[a] || 0));
          return (
            <div key={cat.id} style={S.adminCatCard}>
              <div style={S.adminCatHead}>{cat.emoji} {cat.label}</div>
              {sorted.map(opt => {
                const count = catTally[opt] || 0;
                const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                return (
                  <div key={opt} style={S.adminRow}>
                    <div style={S.adminRowLabel}>{opt}</div>
                    <div style={S.adminBar}>
                      <div style={{ ...S.adminBarFill, width: `${Math.round((count / max) * 100)}%` }} />
                    </div>
                    <div style={S.adminCount}>{count} <span style={{ color:'#aaa', fontSize:11 }}>({pct}%)</span></div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {allSuggestions.length > 0 && (
          <div style={S.adminCatCard}>
            <div style={S.adminCatHead}>💡 Suggestions ({allSuggestions.length})</div>
            {allSuggestions.map((s, i) => (
              <div key={i} style={S.adminCommentRow}>
                <span style={S.adminCommentCat}>{s.cat}</span>
                <span style={{ color:'#333', fontSize:14, fontFamily:'sans-serif' }}>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        {allComments.length > 0 && (
          <div style={S.adminCatCard}>
            <div style={S.adminCatHead}>💬 Comments ({allComments.length})</div>
            {allComments.map((c, i) => (
              <div key={i} style={{ ...S.adminCommentRow, flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:11, color:'#aaa', fontFamily:'sans-serif' }}>{new Date(c.date).toLocaleDateString('en-AU')}</span>
                <span style={{ color:'#333', fontSize:14, fontFamily:'sans-serif' }}>{c.text}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign:'center', padding:'16px', display:'flex', gap:12, justifyContent:'center' }}>
          <button style={{ ...S.ghostBtn, color:'#cc3333' }}
            onClick={async () => {
              if (!confirm('Delete ALL responses? This cannot be undone.')) return;
              await supabase.from('responses').delete().gte('created_at', '2000-01-01');
              setAdminData([]);
            }}>
            🗑 Reset all responses
          </button>
          <button style={S.ghostBtn} onClick={() => setScreen('home')}>← Home</button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  root: { minHeight:'100vh', background:'#FAF6F0', fontFamily:"'Georgia', serif", maxWidth:600, margin:'0 auto', paddingBottom:40 },
  hero: { background:'linear-gradient(160deg, #2C1A0E 0%, #4a2c14 100%)', color:'#F5E6C8', padding:'40px 24px 32px', textAlign:'center' },
  heroIcon: { fontSize:52, marginBottom:8 },
  heroTitle: { fontSize:32, fontWeight:400, margin:'0 0 4px', letterSpacing:1.5, color:'#F5C842' },
  heroSub: { fontSize:12, textTransform:'uppercase', letterSpacing:3, color:'#D4A96A', margin:'0 0 12px' },
  heroDesc: { fontSize:14, color:'#E8D5B7', maxWidth:380, margin:'0 auto 16px', lineHeight:1.6, fontFamily:'sans-serif' },
  countBadge: { display:'inline-block', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(212,169,106,0.5)', borderRadius:20, padding:'6px 16px', fontSize:13, color:'#F5E6C8', fontFamily:'sans-serif' },
  card: { background:'#fff', margin:'14px 14px 0', borderRadius:12, padding:'20px', border:'1px solid #F0E0C8', boxShadow:'0 2px 8px rgba(44,26,14,0.06)' },
  cardTitle: { fontFamily:"'Georgia',serif", fontSize:17, color:'#2C1A0E', margin:'0 0 10px' },
  instrText: { fontSize:14, color:'#555', lineHeight:1.6, margin:'0 0 14px', fontFamily:'sans-serif' },
  catPreview: { display:'flex', flexWrap:'wrap', gap:6 },
  catChip: { fontSize:12, fontFamily:'sans-serif', background:'#FAF6F0', border:'1px solid #E8D5B7', borderRadius:12, padding:'4px 10px', color:'#555' },
  startBtn: { width:'100%', padding:'16px', background:'#2C1A0E', color:'#F5C842', border:'none', borderRadius:10, fontSize:17, fontFamily:"'Georgia',serif", cursor:'pointer', letterSpacing:0.5 },
  topBar: { background:'#2C1A0E', color:'#F5E6C8', padding:'16px 16px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  topTitle: { fontSize:18, fontWeight:400, margin:0, color:'#F5C842', fontFamily:"'Georgia',serif", letterSpacing:0.5 },
  topSub: { fontSize:11, color:'#D4A96A', margin:'2px 0 0', letterSpacing:1, fontFamily:'sans-serif' },
  progressBadge: { background:'rgba(245,200,66,0.2)', border:'1px solid rgba(245,200,66,0.4)', borderRadius:12, padding:'4px 12px', fontSize:13, color:'#F5C842', whiteSpace:'nowrap', fontFamily:'sans-serif' },
  catCard: { background:'#fff', margin:'10px 14px 0', borderRadius:12, padding:'16px', border:'1px solid #F0E0C8', boxShadow:'0 1px 4px rgba(44,26,14,0.04)', transition:'border-color 0.2s, box-shadow 0.2s' },
  catCardActive: { borderColor:'#D4A96A', boxShadow:'0 2px 10px rgba(212,169,106,0.15)' },
  catHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:12 },
  catEmoji: { fontSize:22 },
  catLabel: { fontFamily:"'Georgia',serif", fontSize:16, fontWeight:700, color:'#2C1A0E', flex:1 },
  catBadge: { background:'#F5C842', color:'#2C1A0E', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, fontFamily:'sans-serif' },
  optionsGrid: { display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 },
  optionLabel: { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:20, border:'1.5px solid #E8D5B7', cursor:'pointer', background:'#FAF6F0', transition:'all 0.15s', userSelect:'none' },
  optionLabelChecked: { background:'#2C1A0E', borderColor:'#2C1A0E' },
  optionCheck: { width:16, height:16, borderRadius:'50%', border:'1.5px solid #ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0, color:'transparent', fontFamily:'sans-serif' },
  optionCheckChecked: { background:'#F5C842', border:'1.5px solid #F5C842', color:'#2C1A0E', fontWeight:700 },
  optionText: { fontSize:13, color:'#2C1A0E', fontFamily:'sans-serif' },
  suggInput: { width:'100%', padding:'8px 12px', border:'1px solid #E8D5B7', borderRadius:8, fontSize:13, fontFamily:'sans-serif', color:'#444', background:'#FAF6F0', outline:'none', boxSizing:'border-box' },
  commentCard: { background:'#fff', margin:'10px 14px 0', borderRadius:12, padding:'20px', border:'1px solid #F0E0C8' },
  commentLabel: { display:'block', fontSize:14, color:'#2C1A0E', marginBottom:8, fontFamily:"'Georgia',serif" },
  commentArea: { width:'100%', minHeight:80, padding:'10px 12px', border:'1px solid #E8D5B7', borderRadius:8, fontSize:13, fontFamily:'sans-serif', color:'#444', resize:'vertical', boxSizing:'border-box', outline:'none' },
  submitArea: { padding:'20px 14px 0', textAlign:'center' },
  submitHint: { color:'#aaa', fontSize:13, margin:'0 0 10px', fontFamily:'sans-serif' },
  primaryBtn: { display:'block', width:'100%', padding:'14px', background:'#2C1A0E', color:'#F5C842', border:'none', borderRadius:10, fontSize:15, fontFamily:"'Georgia',serif", cursor:'pointer', textAlign:'center' },
  ghostBtn: { background:'none', border:'1px solid #ddd', borderRadius:8, padding:'8px 16px', color:'#888', cursor:'pointer', fontSize:13, fontFamily:'sans-serif' },
  smallBtn: { padding:'7px 14px', border:'1px solid #ddd', borderRadius:8, background:'#fff', fontSize:12, cursor:'pointer', fontFamily:'sans-serif', color:'#555' },
  disabled: { opacity:0.4, pointerEvents:'none' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #E8D5B7', borderRadius:8, fontSize:14, fontFamily:'sans-serif', outline:'none', boxSizing:'border-box', marginBottom:10 },
  adminBox: { marginTop:14, display:'flex', gap:8, alignItems:'center' },
  errorBox: { margin:'10px 14px', background:'#fff0f0', border:'1px solid #ffcccc', borderRadius:8, padding:'10px 14px', color:'#cc3333', fontSize:13, fontFamily:'sans-serif' },
  reviewCat: { background:'#fff', margin:'8px 14px 0', borderRadius:10, padding:'14px 16px', border:'1px solid #F0E0C8' },
  reviewCatHead: { fontSize:14, fontWeight:700, color:'#2C1A0E', marginBottom:8, fontFamily:"'Georgia',serif" },
  reviewTags: { display:'flex', flexWrap:'wrap', gap:6 },
  reviewTag: { background:'#2C1A0E', color:'#F5C842', fontSize:12, padding:'4px 10px', borderRadius:12, fontFamily:'sans-serif' },
  reviewSugg: { fontSize:13, color:'#888', margin:'6px 0 0', fontStyle:'italic', fontFamily:'sans-serif' },
  reviewComment: { background:'#fff', margin:'8px 14px 0', borderRadius:10, padding:'14px 16px', border:'1px solid #F0E0C8', fontSize:13, color:'#555', fontFamily:'sans-serif' },
  successCard: { margin:'50px 20px', background:'#fff', borderRadius:16, padding:'40px 24px', textAlign:'center', boxShadow:'0 4px 24px rgba(44,26,14,0.1)', border:'1px solid #F0E0C8' },
  adminCatCard: { background:'#fff', margin:'10px 14px 0', borderRadius:12, padding:'16px', border:'1px solid #F0E0C8' },
  adminCatHead: { fontFamily:"'Georgia',serif", fontSize:15, color:'#2C1A0E', fontWeight:700, marginBottom:12, paddingBottom:8, borderBottom:'1px solid #F0E0C8' },
  adminRow: { display:'flex', alignItems:'center', gap:10, marginBottom:8 },
  adminRowLabel: { width:165, fontSize:13, color:'#444', fontFamily:'sans-serif', flexShrink:0 },
  adminBar: { flex:1, height:10, background:'#F0E0C8', borderRadius:5, overflow:'hidden' },
  adminBarFill: { height:'100%', background:'linear-gradient(90deg, #D4A96A, #F5C842)', borderRadius:5, transition:'width 0.4s ease' },
  adminCount: { width:65, textAlign:'right', fontSize:14, fontWeight:700, color:'#2C1A0E', fontFamily:'sans-serif', flexShrink:0 },
  adminCommentRow: { display:'flex', gap:10, alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #FAF6F0', fontFamily:'sans-serif' },
  adminCommentCat: { fontSize:11, fontWeight:700, color:'#D4A96A', textTransform:'uppercase', letterSpacing:0.5, flexShrink:0, width:130 },
};
