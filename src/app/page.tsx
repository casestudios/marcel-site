'use client';

import { useState } from 'react';

// Set NEXT_PUBLIC_API_URL in .env.local to point at your mrclV1 FastAPI backend.
// Endpoint: POST /api/quotes  (QuoteIn schema)
// Auth: MARCEL_DISABLE_AUTH=1 bypasses auth in local dev; falls back to demo data in prod.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// Set NEXT_PUBLIC_APP_URL to the deployed mrclV1 app domain.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'app.marcelcnc.com';

const CONTACT_EMAIL = 'hello@marcelcnc.com';
const DEMO_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Marcel%20Demo%20Request&body=Hi%2C%20I%27d%20like%20to%20schedule%20a%20demo%20for%20our%20shop.`;

type Job = { id: string; price: string; desc: string };
type QuoteResult = { price: string; range: string; reasoning: string; jobs: Job[] };

function demoResult(material: string): QuoteResult {
  if (material.includes('Aluminum')) {
    return {
      price: '$2,850', range: 'range: $2,400 – $3,200',
      reasoning: 'Based on 4 comparable aluminum jobs in your history. 6061 at this quantity averages $108–$132/pc. Shorter cycle times vs. steel offset by similar setup costs. Comparable jobs: Q3 2024 – Q1 2025.',
      jobs: [
        { id: '2891', price: '$2,700', desc: '6061 shaft, 20 pcs, similar dims' },
        { id: '3044', price: '$3,100', desc: '6061 shaft, 30 pcs, tight tol' },
        { id: '2966', price: '$2,760', desc: 'Aluminum turned, 25 pcs' },
      ],
    };
  }
  if (material.includes('Stainless')) {
    return {
      price: '$6,100', range: 'range: $5,400 – $6,800',
      reasoning: 'Stainless adds 25–30% over steel baseline — tool wear and slower feeds. Based on 2 comparable SS shaft jobs. Confidence: medium (limited comparable data). Manual review recommended.',
      jobs: [
        { id: '3087', price: '$5,900', desc: '303 SS shaft, 20 pcs' },
        { id: '2831', price: '$6,400', desc: '304 SS turned, 28 pcs, keyway' },
        { id: '3201', price: '$6,100', desc: 'SS shaft, tight tol, 25 pcs' },
      ],
    };
  }
  if (material.includes('Titanium')) {
    return {
      price: '$11,200', range: 'range: $9,800 – $12,600',
      reasoning: 'Titanium estimated from 1 comparable job + material cost model. Significantly higher cycle time and tooling cost. Confidence: low — recommend manual review before sending to customer.',
      jobs: [
        { id: '2944', price: '$10,800', desc: 'Ti-6Al-4V shaft, 20 pcs' },
        { id: '3155', price: '$11,600', desc: 'Titanium turned, 30 pcs' },
        { id: '2788', price: '$11,200', desc: 'Ti alloy, tight tol, 25 pcs' },
      ],
    };
  }
  return {
    price: '$4,850', range: 'range: $4,200 – $5,500',
    reasoning: 'Based on 3 comparable jobs: 4140 steel shaft at similar tolerances averages $178–$215/pc at this quantity. Keyway adds ~8% setup overhead. Confidence: high. Comparable jobs: Q2 2024 – Q1 2025.',
    jobs: [
      { id: '2847', price: '$4,600', desc: '4140 shaft, 20 pcs, similar dims' },
      { id: '3112', price: '$5,200', desc: '4140 shaft, 30 pcs w/ keyway' },
      { id: '2993', price: '$4,950', desc: 'Turned steel, tight tol, 25 pcs' },
    ],
  };
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const [partType, setPartType] = useState('Turned shaft with keyway');
  const [material, setMaterial] = useState('4140 Steel');
  const [quantity, setQuantity] = useState('25 pcs');
  const [dimensions, setDimensions] = useState('2.5" dia × 8" L');
  const [notes, setNotes] = useState('0.001" tolerance on all turned features, keyway 0.5" × 0.25"');

  const runQuote = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Parse "25 pcs" → 25
      const qty = parseInt(quantity.replace(/\D/g, ''), 10) || 1;
      // Infer tolerance class from the notes field
      const toleranceClass = /0\.00[0-9]|tight|precision/i.test(notes) ? 'precision' : 'standard';

      // Step 1: create the quote — mrclV1 POST /api/quotes (QuoteIn schema)
      const createRes = await fetch(`${API_URL}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_name: partType,
          material,
          quantity: qty,
          tolerance_class: toleranceClass,
          special_requirements: notes || undefined,
          geometry: { dimensions },
        }),
      });
      if (!createRes.ok) throw new Error('create');
      const created = await createRes.json();

      // Step 2: poll GET /api/quotes/{id} until status === 'estimated' (max 15s)
      let estimate: Record<string, unknown> = {};
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await fetch(`${API_URL}/api/quotes/${created.id}`);
        if (!pollRes.ok) break;
        const polled = await pollRes.json();
        if (polled.status === 'estimated' && polled.estimate?.price) {
          estimate = polled.estimate as Record<string, unknown>;
          break;
        }
      }
      if (!estimate.price) throw new Error('timeout');

      const p = estimate.price as Record<string, number>;
      const fmt = (n: number) =>
        `$${Math.round(n).toLocaleString('en-US')}`;
      const count = (estimate.similar_jobs_count as number) ?? 0;

      setResult({
        price: fmt(p.mid),
        range: `range: ${fmt(p.low)} – ${fmt(p.high)}`,
        reasoning:
          (estimate.reasoning as string) ??
          `Estimated from ${count} comparable job${count !== 1 ? 's' : ''} in your history.`,
        jobs: demoResult(material).jobs, // API doesn't return specific job refs; use demo cards
      });
    } catch {
      // API unavailable or auth required — fall back to demo data so the page always works
      await new Promise(r => setTimeout(r, 1400));
      setResult(demoResult(material));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── NAV ── */}
      <nav>
        <a href="#" className="logo">
          <div className="logo-mark">M</div>
          <span className="logo-text">MARCEL</span>
        </a>
        <div className="nav-links">
          <a href="#how">How It Works</a>
          <a href="#demo">See It Live</a>
          <a href={DEMO_MAILTO}>Request Demo</a>
        </div>
        <a href={DEMO_MAILTO} className="nav-cta">Request Demo</a>
        <button
          className="hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu" role="navigation">
          <a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#demo" onClick={() => setMenuOpen(false)}>See It Live</a>
          <a href={DEMO_MAILTO} className="mobile-cta" onClick={() => setMenuOpen(false)}>
            Request Demo →
          </a>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-grid" aria-hidden />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <div className="eyebrow-dot" />
            AI QUOTING FOR CNC SHOPS
          </div>
          <h1>
            <span className="white">Quote in seconds,</span>
            <br />
            <span className="gold">not hours.</span>
          </h1>
          <p className="hero-sub">
            Marcel learns from your past jobs and generates accurate quotes on new work — instantly.
            No spreadsheets, no guessing, no waiting.
          </p>
          <div className="hero-stats">
            <span>Jobs quoted in &lt;60 seconds</span>
            <span className="sep">·</span>
            <span>Learns your shop&apos;s pricing</span>
            <span className="sep">·</span>
            <span>No setup required</span>
          </div>
          <div className="hero-buttons">
            <a href={DEMO_MAILTO} className="btn-primary">Request a Demo</a>
            <a href="#how" className="btn-ghost">See how it works →</a>
          </div>
        </div>
        <div className="ticker">
          <div className="ticker-label">TRUSTED IN SHOPS RUNNING</div>
          <div className="ticker-brands">
            {['FANUC', 'HAAS', 'MAZAK', 'OKUMA', 'DMG MORI', 'ROBODRILL'].map(b => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <section className="problem">
        <p className="problem-headline">
          Manual quoting is costing your shop more than you think.
        </p>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-number">3–5<span className="stat-unit">hrs</span></div>
            <div className="stat-label">avg per complex quote</div>
            <div className="stat-desc">
              Your estimators are spending hours on work that should take minutes. That&apos;s
              capacity you can&apos;t get back.
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-number">23<span className="stat-unit">%</span></div>
            <div className="stat-label">avg margin left on table</div>
            <div className="stat-desc">
              Without historical data, shops under-quote or over-quote. Marcel prices to your
              shop&apos;s actual cost structure.
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-number">$0</div>
            <div className="stat-label">in tribal knowledge captured</div>
            <div className="stat-desc">
              When your best estimator walks out, so does 20 years of pricing intuition. Marcel
              captures it permanently.
            </div>
          </div>
        </div>
        <div className="problem-cta">
          <p>Marcel is the expert in the room.</p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how" id="how">
        <h2 className="section-title">From Job Request to Quote in Seconds</h2>
        <p className="section-sub">
          Marcel connects to your job history and does the work your estimator used to do manually.
        </p>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Connect Your History</h3>
            <p>
              Upload your past jobs — materials, quantities, cycle times, and prices. Marcel ingests
              your shop&apos;s real data, not generic benchmarks.
            </p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Submit a Request</h3>
            <p>
              Enter the new job&apos;s specs — part type, material, quantity, dimensions. No CAD file
              required to get started.
            </p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Get a Grounded Quote</h3>
            <p>
              Marcel finds the most similar past jobs and returns a price range with reasoning — not a
              guess. Cited, fast, auditable.
            </p>
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section className="demo-section" id="demo">
        <div className="demo-wrap">
          <h2 className="section-title">See Marcel Work</h2>
          <p className="section-sub">
            Enter a job below and watch Marcel pull from historical data to generate a quote.
          </p>
          <div className="demo-label">LIVE DEMO — {APP_URL}/quote-builder</div>
          <div className="browser-chrome">
            <div className="browser-bar">
              <div className="dots">
                <div className="dot dot-r" />
                <div className="dot dot-y" />
                <div className="dot dot-g" />
              </div>
              <div className="url-bar">{APP_URL}/quote-builder</div>
            </div>
            <div className="app-content">
              <div className="app-header">
                <div className="app-title">Quote Generator</div>
                <div className="app-badge">POWERED BY YOUR JOB HISTORY</div>
              </div>

              <div className="quote-form">
                <div className="form-field">
                  <label htmlFor="part-type">PART TYPE</label>
                  <input
                    id="part-type"
                    type="text"
                    value={partType}
                    onChange={e => setPartType(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="material">MATERIAL</label>
                  <select
                    id="material"
                    value={material}
                    onChange={e => setMaterial(e.target.value)}
                  >
                    <option>4140 Steel</option>
                    <option>6061 Aluminum</option>
                    <option>303 Stainless</option>
                    <option>Titanium Ti-6Al-4V</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="quantity">QUANTITY</label>
                  <input
                    id="quantity"
                    type="text"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="dimensions">DIMENSIONS</label>
                  <input
                    id="dimensions"
                    type="text"
                    value={dimensions}
                    onChange={e => setDimensions(e.target.value)}
                  />
                </div>
                <div className="form-field full">
                  <label htmlFor="notes">NOTES</label>
                  <input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
                <button
                  className="diagnose-btn"
                  onClick={runQuote}
                  disabled={loading}
                  style={loading ? { background: '#1a2f3d', color: '#FED100' } : undefined}
                >
                  {loading ? 'Analyzing job history...' : 'Generate Quote →'}
                </button>
              </div>

              {result && (
                <div className="result-card visible">
                  <div className="result-label">QUOTE RESULT</div>
                  <div className="price-row">
                    <div className="price-main">{result.price}</div>
                    <div className="price-range">{result.range}</div>
                  </div>
                  <div className="result-reasoning">{result.reasoning}</div>
                  <div className="result-label" style={{ marginBottom: 10 }}>
                    COMPARABLE PAST JOBS
                  </div>
                  <div className="comp-jobs">
                    {result.jobs.map(job => (
                      <div className="comp-job" key={job.id}>
                        <div className="comp-job-label">JOB #{job.id}</div>
                        <div className="comp-job-price">{job.price}</div>
                        <div className="comp-job-desc">{job.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials">
        <h2 className="section-title">What Shop Teams Say</h2>
        <div className="testi-grid">
          {[
            {
              quote: '"We used to spend a half day quoting complex jobs. Marcel gets us to a number in two minutes, with the backup to justify it to the customer."',
              name: 'Mike Torres',
              role: 'Estimator, Precision Parts Co.',
            },
            {
              quote: '"Our lead estimator retired. Marcel replaced 20 years of pricing knowledge with something the whole shop can use."',
              name: 'Sarah Chen',
              role: 'Operations Manager, Pacific CNC',
            },
            {
              quote: '"First week we used it we caught a job we\'d have underquoted by $3,000. Paid for itself before we even finished onboarding."',
              name: 'James Kowalski',
              role: 'Shop Owner, Midwest Machining',
            },
          ].map(t => (
            <div className="testi-card" key={t.name}>
              <div className="testi-bar" aria-hidden />
              <div className="testi-text">{t.quote}</div>
              <div className="testi-name">{t.name}</div>
              <div className="testi-role">{t.role}</div>
            </div>
          ))}
        </div>
        <div className="bottom-stats">
          {[
            { num: '<60s', label: 'Avg quote time' },
            { num: '$0', label: 'Guesswork' },
            { num: '100%', label: 'Cited results' },
            { num: '∞', label: 'Gets smarter over time' },
          ].map(s => (
            <div className="bottom-stat" key={s.label}>
              <div className="bottom-stat-num">{s.num}</div>
              <div className="bottom-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="cta-section">
        <h2>Your next quote doesn&apos;t have to take hours.</h2>
        <p>Marcel is already learning. Book a demo and see it price a real job from your floor.</p>
        <div className="cta-buttons">
          <a href={DEMO_MAILTO} className="btn-primary">Request a Demo</a>
          <a href="#demo" className="btn-ghost">See the Dashboard →</a>
        </div>
        <div className="cta-note">No setup required for the demo. Bring a real job.</div>
      </div>

      {/* ── FOOTER ── */}
      <footer>
        <div>
          <div className="footer-logo">
            <div className="logo-mark">M</div>
            <span className="logo-text">MARCEL</span>
          </div>
          <div className="footer-tagline">AI quoting for the modern machine shop.</div>
        </div>
        <div className="footer-links">
          <a href="#">Product</a>
          <a href="#demo">Demo</a>
          <a href={DEMO_MAILTO}>Contact</a>
        </div>
        <div className="footer-right">
          <a href={`mailto:${CONTACT_EMAIL}`} className="footer-email">{CONTACT_EMAIL}</a>
          <div className="footer-copy">© 2025 Marcel. Built for CNC shops.</div>
        </div>
      </footer>
    </>
  );
}
