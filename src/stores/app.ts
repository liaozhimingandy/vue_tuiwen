import {defineStore} from "pinia";
import {ref} from "vue";
import type {IAccount, IPost} from "../interface/types.ts";

export const usePostStore = defineStore("posts", () => {
    let posts = ref<IPost[]>([]); // 推文列表

    // 新增推文数据
    const addPost = (data: IPost)=>  {
        posts.value.push(data);
    }
    return {
        addPost,
        posts
    }});

// 帐户信息存储
export const useAccountStore = defineStore("account", () => {
    let account = ref<IAccount>();

    const update_account = (data: IAccount) => {
        account.value = data;
    }
    return {
        account,
        update_account
    }
})