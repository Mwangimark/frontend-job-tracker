export interface Job {
  id: string;
  firstSeen: string;
  published: string;
  title: string;
  company: string;
  location: string;
  openToKenya: boolean;
  role: string;
  jobType: string;
  salary: string;
  url: string;
}

export interface DayStat {
  date: string;
  newJobs: number;
  newOpenToKenya: number;
  totalTracked: number;
}

/** Parses RFC 4180 CSV (quoted fields, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows.filter(r => r.some(v => v !== ''));
  if (!header) return [];
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export function toJob(r: Record<string, string>): Job {
  return {
    id: r['id'],
    firstSeen: r['first_seen'],
    published: r['published'],
    title: r['title'],
    company: r['company'],
    location: r['location'],
    openToKenya: r['open_to_kenya'] === 'yes',
    role: r['role'] || 'General',
    jobType: r['job_type'],
    salary: r['salary'],
    url: r['url'],
  };
}

export function toDayStat(r: Record<string, string>): DayStat {
  return {
    date: r['date'],
    newJobs: Number(r['new_jobs']) || 0,
    newOpenToKenya: Number(r['new_open_to_kenya']) || 0,
    totalTracked: Number(r['total_tracked']) || 0,
  };
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
  other: 'Other',
};

export function jobTypeLabel(t: string): string {
  return JOB_TYPE_LABELS[t] ?? (t ? t.replace(/_/g, ' ') : 'Not stated');
}
