"""Fetch remote software development jobs from Remotive, classify them by role, and update the tracker.

Writes:
  data/jobs.csv         every job ever seen (deduplicated by id)
  data/daily_stats.csv  one row per day: new jobs, jobs open to Kenya
  README.md             summary, 30-day chart and latest jobs
Uses only the Python standard library.
"""
import csv
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
API = "https://remotive.com/api/remote-jobs"
# Location strings that mean someone in Kenya can apply
OPEN_TO_KENYA = ["worldwide", "anywhere", "africa", "kenya", "emea", "global"]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_CSV = os.path.join(ROOT, "data", "jobs.csv")
STATS_CSV = os.path.join(ROOT, "data", "daily_stats.csv")
README = os.path.join(ROOT, "README.md")
JOB_FIELDS = ["id", "first_seen", "published", "title", "company", "location",
              "open_to_kenya", "role", "job_type", "salary", "url"]


def fetch():
    url = f"{API}?{urllib.parse.urlencode({'category': 'software-dev'})}"
    req = urllib.request.Request(url, headers={"User-Agent": "job-tracker (GitHub Actions)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("jobs", [])


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
from the [Remotive](https://remotive.com) public API, deduplicates them, and commits the updated data.

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

Job data comes from [Remotive](https://remotive.com); each link goes to the original listing.
"""


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    jobs = read_csv(JOBS_CSV)
    seen = {j["id"] for j in jobs}

    for j in jobs:  # rows saved before roles existed
        if not j.get("role"):
            j["role"] = classify(j["title"])

    try:
        fetched = {str(job["id"]): job for job in fetch()
                   if job.get("category") == "Software Development"}
    except Exception as e:
        sys.exit(f"Fetching jobs failed; nothing updated. {e}")

    new = []
    for jid, job in fetched.items():
        if jid in seen:
            continue
        loc = job.get("candidate_required_location", "")
        new.append({
            "id": jid,
            "first_seen": today,
            "published": job.get("publication_date", ""),
            "title": job.get("title", ""),
            "company": job.get("company_name", ""),
            "location": loc,
            "open_to_kenya": "yes" if open_to_kenya(loc) else "no",
            "role": classify(job.get("title", "")),
            "job_type": job.get("job_type", ""),
            "salary": job.get("salary", ""),
            "url": job.get("url", ""),
        })
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
