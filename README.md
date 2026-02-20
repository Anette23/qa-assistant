# 🧪 QA Assistant — AI-Powered Testing Toolkit

> A complete, single-page web app that guides you through the full QA workflow — from test planning to execution tracking — powered by Claude AI.

## ✨ Features

The app follows a real QA workflow — each tab represents a phase you'd go through in an actual testing cycle:

| Step | Tool | Description |
|------|------|-------------|
| 1 | 🗺️ **Test Plan** | Generate a full test plan with scope, phases, risks and entry/exit criteria |
| 2 | 🧪 **Test Cases** | Generate structured test cases (functional, negative, boundary, smoke, regression) |
| 3 | ✅ **Acceptance Criteria** | Generate Gherkin (Given/When/Then) scenarios and checklists from user stories |
| 4 | ▶️ **Test Execution** | Run tests, mark each as Pass / Fail / Blocked / Skipped, track progress live |
| 5 | 🐛 **Bug Report** | Create structured bug reports — auto-prefilled from failed test cases |
| 6 | 📋 **Test Notes** | Turn raw notes into professional Test Summary Reports or Session Notes |
| 7 | 🔍 **Review** | Score and review existing test cases or bug reports with AI feedback |

---

## 🚀 Live Demo

**[→ Open QA Assistant](https://anette23.github.io/qa-assistant/)**

---

## ▶️ Test Execution — Highlight Feature

The Execution tab works like a lightweight TestRail:

- AI generates test cases based on the feature you describe
- Each test case shows steps, preconditions and expected result
- Mark each test as **✓ Pass**, **✗ Fail**, **⛔ Blocked** or **⏭ Skipped**
- Add notes to individual test cases
- When a test **Fails**, a button appears to instantly pre-fill a Bug Report
- Live stats bar tracks Pass / Fail / Blocked / Skipped counts
- Progress bar shows how far through the execution you are
- Click **"Generate Summary"** to get an AI-written Execution Summary report
- **Session is saved to localStorage** — results persist after page refresh

---

## 🛠️ How to Use

1. **Open the app** — no installation needed, runs entirely in the browser
2. **Follow the workflow** — start with Test Plan, work through each step
3. **Copy & paste outputs** — use results directly in Jira, Confluence, Notion or any tool

---

## 💡 Example Workflow

1. **Test Plan** → describe your project, get a full test plan with phases and risks
2. **Test Cases** → describe the login feature, get 5 structured test cases
3. **Acceptance Criteria** → paste a user story, get Gherkin scenarios + checklist
4. **Execution** → AI generates test cases, you click Pass/Fail as you test
5. **Bug Report** → a test fails → click "Create Bug Report" → form auto-fills
6. **Test Notes** → paste your observations, get a clean Test Summary Report
7. **Review** → paste a test case, get a score + improvement suggestions

---

## ⚙️ Tech Stack

- **Pure HTML / CSS / JavaScript** — no frameworks, no build tools, no dependencies
- **Anthropic Claude API** — `claude-sonnet-4-20250514` model
- **Cloudflare Workers** — secure API proxy, no API key needed from the user
- **localStorage** — execution sessions persist across page refreshes
- **3 files** — easy to deploy anywhere

---

## 📁 Project Structure

```
qa-assistant/
├── index.html    # App structure and layout
├── style.css     # All styling and themes
├── app.js        # Logic, AI calls, execution tracking
└── README.md     # This file
```

---

## 🌱 Future Ideas

- [ ] Export execution results to PDF or CSV
- [ ] Multiple execution sessions with history
- [ ] Jira integration — create issues directly from bug reports
- [ ] Custom templates per team or project
- [ ] Dark / light theme toggle

---

## 👩‍💻 About

Built as a portfolio project to demonstrate practical AI integration in a real QA workflow.  
Created with [Claude AI](https://claude.ai) · Deployed via GitHub Pages

---

*Feel free to fork, use, and adapt for your own QA workflow!*
