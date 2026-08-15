const fs = require('fs');
const path = require('path');

// `node scripts/xxx.js` として直接実行される単発スクリプト向けの最小限の.envローダー。
// Next.js本体（page.js側）はフレームワークが自動で.env.localを読み込むが、
// このディレクトリのスクリプトはNext.js CLIを経由しないため、ここで明示的に読み込む。
// dotenv等の外部ライブラリには依存せず、KEY=VALUE形式のみをサポートする。
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    // 既存の環境変数（シェルでのexport等）を優先し、上書きしない
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadEnvLocal();

const DRIVE_DIR = process.env.DRIVE_DIR;
if (!DRIVE_DIR) {
  console.error('DRIVE_DIR が設定されていません。.env.example を .env.local としてコピーし、DRIVE_DIR にログディレクトリの絶対パスを設定してください。');
  process.exit(1);
}

module.exports = { DRIVE_DIR };
