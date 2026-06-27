const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DRIVE_DIR = '/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/';

function getRating(score) {
  if (score >= 75) return 'Extreme Greed';
  if (score >= 55) return 'Greed';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Fear';
  return 'Extreme Fear';
}

async function updateHistoryMargin() {
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

  // 1. Fetch dailyweek2.json dynamically to resolve cache-buster
  console.log('Fetching sinyou.php page for credit script URL...');
  const htmlRes = await fetch('https://nikkei225jp.com/data/sinyou.php', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await htmlRes.text();
  const scriptMatch = html.match(/src=\"(\/_data\/_nfsDATA\/DAY\/dailyweek2\.json\?\d+)\"/);
  if (!scriptMatch) {
    console.error('Failed to parse dailyweek2.json URL from HTML.');
    process.exit(1);
  }

  const url = 'https://nikkei225jp.com' + scriptMatch[1];
  console.log(`Fetching data array from: ${url}`);
  const dataRes = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const js = await dataRes.text();

  // Evaluate the JS content to get sandbox.DAILY
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  const arr = sandbox.DAILY;
  if (!arr || arr.length === 0) {
    console.error('Failed to parse DAILY array.');
    process.exit(1);
  }

  console.log('Successfully loaded and evaluated DAILY array.');

  // Create date mappings
  const marginMap = {};
  arr.forEach(row => {
    const timestamp = row[0];
    const dateObj = new Date(timestamp);
    // Convert to JST date string (YYYY-MM-DD)
    const jstDate = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
    const dateStr = jstDate.toISOString().split('T')[0];
    
    const val = row[7];
    if (val !== "" && val !== null && typeof val === 'number') {
      marginMap[dateStr] = val;
    }
  });

  let updatedCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(DRIVE_DIR, file);

    const match = file.match(/data_(\d{4})(\d{2})(\d{2})\.json/);
    const dateStr = `${match[1]}-${match[2]}-${match[3]}`;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      let marginRatio = marginMap[dateStr];

      // If weekend or holiday or mid-week, lookup nearest previous day that has credit data
      if (marginRatio === undefined) {
        let lookupDate = new Date(dateStr);
        for (let day = 1; day <= 14; day++) {
          lookupDate.setDate(lookupDate.getDate() - 1);
          const lookupStr = lookupDate.toISOString().split('T')[0];
          if (marginMap[lookupStr] !== undefined) {
            marginRatio = marginMap[lookupStr];
            break;
          }
        }
      }

      if (marginRatio !== undefined) {
        // Calculate Margin Sentiment Score
        // -3% or higher = 100, -18% or lower = 0
        let scoreRaw = ((marginRatio - (-18)) / ((-3) - (-18))) * 100;
        let marginScore = Math.max(0, Math.min(100, Math.round(scoreRaw)));
        let marginDesc = `個人投資家の信用評価損益率は${marginRatio.toFixed(2)}%で、信用口座の含み損益センチメントは${getRating(marginScore)}レベルです。`;

        const marginIndicator = {
          name: 'Margin Trading Sentiment',
          score: marginScore,
          rating: getRating(marginScore),
          description: marginDesc
        };

        // Insert or replace in indicators array
        const existIdx = data.indicators.findIndex(ind => ind.name === 'Margin Trading Sentiment');
        if (existIdx !== -1) {
          data.indicators[existIdx] = marginIndicator;
        } else {
          // Insert at index 3 (after Stock Price Breadth)
          data.indicators.splice(3, 0, marginIndicator);
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
        console.warn(`Could not find suitable margin trading values for date ${dateStr} in file ${file}`);
      }
    } catch (err) {
      console.error(`Error updating file ${file}:`, err);
    }
  }

  console.log(`Successfully updated and recalculated ${updatedCount} files on Google Drive with Margin Trading Sentiment!`);
}

updateHistoryMargin().catch(err => {
  console.error('Fatal error running margin update script:', err);
  process.exit(1);
});
