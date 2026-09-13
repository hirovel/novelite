#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const distDir = path.resolve(currentDirPath, '../dist');

if (!fs.existsSync(distDir)) {
  console.error('\n❌ 未找到 dist 生产构建产物，请先在项目根目录运行: npm run build\n');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function startServer(port = 5174) {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    let filePath = path.join(distDir, reqPath);

    // Prevent directory traversal
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // SPA fallback: if file does not exist, serve index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000, immutable',
      });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end('Server Error');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🖋️  Novelite - 轻量、插件化的小说文本编辑器                │
│                                                             │
│   🚀 本地服务已启动:  \x1b[36m${url}\x1b[0m                            │
│   正在为您打开默认浏览器...                                 │
│                                                             │
│   提示: 按 Ctrl + C 即可停止服务                            │
└─────────────────────────────────────────────────────────────┘
`);

    const startCmd =
      process.platform === 'win32'
        ? `start ${url}`
        : process.platform === 'darwin'
        ? `open ${url}`
        : `xdg-open ${url}`;

    exec(startCmd, () => {});
  });
}

startServer(5174);
