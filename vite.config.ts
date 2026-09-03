import path from 'node:path';
import process from 'node:process';

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {version} from './package.json' with {type: 'json'}
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import removeConsole from 'vite-plugin-remove-console'
import {TDesignResolver} from '@tdesign-vue-next/auto-import-resolver';
import {createSvgIconsPlugin} from 'vite-plugin-svg-icons';

const __dirname = import.meta.dirname

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
                    library: 'vue-next'
                })
            ],
        }),
        Components({
            resolvers: [
                TDesignResolver({
                    library: 'vue-next'
                })
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
                            attrs: 'fill'
                        }
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, `./src`),
        },
    },
})
