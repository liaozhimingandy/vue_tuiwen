/**
 * 推文信息
 */
export interface IPost {
    account_id: string;
    content: IContent;
    post_type: number;
    from_device: number;
    from_ip?: string;
    gmt_created: string;
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
    area_code?: string;
    avatar?: string;
    email?: null | string;
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
    id: number;
    comment_id: string;
    is_root?: boolean;
    parent_id?: string | null;
    content: string;
    account_id: string;
    obj_id: string;
    obj_type: number;
    gmt_created: string
}


// 草稿结构类型统一定义，TS 类型安全
export interface IPostDraft {
    /** 文本内容 */
    text: string
    /** 已上传的图片链接 */
    images: string[]
    /** 创建时间，用于过期校验 */
    createTime: number
}

// token信息
export interface IToken {
    access_token: string
    refresh_token: string
}


// follow
export interface IFollow {
    follower_count: number,
    followee_count: number,
    is_following: boolean,
    like_count: number
}