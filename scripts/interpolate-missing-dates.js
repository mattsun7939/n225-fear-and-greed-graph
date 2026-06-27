const fs = require('fs');
const path = require('path');

const DRIVE_DIR = '/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/';

function getRating(score) {
  if (score >= 75) return 'Extreme Greed';
  if (score >= 55) return 'Greed';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Fear';
  return 'Extreme Fear';
}

function parseDateStr(file) {
  const match = file.match(/data_(\d{4})(\d{2})(\d{2})\.json/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

async function interpolateMissing() {
  console.log(`Scanning Google Drive directory: ${DRIVE_DIR}`);
  if (!fs.existsSync(DRIVE_DIR)) {
    console.error(`Google Drive directory not found: ${DRIVE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DRIVE_DIR)
    .filter(f => f.startsWith('data_') && f.endsWith('.json'))
    .sort();

  if (files.length < 2) {
    console.log('Need at least 2 files to interpolate.');
    return;
  }

  const dateFileMap = {};
  files.forEach(f => {
    const dStr = parseDateStr(f);
    if (dStr) {
      dateFileMap[dStr] = f;
    }
  });

  const availableDates = Object.keys(dateFileMap).sort();
  const minDate = new Date(availableDates[0]);
  const maxDate = new Date(availableDates[availableDates.length - 1]);

  console.log(`Date range: ${availableDates[0]} to ${availableDates[availableDates.length - 1]}`);
  console.log(`Available files: ${availableDates.length}`);

  // Generate all calendar dates in between
  const allDates = [];
  let current = new Date(minDate);
  while (current <= maxDate) {
    const dStr = current.toISOString().split('T')[0];
    allDates.push(dStr);
    current.setDate(current.getDate() + 1);
  }

  const missingDates = allDates.filter(d => !dateFileMap[d]);
  console.log(`Missing calendar dates identified: ${missingDates.length}`);
  
  if (missingDates.length === 0) {
    console.log('No missing dates found.');
    return;
  }

  console.log('Missing dates details:', missingDates);

  let generatedCount = 0;
  missingDates.forEach(targetDateStr => {
    // Find closest preceding date with a file
    let precDateStr = null;
    for (let i = availableDates.length - 1; i >= 0; i--) {
      if (availableDates[i] < targetDateStr) {
        precDateStr = availableDates[i];
        break;
      }
    }

    // Find closest succeeding date with a file
    let succDateStr = null;
    for (let i = 0; i < availableDates.length; i++) {
      if (availableDates[i] > targetDateStr) {
        succDateStr = availableDates[i];
        break;
      }
    }

    if (!precDateStr || !succDateStr) {
      console.warn(`Cannot interpolate ${targetDateStr} because surrounding dates are missing.`);
      return;
    }

    // Read files
    const precData = JSON.parse(fs.readFileSync(path.join(DRIVE_DIR, dateFileMap[precDateStr]), 'utf8'));
    const succData = JSON.parse(fs.readFileSync(path.join(DRIVE_DIR, dateFileMap[succDateStr]), 'utf8'));

    // Distance calculation for linear interpolation weights
    const tTime = new Date(targetDateStr).getTime();
    const pTime = new Date(precDateStr).getTime();
    const sTime = new Date(succDateStr).getTime();

    const totalDiff = sTime - pTime;
    const pWeight = (sTime - tTime) / totalDiff;
    const sWeight = (tTime - pTime) / totalDiff;

    // 1. Interpolate Nikkei 225 price
    const pPrice = precData.n225Price || 0;
    const sPrice = succData.n225Price || 0;
    const n225Price = Math.round(pPrice * pWeight + sPrice * sWeight);

    // 2. Interpolate Indicators
    const interpolatedIndicators = [];
    precData.indicators.forEach(pInd => {
      // Find matching indicator in succData
      const sInd = succData.indicators.find(ind => ind.name === pInd.name);
      if (sInd) {
        const score = Math.round(pInd.score * pWeight + sInd.score * sWeight);
        interpolatedIndicators.push({
          name: pInd.name,
          score: score,
          rating: getRating(score),
          description: `[補間データ] 前後日付のデータから算出された値です。(${pInd.name}: ${score})`
        });
      }
    });

    // 3. Calculate overall score
    const totalScore = Math.round(
      interpolatedIndicators.reduce((acc, curr) => acc + curr.score, 0) / interpolatedIndicators.length
    );

    const interpolatedData = {
      score: totalScore,
      rating: getRating(totalScore),
      n225Price: n225Price,
      timestamp: `${targetDateStr}T13:00:00.000+09:00`,
      indicators: interpolatedIndicators
    };

    // Write file name: data_yyyymmdd.json
    const cleanDate = targetDateStr.replace(/-/g, '');
    const outFilename = `data_${cleanDate}.json`;
    const outFilePath = path.join(DRIVE_DIR, outFilename);

    fs.writeFileSync(outFilePath, JSON.stringify(interpolatedData, null, 2));
    console.log(`Generated interpolated file: ${outFilename} (${targetDateStr})`);
    generatedCount++;
  });

  console.log(`Interpolation complete! Successfully generated ${generatedCount} missing files.`);
}

interpolateMissing().catch(err => {
  console.error('Fatal error running interpolation script:', err);
  process.exit(1);
});
