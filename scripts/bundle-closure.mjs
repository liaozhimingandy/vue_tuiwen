#!/usr/bin/env node
/**
 * 首屏体积度量工具（闭包口径）
 *
 * 为什么需要它：单个 chunk 的体积**不能**代表真实下载量。
 * 浏览器解析入口 chunk 时会顺着静态 `import "./xxx.js"` 把整条依赖链拉下来
 * （Vite 还会把入口静态依赖写进 index.html 的 modulepreload），所以真正要统计的是
 * 「入口静态闭包」而不是「index-xxx.js 那一个文件」。
 *
 * 反面教材：曾经用 `build.rollupOptions.output.codeSplitting.groups` 把 wangEditor
 * 单独拆成 vendor-editor chunk，肉眼看上去 chunk 列表很干净，实际入口 chunk 里
 * 出现了 `from"./vendor-editor-xxx.js"` 的静态导入 —— 891KB 编辑器在首屏就被下载，
 * 比不拆还慢 307KB。只看单 chunk 体积会得出完全相反的结论。
 *
 * 用法：
 *   npm run analyze:bundle                 # 先 build，再度量默认路由
 *   node scripts/bundle-closure.mjs dist HomePage ArticlePage
 *   OUT=closure.json node scripts/bundle-closure.mjs dist HomePage
 *
 * 输出：
 *   【入口闭包】        —— 任何页面首屏都必须下载的部分
 *   【进入 X 的额外加载】—— 该路由懒加载时追加下载的部分
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dist = process.argv[2] || 'dist';
const routes = process.argv.slice(3);
const assets = path.join(dist, 'assets');

if (!fs.existsSync(assets)) {
  console.error(`找不到 ${assets}，请先执行 npm run build`);
  process.exit(1);
}

const files = fs.readdirSync(assets);
const sizeOf = (f) => {
  try {
    return fs.statSync(path.join(assets, f)).size;
  } catch {
    return 0;
  }
};
/** 真实传输体积看 gzip（服务端都会开压缩），缓存一份避免重复压缩 */
const gzCache = new Map();
const gzipOf = (f) => {
  if (!gzCache.has(f)) {
    try {
      gzCache.set(f, zlib.gzipSync(fs.readFileSync(path.join(assets, f))).length);
    } catch {
      gzCache.set(f, 0);
    }
  }
  return gzCache.get(f);
};
const read = (f) => fs.readFileSync(path.join(assets, f), 'utf8');
const kb = (n) => (n / 1024).toFixed(1);
const sum = (list) => list.reduce((a, f) => a + sizeOf(f), 0);
const sumGz = (list) => list.reduce((a, f) => a + gzipOf(f), 0);

/** 从产物里抓出所有「静态」依赖：靠相对路径 ./xxx 出现的才算，动态 import 会带 chunk 名映射表 */
const pick = (code, ext) => {
  const out = new Set();
  for (const re of [new RegExp(`(?:from|import)\\s*"\\./([^"]+\\.${ext})"`, 'g'), new RegExp(`(?:from|import)\\s*'\\./([^']+\\.${ext})'`, 'g')]) {
    for (const m of code.matchAll(re)) out.add(m[1]);
  }
  return [...out].filter((f) => files.includes(f));
};

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const grab = (re) => [...html.matchAll(re)].map((m) => m[1]);
const entry = grab(/<script[^>]+src="\/assets\/([^"]+)"/g)[0];
const htmlPreload = grab(/<link rel="modulepreload"[^>]+href="\/assets\/([^"]+)"/g);
const htmlCss = grab(/<link rel="stylesheet"[^>]+href="\/assets\/([^"]+)"/g);

if (!entry) {
  console.error('index.html 里找不到入口 script');
  process.exit(1);
}

/** 求某个 chunk 的静态闭包（JS 顺着 import 递归，CSS 只取直接引用） */
function closure(root) {
  const js = new Set();
  const css = new Set();
  const stack = [root];
  while (stack.length) {
    const f = stack.pop();
    if (js.has(f)) continue;
    js.add(f);
    for (const d of pick(read(f), 'js')) if (!js.has(d)) stack.push(d);
    for (const c of pick(read(f), 'css')) css.add(c);
  }
  return {js: [...js], css: [...css]};
}

console.log(`入口 chunk: ${entry}`);
const c = closure(entry);
const entryJs = new Set([...c.js, ...htmlPreload]);
const entryCss = new Set([...c.css, ...htmlCss]);
const jsTotal = sum([...entryJs]);
const cssTotal = sum([...entryCss]);

console.log(`\n【入口闭包】${entryJs.size} 个 JS + ${entryCss.size} 个 CSS`);
console.log(`  JS  ${kb(jsTotal)} KB  (gzip ${kb(sumGz([...entryJs]))} KB)`);
console.log(`  CSS ${kb(cssTotal)} KB  (gzip ${kb(sumGz([...entryCss]))} KB)`);
console.log(
  `  合计 ${kb(jsTotal + cssTotal)} KB  (gzip ${kb(sumGz([...entryJs]) + sumGz([...entryCss]))} KB)   ← 首屏预算基线，改动后不应变大`,
);
console.log('  明细（JS，降序）:');
[...entryJs]
  .sort((a, b) => sizeOf(b) - sizeOf(a))
  .forEach((f) => console.log(`    ${kb(sizeOf(f)).padStart(8)} KB  ${f}`));

const report = {entry, entryClosure: {jsTotal, cssTotal, js: [...entryJs], css: [...entryCss]}, routes: {}};

for (const r of routes) {
  const page = files.find((f) => f.startsWith(`${r}-`) && f.endsWith('.js'));
  if (!page) {
    console.log(`\n【${r}】未找到对应 chunk（检查路由组件名）`);
    continue;
  }
  const rc = closure(page);
  const extraJs = rc.js.filter((f) => !entryJs.has(f));
  const extraCss = [...new Set([...rc.css, ...htmlCss])].filter((f) => !entryCss.has(f));
  const extra = sum(extraJs) + sum(extraCss);
  const total = jsTotal + cssTotal + extra;
  const totalGz = sumGz([...entryJs]) + sumGz([...entryCss]) + sumGz(extraJs) + sumGz(extraCss);
  console.log(
    `\n【进入 ${r} 的额外加载】${extraJs.length} 个 JS + ${extraCss.length} 个 CSS，小计 ${kb(extra)} KB → 该路由总计 ${kb(total)} KB  (gzip ${kb(totalGz)} KB)`,
  );
  extraJs
    .sort((a, b) => sizeOf(b) - sizeOf(a))
    .slice(0, 8)
    .forEach((f) => console.log(`    ${kb(sizeOf(f)).padStart(8)} KB  ${f}`));
  report.routes[r] = {extra, extraJs, extraCss, total};
}

if (process.env.OUT) {
  fs.writeFileSync(process.env.OUT, JSON.stringify(report, null, 2));
  console.log(`\n已写出 ${process.env.OUT}`);
}
