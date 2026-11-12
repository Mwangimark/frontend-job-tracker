# Site

Angular front end for the job tracker. It reads `data/jobs.csv` and `data/daily_stats.csv`,
which the deploy workflow copies into `public/data/` before building.

```bash
npm install
mkdir -p public/data && cp ../data/*.csv public/data/
npm start
```
