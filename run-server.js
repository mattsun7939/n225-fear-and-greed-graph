const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 起動モードの決定 (デフォルトは 'dev')
const mode = process.argv[2] || 'dev';

// 設定ファイル (.env.local または .env) から PORT を抽出
// Next.js自身も.env.localを自動読込するが、それはCLIのポート決定より後に走るため、
// ポート番号のように起動前に必要な値はここで明示的に読み込む。
let port = '3000'; // デフォルトポート
const envPaths = [
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    // 'PORT=xxxx' を検索する正規表現
    const match = content.match(/^PORT\s*=\s*(\d+)/m);
    if (match) {
      port = match[1];
      break;
    }
  }
}

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const args = ['next', mode, '-p', port];

console.log(`Starting Next.js in '${mode}' mode on port ${port}...`);

// プロセスを起動して出力を継承する
const child = spawn(npxCmd, args, { stdio: 'inherit', shell: true });

child.on('close', (code) => {
  process.exit(code);
});
