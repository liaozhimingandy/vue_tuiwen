/**
 * 推文信息
 */
export interface IPost {
    account_id: string;
    content: IContent;
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
    sex?: string | null;
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