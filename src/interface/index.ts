/**
 * 全局业务实体类型定义
 *
 * 约定：字段名与后端返回保持一致（下划线风格），不做驼峰转换，
 * 以免各处自行映射造成歧义。
 *
 * ⚠️ 关于索引签名 `[property: string]: any`：
 * 它虽然方便兼容后端字段变动，但会让所有拼错的字段名都"合法"，
 * 从而掩盖真实 bug（例如 post.create_at 与 gmt_created 混用）。
 * 建议后续逐步用显式字段替换掉索引签名。
 */

/**
 * 推文信息
 */
export interface IPost {
  account_id: string;
  content: IContent;
  post_type: number;
  from_device: number;
  from_ip?: string;
  /**
   * 创建时间
   *
   * ⚠️ 后端在不同接口上分别返回 `create_at` 与 `gmt_created` 两种命名，
   * 两者含义相同（都是创建时间）。这里声明为可选，且**读取时必须走
   * `getEntityTime()` 做双字段兼容**，不要直接 `new Date(post.create_at)`
   * （缺失时会得到 Invalid Date，表现为排序失效、显示 NaN）。
   */
  create_at?: string;
  /** 创建时间（另一种命名，与 create_at 等价） */
  gmt_created?: string;
  is_top?: boolean | null;
  latitude?: string | null;
  location?: null | string;
  longitude?: string | null;
  post_id: string;
  right_status: number;
  status: number;

  [property: string]: any;
}

/**
 * 内容信息
 * 目前正文既可能是纯文本，也可能是富文本 HTML + 图片数组
 */
export interface IContent {
  [property: string]: IContentText | IContentImage | any;
}

export interface IContentText extends IContent {
  text?: string;
}

export interface IContentImage extends IContent {
  images?: string;
}

/**
 * 账户信息
 */
export interface IAccount {
  account_id: string;
  allow_add_friend?: boolean;
  allow_beep?: boolean;
  allow_vibration?: boolean;
  allow_notification?: boolean;
  area_code?: string;
  avatar?: string;
  mail?: null | string;
  gmt_birth?: string;
  gmt_created?: string;
  im_id?: null | string;
  is_active?: boolean;
  mobile?: null | string;
  nick_name?: string;
  password?: string;
  sex?: number | null;
  account_type?: number;
  username?: string;
  [property: string]: any;
}

/**
 * 评论信息
 */
export interface IComment {
  /** 自增主键 */
  id: number;
  /** 业务评论 ID */
  comment_id: string;
  is_root?: boolean;
  parent_id?: string | null;
  content: string;
  account_id: string;
  /** 评论目标 ID（帖子/评论） */
  obj_id: string;
  /** 评论目标类型 */
  obj_type: number;
  create_at?: string | null;
}

/**
 * 发帖草稿结构（持久化到 localStorage）
 * TS 类型安全：避免各处自行拼对象导致字段丢失
 */
export interface IPostDraft {
  /** 文本内容 */
  text: string;
  /** 已上传的图片链接 */
  images: string[];
  /** 创建时间，用于过期校验 */
  createTime: number;
}

/**
 * token 信息
 */
export interface IToken {
  access_token: string;
  refresh_token: string;
}

/**
 * 关注关系统计信息
 */
export interface IFollow {
  /** 粉丝数 */
  follower_count: number;
  /** 关注数 */
  followee_count: number;
  /** 当前登录用户是否已关注 TA */
  is_following: boolean;
  /** 获赞数 */
  like_count: number;
}

/**
 * 意见反馈表单
 */
export interface IFeedbackForm {
  content: string;
  contact: string;
  feedback_type: number;
  level: number;
}
