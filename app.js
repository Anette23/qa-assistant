// ─────────────────────────────────────────
//  QA Assistant — app.js
// ─────────────────────────────────────────

let currentTab = 'plan';
let selectedSeverity = 'medium';
let generationCount = 0;
let apiKey = 'hidden'; // API key is stored securely in Cloudflare Worker

// Execution state (persisted to localStorage)
let execSession = loadExecSession();

// ── Init ──────────────────────────────────
document.getElementById('statusDot').classList.add('active');

switchTab('plan');
renderExecList();
updateExecStats();

// ── API Key (not needed, handled by Worker) ───────────────────────────────
function saveKey() {
  showToast('✓ Pripojené!');
}

// ── LocalStorage helpers ──────────────────
function loadExecSession() {
  try {
    const raw = localStorage.getItem('qa_exec_session');
    return raw ? JSON.parse(raw) : { testCases: [], feature: '' };
  } catch { return { testCases: [], feature: '' }; }
}

function saveExecSession() {
  localStorage.setItem('qa_exec_session', JSON.stringify(execSession));
}

// ── Tab switching ─────────────────────────
function switchTab(tab) {
  currentTab = tab;

  const tabs = ['plan', 'testcase', 'acceptance', 'execution', 'bug', 'notes', 'review'];

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', tabs[i] === tab);
  });

  // Update workflow bar
  document.querySelectorAll('.workflow-step').forEach(step => {
    const t = step.dataset.tab;
    step.classList.toggle('active', t === tab);
  });

  // Show/hide views
  const isExecution = tab === 'execution';
  document.getElementById('execution-view').style.display = isExecution ? 'block' : 'none';
  document.getElementById('standard-view').style.display = isExecution ? 'none' : 'grid';

  if (!isExecution) {
    document.querySelectorAll('.mode-form').forEach(f => f.classList.remove('active'));
    const form = document.getElementById('form-' + tab);
    if (form) form.classList.add('active');

    const titles = {
      plan:       'Test Plan Generator',
      testcase:   'Test Case Generator',
      acceptance: 'Acceptance Criteria Generator',
      bug:        'Bug Report Generator',
      notes:      'Test Notes & Summary Generator',
      review:     'QA Review Tool'
    };
    document.getElementById('inputPanelTitle').textContent = titles[tab] || '';
  }
}

// ── Severity badge ────────────────────────
function selectBadge(el) {
  el.closest('.badge-row').querySelectorAll('.badge').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedSeverity = el.textContent.toLowerCase();
}

// ═══════════════════════════════════════════
//  EXECUTION
// ═══════════════════════════════════════════

async function generateForExecution() {

  const feature = document.getElementById('exec-feature').value.trim();
  const desc    = document.getElementById('exec-desc').value.trim();
  const type    = document.getElementById('exec-type').value;
  const count   = document.getElementById('exec-count').value;

  if (!feature) { showToast('⚠️ Zadaj názov featury!'); return; }

  const btn = document.querySelector('#execGeneratePanel .btn-generate');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader"><div class="spinner"></div><span>Generujem...</span></div>';

  const listEl = document.getElementById('execTestList');
  listEl.innerHTML = '<div class="exec-empty"><div class="empty-icon typing-cursor"></div><p style="color:var(--accent)">AI generuje test cases...</p></div>';

  const prompt = `Si skúsený QA inžinier. Vytvor ${count} test cases pre exekúciu.

Feature: ${feature}
Popis: ${desc || 'nie je zadaný'}
Typ: ${type}

Odpoveď vráť VÝHRADNE v JSON (žiadny markdown):
{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Krátky názov testu",
      "preconditions": "Predpoklady",
      "steps": ["Krok 1", "Krok 2", "Krok 3"],
      "expectedResult": "Očakávaný výsledok",
      "priority": "High"
    }
  ]
}`;

  try {
    const response = await fetch('https://qa-proxy.anet-krajcovicovie.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key handled by Worker
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.content[0].text;
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    // Build session
    execSession.feature = feature;
    execSession.testCases = parsed.testCases.map(tc => ({
      ...tc,
      status: 'pending',
      notes: ''
    }));
    saveExecSession();
    renderExecList();
    updateExecStats();
    showToast(`✓ ${parsed.testCases.length} test cases pripravených!`);

  } catch (err) {
    listEl.innerHTML = `<div class="exec-empty"><div class="empty-icon">⚠️</div><p style="color:var(--accent3)">${err.message}</p></div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Generovať & spustiť exekúciu</span><span>→</span>';
  }
}

function renderExecList() {
  const listEl = document.getElementById('execTestList');
  const tcs = execSession.testCases;

  if (!tcs || tcs.length === 0) {
    listEl.innerHTML = `
      <div class="exec-empty">
        <div class="empty-icon">▶️</div>
        <p>Vygeneruj test cases a začni exekúciu</p>
      </div>`;
    return;
  }

  // Progress bar
  const done = tcs.filter(t => t.status !== 'pending').length;
  const pct = Math.round((done / tcs.length) * 100);

  let html = `
    <div class="exec-progress">
      <div class="exec-progress-fill" style="width:${pct}%"></div>
    </div>`;

  tcs.forEach((tc, idx) => {
    const statusLabels = { pending: '—', pass: '✓ Pass', fail: '✗ Fail', blocked: '⛔ Blocked', skipped: '⏭ Skipped' };
    const statusClass = tc.status !== 'pending' ? `status-${tc.status}` : '';
    const expanded = tc.expanded ? 'expanded' : '';

    html += `
      <div class="tc-card ${statusClass} ${expanded}" id="tcCard-${idx}">
        <div class="tc-card-header" onclick="toggleCard(${idx})">
          <span class="tc-card-id">${tc.id}</span>
          <span class="tc-card-title">${tc.title}</span>
          <span class="tc-status-indicator">${statusLabels[tc.status] || '—'}</span>
          <span class="tc-chevron">›</span>
        </div>
        <div class="tc-card-body">
          <div class="tc-detail-row">
            <div class="tc-detail-label">Predpoklady</div>
            <div class="tc-detail-value">${tc.preconditions}</div>
          </div>
          <div class="tc-detail-row">
            <div class="tc-detail-label">Kroky</div>
            <div class="tc-detail-value">${tc.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>')}</div>
          </div>
          <div class="tc-detail-row">
            <div class="tc-detail-label">Expected Result</div>
            <div class="tc-detail-value" style="color:var(--accent)">${tc.expectedResult}</div>
          </div>

          <div class="tc-actions">
            <button class="tc-action-btn pass ${tc.status === 'pass' ? 'active-pass' : ''}" onclick="setStatus(${idx}, 'pass')">✓ Pass</button>
            <button class="tc-action-btn fail ${tc.status === 'fail' ? 'active-fail' : ''}" onclick="setStatus(${idx}, 'fail')">✗ Fail</button>
            <button class="tc-action-btn blocked ${tc.status === 'blocked' ? 'active-blocked' : ''}" onclick="setStatus(${idx}, 'blocked')">⛔ Blocked</button>
            <button class="tc-action-btn skipped ${tc.status === 'skipped' ? 'active-skipped' : ''}" onclick="setStatus(${idx}, 'skipped')">⏭ Skipped</button>
          </div>

          <textarea
            class="tc-notes-input"
            placeholder="Poznámky k tomuto testu (voliteľné)..."
            onchange="saveNotes(${idx}, this.value)"
          >${tc.notes || ''}</textarea>

          <button class="tc-bug-btn" onclick="prefillBugFromTC(${idx})">
            🐛 Vytvoriť Bug Report z tohto testu
          </button>
        </div>
      </div>`;
  });

  listEl.innerHTML = html;
}

function toggleCard(idx) {
  execSession.testCases[idx].expanded = !execSession.testCases[idx].expanded;
  saveExecSession();
  renderExecList();
}

function setStatus(idx, status) {
  execSession.testCases[idx].status = status;
  // Auto-expand on fail/blocked to see bug button
  if (status === 'fail' || status === 'blocked') {
    execSession.testCases[idx].expanded = true;
  }
  saveExecSession();
  renderExecList();
  updateExecStats();
}

function saveNotes(idx, value) {
  execSession.testCases[idx].notes = value;
  saveExecSession();
}

function updateExecStats() {
  const tcs = execSession.testCases || [];
  const count = (status) => tcs.filter(t => t.status === status).length;
  document.getElementById('statPass').textContent    = count('pass');
  document.getElementById('statFail').textContent    = count('fail');
  document.getElementById('statBlocked').textContent = count('blocked');
  document.getElementById('statSkipped').textContent = count('skipped');
  document.getElementById('statTotal').textContent   = tcs.length;
}

function clearExecution() {
  if (!confirm('Vymazať celú execution session?')) return;
  execSession = { testCases: [], feature: '' };
  saveExecSession();
  renderExecList();
  updateExecStats();
  document.getElementById('execSummaryPanel').style.display = 'none';
  showToast('Session vymazaná');
}

// ── Prefill bug report from failed TC ────
function prefillBugFromTC(idx) {
  const tc = execSession.testCases[idx];
  switchTab('bug');
  document.getElementById('bug-title').value = `[FAIL] ${tc.title}`;
  document.getElementById('bug-steps').value = tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  document.getElementById('bug-expected').value = tc.expectedResult;
  document.getElementById('bug-actual').value = tc.notes || '';
  showToast('✓ Bug Report predvyplnený!');
}

// ── Execution Summary ─────────────────────
async function generateExecSummary() {
  const tcs = execSession.testCases;
  if (!tcs.length) { showToast('⚠️ Žiadne test cases!'); return; }

  const summaryPanel = document.getElementById('execSummaryPanel');
  const summaryContent = document.getElementById('execSummaryContent');
  summaryPanel.style.display = 'block';
  summaryContent.innerHTML = '<div class="result-empty"><div class="empty-icon typing-cursor"></div><p style="color:var(--accent)">Generujem summary...</p></div>';

  const stats = {
    total: tcs.length,
    pass: tcs.filter(t => t.status === 'pass').length,
    fail: tcs.filter(t => t.status === 'fail').length,
    blocked: tcs.filter(t => t.status === 'blocked').length,
    skipped: tcs.filter(t => t.status === 'skipped').length,
  };

  const tcSummary = tcs.map(tc =>
    `${tc.id} | ${tc.title} | ${tc.status.toUpperCase()}${tc.notes ? ` | Poznámka: ${tc.notes}` : ''}`
  ).join('\n');

  const prompt = `Si QA inžinier. Vytvor Test Execution Summary report.

Feature: ${execSession.feature}
Štatistiky: Total: ${stats.total}, Pass: ${stats.pass}, Fail: ${stats.fail}, Blocked: ${stats.blocked}, Skipped: ${stats.skipped}

Test Cases:
${tcSummary}

Odpoveď vráť VÝHRADNE v JSON (žiadny markdown):
{
  "summary": {
    "title": "Execution Summary — [feature]",
    "date": "dátum",
    "feature": "${execSession.feature}",
    "metrics": { "total": ${stats.total}, "pass": ${stats.pass}, "fail": ${stats.fail}, "blocked": ${stats.blocked}, "skipped": ${stats.skipped}, "passRate": "%" },
    "verdict": "Pass / Fail / Conditional Pass",
    "keyFindings": ["Nález 1", "Nález 2"],
    "blockers": ["Bloker 1"],
    "recommendations": ["Odporúčanie 1"],
    "conclusion": "Záverečné zhodnotenie"
  }
}`;

  try {
    const response = await fetch('https://qa-proxy.anet-krajcovicovie.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key handled by Worker
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.content[0].text;
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    renderExecSummary(parsed.summary, stats);

  } catch (err) {
    summaryContent.innerHTML = `<div class="result-empty"><div class="empty-icon">⚠️</div><p style="color:var(--accent3)">${err.message}</p></div>`;
  }
}

function renderExecSummary(s, stats) {
  const el = document.getElementById('execSummaryContent');
  const verdictColor = s.verdict?.toLowerCase().includes('pass') && !s.verdict?.toLowerCase().includes('fail')
    ? 'var(--accent)' : s.verdict?.toLowerCase().includes('conditional')
    ? 'var(--accent4)' : 'var(--accent3)';

  const pct = Math.round((stats.pass / stats.total) * 100);

  let html = `
    <div class="result-section">
      <div class="result-section-title">${s.title}</div>
      <table class="result-table">
        <tr><td style="width:140px;color:var(--text-muted)">Dátum</td><td>${s.date}</td></tr>
        <tr><td style="color:var(--text-muted)">Feature</td><td>${s.feature}</td></tr>
        <tr><td style="color:var(--text-muted)">Verdikt</td><td style="font-weight:700;color:${verdictColor}">${s.verdict}</td></tr>
        <tr><td style="color:var(--text-muted)">Pass Rate</td><td style="color:var(--accent);font-weight:700">${pct}% (${stats.pass}/${stats.total})</td></tr>
      </table>
    </div>

    <div class="result-section">
      <div class="result-section-title">Metriky</div>
      <table class="result-table">
        <tr><th>Total</th><th style="color:var(--accent)">Pass</th><th style="color:var(--accent3)">Fail</th><th style="color:var(--accent4)">Blocked</th><th style="color:var(--accent2)">Skipped</th></tr>
        <tr>
          <td style="font-weight:700">${stats.total}</td>
          <td style="color:var(--accent);font-weight:700">${stats.pass}</td>
          <td style="color:var(--accent3);font-weight:700">${stats.fail}</td>
          <td style="color:var(--accent4);font-weight:700">${stats.blocked}</td>
          <td style="color:var(--accent2);font-weight:700">${stats.skipped}</td>
        </tr>
      </table>
    </div>`;

  if (s.keyFindings?.length) {
    html += `<div class="result-section"><div class="result-section-title">Kľúčové nálezy</div>`;
    s.keyFindings.forEach(f => {
      html += `<div class="checklist-item"><span class="check-icon">●</span><span>${f}</span></div>`;
    });
    html += '</div>';
  }

  if (s.blockers?.length && s.blockers[0] !== 'Žiadne') {
    html += `<div class="result-section"><div class="result-section-title">Blokery</div>`;
    s.blockers.forEach(b => {
      html += `<div class="checklist-item"><span class="check-icon" style="color:var(--accent3)">⛔</span><span>${b}</span></div>`;
    });
    html += '</div>';
  }

  if (s.recommendations?.length) {
    html += `<div class="result-section"><div class="result-section-title">Odporúčania</div>`;
    s.recommendations.forEach(r => {
      html += `<div class="checklist-item"><span class="check-icon" style="color:var(--accent4)">→</span><span>${r}</span></div>`;
    });
    html += '</div>';
  }

  html += `<div class="result-section"><div class="result-section-title">Záver</div><p class="result-text">${s.conclusion}</p></div>`;

  el.innerHTML = html;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyExecSummary() {
  const el = document.getElementById('execSummaryContent');
  navigator.clipboard.writeText(el.innerText).then(() => showToast('✓ Skopírované!'));
}

// ═══════════════════════════════════════════
//  STANDARD GENERATE (other tabs)
// ═══════════════════════════════════════════

function buildPrompt(tab) {
  const prompts = {

    plan() {
      const project  = document.getElementById('plan-project').value;
      const scope    = document.getElementById('plan-scope').value;
      const type     = document.getElementById('plan-type').value;
      const timeline = document.getElementById('plan-timeline').value;
      return `Si senior QA inžinier. Vytvor test plán.
Projekt: ${project}, Scope: ${scope}, Typ: ${type}, Timeline: ${timeline}
Odpoveď VÝHRADNE JSON (žiadny markdown):
{"testPlan":{"projectName":"názov","objective":"cieľ","scope":{"inScope":["položka"],"outOfScope":["položka"]},"testTypes":["typ"],"testEnvironments":["env"],"entryExitCriteria":{"entry":["kritérium"],"exit":["kritérium"]},"testingPhases":[{"phase":"fáza","description":"popis","duration":"čas"}],"risks":[{"risk":"riziko","mitigation":"riešenie"}],"tools":["nástroj"],"deliverables":["dodatok"]}}`;
    },

    testcase() {
      const feature = document.getElementById('tc-feature').value;
      const desc    = document.getElementById('tc-desc').value;
      const type    = document.getElementById('tc-type').value;
      const count   = document.getElementById('tc-count').value;
      return `Si QA inžinier. Vytvor ${count} test cases. Feature: ${feature}, Popis: ${desc}, Typ: ${type}
Odpoveď VÝHRADNE JSON:
{"testCases":[{"id":"TC-001","title":"názov","preconditions":"predpoklady","steps":["krok 1"],"expectedResult":"výsledok","priority":"High","type":"typ"}]}`;
    },

    acceptance() {
      const story   = document.getElementById('ac-story').value;
      const context = document.getElementById('ac-context').value;
      const format  = document.getElementById('ac-format').value;
      return `Si QA expert. Vytvor acceptance criteria. Story: ${story}, Kontext: ${context}, Formát: ${format}
Odpoveď VÝHRADNE JSON:
{"acceptanceCriteria":{"userStory":"story","gherkin":[{"scenario":"názov","given":"given","when":"when","then":"then"}],"checklist":["kritérium"],"edgeCases":["edge case"],"outOfScope":["mimo scope"]}}`;
    },

    bug() {
      const title    = document.getElementById('bug-title').value;
      const steps    = document.getElementById('bug-steps').value;
      const actual   = document.getElementById('bug-actual').value;
      const expected = document.getElementById('bug-expected').value;
      const env      = document.getElementById('bug-env').value;
      return `Si QA inžinier. Vytvor bug report. Problém: ${title}, Kroky: ${steps}, Actual: ${actual}, Expected: ${expected}, Prostredie: ${env}, Severity: ${selectedSeverity}
Odpoveď VÝHRADNE JSON:
{"bugReport":{"id":"BUG-001","title":"názov","summary":"zhrnutie","severity":"${selectedSeverity}","priority":"High","status":"New","environment":"env","stepsToReproduce":["krok"],"actualResult":"actual","expectedResult":"expected","impact":"dopad","possibleCause":"príčina","attachments":"placeholder"}}`;
    },

    notes() {
      const what     = document.getElementById('notes-what').value;
      const findings = document.getElementById('notes-findings').value;
      const type     = document.getElementById('notes-type').value;
      return `Si QA inžinier. Vytvor ${type}. Testované: ${what}, Nálezy: ${findings}
Odpoveď VÝHRADNE JSON:
{"testReport":{"title":"názov","date":"dátum","summary":"summary","scope":"scope","findings":[{"type":"typ","description":"popis","severity":"level"}],"metrics":{"tested":"5","passed":"4","failed":"1","blocked":"0"},"recommendations":["odporúčanie"],"conclusion":"záver"}}`;
    },

    review() {
      const type    = document.getElementById('review-type').value;
      const content = document.getElementById('review-content').value;
      return `Si senior QA reviewer. Vykonaj review. Typ: ${type}, Obsah: ${content}
Odpoveď VÝHRADNE JSON:
{"review":{"overallScore":8,"verdict":"Pass","strengths":["silná stránka"],"issues":[{"severity":"Major","description":"problém","suggestion":"návrh"}],"improvements":["zlepšenie"],"summary":"záver"}}`;
    }
  };

  return prompts[tab]();
}

async function generate(tab) {

  const btn = document.querySelector(`#form-${tab} .btn-generate`);
  btn.disabled = true;
  btn.innerHTML = '<div class="loader"><div class="spinner"></div><span>Generujem...</span></div>';

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('resultContent').style.display = 'block';
  document.getElementById('resultContent').innerHTML =
    '<div class="result-empty"><div class="empty-icon typing-cursor"></div><p style="color:var(--accent)">AI generuje výstup...</p></div>';

  try {
    const response = await fetch('https://qa-proxy.anet-krajcovicovie.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key handled by Worker
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(tab) }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const rawText = data.content[0].text;
    let parsed;
    try {
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      document.getElementById('resultContent').innerHTML = `<div class="result-text">${rawText}</div>`;
      return;
    }

    renderResult(tab, parsed);
    generationCount++;
    document.getElementById('generationCount').textContent = `${generationCount} vygenerovaných`;

  } catch (err) {
    document.getElementById('resultContent').innerHTML =
      `<div class="result-empty"><div class="empty-icon">⚠️</div><p style="color:var(--accent3)">${err.message}</p></div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Generovať</span><span>→</span>';
  }
}

// ── Render standard results ───────────────
function renderResult(tab, data) {
  const el = document.getElementById('resultContent');
  let html = '';

  if (tab === 'plan' && data.testPlan) {
    const p = data.testPlan;
    html += `<div class="result-section"><div class="result-section-title">${p.projectName} — Test Plan</div>
      <p class="result-text" style="margin-bottom:12px">${p.objective}</p>
      <table class="result-table">
        <tr><th>In Scope</th><th>Out of Scope</th></tr>
        <tr><td>${p.scope.inScope.join('<br>')}</td><td>${p.scope.outOfScope.join('<br>')}</td></tr>
      </table></div>`;
    if (p.testingPhases?.length) {
      html += `<div class="result-section"><div class="result-section-title">Fázy</div>
        <table class="result-table"><tr><th>Fáza</th><th>Popis</th><th>Trvanie</th></tr>`;
      p.testingPhases.forEach(ph => {
        html += `<tr><td style="color:var(--accent)">${ph.phase}</td><td>${ph.description}</td><td>${ph.duration}</td></tr>`;
      });
      html += '</table></div>';
    }
    if (p.risks?.length) {
      html += `<div class="result-section"><div class="result-section-title">Riziká</div>`;
      p.risks.forEach(r => {
        html += `<div class="checklist-item"><span class="check-icon" style="color:var(--accent3)">⚠</span><span><strong>${r.risk}</strong> → ${r.mitigation}</span></div>`;
      });
      html += '</div>';
    }

  } else if (tab === 'testcase' && data.testCases) {
    html += `<div class="result-section"><div class="result-section-title">Test Cases (${data.testCases.length})</div>`;
    data.testCases.forEach(tc => {
      html += `<table class="result-table" style="margin-bottom:14px;">
        <tr><th colspan="2">${tc.id} — ${tc.title}</th></tr>
        <tr><td style="width:130px;color:var(--text-muted)">Priorita</td><td>${tc.priority} &nbsp;<span class="env-tag">${tc.type}</span></td></tr>
        <tr><td style="color:var(--text-muted)">Predpoklady</td><td>${tc.preconditions}</td></tr>
        <tr><td style="color:var(--text-muted)">Kroky</td><td>${tc.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>')}</td></tr>
        <tr><td style="color:var(--text-muted)">Expected</td><td style="color:var(--accent)">${tc.expectedResult}</td></tr>
      </table>`;
    });
    html += '</div>';

  } else if (tab === 'acceptance' && data.acceptanceCriteria) {
    const ac = data.acceptanceCriteria;
    html += `<div class="result-section"><div class="result-section-title">User Story</div><p class="result-text" style="font-style:italic">${ac.userStory}</p></div>`;
    if (ac.gherkin?.length) {
      html += `<div class="result-section"><div class="result-section-title">Gherkin Scenarios</div>`;
      ac.gherkin.forEach(g => {
        html += `<table class="result-table" style="margin-bottom:10px;">
          <tr><th colspan="2">${g.scenario}</th></tr>
          <tr><td style="width:60px;color:var(--accent2)">Given</td><td>${g.given}</td></tr>
          <tr><td style="color:var(--accent4)">When</td><td>${g.when}</td></tr>
          <tr><td style="color:var(--accent)">Then</td><td>${g.then}</td></tr>
        </table>`;
      });
      html += '</div>';
    }
    if (ac.checklist?.length) {
      html += `<div class="result-section"><div class="result-section-title">Checklist</div>`;
      ac.checklist.forEach(c => {
        html += `<div class="checklist-item"><span class="check-icon">◻</span><span>${c}</span></div>`;
      });
      html += '</div>';
    }
    if (ac.edgeCases?.length) {
      html += `<div class="result-section"><div class="result-section-title">Edge Cases</div>`;
      ac.edgeCases.forEach(e => {
        html += `<div class="checklist-item"><span class="check-icon" style="color:var(--accent4)">⚠</span><span>${e}</span></div>`;
      });
      html += '</div>';
    }

  } else if (tab === 'bug' && data.bugReport) {
    const b = data.bugReport;
    const sevColor = { critical: 'var(--accent3)', high: '#ff9500', medium: 'var(--accent4)', low: 'var(--accent)' }[b.severity?.toLowerCase()] || 'var(--text)';
    html += `<div class="result-section"><div class="result-section-title">Bug Report — ${b.id}</div>
      <table class="result-table">
        <tr><th colspan="2">${b.title}</th></tr>
        <tr><td style="width:120px;color:var(--text-muted)">Severity</td><td style="color:${sevColor};font-weight:600">${b.severity?.toUpperCase()}</td></tr>
        <tr><td style="color:var(--text-muted)">Priority</td><td>${b.priority}</td></tr>
        <tr><td style="color:var(--text-muted)">Status</td><td>${b.status}</td></tr>
        <tr><td style="color:var(--text-muted)">Prostredie</td><td><span class="env-tag">${b.environment}</span></td></tr>
        <tr><td style="color:var(--text-muted)">Summary</td><td>${b.summary}</td></tr>
        <tr><td style="color:var(--text-muted)">Kroky</td><td>${b.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join('<br>')}</td></tr>
        <tr><td style="color:var(--text-muted)">Actual</td><td style="color:var(--accent3)">${b.actualResult}</td></tr>
        <tr><td style="color:var(--text-muted)">Expected</td><td style="color:var(--accent)">${b.expectedResult}</td></tr>
        <tr><td style="color:var(--text-muted)">Dopad</td><td>${b.impact}</td></tr>
        <tr><td style="color:var(--text-muted)">Možná príčina</td><td>${b.possibleCause}</td></tr>
      </table></div>`;

  } else if (tab === 'notes' && data.testReport) {
    const r = data.testReport;
    html += `<div class="result-section"><div class="result-section-title">${r.title}</div>
      <table class="result-table">
        <tr><td style="width:120px;color:var(--text-muted)">Dátum</td><td>${r.date}</td></tr>
        <tr><td style="color:var(--text-muted)">Scope</td><td>${r.scope}</td></tr>
        <tr><td style="color:var(--text-muted)">Summary</td><td>${r.summary}</td></tr>
      </table></div>`;
    if (r.metrics) {
      html += `<div class="result-section"><div class="result-section-title">Metriky</div>
        <table class="result-table">
          <tr><th>Testované</th><th>Prešlo</th><th>Neprešlo</th><th>Blokované</th></tr>
          <tr>
            <td>${r.metrics.tested}</td>
            <td style="color:var(--accent)">${r.metrics.passed}</td>
            <td style="color:var(--accent3)">${r.metrics.failed}</td>
            <td style="color:var(--accent4)">${r.metrics.blocked}</td>
          </tr>
        </table></div>`;
    }
    if (r.findings?.length) {
      html += `<div class="result-section"><div class="result-section-title">Nálezy</div>`;
      r.findings.forEach(f => {
        html += `<div class="checklist-item"><span class="check-icon">●</span><span><strong>${f.type}</strong> — ${f.description}</span></div>`;
      });
      html += '</div>';
    }
    html += `<div class="result-section"><div class="result-section-title">Záver</div><p class="result-text">${r.conclusion}</p></div>`;

  } else if (tab === 'review' && data.review) {
    const r = data.review;
    const scoreColor = r.overallScore >= 8 ? 'var(--accent)' : r.overallScore >= 5 ? 'var(--accent4)' : 'var(--accent3)';
    html += `<div class="result-section"><div class="result-section-title">Review Výsledok</div>
      <table class="result-table">
        <tr><td style="width:130px;color:var(--text-muted)">Skóre</td><td style="font-size:1.4rem;font-weight:700;color:${scoreColor}">${r.overallScore}/10</td></tr>
        <tr><td style="color:var(--text-muted)">Verdikt</td><td style="font-weight:600">${r.verdict}</td></tr>
        <tr><td style="color:var(--text-muted)">Zhrnutie</td><td>${r.summary}</td></tr>
      </table></div>`;
    if (r.strengths?.length) {
      html += `<div class="result-section"><div class="result-section-title">Silné stránky</div>`;
      r.strengths.forEach(s => { html += `<div class="checklist-item"><span class="check-icon">✓</span><span>${s}</span></div>`; });
      html += '</div>';
    }
    if (r.issues?.length) {
      html += `<div class="result-section"><div class="result-section-title">Problémy</div>`;
      r.issues.forEach(i => {
        const ic = { critical: 'var(--accent3)', major: '#ff9500', minor: 'var(--accent4)' }[i.severity?.toLowerCase()] || 'var(--text-muted)';
        html += `<div class="checklist-item">
          <span class="check-icon" style="color:${ic}">●</span>
          <span><strong>[${i.severity}]</strong> ${i.description}<br>
          <small style="color:var(--accent)">💡 ${i.suggestion}</small></span>
        </div>`;
      });
      html += '</div>';
    }
  } else {
    el.innerHTML = `<div class="result-text">${JSON.stringify(data, null, 2)}</div>`;
    return;
  }

  el.innerHTML = html;
}

// ── Utility ───────────────────────────────
function copyOutput() {
  const el = document.getElementById('resultContent');
  if (!el.textContent.trim()) { showToast('Nič na kopírovanie'); return; }
  navigator.clipboard.writeText(el.innerText).then(() => showToast('✓ Skopírované!'));
}

function clearOutput() {
  document.getElementById('resultContent').style.display = 'none';
  document.getElementById('resultContent').innerHTML = '';
  document.getElementById('emptyState').style.display = 'flex';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
