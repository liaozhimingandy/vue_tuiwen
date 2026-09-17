import path from 'node:path';
import process from 'node:process';

import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {version} from './package.json' with {type: 'json'};
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import removeConsole from 'vite-plugin-remove-console';
import {TDesignResolver} from '@tdesign-vue-next/auto-import-resolver';
import {createSvgIconsPlugin} from 'vite-plugin-svg-icons';

const __dirname = import.meta.dirname;

// https://vite.dev/config/
export default defineConfig({
  base: '/', // 这里保持和你你的 GitHub 仓库名一致
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: process.env.VITE_HOST || '0.0.0.0',
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [
        TDesignResolver({
          library: 'vue-next',
        }),
      ],
    }),
    Components({
      resolvers: [
        TDesignResolver({
          library: 'vue-next',
        }),
      ],
    }),
    removeConsole({
      // 默认在生产环境移除console
      exclude: ['error', 'warn'], // 可选：保留 error 和 warn 信息
    }),
    createSvgIconsPlugin({
      // 图标存放目录：所有svg放这里
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
      // symbol id格式: #icon‑文件名
      symbolId: 'icon-[name]',
      svgoOptions: {
        plugins: [
          {
            name: 'removeAttrs',
            params: {
              attrs: 'fill',
            },
          },
        ],
      },
    }),
  ],
  build: {
    /**
     * ⚠️ 这里**刻意不配置** `rollupOptions.output.codeSplitting.groups`（rolldown 时代
     * manualChunks / advancedChunks 的替代品），原因是被实测数据否掉了：
     *
     * 曾尝试给 wangEditor 单独建组（只被懒加载路由 /articles/ 使用，看上去很适合长期缓存）：
     *   groups: [{name: 'vendor-editor', test: /node_modules[\\/]@wangeditor[\\/]/, priority: 10}]
     * 结果产物里入口 chunk 出现 `from"./vendor-editor-xxx.js"` 的**静态导入**，
     * dist/index.html 也把它写进了 modulepreload —— 那 891KB 编辑器在首屏就被下载了。
     * （入口闭包 849.9 KB → 1157.6 KB，首屏反而变大 307KB。）
     *
     * 结论：rolldown 的命名分组会把 chunk 提到入口的静态依赖里，而 chunk 是「原子加载单位」，
     * 所以「把大依赖拆出来」不等于「按需加载」。保持默认行为，让 rolldown 自己按动态 import
     * 边界切分，wangEditor 自然只待在 ArticlePage 的懒加载 chunk 中，首屏零成本。
     *
     * ⚠️ 若将来确实要调分包，务必用 `npm run analyze:bundle` 做「闭包度量」验证，
     * 只看单个 chunk 体积会得出完全相反的结论。
     */
    /**
     * 体积告警阈值。
     *
     * 500KB 默认阈值下，唯一超标的是 ArticlePage 的懒加载 chunk（约 806KB，
     * 其中 787KB 是 wangEditor 富文本编辑器），它只在用户进入发布页时才下载，
     * 不参与首屏；入口闭包全部 chunk 均 < 120KB。把阈值抬到 900KB 是为了
     * 让这条已知且可接受的告警不再淹没其它输出，同时仍能在产物异常膨胀时报警。
     * 判断有没有回退，请以 analyze:bundle 的「入口闭包」数字为准。
     */
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    // 用数组形式是为了能写正则（精确匹配），避免误伤同前缀的包
    alias: [
      /**
       * ⚠️ 必须精确匹配 vue 本身（^vue$），否则会误伤 vue-router / vue-clamp / vue-cloudflare-turnstile 等。
       *
       * 背景：依赖 c-scrollbar 只发布了 CJS 产物（cScrollbar.common.js），内部通过 require('vue') 引 Vue。
       * 这条 CJS 路径会解析到 Vue 的「完整构建」（vue.cjs.prod.js），连带把模板编译器
       * @vue/compiler-core（约 133KB）与 @vue/compiler-dom（约 18KB）一起打进产物。
       * 而运行时根本用不到编译器（所有组件都是 SFC，编译发生在构建期）。
       *
       * 强制指向 runtime-only 的 ESM 构建：API 完全等价，且可被 tree-shake。
       * 实测可为首屏减掉约 151KB（未压缩）。
       */
      {
        find: /^vue$/,
        replacement: 'vue/dist/vue.runtime.esm-bundler.js',
      },
      /**
       * 把 lodash 的两个入口都指向 lodash-es（ESM）。
       *
       * 背景：lodash 的 main 是 CJS 的 lodash.js（约 540KB 源码），
       * `import {debounce} from 'lodash'` 这种写法无法 tree-shake，会把完整 lodash
       * （未压缩约 177KB）打进首屏。
       * lodash-es 与之版本一致（4.18.1）、API 完全相同，且 package.json 声明了
       * sideEffects:false，能真正按需摇树；同时可与 tdesign-vue-next 内部的
       * lodash-es 依赖复用同一批模块，不会出现两份 lodash。
       *
       * 说明：类型检查仍走 @types/lodash（tsconfig 不需要跟着改），只是运行时被换成 ESM 实现。
       */
      {
        find: /^lodash$/,
        replacement: 'lodash-es',
      },
      {
        find: /^lodash\/(.*)$/,
        replacement: 'lodash-es/$1',
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, `./src`),
      },
    ],
  },
});
