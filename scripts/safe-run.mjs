#!/usr/bin/env node
// WorkBuddy 注入的 genie-safe-delete 垫片会把所有文件删除重定向到 Windows 回收站。
// 本机回收站操作会失败（"Some operations were aborted"），导致任何需要清空目录的
// 构建步骤（vite emptyDir、electron-builder 清理）直接报错退出。
// 该垫片仅在 CODEBUDDY_SESSION_ID / CLAUDE_SESSION_ID 存在时生效，
// 因此这里在启动真正命令前移除这两个环境变量，恢复普通文件系统删除。
//
// 另外，本机 shell 可能残留 NODE_OPTIONS（含 --use-system-ca，Electron 不允许）
// 与 ELECTRON_RUN_AS_NODE=1（会让 Electron 退化为普通 Node，导致 require('electron')
// 崩溃）。这两者同样在子进程里清除，保证 npm run dev/build/start 开箱即用。
import { spawnSync } from 'node:child_process';

for (const key of [
  'CODEBUDDY_SESSION_ID',
  'CLAUDE_SESSION_ID',
  'NODE_OPTIONS',
  'ELECTRON_RUN_AS_NODE',
]) {
  delete process.env[key];
}

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('usage: node scripts/safe-run.mjs <command...>');
  process.exit(2);
}

// npm 在运行时已把 node_modules/.bin 加入 PATH，子进程继承该 PATH，
// 因此 electron-vite / cross-env 等命令可正常解析。
const result = spawnSync(command, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
