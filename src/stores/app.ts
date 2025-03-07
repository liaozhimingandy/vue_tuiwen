import {defineStore} from "pinia";
import {ref} from "vue";
import type {IAccount, IPost} from "../interface/types.ts";

export const usePostStore = defineStore("posts", () => {
    const posts = ref<IPost[]>([]); // 推文列表

    // 新增推文数据
    const addPost = (data: IPost)=>  {
        posts.value.push(data);
        posts.value = posts.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
    }
    // 新增多份推文数据
    const addPosts = (data: IPost[])=>  {
        let els = posts.value.concat(data);
        let map = new Map();
        els.forEach((el) => map.set(el.post_id, el));
        posts.value = Array.from(map.values());
        posts.value = posts.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
    }
    return {
        addPost,
        posts,
        addPosts
    }});

// 帐户信息存储
export const useAccountStore = defineStore("account", () => {
    const account = ref<IAccount>();

    const update_account = (data: IAccount) => {
        account.value = data;
        console.info(account.value);
    };

    return {
        account,
        update_account
    }
})