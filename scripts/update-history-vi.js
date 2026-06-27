const fs = require('fs');
const path = require('path');
const yahooFinanceModule = require('yahoo-finance2').default;
const yahooFinance = new yahooFinanceModule({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const DRIVE_DIR = '/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/';

function getRating(score) {
  if (score >= 75) return 'Extreme Greed';
  if (score >= 55) return 'Greed';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Fear';
  return 'Extreme Fear';
}

async function updateHistoryVI() {
  console.log(`Scanning directory: ${DRIVE_DIR}`);
  if (!fs.existsSync(DRIVE_DIR)) {
    console.error(`Error: Google Drive directory not found: ${DRIVE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DRIVE_DIR)
    .filter(f => f.startsWith('data_') && f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('No data files found to update.');
    return;
  }

  console.log(`Found ${files.length} data files.`);

  const dates = files.map(file => {
    const match = file.match(/data_(\d{4})(\d{2})(\d{2})\.json/);
    return `${match[1]}-${match[2]}-${match[3]}`;
  });

  const minDateStr = dates[0];
  const maxDateStr = dates[dates.length - 1];

  const startDate = new Date(minDateStr);
  startDate.setDate(startDate.getDate() - 5);
  const endDate = new Date(maxDateStr);
  endDate.setDate(endDate.getDate() + 5);

  const period1 = startDate.toISOString().split('T')[0];
  const period2 = endDate.toISOString().split('T')[0];

  console.log(`Fetching Nikkei VI (^NKVI.OS) history from ${period1} to ${period2}...`);
  const chartResult = await yahooFinance.chart('^NKVI.OS', { period1, period2, interval: '1d' }, { validateResult: false });
  const quotes = chartResult.quotes.filter(q => q.close !== null);

  const viMap = {};
  quotes.forEach(q => {
    const qDate = new Date(q.date);
    const jstDate = new Date(qDate.getTime() + (9 * 60 * 60 * 1000));
    const dateStr = jstDate.toISOString().split('T')[0];
    viMap[dateStr] = q.close; // Keep float for precision in description
  });

  console.log('Yahoo Finance historical VI data mapped.');

  let updatedCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dateStr = dates[i];
    const filePath = path.join(DRIVE_DIR, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      let viPrice = viMap[dateStr];

      // If weekend or holiday, lookup previous trading day
      if (viPrice === undefined) {
        let lookupDate = new Date(dateStr);
        for (let day = 1; day <= 7; day++) {
          lookupDate.setDate(lookupDate.getDate() - 1);
          const lookupStr = lookupDate.toISOString().split('T')[0];
          if (viMap[lookupStr] !== undefined) {
            viPrice = viMap[lookupStr];
            break;
          }
        }
      }

      if (viPrice !== undefined) {
        // Calculate new Volatility Score
        // 15 = Extreme Greed (100), 40 = Extreme Fear (0)
        let volScore = 100 - ((viPrice - 15) / 25 * 100);
        volScore = Math.max(0, Math.min(100, Math.round(volScore)));

        // Find and update 'Market Volatility' indicator
        const volIndIdx = data.indicators.findIndex(ind => ind.name === 'Market Volatility');
        if (volIndIdx !== -1) {
          data.indicators[volIndIdx].score = volScore;
          data.indicators[volIndIdx].rating = getRating(volScore);
          data.indicators[volIndIdx].description = `日経平均VIは${viPrice.toFixed(2)}で、オプション市場から算出されたボラティリティセンチメントは${getRating(volScore)}レベルです。`;
        }

        // Recalculate total score
        const totalScore = Math.round(
          data.indicators.reduce((acc, curr) => acc + curr.score, 0) / data.indicators.length
        );

        data.score = totalScore;
        data.rating = getRating(totalScore);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        updatedCount++;
      } else {
        console.warn(`Could not find a suitable Nikkei VI price for date ${dateStr} in file ${file}`);
      }
    } catch (err) {
      console.error(`Error updating file ${file}:`, err);
    }
  }

  console.log(`Successfully updated and recalculated ${updatedCount} files on Google Drive with historical Nikkei VI values!`);
}

updateHistoryVI().catch(err => {
  console.error('Fatal error running update script:', err);
  process.exit(1);
});
