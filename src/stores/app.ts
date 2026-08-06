import {defineStore} from "pinia";
import {ref} from "vue";
import type {IAccount, IPost, IToken} from "@/interface";
import type {IPostDraft} from "../interface";
import instance from "../services";
import {apiUrls} from "../services/api.ts";

// 帖子信息
export const usePostStore = defineStore("posts", () => {
    const posts = ref<IPost[]>([]); // 推文列表

    // 新增推文数据
    const addPost = (data: IPost) => {
        posts.value.push(data);
        posts.value = posts.value.sort((a: IPost, b: IPost) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
    }
    // 新增多份推文数据
    const addPosts = (data: IPost[]) => {
        // let els = posts.value.concat(data);
        // let map = new Map();
        // els.forEach((item: IPost) => map.set(item.post_id, item));
        // posts.value = Array.from(map.values());
        // posts.value = posts.value.sort((a: IPost, b: IPost) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
        // 合并现有 + 新数据
        const combined = [...posts.value, ...data]

        // Map 去重（保留最后出现的那条）
        const map = new Map()
        for (const item of combined) {
            map.set(item.post_id, item)
        }
        // 排序：最新在前
        posts.value = Array.from(map.values()).sort((a, b) => {
            return new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime()
        })
    }

    // 删除指定的帖子
    const delete_post = (post_id: string) => {
        posts.value = posts.value.filter(p => p.post_id !== post_id);
    }
    return {
        addPost,
        posts,
        addPosts,
        delete_post
    }
});

// 帐户信息存储
export const useAccountStore = defineStore("account", () => {
        const account = ref<IAccount>({account_id: ''});
        const token = ref<IToken>({access_token: '', refresh_token: ''})

        const update_account = (data: IAccount) => account.value = data;

        // 更新部分token,
        const update_token = <K extends keyof IToken>(key: K, value: IToken[K]) => {
            if (!token.value) {
                token.value = {access_token: '', refresh_token: ''}
            }
            token.value[key] = value;
        };


        // 重置 token
        const reset_token = () => {
            token.value = {
                access_token: '',
                refresh_token: ''
            }
        }

        // 重置用户信息
        const reset_account = () => {
            account.value = {account_id: ''};
        };

        // 退出登录统一方法
        const logout = () => {
            reset_account();
            reset_token();
            localStorage.removeItem('account');
        }


        return {
            account,
            update_account,
            token,
            update_token,
            reset_token,
            logout
        }
    },
    {
        persist: {
            key: 'account', // 本地存储的自定义key
            storage: localStorage, // 用localStorage，支持跨标签页共享
            paths: ['account', 'token'] // 只持久化这个字段，无关数据不存储
        }
    }
)

// 草稿信息
export const useDraftStore = defineStore("draft", () => {
        const post_draft = ref<IPostDraft | null>(null);

        const clearDraft = () => {
            localStorage.removeItem('post_draft');
        }

        return {
            post_draft,
            clearDraft
        }
    },
    {
        persist: {
            key: 'post_draft', // 本地存储的自定义key
            storage: localStorage, // 用localStorage，支持跨标签页共享
            paths: ['post_draft',] // 只持久化这个字段，无关数据不存储
        }
    });

//
export const useCacheStore = defineStore("cache", () => {
        // 缓存所有用户信息 { userId: userInfo }
        const account_map = ref<Record<string, IAccount>>({});
        // 缓存关注状态 { userId: boolean }
        const follow_map = ref<Record<string, boolean>>({});
        // 缓存正在请求中的 Promise
        const pending_map = ref<Record<string, Promise<IAccount>>>({})

        // 获取用户信息
        const fetech_account = async (account_id: string) => {
            //已有缓存直接返回
            if (account_map.value[account_id]) {
                return Promise.resolve(account_map.value[account_id]);
            }

            // 2. 如果正在请求，直接复用同一个 Promise
            const pending = pending_map.value[account_id];
            if (pending) {
                return pending;
            }

            const promise = Promise.all([
                instance.get(apiUrls.get_account(account_id)),
                instance.get(apiUrls.get_account_follow(account_id)),
            ]).then(([r1, r2]) => {
                // 合并成一个完整对象
                const account = {
                    ...r1.data,
                 ...{follow: r2.data}
                };

                account_map.value[account_id] = account;
                return account;
            }).finally(() => {
                account_map.value[account_id] = null;
            });

            account_map.value[account_id] = promise;
            return promise;
        };

        // 关注 / 取消关注（全局同步）
        const follow_account = async (account_id: string) => {
            // await instance.post('/follow', { userId })
            follow_map.value[account_id] = true;
        };

        const unfollow_account = async (account_id: string) => {
            // await instance.post('/unfollow', { userId })
            follow_map.value[account_id] = false;
        };

        // 获取关注状态
        const get_follow_status = (account_id: string) => {
            return follow_map.value[account_id];
        };

        return {
            account_map,
            fetech_account,
            follow_account,
            unfollow_account,
            get_follow_status
        }
    }
)