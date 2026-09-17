/**
 * 接口地址集中管理与常用请求封装
 *
 * - `apiUrls`：所有后端接口路径的唯一来源，避免路径散落在各页面；
 * - 下面的函数是常用的轻量请求封装，复杂逻辑请放在页面/Store 中。
 *
 * 注意：与接口地址相关的拼接一律通过 `getApiBaseUrl()` 取运行时地址，
 * 不要直接使用 `config.API_BASE_URL`（那是启动时的快照，
 * 节点自动切换后不会更新）。
 */
import appStore from '@/stores';
import instance from '@/services';
import type {IAccount} from '@/interface';
import {config} from '../common/config.ts';
import {getApiBaseUrl} from '../common/endpoint-detector.ts';

export const apiUrls = {
  // 用户账号相关
  get_account: (account_id: string) => `/accounts/${account_id}/`,
  check_username: (username: string) => `/accounts/check-username/${username}/`,
  update_username: () => '/accounts/credential/',
  register: () => '/accounts/register/',
  update_password: () => '/accounts/password/change/',
  reset_password: () => '/accounts/password/reset/',
  update_account: (account_id: string) => `/accounts/${account_id}/`,
  send_code: () => '/accounts/send/code/',
  login: () => '/oauth/authorize/password/',
  update_token: (account_id: string) => `/oauth/refresh-token/${account_id}/refresh_token/`,
  search_account: (keyword: string) => `/accounts/search/${keyword}/`,

  // 帖子相关
  get_posts: () => '/posts/',
  get_post: (post_id: string) => `/posts/${post_id}/`,
  get_account_posts: (account_id: string) => `/posts/accounts/${account_id}/`,
  post_posts: () => '/posts/',
  delete_posts: (post_id: string) => `/posts/${post_id}/`,
  get_posts_latest: () => '/posts/lastest/',
  get_s_post: (post_id: string) => `/posts/s/${post_id}/`,

  // 评论相关
  get_comments: (post_id: string) => `/comments/1/${post_id}/`,
  post_comments: () => `/comments/`,
  delete_comments: (comment_id: string) => `/comments/${comment_id}/`,

  // 点赞相关
  post_likes: () => '/likes/',
  delete_likes: (post_id: string) => `/likes/${post_id}/`,
  get_likes: (post_id: string) => `/likes/${post_id}/count/`,

  // 关注相关
  post_follow: () => '/follows/',
  delete_follow: (follower_id: string, followee_id: string) => `/follows/${follower_id}/${followee_id}/`,
  get_account_follow: (account_id: string) => `/follows/${account_id}/count/`,

  // 上传 & 分享
  /** 图片上传地址（走运行时 API 地址） */
  upload_image_url: () => `${getApiBaseUrl()}/upload/image/`,
  /** 帖子分享链接（走 APP 站点地址） */
  share_post_link: (post_id: string) => `${config.APP_BASE_URL}/s/${post_id}/`,
  /** 用户主页分享链接（走 APP 站点地址） */
  share_account_link: (account_id: string) => `${config.APP_BASE_URL}/u/${account_id}/`,

  // 获取系统通知列表
  get_system_notices: () => '/notices/system/', // 拉取公告通知
  get_account_notices: (account_id: string) => `/notices/accounts/${account_id}/`, // 拉取用户通知

  // 天亮即焚
  post_snap: () => '/snaps/',
  get_snap_latest: () => '/snaps/latest/',
  get_snaps: () => '/snaps/',
  like_snap: (id: number) => `/snaps/${id}/like/`,

  // 其它
  check_health: () => '/health-check/', //检查服务健康状态
  /** 把后端返回的相对路径拼成完整静态资源地址（走运行时 API 地址） */
  static_links: (link: string) => `${getApiBaseUrl()}${link}`,
  two_step_verification: () => '/auth/two_step_verification/', //人机检测
  feedback: () => '/feedbacks/', // 用户建议或反馈
};

/**
 * 拉取并更新"当前登录用户"的资料到全局 Store
 * @param account_id 当前登录用户 ID
 */
export const update_self_account = async (account_id: string) => {
  await instance.get(apiUrls.get_account(account_id)).then((r: any) => {
    appStore.useAccountStore.update_account(r.data as IAccount);
  });
};

/**
 * 获取首页推文列表（游标分页）
 * @param limit 单页数量
 * @param cursor 上一页最后一条的 post_id，首页传 null
 */
export const get_posts = async (limit: number = 10, cursor?: string | null) => {
  return await instance.get(apiUrls.get_posts(), {params: {limit: limit, ...(cursor != null && {cursor: cursor})}});
};

/**
 * 获取指定用户的推文列表（游标分页）
 * @param limit 单页数量
 * @param cursor 上一页最后一条的 post_id，首页传 null
 * @param account_id 目标用户 ID
 */
export const get_accounts_posts = async (limit: number = 10, cursor: string | null, account_id: string) => {
  return await instance.get(apiUrls.get_account_posts(account_id), {
    params: {limit: limit, ...(cursor != null && {cursor: cursor})},
  });
};

/**
 * 发布帖子
 *
 * ⚠️ 必须把请求 Promise 返回出去：调用方普遍写作 `await publish_post(post)`，
 * 若不返回，await 会立即通过，导致"接口还没成功就提示发布成功并清空草稿"。
 *
 * @param data 帖子数据
 * @returns 创建成功后的帖子对象
 */
export const publish_post = async (data: any) => {
  return instance.post(apiUrls.post_posts(), data).then((r: any) => {
    appStore.usePostStore.addPost(r.data);
    return r.data;
  });
};

/**
 * 关注 / 取消关注
 *
 * 说明：该方法与 `stores/app.ts` 中的 `useCacheStore.toggleFollow` 功能重叠，
 * 当前页面实际使用的是 Store 版本（能同步缓存中的关注数），
 * 本方法暂无调用方，保留仅为兼容旧代码。
 *
 * @param is_following 当前是否已关注
 * @param follower_id 关注者（当前登录用户）
 * @param followee_id 被关注者
 */
export const toggleFollow = async (is_following: boolean, follower_id: string, followee_id: string) => {
  //follower_id: 关注者 followee_id:被关注者
  if (!is_following) {
    // 如果没有正在关注
    const data = {
      follower_id: follower_id,
      followee_id: followee_id,
    };
    await instance.post(apiUrls.post_follow(), data);
  } else {
    await instance.delete(apiUrls.delete_follow(follower_id, followee_id));
  }
};
