/// <reference types="vite/client" />

/**
 * vite-plugin-svg-icons 提供的虚拟模块
 *
 * 该包的 package.json "exports" 只暴露了 "."，没有暴露 "./client"，
 * 因此 `/// <reference types="vite-plugin-svg-icons/client" />` 无法解析，
 * 这里改为自行声明这两个虚拟模块。
 */
declare module 'virtual:svg-icons-register';

declare module 'virtual:svg-icons-names' {
  const iconsNames: string[];
  export default iconsNames;
}

/**
 * @wangeditor/editor-for-vue 未随包发布类型声明
 *
 * 该包 package.json 没有 types 字段，目录下也只有 dist，导致 TS 报 TS7016
 * （隐式 any）。而 `@wangeditor/editor` 本体是有类型的，这里只补 Vue 封装的
 * 最小声明：Editor 同时需要「值」（组件）与「类型」（编辑器实例）两种含义，
 * 因此用 interface + const 同名声明。
 */
declare module '@wangeditor/editor-for-vue' {
  import type {DefineComponent} from 'vue';

  /** 编辑器实例（只声明项目实际用到的方法，其余按需补充） */
  export interface Editor {
    /** 取编辑器内容的纯文本（用于发布前判空） */
    getText(): string;
    /** 清空编辑器内容 */
    clear(): void;
    /** 销毁编辑器实例 */
    destroy(): void;
    [property: string]: any;
  }

  /** 富文本编辑器组件 */
  export const Editor: DefineComponent<Record<string, any>>;
  /** 编辑器工具栏组件 */
  export const Toolbar: DefineComponent<Record<string, any>>;
}

/**
 * 环境变量类型声明
 *
 * Vite 只会把 .env 中 VITE_ 前缀的变量注入到 import.meta.env，
 * 且**全部以字符串形式**注入（"False" 也是 truthy），
 * 需要布尔语义时请使用 config.isDebug（内部已做解析）。
 *
 * 在此显式声明项目用到的变量，便于补全与排错；
 * 末尾的索引签名用于兼容临时/未声明的变量，不产生类型错误。
 */
interface ImportMetaEnv {
  /** 前端站点地址（用于分享链接） */
  readonly VITE_APP_BASE_URL_APP?: string;
  /** 后端接口地址 */
  readonly VITE_APP_API_BASE_URL?: string;
  /** 是否调试模式，取值 "True" / "False" */
  readonly VITE_APP_IS_DEBUG?: string;
  /** 远端节点清单地址 */
  readonly VITE_APP_ENDPOINT_URL?: string;
  /** Cloudflare Turnstile site key */
  readonly VITE_APP_TURNSTILE_SITE_KEY?: string;
  /** 静态资源 / CDN 地址 */
  readonly VITE_CDN_BASE_URL?: string;
  /** 允许注册的邮箱后缀，逗号分隔 */
  readonly VITE_MAIL_SUFFIX?: string;
  /** 开发服务器 host */
  readonly VITE_HOST?: string;

  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** 由 vite.config.ts 的 define 注入的应用版本号 */
declare const __APP_VERSION__: string;
