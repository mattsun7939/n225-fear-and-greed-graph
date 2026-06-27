const fs = require('fs');
const path = require('path');
const yahooFinanceModule = require('yahoo-finance2').default;
const yahooFinance = new yahooFinanceModule({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const DRIVE_DIR = '/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/';

async function updateHistoryPrices() {
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

  // Find min and max date from filenames to optimize Yahoo Finance query
  // Filename format: data_YYYYMMDD.json
  const dates = files.map(file => {
    const match = file.match(/data_(\d{4})(\d{2})(\d{2})\.json/);
    return `${match[1]}-${match[2]}-${match[3]}`;
  });

  const minDateStr = dates[0];
  const maxDateStr = dates[dates.length - 1];

  // We query slightly wider to make sure we cover weekends/holidays context
  const startDate = new Date(minDateStr);
  startDate.setDate(startDate.getDate() - 5);
  const endDate = new Date(maxDateStr);
  endDate.setDate(endDate.getDate() + 5);

  const period1 = startDate.toISOString().split('T')[0];
  const period2 = endDate.toISOString().split('T')[0];

  console.log(`Fetching Nikkei 225 history from ${period1} to ${period2}...`);
  const chartResult = await yahooFinance.chart('^N225', { period1, period2, interval: '1d' });
  const quotes = chartResult.quotes.filter(q => q.close !== null);

  // Map dates in Tokyo timezone to closing prices
  const priceMap = {};
  quotes.forEach(q => {
    const qDate = new Date(q.date);
    // Convert to Tokyo timezone date string (YYYY-MM-DD)
    const jstDate = new Date(qDate.getTime() + (9 * 60 * 60 * 1000));
    const dateStr = jstDate.toISOString().split('T')[0];
    priceMap[dateStr] = Math.round(q.close);
  });

  console.log('Yahoo Finance historical price data mapped.');

  // Update JSON files
  let updatedCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dateStr = dates[i];
    const filePath = path.join(DRIVE_DIR, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Find the closest closing price
      let n225Price = priceMap[dateStr];

      // If weekend or holiday, find the closest preceding trading day's price
      if (n225Price === undefined) {
        let lookupDate = new Date(dateStr);
        // Look back up to 7 days
        for (let day = 1; day <= 7; day++) {
          lookupDate.setDate(lookupDate.getDate() - 1);
          const lookupStr = lookupDate.toISOString().split('T')[0];
          if (priceMap[lookupStr] !== undefined) {
            n225Price = priceMap[lookupStr];
            break;
          }
        }
      }

      if (n225Price !== undefined) {
        data.n225Price = n225Price;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        updatedCount++;
      } else {
        console.warn(`Could not find a suitable Nikkei 225 price for date ${dateStr} in file ${file}`);
      }
    } catch (err) {
      console.error(`Error updating file ${file}:`, err);
    }
  }

  console.log(`Successfully updated ${updatedCount} files on Google Drive with historical Nikkei 225 closing prices!`);
}

updateHistoryPrices().catch(err => {
  console.error('Fatal error running update script:', err);
  process.exit(1);
});
