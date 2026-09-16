import appStore from "@/stores";
import instance from '@/services';
import type {IAccount} from "@/interface";
import {config} from "../common/config.ts";

export const apiUrls = {
    // 用户账号相关
    get_account: (account_id: string) => `/accounts/${account_id}/`,
    check_username: (username: string) => `/accounts/check-username/${username}/`,
    update_username: () =>  '/accounts/credential/',
    register: () => '/accounts/register/',
    update_password: () => '/accounts/password/change/',
    reset_password: () => "/accounts/password/reset/",
    update_account: (account_id: string) => `/accounts/${account_id}/`,
    send_code: () => "/accounts/send/code/",
    login: () => '/oauth/authorize/password/',
    update_token: (account_id: string) => `/oauth/refresh-token/${account_id}/refresh_token/`,
    search_account: (keyword: string) => `/accounts/search/${keyword}/`,

    // 帖子相关
    get_posts: () => '/posts/',
    get_post: (post_id: string) => `/posts/${post_id}/`,
    get_account_posts: (account_id: string) => `/posts/accounts/${account_id}/`,
    post_posts: () => "/posts/",
    delete_posts: (post_id: string) => `/posts/${post_id}/`,
    get_posts_latest: () => '/posts/lastest/',
    get_s_post: (post_id: string) => `/posts/s/${post_id}/`,

    // 评论相关
    get_comments: (post_id: string) => `/comments/1/${post_id}/`,
    post_comments: () => `/comments/`,
    delete_comments: (comment_id: string) => `/comments/${comment_id}/`,

    // 点赞相关
    post_likes: () => "/likes/",
    delete_likes: (post_id: string) => `/likes/${post_id}/`,
    get_likes: (post_id: string) => `/likes/${post_id}/count/`,

    // 关注相关
    post_follow: () => "/follows/",
    delete_follow: (follower_id: string, followee_id: string) => `/follows/${follower_id}/${followee_id}/`,
    get_account_follow: (account_id: string) => `/follows/${account_id}/count/`,

    // 上传 & 分享
    upload_image_url: () => `${config.API_BASE_URL}/upload/image/`,
    share_post_link: (post_id: string) => `${config.APP_BASE_URL}/s/${post_id}/`,
    share_account_link: (account_id: string) => `${config.APP_BASE_URL}/u/${account_id}/`,

    // 获取系统通知列表
    get_system_notices: () => "/notices/system/", // 拉取公告通知
    get_account_notices: (account_id: string) => `/notices/accounts/${account_id}/`, // 拉取用户通知


    // 天亮即焚
    post_snap: ()=> '/snaps/',
    get_snap_latest: () => '/snaps/latest/',
    get_snaps: () => '/snaps/',
    like_snap:(id: number) => `/snaps/${id}/like/`,

    // 其它
    check_health: () => "/health-check/", //检查服务健康状态
    static_links: (link: string) => `${config.CDN_BASE_URL}${link}`,//获取文件链接地址
    two_step_verification: () => "/auth/two_step_verification/", //人机检测
    feedback: () => "/feedbacks/" // 用户建议或反馈

}

// 更新本帐户信息
export const update_self_account = async (account_id: string) => {
    await instance.get(apiUrls.get_account(account_id)).then((r: any) => {
        // r.data.sex = r.data.sex + '';
        appStore.useAccountStore.update_account(r.data as IAccount);
    });
}

// 获取所有帖子信息
export const get_posts = async (limit: number = 10, cursor: string,) => {
    return await instance.get(apiUrls.get_posts(), {params: {limit: limit, ...(cursor != null && {cursor: cursor})}})
}


// 获取指定用户的帖子信息
export const get_accounts_posts = async (limit: number = 10, cursor: string, account_id: string) => {
    return await instance.get(apiUrls.get_account_posts(account_id), {params: {limit: limit, ...(cursor != null && {cursor: cursor})}})
}

// 发布帖子
export const publish_post = async (data: any) => {
    instance.post(apiUrls.post_posts(), data).then((r: any) => {
        appStore.usePostStore.addPost(r.data);
    });
}

// 关注
export const toggleFollow = async (is_following: boolean, follower_id: string, followee_id: string) => {
    //follower_id: 关注者 followee_id:被关注者
    if (!is_following) {
        // 如果没有正在关注
        const data = {
            follower_id: follower_id,
            followee_id: followee_id
        };
        await instance.post(apiUrls.post_follow(), data);
    } else {
        await instance.delete(apiUrls.delete_follow(follower_id, followee_id))
    }
}