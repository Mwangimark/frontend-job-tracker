"""Fetch remote software development jobs from Remotive and Jobicy, classify them by role, and update the tracker.

Writes:
  data/jobs.csv         every job ever seen (deduplicated by id)
  data/daily_stats.csv  one row per day: new jobs, jobs open to Kenya
  README.md             summary, 30-day chart and latest jobs
Uses only the Python standard library.
"""
import csv
import html
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Role is decided from the job title, first match wins (order matters:
# "Full-stack" before "Frontend", "React Native" before "React").
ROLE_RULES = [
    ("Full-stack", ["full stack", "full-stack", "fullstack"]),
    ("Mobile", ["mobile", "ios", "android", "flutter", "react native", "kotlin", "swift"]),
    ("Frontend", ["frontend", "front-end", "front end", "angular", "javascript", "typescript", "react", "vue", "ui engineer", "web developer"]),
    ("DevOps & Cloud", ["devops", "sre", "site reliability", "platform", "infrastructure", "cloud", "kubernetes"]),
    ("Data & AI", ["data", "machine learning", " ml ", "ai ", " ai", "llm", "analytics"]),
    ("QA & Testing", ["qa", "quality", "test", "sdet"]),
    ("Backend", ["backend", "back-end", "back end", "api", "python", "java", "golang", " go ", "ruby", "rails",
                 "php", "laravel", "node", ".net", "c#", "scala", "elixir"]),
]
REMOTIVE_API = "https://remotive.com/api/remote-jobs"
JOBICY_API = "https://jobicy.com/api/v2/remote-jobs"
# Location strings that mean someone in Kenya can apply
OPEN_TO_KENYA = ["worldwide", "anywhere", "africa", "kenya", "emea", "global"]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_CSV = os.path.join(ROOT, "data", "jobs.csv")
STATS_CSV = os.path.join(ROOT, "data", "daily_stats.csv")
README = os.path.join(ROOT, "README.md")
JOB_FIELDS = ["id", "first_seen", "published", "title", "company", "location",
              "open_to_kenya", "role", "job_type", "salary", "url", "source"]


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "job-tracker (GitHub Actions)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def norm_type(t):
    """'Full-Time' / 'full-time' / 'full_time' -> 'full_time'."""
    return str(t or "").strip().lower().replace("-", "_").replace(" ", "_")


def fetch_remotive():
    data = get_json(f"{REMOTIVE_API}?{urllib.parse.urlencode({'category': 'software-dev'})}")
    for j in data.get("jobs", []):
        if j.get("category") != "Software Development":
            continue
        yield {
            "id": str(j["id"]),  # Remotive ids kept unprefixed for continuity with earlier rows
            "published": j.get("publication_date", ""),
            "title": j.get("title", ""),
            "company": j.get("company_name", ""),
            "location": j.get("candidate_required_location", ""),
            "job_type": norm_type(j.get("job_type")),
            "salary": j.get("salary", ""),
            "url": j.get("url", ""),
            "source": "Remotive",
        }


def jobicy_salary(j):
    lo = j.get("salaryMin") or j.get("annualSalaryMin")
    hi = j.get("salaryMax") or j.get("annualSalaryMax")
    if not (lo or hi):
        return ""
    cur = j.get("salaryCurrency") or ""
    per = j.get("salaryPeriod") or ("yearly" if j.get("annualSalaryMin") else "")
    amount = f"{lo}–{hi}" if lo and hi else str(lo or hi)
    return " ".join(x for x in [cur, amount, f"/ {per}" if per else ""] if x)


def fetch_jobicy():
    data = get_json(f"{JOBICY_API}?{urllib.parse.urlencode({'count': 100, 'industry': 'dev'})}")
    for j in data.get("jobs", []):
        types = j.get("jobType") or []
        yield {
            "id": f"jobicy-{j['id']}",
            "published": str(j.get("pubDate", "")).replace(" ", "T"),
            "title": html.unescape(j.get("jobTitle", "")),
            "company": html.unescape(j.get("companyName", "")),
            "location": j.get("jobGeo", ""),
            "job_type": norm_type(types[0] if isinstance(types, list) and types else types),
            "salary": jobicy_salary(j),
            "url": j.get("url", ""),
            "source": "Jobicy",
        }


SOURCES = [("Remotive", fetch_remotive), ("Jobicy", fetch_jobicy)]


def classify(title):
    t = f" {title.lower()} "
    for role, words in ROLE_RULES:
        if any(w in t for w in words):
            return role
    return "General"


def open_to_kenya(location):
    loc = (location or "").lower()
    return not loc or any(word in loc for word in OPEN_TO_KENYA)


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def md(text):
    return str(text or "").replace("|", "/").replace("\n", " ").strip()


def build_readme(jobs, stats, today):
    last30 = stats[-30:]
    total = len(jobs)
    kenya = sum(1 for j in jobs if j["open_to_kenya"] == "yes")
    today_row = stats[-1] if stats and stats[-1]["date"] == today else {"new_jobs": "0", "new_open_to_kenya": "0"}

    labels = ", ".join(f'"{s["date"][5:]}"' for s in last30)
    new_vals = ", ".join(s["new_jobs"] for s in last30)
    ke_vals = ", ".join(s["new_open_to_kenya"] for s in last30)
    top = max([int(s["new_jobs"]) for s in last30] + [5])

    latest = sorted(jobs, key=lambda j: j["published"], reverse=True)[:20]
    rows = "\n".join(
        f'| {j["published"][:10]} | [{md(j["title"])}]({j["url"]}) | {j["role"]} | {md(j["company"])} '
        f'| {md(j["location"]) or "—"} | {"✅" if j["open_to_kenya"] == "yes" else ""} |'
        for j in latest
    )

    roles = {}
    for j in jobs:
        roles[j["role"]] = roles.get(j["role"], 0) + 1
    role_line = " · ".join(f"{r}: {n}" for r, n in sorted(roles.items(), key=lambda x: -x[1]))

    return f"""# Remote Software Job Tracker

Tracks remote **software development** jobs every day, sorts them by role (frontend, backend,
full-stack, mobile and more), and flags the ones open to candidates in Kenya. A GitHub Actions workflow runs a Python script on a schedule, fetches listings
from the [Remotive](https://remotive.com) and [Jobicy](https://jobicy.com) public APIs, deduplicates them, and commits the updated data.

**Live site:** https://mwangimark.github.io/frontend-job-tracker/ (Angular app in `site/`, redeployed after every update)

**Last updated:** {today} · **Jobs tracked:** {total} · **Open to Kenya:** {kenya} ·
**New today:** {today_row["new_jobs"]} ({today_row["new_open_to_kenya"]} open to Kenya)

**By role:** {role_line}

## New jobs per day (last 30 days)

```mermaid
xychart-beta
    x-axis [{labels}]
    y-axis "New jobs" 0 --> {top}
    bar [{new_vals}]
    line [{ke_vals}]
```
Bars: all new jobs. Line: new jobs open to Kenya.

## Latest 20 jobs

| Published | Job | Role | Company | Location | Open to Kenya |
|---|---|---|---|---|---|
{rows}

## How it works

- `.github/workflows/track-jobs.yml` runs daily at 08:17 EAT (and on demand).
- `scripts/track_jobs.py` fetches the software development category, classifies each job's role from its title, merges new jobs into
  `data/jobs.csv`, appends a row to `data/daily_stats.csv`, and regenerates this README.
- Only Python's standard library is used, so the workflow needs no dependencies.
- `.github/workflows/deploy-site.yml` rebuilds the Angular site in `site/` with the new data
  and deploys it to GitHub Pages.

Job data comes from [Remotive](https://remotive.com) and [Jobicy](https://jobicy.com); each link goes to the original listing.
"""


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    jobs = read_csv(JOBS_CSV)
    seen = {j["id"] for j in jobs}

    for j in jobs:  # rows saved before roles / sources existed
        if not j.get("role"):
            j["role"] = classify(j["title"])
        if not j.get("source"):
            j["source"] = "Remotive"

    fetched, failures = {}, []
    for name, fetch in SOURCES:
        try:
            for job in fetch():
                fetched[job["id"]] = job
        except Exception as e:  # one source down shouldn't stop the other
            failures.append(name)
            print(f"{name} failed: {e}", file=sys.stderr)
    if len(failures) == len(SOURCES):
        sys.exit("All sources failed; nothing updated.")

    new = []
    for jid, job in fetched.items():
        if jid in seen:
            continue
        new.append({**job,
                    "first_seen": today,
                    "open_to_kenya": "yes" if open_to_kenya(job["location"]) else "no",
                    "role": classify(job["title"])})
    jobs.extend(new)
    write_csv(JOBS_CSV, jobs, JOB_FIELDS)

    all_stats = read_csv(STATS_CSV)
    prev = next((s for s in all_stats if s["date"] == today), None)  # earlier run today
    stats = [s for s in all_stats if s["date"] != today]
    new_ke = sum(j["open_to_kenya"] == "yes" for j in new)
    stats.append({"date": today,
                  "new_jobs": str(len(new) + int(prev["new_jobs"] if prev else 0)),
                  "new_open_to_kenya": str(new_ke + int(prev["new_open_to_kenya"] if prev else 0)),
                  "total_tracked": str(len(jobs))})
    write_csv(STATS_CSV, stats, ["date", "new_jobs", "new_open_to_kenya", "total_tracked"])

    with open(README, "w", encoding="utf-8") as f:
        f.write(build_readme(jobs, stats, today))
    print(f"{len(fetched)} fetched, {len(new)} new, {len(jobs)} total")


if __name__ == "__main__":
    main()
