import path from 'node:path';
import process from 'node:process';

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {version} from './package.json'
import {AntDesignVueResolver} from 'unplugin-vue-components/resolvers'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import removeConsole from 'vite-plugin-remove-console'

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
                AntDesignVueResolver()
            ],
        }),
        Components({
            resolvers: [
                AntDesignVueResolver({
                    importStyle: false, // css in js
                }),
            ],
        }),
        removeConsole({
            // 默认在生产环境移除console
            exclude: ['error', 'warn'], // 可选：保留 error 和 warn 信息
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, `./src`),
        },
    },
})
