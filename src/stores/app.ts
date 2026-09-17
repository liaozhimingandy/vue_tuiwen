import {defineStore} from 'pinia';
import {ref} from 'vue';
import type {IAccount, IPost, IToken} from '@/interface';
import type {IPostDraft} from '../interface';
import instance from '../services';
import {apiUrls} from '../services/api.ts';
import {MessagePlugin} from 'tdesign-vue-next';
import {compareByTimeDesc} from '../common/utils.ts';

/**
 * 帖子列表状态库
 * 负责首页/用户页推文列表的本地维护（新增、去重合并、删除、排序）
 */
export const usePostStore = defineStore('posts', () => {
  /** 推文列表（始终按创建时间倒序） */
  const posts = ref<IPost[]>([]);

  /**
   * 新增单条推文数据
   * @param data 新发布的推文
   */
  const addPost = (data: IPost) => {
    posts.value.push(data);
    posts.value = posts.value.sort(compareByTimeDesc);
  };

  /**
   * 批量追加拿更多推文
   * 以 post_id 去重（同一条保留最新一次出现的数据），最后统一按时间倒序
   * @param data 接口返回的推文数组
   */
  const addPosts = (data: IPost[]) => {
    // 合并现有 + 新数据
    const combined = [...posts.value, ...data];

    // Map 去重（保留最后出现的那条）
    const map = new Map<string, IPost>();
    for (const item of combined) {
      map.set(item.post_id, item);
    }
    // 排序：最新在前
    posts.value = Array.from(map.values()).sort(compareByTimeDesc);
  };

  /**
   * 删除指定的帖子
   * @param post_id 帖子 ID
   */
  const delete_post = (post_id: string) => {
    posts.value = posts.value.filter((p) => p.post_id !== post_id);
  };
  return {
    addPost,
    posts,
    addPosts,
    delete_post,
  };
});

/**
 * 账户状态库（持久化到 localStorage）
 * 同时保存用户资料与双 token，是全站鉴权的唯一数据源
 */
export const useAccountStore = defineStore(
  'account',
  () => {
    /** 当前登录用户资料 */
    const account = ref<IAccount>({account_id: ''});
    /** 访问令牌 + 刷新令牌 */
    const token = ref<IToken>({access_token: '', refresh_token: ''});

    /** 覆盖式更新用户资料 */
    const update_account = (data: IAccount) => (account.value = data);

    /**
     * 更新单个 token 字段
     * @param key 'access_token' | 'refresh_token'
     * @param value 新值
     */
    const update_token = <K extends keyof IToken>(key: K, value: IToken[K]) => {
      if (!token.value) {
        token.value = {access_token: '', refresh_token: ''};
      }
      token.value[key] = value;
    };

    /** 清空 token */
    const reset_token = () => {
      token.value = {
        access_token: '',
        refresh_token: '',
      };
    };

    /** 清空用户信息 */
    const reset_account = () => {
      account.value = {account_id: ''};
    };

    /** 退出登录统一方法：清空内存状态与本地存储 */
    const logout = () => {
      reset_account();
      reset_token();
      localStorage.removeItem('account');
    };

    return {
      account,
      update_account,
      token,
      update_token,
      reset_token,
      logout,
    };
  },
  {
    persist: {
      key: 'account', // 本地存储的自定义 key
      storage: localStorage, // 用 localStorage，支持跨标签页共享
      // 只持久化这两个字段（pinia-plugin-persistedstate v4 中 paths 已更名为 pick，
      // 继续写 paths 会被静默忽略，导致该白名单失效）
      pick: ['account', 'token'],
    },
  },
);

/**
 * 发帖草稿状态库（持久化到 localStorage）
 * 用于长文/发帖中途刷新页面不丢内容
 */
export const useDraftStore = defineStore(
  'draft',
  () => {
    /** 草稿内容：文本 + 已上传图片 + 创建时间 */
    const post_draft = ref<IPostDraft | null>(null);

    /** 清除草稿（同时清掉持久化数据） */
    const clearDraft = () => {
      localStorage.removeItem('post_draft');
    };

    return {
      post_draft,
      clearDraft,
    };
  },
  {
    persist: {
      key: 'post_draft', // 本地存储的自定义 key
      storage: localStorage, // 用 localStorage，支持跨标签页共享
      pick: ['post_draft'], // 只持久化草稿字段（v4 使用 pick，见上）
    },
  },
);

/**
 * 用户资料缓存状态库
 * 解决列表中同一位用户被多次请求资料的问题：
 * - account_map：已完成的用户资料缓存
 * - pending_map：进行中的请求，用于并发去重（同一用户只发一次请求）
 */
export const useCacheStore = defineStore('cache', () => {
  /** 缓存所有用户信息 { account_id: IAccount } */
  const account_map = ref<Record<string, IAccount>>({});
  /** 缓存正在请求中的 Promise，避免并发重复请求同一用户 */
  const pending_map = ref<Record<string, Promise<IAccount>>>({});

  /**
   * 获取用户资料（含关注状态），带缓存与并发去重
   * @param account_id 用户 ID
   * @returns 完整用户资料（含 follow 字段）
   */
  const fetch_account = async (account_id: string) => {
    // 命中缓存直接返回
    if (account_map.value[account_id]) {
      return Promise.resolve(account_map.value[account_id]);
    }

    // 已有相同请求在途，复用同一个 Promise（并发去重）
    const pending = pending_map.value[account_id];
    if (pending) {
      return pending;
    }

    const promise = Promise.all([
      instance.get(apiUrls.get_account(account_id)),
      instance.get(apiUrls.get_account_follow(account_id)),
    ])
      .then(([r1, r2]) => {
        // 合并成一个完整对象
        const account = {
          ...r1.data,
          follow: r2.data,
        };

        account_map.value[account_id] = account;
        return account;
      })
      .finally(() => {
        delete pending_map.value[account_id];
      });

    // 注意：这里记录的是"进行中"的 Promise，必须写入 pending_map。
    // 之前误写成 account_map.value[account_id] = promise，
    // 会把 Promise 当成用户信息塞进 account_map，
    // 导致组件读到 Promise（如 Post.vue 直接取 account_map[id].follow）
    // 在接口返回前出现瞬时错误数据。
    pending_map.value[account_id] = promise;
    return promise;
  };

  const toggleFollow = async (follower_id: string, followee_id: string) => {
    // follower_id: 关注者（当前登录用户）  followee_id: 被关注者
    const account = account_map.value[followee_id];

    // 被关注者信息尚未加载时不做任何操作
    if (!account?.follow) return;

    /**
     * 同步维护双方的关注计数
     * 注意 follower 可能还没被缓存，需要判空，避免 undefined.follow 报错
     */
    const bumpCount = (delta: number) => {
      if (typeof account.follow.follower_count === 'number') {
        account.follow.follower_count += delta;
      }
      const selfAccount = account_map.value[follower_id];
      if (selfAccount?.follow && typeof selfAccount.follow.followee_count === 'number') {
        selfAccount.follow.followee_count += delta;
      }
    };

    if (!account.follow.is_following) {
      // 当前未关注 → 发起关注
      const data = {
        follower_id: follower_id,
        followee_id: followee_id,
      };
      await instance.post(apiUrls.post_follow(), {...data});
      account.follow.is_following = true;
      bumpCount(1);
      await MessagePlugin.success('关注成功');
    } else {
      // 已关注 → 取消关注（统一 await，保证异常能被上层捕获）
      await instance.delete(apiUrls.delete_follow(follower_id, followee_id));
      account.follow.is_following = false;
      bumpCount(-1);
      await MessagePlugin.success('取消关注成功');
    }
  };

  return {
    account_map,
    fetch_account,
    toggleFollow,
  };
});
