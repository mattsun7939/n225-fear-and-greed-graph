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

async function updateHistoryJPX() {
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

  // 1. Fetch daily2year.json dynamically to resolve cache-buster
  console.log('Fetching touraku.php page for script URL...');
  const htmlRes = await fetch('https://nikkei225jp.com/data/touraku.php', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await htmlRes.text();
  const scriptMatch = html.match(/src=\"(\/_data\/_nfsDATA\/DAY\/daily2year\.json\?\d+)\"/);
  if (!scriptMatch) {
    console.error('Failed to parse daily2year.json URL from HTML.');
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
  const jpxMap = {};
  arr.forEach(row => {
    const timestamp = row[0];
    const dateObj = new Date(timestamp);
    // Convert to JST date string (YYYY-MM-DD)
    const jstDate = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
    const dateStr = jstDate.toISOString().split('T')[0];
    
    jpxMap[dateStr] = {
      toraku25: row[7],
      newHighs: row[8],
      newLows: row[9]
    };
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

      let jpxInfo = jpxMap[dateStr];

      // If weekend or holiday, lookup previous trading day
      if (jpxInfo === undefined) {
        let lookupDate = new Date(dateStr);
        for (let day = 1; day <= 7; day++) {
          lookupDate.setDate(lookupDate.getDate() - 1);
          const lookupStr = lookupDate.toISOString().split('T')[0];
          if (jpxMap[lookupStr] !== undefined) {
            jpxInfo = jpxMap[lookupStr];
            break;
          }
        }
      }

      if (jpxInfo !== undefined) {
        // 1. Update Stock Price Strength
        let strengthScore = 50;
        let strengthDesc = '';
        if (typeof jpxInfo.newHighs === 'number' && typeof jpxInfo.newLows === 'number') {
          const totalNew = jpxInfo.newHighs + jpxInfo.newLows;
          const ratio = totalNew > 0 ? jpxInfo.newHighs / totalNew : 0.5;
          strengthScore = Math.max(0, Math.min(100, Math.round(ratio * 100)));
          strengthDesc = `東証プライムの新高値銘柄数は${jpxInfo.newHighs}、新安値銘柄数は${jpxInfo.newLows}で、新高値比率(${strengthScore}%)は${getRating(strengthScore)}レベルです。`;
        }

        const strIndIdx = data.indicators.findIndex(ind => ind.name === 'Stock Price Strength');
        if (strIndIdx !== -1) {
          data.indicators[strIndIdx].score = strengthScore;
          data.indicators[strIndIdx].rating = getRating(strengthScore);
          data.indicators[strIndIdx].description = strengthDesc;
        }

        // 2. Update Stock Price Breadth
        let breadthScore = 50;
        let breadthDesc = '';
        if (typeof jpxInfo.toraku25 === 'number') {
          const toraku = jpxInfo.toraku25;
          let scoreRaw = ((toraku - 70) / (130 - 70)) * 100;
          breadthScore = Math.max(0, Math.min(100, Math.round(scoreRaw)));
          breadthDesc = `東証プライム市場の25日騰落レシオは${toraku.toFixed(1)}%で、市場の広がりは${getRating(breadthScore)}レベルです。`;
        }

        // Search for 'Stock Price Breadth (Proxy)' or 'Stock Price Breadth'
        const brIndIdx = data.indicators.findIndex(ind => 
          ind.name === 'Stock Price Breadth (Proxy)' || ind.name === 'Stock Price Breadth'
        );
        if (brIndIdx !== -1) {
          data.indicators[brIndIdx].name = 'Stock Price Breadth';
          data.indicators[brIndIdx].score = breadthScore;
          data.indicators[brIndIdx].rating = getRating(breadthScore);
          data.indicators[brIndIdx].description = breadthDesc;
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
        console.warn(`Could not find suitable JPX values for date ${dateStr} in file ${file}`);
      }
    } catch (err) {
      console.error(`Error updating file ${file}:`, err);
    }
  }

  console.log(`Successfully updated and recalculated ${updatedCount} files on Google Drive with historical Toraku Ratio and New Highs/Lows!`);
}

updateHistoryJPX().catch(err => {
  console.error('Fatal error running JPX update script:', err);
  process.exit(1);
});
