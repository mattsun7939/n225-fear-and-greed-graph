import fs from 'fs';
import path from 'path';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

function getFearAndGreedHistory() {
  const driveDir = '/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/';
  const fallbackDir = path.join(process.cwd(), '../fear_and_greed_index_for_jp/public/log');
  
  let targetDir = driveDir;
  if (!fs.existsSync(targetDir)) {
    targetDir = fallbackDir;
  }
  
  if (!fs.existsSync(targetDir)) {
    console.warn(`Data directory not found at ${driveDir} or ${fallbackDir}. Creating empty fallback list.`);
    return [];
  }
  
  try {
    const files = fs.readdirSync(targetDir);
    const dataFiles = files.filter(f => f.startsWith('data_') && f.endsWith('.json')).sort();
    
    const history = [];
    for (const file of dataFiles) {
      try {
        const filePath = path.join(targetDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Extract date from filename: data_20260219.json -> 2026-02-19
        const match = file.match(/data_(\d{4})(\d{2})(\d{2})\.json/);
        let dateStr = data.timestamp ? data.timestamp.split('T')[0] : null;
        if (match && !dateStr) {
          dateStr = `${match[1]}-${match[2]}-${match[3]}`;
        }
        
        history.push({
          date: dateStr,
          score: data.score,
          rating: data.rating,
          indicators: data.indicators || [],
          rawTimestamp: data.timestamp,
          n225Price: data.n225Price
        });
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
    
    // Sort by date ascending
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    return history;
  } catch (err) {
    console.error('Error fetching history:', err);
    return [];
  }
}

export default async function Home() {
  const rawHistory = getFearAndGreedHistory();
  
  // Format history for the chart component
  const history = rawHistory.map(item => {
    const indicatorsMap = {};
    item.indicators.forEach(ind => {
      // Normalize name to snake_case key
      const key = ind.name
        .replace(/\s*\(.*\)/g, '') // remove parentheses
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
      indicatorsMap[key] = ind.score;
    });
    
    return {
      date: item.date,
      score: item.score,
      rating: item.rating,
      rawTimestamp: item.rawTimestamp,
      indicators: item.indicators,
      n225Price: item.n225Price,
      ...indicatorsMap
    };
  });
  
  return <Dashboard initialHistory={history} />;
}
