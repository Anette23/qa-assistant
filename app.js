// ─────────────────────────────────────────
//  QA Assistant — app.js
// ─────────────────────────────────────────

let currentTab = 'testcase';
let selectedSeverity = 'medium';
let generationCount = 0;
let apiKey = localStorage.getItem('qa_api_key') || '';

// ── Init ──────────────────────────────────
if (apiKey) {
  document.getElementById('apiKeyInput').value = apiKey;
  document.getElementById('statusDot').classList.add('active');
}

// ── API Key ───────────────────────────────
function saveKey() {
  apiKey = document.getElementById('apiKeyInput').value.trim();
  if (apiKey) {
    localStorage.setItem('qa_api_key', apiKey);
    document.getElementById('statusDot').classList.add('active');
    showToast('✓ API kľúč uložený');
  }
}

// ── Tab switching ─────────────────────────
function switchTab(tab) {
  currentTab = tab;

  const tabs = ['testcase', 'bug', 'acceptance', 'notes', 'plan', 'review'];
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', tabs[i] === tab);
  });

  document.querySelectorAll('.mode-form').forEach(f => f.classList.remove('active'));
  document.getElementById('form-' + tab).classList.add('active');

  const titles = {
    testcase:   'Test Case Generator',
    bug:        'Bug Report Generator',
    acceptance: 'Acceptance Criteria Generator',
    notes:      'Test Notes & Summary Generator',
    plan:       'Test Plan Generator',
    review:     'QA Review Tool'
  };
  document.getElementById('inputPanelTitle').textContent = titles[tab];
}

// ── Severity badge selection ──────────────
function selectBadge(el) {
  el.closest('.badge-row').querySelectorAll('.badge').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedSeverity = el.textContent.toLowerCase();
}

// ── Prompt builder ────────────────────────
function buildPrompt(tab) {
  const prompts = {

    testcase() {
      const feature = document.getElementById('tc-feature').value;
      const desc    = document.getElementById('tc-desc').value;
      const type    = document.getElementById('tc-type').value;
      const count   = document.getElementById('tc-count').value;
      return `Si skúsený QA inžinier. Vytvor ${count} profesionálnych test cases pre nasledujúcu funkciu.

Feature: ${feature}
Popis: ${desc}
Typ testovania: ${type}

Odpoveď vráť VÝHRADNE v JSON formáte (žiadny markdown, žiadne bloky kódu), takto:
{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Názov testu",
      "preconditions": "Predpoklady",
      "steps": ["Krok 1", "Krok 2", "Krok 3"],
      "expectedResult": "Očakávaný výsledok",
      "priority": "High/Medium/Low",
      "type": "Typ testu"
    }
  ]
}`;
    },

    bug() {
      const title    = document.getElementById('bug-title').value;
      const steps    = document.getElementById('bug-steps').value;
      const actual   = document.getElementById('bug-actual').value;
      const expected = document.getElementById('bug-expected').value;
      const env      = document.getElementById('bug-env').value;
      return `Si skúsený QA inžinier. Vytvor profesionálny bug report.

Vstupné informácie:
- Problém: ${title}
- Kroky: ${steps}
- Actual: ${actual}
- Expected: ${expected}
- Prostredie: ${env}
- Severity: ${selectedSeverity}

Odpoveď vráť VÝHRADNE v JSON formáte (žiadny markdown, žiadne bloky kódu):
{
  "bugReport": {
    "id": "BUG-001",
    "title": "Profesionálny názov",
    "summary": "Krátke zhrnutie",
    "severity": "${selectedSeverity}",
    "priority": "napr. High",
    "status": "New",
    "environment": "popis prostredia",
    "stepsToReproduce": ["Krok 1", "Krok 2"],
    "actualResult": "čo sa stalo",
    "expectedResult": "čo malo byť",
    "impact": "Dopad na užívateľov / biznis",
    "possibleCause": "Možná príčina (ak zrejmá)",
    "attachments": "Screenshots, logy (placeholder)"
  }
}`;
    },

    acceptance() {
      const story   = document.getElementById('ac-story').value;
      const context = document.getElementById('ac-context').value;
      const format  = document.getElementById('ac-format').value;
      return `Si produktový QA expert. Vytvor acceptance criteria.

User Story: ${story}
Kontext: ${context}
Formát: ${format}

Odpoveď vráť VÝHRADNE v JSON formáte (žiadny markdown):
{
  "acceptanceCriteria": {
    "userStory": "User story",
    "gherkin": [
      {
        "scenario": "Názov scenára",
        "given": "Given podmienka",
        "when": "When akcia",
        "then": "Then výsledok"
      }
    ],
    "checklist": ["Kritérium 1", "Kritérium 2"],
    "edgeCases": ["Edge case 1"],
    "outOfScope": ["Čo nie je súčasťou"]
  }
}`;
    },

    notes() {
      const what     = document.getElementById('notes-what').value;
      const findings = document.getElementById('notes-findings').value;
      const type     = document.getElementById('notes-type').value;
      return `Si QA inžinier. Vytvor profesionálny ${type} dokument.

Čo bolo testované: ${what}
Nálezy: ${findings}

Odpoveď vráť VÝHRADNE v JSON formáte (žiadny markdown):
{
  "testReport": {
    "title": "Názov reportu",
    "date": "dátum",
    "summary": "Executive summary",
    "scope": "Čo bolo testované",
    "findings": [
      {"type": "Bug/Observation/Improvement", "description": "popis", "severity": "level"}
    ],
    "metrics": {
      "tested": "počet testov",
      "passed": "prešlo",
      "failed": "neprešlo",
      "blocked": "blokované"
    },
    "recommendations": ["Odporúčanie 1"],
    "conclusion": "Záver a next steps"
  }
}`;
    },

    plan() {
      const project  = document.getElementById('plan-project').value;
      const scope    = document.getElementById('plan-scope').value;
      const type     = document.getElementById('plan-type').value;
      const timeline = document.getElementById('plan-timeline').value;
      return `Si senior QA inžinier. Vytvor test plán pre projekt.

Projekt: ${project}
Scope: ${scope}
Typ: ${type}
Timeline: ${timeline}

Odpoveď vráť VÝHRADNE v JSON formáte (žiadny markdown):
{
  "testPlan": {
    "projectName": "názov",
    "objective": "Cieľ testovania",
    "scope": {
      "inScope": ["položka 1"],
      "outOfScope": ["položka 1"]
    },
    "testTypes": ["Unit", "Integration", "E2E"],
    "testEnvironments": ["env 1", "env 2"],
    "entryExitCriteria": {
      "entry": ["kritérium 1"],
      "exit": ["kritérium 1"]
    },
    "testingPhases": [
      {"phase": "Fáza 1", "description": "popis", "duration": "čas"}
    ],
    "risks": [
      {"risk": "Riziko", "mitigation": "Riešenie"}
    ],
    "tools": ["Nástroj 1"],
    "deliverables": ["Dodatok 1"]
  }
}`;
    },

    review() {
      const type    = document.getElementById('review-type').value;
      const content = document.getElementById('review-content').value;
      return `Si senior QA reviewer. Vykonaj review nasledujúceho obsahu.

Typ review: ${type}
Obsah na review:
${content}

Odpoveď vráť VÝHRADNE v JSON formáte (žiadny markdown):
{
  "review": {
    "overallScore": "skóre 1-10",
    "verdict": "Pass/Needs Improvement/Fail",
    "strengths": ["Silná stránka 1"],
    "issues": [
      {"severity": "Critical/Major/Minor", "description": "popis", "suggestion": "návrh"}
    ],
    "improvements": ["Zlepšenie 1"],
    "summary": "Záverečné zhodnotenie"
  }
}`;
    }
  };

  return prompts[tab]();
}

// ── Generate (API call) ───────────────────
async function generate(tab) {
  if (!apiKey) {
    showToast('⚠️ Vlož API kľúč!');
    return;
  }

  const btn = document.querySelector(`#form-${tab} .btn-generate`);
  btn.disabled = true;
  btn.innerHTML = '<div class="loader"><div class="spinner"></div><span>Generujem...</span></div>';

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('resultContent').style.display = 'block';
  document.getElementById('resultContent').innerHTML =
    '<div class="result-empty"><div class="empty-icon typing-cursor"></div><p style="color:var(--accent)">AI generuje výstup...</p></div>';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
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

// ── Render result ─────────────────────────
function renderResult(tab, data) {
  const el = document.getElementById('resultContent');
  let html = '';

  if (tab === 'testcase' && data.testCases) {
    html += `<div class="result-section"><div class="result-section-title">Test Cases (${data.testCases.length})</div>`;
    data.testCases.forEach(tc => {
      html += `
        <table class="result-table" style="margin-bottom:14px;">
          <tr><th colspan="2">${tc.id} — ${tc.title}</th></tr>
          <tr><td style="width:130px;color:var(--text-muted)">Priorita</td><td>${tc.priority} &nbsp;<span class="env-tag">${tc.type}</span></td></tr>
          <tr><td style="color:var(--text-muted)">Predpoklady</td><td>${tc.preconditions}</td></tr>
          <tr><td style="color:var(--text-muted)">Kroky</td><td>${tc.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>')}</td></tr>
          <tr><td style="color:var(--text-muted)">Expected</td><td style="color:var(--accent)">${tc.expectedResult}</td></tr>
        </table>`;
    });
    html += '</div>';

  } else if (tab === 'bug' && data.bugReport) {
    const b = data.bugReport;
    const sevColor = { critical: 'var(--accent3)', high: '#ff9500', medium: 'var(--accent4)', low: 'var(--accent)' }[b.severity?.toLowerCase()] || 'var(--text)';
    html += `
      <div class="result-section"><div class="result-section-title">Bug Report — ${b.id}</div>
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

  } else if (tab === 'acceptance' && data.acceptanceCriteria) {
    const ac = data.acceptanceCriteria;
    html += `<div class="result-section"><div class="result-section-title">User Story</div><p class="result-text" style="font-style:italic">${ac.userStory}</p></div>`;
    if (ac.gherkin?.length) {
      html += `<div class="result-section"><div class="result-section-title">Gherkin Scenarios</div>`;
      ac.gherkin.forEach(g => {
        html += `
          <table class="result-table" style="margin-bottom:10px;">
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

  } else if (tab === 'notes' && data.testReport) {
    const r = data.testReport;
    html += `
      <div class="result-section"><div class="result-section-title">${r.title}</div>
      <table class="result-table">
        <tr><td style="width:120px;color:var(--text-muted)">Dátum</td><td>${r.date}</td></tr>
        <tr><td style="color:var(--text-muted)">Scope</td><td>${r.scope}</td></tr>
        <tr><td style="color:var(--text-muted)">Summary</td><td>${r.summary}</td></tr>
      </table></div>`;
    if (r.metrics) {
      html += `
        <div class="result-section"><div class="result-section-title">Metriky</div>
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

  } else if (tab === 'plan' && data.testPlan) {
    const p = data.testPlan;
    html += `
      <div class="result-section"><div class="result-section-title">${p.projectName} — Test Plan</div>
      <p class="result-text" style="margin-bottom:12px">${p.objective}</p>
      <table class="result-table">
        <tr><th>In Scope</th><th>Out of Scope</th></tr>
        <tr><td>${p.scope.inScope.join('<br>')}</td><td>${p.scope.outOfScope.join('<br>')}</td></tr>
      </table></div>`;
    if (p.testingPhases?.length) {
      html += `<div class="result-section"><div class="result-section-title">Fázy testovania</div>
        <table class="result-table">
          <tr><th>Fáza</th><th>Popis</th><th>Trvanie</th></tr>`;
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

  } else if (tab === 'review' && data.review) {
    const r = data.review;
    const scoreColor = r.overallScore >= 8 ? 'var(--accent)' : r.overallScore >= 5 ? 'var(--accent4)' : 'var(--accent3)';
    html += `
      <div class="result-section"><div class="result-section-title">Review Výsledok</div>
      <table class="result-table">
        <tr><td style="width:130px;color:var(--text-muted)">Skóre</td><td style="font-size:1.4rem;font-weight:700;color:${scoreColor}">${r.overallScore}/10</td></tr>
        <tr><td style="color:var(--text-muted)">Verdikt</td><td style="font-weight:600">${r.verdict}</td></tr>
        <tr><td style="color:var(--text-muted)">Zhrnutie</td><td>${r.summary}</td></tr>
      </table></div>`;
    if (r.strengths?.length) {
      html += `<div class="result-section"><div class="result-section-title">Silné stránky</div>`;
      r.strengths.forEach(s => {
        html += `<div class="checklist-item"><span class="check-icon">✓</span><span>${s}</span></div>`;
      });
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

// ── Utility functions ─────────────────────
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
