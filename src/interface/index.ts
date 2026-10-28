/**
 * 全局业务实体类型定义
 *
 * 约定：字段名与后端返回**完全一致**（下划线风格），不做驼峰转换，
 * 以免各处自行映射造成歧义。后端契约以 `openapi.json` 为准，表模型改名后这里同步。
 *
 * 已废弃的历史命名（不要再用）：create_at / gmt_created / nick_name / gmt_birth /
 * obj_id / obj_type，以及评论的 id（现为 comment_id）、快照的 like（现为 like_count）。
 */

/**
 * 推文信息（对应后端 Post）
 */
export interface IPost {
  /** 帖子ID（后端 DB 列名为 id，对外 JSON 序列化为 post_id） */
  post_id: string;
  account_id: string;
  content: IContent;
  /** 内容类型，取值见 PostType 枚举 */
  post_type: number;
  /** 来源设备，取值见 FromDeviceEnum */
  from_device: number;
  from_ip?: string | null;
  /** 权限状态：0公开 / 1私密等，取值见 RightStatusEnum */
  right_status: number;
  /** 帖子状态（后端暂未使用） */
  status?: number | null;
  is_top?: boolean | null;
  latitude?: string | null;
  location?: null | string;
  longitude?: string | null;
  /** 创建时间（ISO 字符串，后端统一为 created_at） */
  created_at: string;
  /** 最后修改时间 */
  updated_at?: string;

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
 * 账户信息（对应后端 AccountInfo）
 */
export interface IAccount {
  account_id: string;
  username?: string;
  /** 昵称（后端字段名是 nickname，旧名 nick_name 已废弃） */
  nickname?: string;
  /** 出生日期，YYYY-MM-DD（后端字段名是 birthday，旧名 gmt_birth 已废弃） */
  birthday?: string;
  area_code?: string;
  /** 性别，0未知 1男 2女 9未说明 */
  sex?: number | null;
  avatar?: string;
  /** 个人简介 */
  bio?: string;
  mail?: string;
  mobile?: string;
  is_active?: boolean;
  allow_beep?: boolean;
  allow_vibration?: boolean;

  [property: string]: any;
}

/**
 * 评论信息（对应后端 Comment）
 */
export interface IComment {
  /** 评论ID（后端主键对外序列化为 comment_id，不再返回自增 id） */
  comment_id: string;
  is_root?: boolean;
  parent_id?: string | null;
  content: string;
  account_id: string;
  /** 评论目标ID（帖子/评论主键） */
  target_id: string;
  /** 评论目标类型，1=帖子 */
  target_type: number;
  created_at?: string | null;
}

/**
 * 评论列表里附带的作者信息（前端本地拼装，非后端返回）
 */
export interface ICommentUser {
  account_id: string;
  nickname?: string;
  avatar?: string;
}

/**
 * 点赞状态（对应后端 LikeCountModel：字段名就是 count）
 */
export interface ILikeState {
  count: number;
  is_liked: boolean;
}

/**
 * 天亮即焚（对应后端 Snap）
 */
export interface ISnap {
  id: number;
  alias_name: string;
  content?: IContentText | null;
  /** 情绪标签编号，取值见 EmotionTagEnum */
  emotion?: number;
  topic?: string | null;
  /** 点赞数（后端字段名是 like_count，不再是 like） */
  like_count: number;
  is_top?: boolean;
  created_at: string;
}

/**
 * 通知/公告（对应后端 Notice）
 */
export interface INotice {
  id: number;
  account_id?: string | null;
  trigger_account_id?: string | null;
  /** 通知类型，后端字段名是 notice_type（不再是 type） */
  notice_type: number;
  target_type?: number | null;
  target_scope?: number;
  target_id?: string | null;
  title?: string | null;
  content: IContent;
  extra?: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean;
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
  /** 创建时间，用于过期校验（本地时间戳，与后端 created_at 无关） */
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
 * 关注关系统计信息（对应后端 FollowCountModel）
 */
export interface IFollow {
  /** 粉丝数 */
  follower_count: number;
  /** 关注数 */
  followee_count: number;
  /** 当前登录用户是否已关注 TA */
  is_following: boolean;
  /** 获赞数（后端由 LikeDAO 实时聚合） */
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
