/**
 * HTML 消毒：`v-html` 渲染前的最后一道防线
 *
 * 为什么单独成文件：本模块只被「渲染富文本正文」的懒加载路由引用
 * （components/RichTextCollapse.vue、pages/SnapPage.vue）。若放进 common/utils.ts，
 * 它会随 utils 一起进入首屏入口闭包，让所有用户为本用不到的功能付流量。
 */

/**
 * 需要整体移除（含子树）的高危元素
 *
 * svg / math 一并移除：它们是 `on*`、`xlink:href="javascript:"`、
 * `<svg><script>` 等载体，且用户正文几乎不会内联矢量图，
 * 与其逐项排查外部内容（foreign content）解析差异，不如直接禁掉。
 */
const DROP_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'link',
  'meta',
  'base',
  'title',
  'noscript',
  'svg',
  'math',
  'template',
  'frame',
  'applet',
].join(',');

/** 携带 URL、需要校验协议的属性 */
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'background', 'srcset']);

/** data: 仅放行常见位图格式（data:image/svg+xml 可携带脚本，不放行） */
const SAFE_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp)[;,]/i;

/**
 * HTML 消毒（零依赖）
 *
 * 背景：推文正文与树洞正文最终都经 `v-html` 渲染。任何人发布一条含
 * `<img src=x onerror=...>` 的正文，所有浏览者都会执行其中的脚本（存储型 XSS）。
 * 但长文编辑器产出的是**合法 HTML**（`<p>` / `<img>` / `<table>` 等），
 * 不能整体转义，否则正文会被渲染成一堆标签文字。
 *
 * 因此这里做「基于 DOM 的选择性清洗」而非转义：
 *   1. 整体删除高危元素及其子树（见 DROP_TAGS）；
 *   2. 删除所有 `on*` 事件属性（onerror / onclick / onload ...）；
 *   3. URL 类属性中协议为 `javascript:` / `vbscript:` 或非图片 `data:` 的直接删属性；
 *   4. `style` 中含 `expression(` / `javascript:` / `url(` 的删属性。
 * 白名单之外的元素（如 `<font>`）保留标签、只清洗属性，尽量不丢正文内容。
 *
 * 安全性说明：清洗时把 HTML 写进**脱离文档的 `<template>` 元素**，
 * 脚本不会执行、图片不会发起请求，因此「清洗」这个动作本身无副作用；
 * 等属性清完再取 innerHTML 交给 v-html，此时危险属性已经不存在。
 *
 * @param html 待渲染的 HTML 字符串
 * @returns 清洗后的 HTML 字符串
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // 无 DOM 环境（SSR / 单测）下退化为整体转义，绝不原样返回
  if (typeof document === 'undefined') {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  // 1) 高危元素整体移除（含子树）
  tpl.content.querySelectorAll(DROP_TAGS).forEach((el) => el.remove());

  // 2) 逐元素清洗属性。注意：先取 Array.from 快照，
  //    否则边遍历边 removeAttribute 会跳过相邻属性
  tpl.content.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = (attr.value ?? '').trim();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRS.has(name)) {
        const lower = value.toLowerCase();
        if (/^(javascript|vbscript):/.test(lower) || (/^data:/.test(lower) && !SAFE_DATA_URL_RE.test(value))) {
          el.removeAttribute(attr.name);
        }
        continue;
      }

      if (name === 'style') {
        const lower = value.toLowerCase();
        if (lower.includes('expression') || lower.includes('javascript:') || lower.includes('url(')) {
          el.removeAttribute(attr.name);
        }
      }
    }
  });

  return tpl.innerHTML;
}
