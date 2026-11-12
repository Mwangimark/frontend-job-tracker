# Remote Software Job Tracker

Tracks remote **software development** jobs every day, sorts them by role (frontend, backend,
full-stack, mobile and more), and flags the ones open to candidates in Kenya. A GitHub Actions workflow runs a Python script on a schedule, fetches listings
from the [Remotive](https://remotive.com) and [Jobicy](https://jobicy.com) public APIs, deduplicates them, and commits the updated data.

**Live site:** https://mwangimark.github.io/frontend-job-tracker/ (Angular app in `site/`, redeployed after every update)

**Last updated:** 2026-11-12 · **Jobs tracked:** 106 · **Open to Kenya:** 7 ·
**New today:** 106 (7 open to Kenya)

**By role:** General: 47 · Data & AI: 20 · Full-stack: 12 · Backend: 12 · DevOps & Cloud: 5 · Frontend: 4 · Mobile: 3 · QA & Testing: 3

## New jobs per day (last 30 days)

```mermaid
xychart-beta
    x-axis ["11-12"]
    y-axis "New jobs" 0 --> 106
    bar [106]
    line [7]
```
Bars: all new jobs. Line: new jobs open to Kenya.

## Latest 20 jobs

| Published | Job | Role | Company | Location | Open to Kenya |
|---|---|---|---|---|---|
| 2026-11-12 | [Senior Software Engineer, Developer Enablement](https://jobicy.com/jobs/161529-senior-software-engineer-developer-enablement) | General | Fleetio | Canada,  Mexico,  USA |  |
| 2026-11-12 | [Staff Backend Engineer - Platform (f/m/d)](https://jobicy.com/jobs/161525-staff-backend-engineer-platform-f-m-d) | DevOps & Cloud | Apaleo | Europe |  |
| 2026-11-12 | [Salesforce Developer](https://jobicy.com/jobs/161517-salesforce-developer) | General | Nivoda | UK |  |
| 2026-11-12 | [Senior Developer Advocate - Modern App Development](https://jobicy.com/jobs/161516-senior-developer-advocate-modern-app-development) | General | Datadog | USA |  |
| 2026-11-12 | [GTM System Engineer](https://jobicy.com/jobs/161515-gtm-system-engineer) | General | Nivoda | Sweden,  UK |  |
| 2026-11-12 | [Senior Integration Engineer](https://jobicy.com/jobs/155132-senior-integration-engineer-2) | General | Legion | Mexico |  |
| 2026-11-12 | [Engineering Manager, AI CICD](https://jobicy.com/jobs/155140-engineering-manager-ai-cicd) | Data & AI | Chainguard | UK,  USA |  |
| 2026-11-12 | [Senior Forward Deployed Engineer (AI Agent) - UK](https://jobicy.com/jobs/155100-senior-forward-deployed-engineer-ai-agent-uk) | Data & AI | Cresta | UK |  |
| 2026-11-12 | [Engineering Manager (Subscriptions)](https://jobicy.com/jobs/155099-engineering-manager-subscriptions) | General | Paddle | Ireland,  Portugal,  UK |  |
| 2026-11-12 | [Frontend Engineer React and AWS](https://jobicy.com/jobs/145744-frontend-engineer-react-and-aws) | Frontend | Numentica | USA |  |
| 2026-11-12 | [Software Engineer (Remote Eligible in Bulgaria)](https://jobicy.com/jobs/155069-software-engineer-remote-eligible-in-bulgaria) | General | Smartsheet | Bulgaria |  |
| 2026-11-12 | [Go (Golang) Software Engineer, Developer Tooling and Containers](https://jobicy.com/jobs/150365-go-golang-software-engineer-developer-tooling-and-containers) | Backend | Canonical | APAC |  |
| 2026-11-12 | [Software Engineer - Python - Container Images](https://jobicy.com/jobs/150364-software-engineer-python-container-images) | Backend | Canonical | APAC,  EMEA,  LATAM,  Canada,  USA | ✅ |
| 2026-11-12 | [Embedded Linux Consultant - Japan](https://jobicy.com/jobs/150361-embedded-linux-consultant-japan) | General | Canonical | Japan |  |
| 2026-11-12 | [Open Source Networking Software Engineer - ToR Switch / SmartNIC / DPU](https://jobicy.com/jobs/150360-open-source-networking-software-engineer-tor-switch-smartnic-dpu) | General | Canonical | APAC,  LATAM,  Canada,  China,  USA |  |
| 2026-11-11 | [Senior Fullstack Engineer](https://jobicy.com/jobs/161444-senior-fullstack-engineer-4) | Full-stack | Toptal | LATAM,  Europe |  |
| 2026-11-11 | [Full Stack AI Engineer](https://jobicy.com/jobs/161438-full-stack-ai-engineer) | Full-stack | 3Y Health | Argentina |  |
| 2026-11-11 | [Full Stack Engineer](https://jobicy.com/jobs/161435-full-stack-engineer-9) | Full-stack | 3Y Health | Argentina |  |
| 2026-11-11 | [Founding Engineer](https://jobicy.com/jobs/161432-founding-engineer) | General | 3Y Health | Argentina |  |
| 2026-11-11 | [AI Product Engineer](https://jobicy.com/jobs/161428-ai-product-engineer) | Data & AI | 3Y Health | Argentina |  |

## How it works

- `.github/workflows/track-jobs.yml` runs daily at 08:17 EAT (and on demand).
- `scripts/track_jobs.py` fetches the software development category, classifies each job's role from its title, merges new jobs into
  `data/jobs.csv`, appends a row to `data/daily_stats.csv`, and regenerates this README.
- Only Python's standard library is used, so the workflow needs no dependencies.
- `.github/workflows/deploy-site.yml` rebuilds the Angular site in `site/` with the new data
  and deploys it to GitHub Pages.

Job data comes from [Remotive](https://remotive.com) and [Jobicy](https://jobicy.com); each link goes to the original listing.
