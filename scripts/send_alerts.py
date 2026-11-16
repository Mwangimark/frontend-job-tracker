"""Email job alerts to subscribers after the daily tracker run.

Reads active subscribers from Supabase, matches them against jobs first seen today
(daily subscribers) or in the last 7 days (weekly subscribers, sent on Mondays),
and sends each one a digest through Gmail SMTP.

Needs these GitHub Actions secrets; if any is missing the script exits quietly:
  SUPABASE_URL           https://<project>.supabase.co
  SUPABASE_SERVICE_KEY   service_role key (Project Settings → API). Keep it secret.
  SMTP_USER              the Gmail address that sends the alerts
  SMTP_PASSWORD          a Gmail app password for that account (not the normal password)
Uses only the Python standard library.
"""
import csv
import html
import json
import os
import smtplib
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_CSV = os.path.join(ROOT, "data", "jobs.csv")
SITE_URL = os.environ.get("SITE_URL", "https://mwangimark.github.io/frontend-job-tracker").rstrip("/")
MAX_JOBS_PER_EMAIL = 25
WEEKLY_SEND_DAY = 0  # Monday


def env(name):
    return os.environ.get(name, "").strip()


def supabase(method, path, body=None):
    url = f"{env('SUPABASE_URL').rstrip('/')}/rest/v1/{path}"
    key = env("SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"apikey": key, "Authorization": f"Bearer {key}",
                                          "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def load_jobs():
    with open(JOBS_CSV, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def matches(sub, job):
    roles = set(sub.get("roles") or [])
    return job["role"] in roles and (not sub.get("kenya_only") or job["open_to_kenya"] == "yes")


def salary_text(raw):
    """'USD 130000–145000 / yearly' -> '$130k–$145k / year' (same rule as the site)."""
    import re
    m = re.match(r"^([A-Z]{3}) (\d+)(?:–(\d+))?(?: / (\w+))?$", raw or "")
    if not m:
        return raw or ""
    cur, lo, hi, per = m.groups()
    sym = {"USD": "$", "EUR": "€", "GBP": "£"}.get(cur, cur + " ")
    fmt = lambda n: f"{sym}{round(int(n) / 1000)}k" if int(n) >= 1000 else f"{sym}{n}"
    period = {"yearly": "year", "monthly": "month", "hourly": "hour", "weekly": "week", "daily": "day"}
    return f"{fmt(lo)}{'–' + fmt(hi) if hi else ''}{' / ' + period.get(per, per) if per else ''}"


def describe_roles(roles, all_roles):
    if set(all_roles) <= set(roles):
        return "software"
    roles = list(roles)
    return roles[0] if len(roles) == 1 else ", ".join(roles[:-1]) + " and " + roles[-1]


def build_email(sub, jobs, period_label, all_roles):
    n = len(jobs)
    what = describe_roles(sub["roles"], all_roles)
    kenya = " open to Kenya" if sub.get("kenya_only") else ""
    subject = f"{n} new {what} job{'s' if n != 1 else ''}{kenya} · Remote Software Jobs"
    unsub = f"{SITE_URL}/unsubscribe?token={sub['unsubscribe_token']}"
    shown, extra = jobs[:MAX_JOBS_PER_EMAIL], max(0, n - MAX_JOBS_PER_EMAIL)

    lines = [f"{n} new {what} job{'s' if n != 1 else ''}{kenya} {period_label}:", ""]
    for j in shown:
        bits = [j["company"], j["location"] or "Location not stated", salary_text(j["salary"])]
        lines += [f"- {j['title']} ({' · '.join(b for b in bits if b)})", f"  {j['url']}"]
    if extra:
        lines += ["", f"…and {extra} more: {SITE_URL}/"]
    lines += ["", f"Browse all jobs: {SITE_URL}/", f"Unsubscribe: {unsub}"]
    text = "\n".join(lines)

    e = html.escape
    rows = "".join(f"""
      <tr><td style="padding:14px 0;border-bottom:1px solid #e3e6ea">
        <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f56b8">{e(j['role'])}</div>
        <a href="{e(j['url'])}" style="font-size:16px;font-weight:600;color:#1a1d21;text-decoration:none">{e(j['title'])}</a>
        <div style="font-size:13px;color:#5d6570;margin-top:4px">{e(' · '.join(b for b in [j['company'], j['location'] or 'Location not stated', salary_text(j['salary'])] if b))}</div>
        <div style="margin-top:6px">{'<span style="font-size:12px;font-weight:600;color:#17663a;background:#e3f5ea;padding:2px 8px;border-radius:999px">✓ Open to Kenya</span>' if j['open_to_kenya'] == 'yes' else ''}
          <a href="{e(j['url'])}" style="font-size:13px;font-weight:600;color:#1f56b8;margin-left:6px">View &amp; apply →</a></div>
      </td></tr>""" for j in shown)
    more = f'<p style="font-size:14px"><a href="{SITE_URL}/" style="color:#1f56b8">…and {extra} more on the site</a></p>' if extra else ""
    body = f"""<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1d21">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e3e6ea;border-radius:12px">
      <tr><td style="background:#14213d;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
        <div style="font-size:13px;opacity:.8">Remote Software Jobs</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px">{n} new {e(what)} job{'s' if n != 1 else ''}{e(kenya)}</div>
        <div style="font-size:14px;opacity:.8;margin-top:4px">{e(period_label.capitalize())}</div>
      </td></tr>
      <tr><td style="padding:8px 28px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>{more}
        <p style="margin:20px 0 0"><a href="{SITE_URL}/" style="display:inline-block;background:#2f6bd8;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px">Browse all jobs</a></p>
      </td></tr>
      <tr><td style="padding:16px 28px 24px;font-size:12px;color:#5d6570;border-top:1px solid #e3e6ea">
        You're getting this because you subscribed to {e(sub['frequency'])} alerts on Remote Software Jobs.<br>
        <a href="{unsub}" style="color:#5d6570">Unsubscribe</a> · <a href="{SITE_URL}/about#subscribe" style="color:#5d6570">Change preferences</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>"""

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr(("Remote Software Jobs", env("SMTP_USER")))
    msg["To"] = sub["email"]
    msg["List-Unsubscribe"] = f"<{unsub}>"
    msg.set_content(text)
    msg.add_alternative(body, subtype="html")
    return msg


def main():
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SMTP_USER", "SMTP_PASSWORD") if not env(k)]
    if missing:
        print(f"Alerts not configured (missing {', '.join(missing)}); skipping.")
        return

    now = datetime.now(timezone.utc)
    today = now.date()
    jobs = load_jobs()
    all_roles = sorted({j["role"] for j in jobs})
    newest_first = lambda js: sorted(js, key=lambda j: j["published"], reverse=True)

    daily_jobs = [j for j in jobs if j["first_seen"] == today.isoformat()]
    week_start = (today - timedelta(days=6)).isoformat()
    weekly_jobs = [j for j in jobs if j["first_seen"] >= week_start]
    is_weekly_day = today.weekday() == WEEKLY_SEND_DAY

    subs = supabase("GET", "subscribers?active=eq.true&select=id,email,roles,kenya_only,frequency,unsubscribe_token,last_sent_at")
    print(f"{len(subs)} active subscribers, {len(daily_jobs)} new jobs today")

    sent = skipped = failed = 0
    with smtplib.SMTP_SSL(env("SMTP_HOST") or "smtp.gmail.com", int(env("SMTP_PORT") or 465), timeout=30) as smtp:
        smtp.login(env("SMTP_USER"), env("SMTP_PASSWORD"))
        for sub in subs:
            if sub.get("last_sent_at") and sub["last_sent_at"][:10] == today.isoformat():
                skipped += 1  # already emailed today (e.g. the workflow was re-run)
                continue
            if sub["frequency"] == "weekly":
                if not is_weekly_day:
                    continue
                pool, label = weekly_jobs, "this week"
            else:
                pool, label = daily_jobs, "today"
            picks = newest_first([j for j in pool if matches(sub, j)])
            if not picks:
                continue
            try:
                smtp.send_message(build_email(sub, picks, label, all_roles))
                supabase("PATCH", f"subscribers?id=eq.{urllib.parse.quote(sub['id'])}", {"last_sent_at": now.isoformat()})
                sent += 1
                time.sleep(0.5)  # stay well under Gmail's sending rate
            except Exception as e:
                failed += 1
                print(f"Failed for subscriber {sub['id']}: {e}", file=sys.stderr)

    print(f"Sent {sent}, skipped {skipped} already sent today, failed {failed}")


if __name__ == "__main__":
    main()
