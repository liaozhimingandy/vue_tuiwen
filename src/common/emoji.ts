/**
 * Emoji 类型
 */
export interface FaceItem {
    /** 唯一编码 */
    code: string

    /** 显示名称 */
    name: string

    /** Emoji 类型 */
    type: 'unicode'

    /** Unicode Emoji */
    unicode: string

    /** type=custom 有效：图片地址（svg/用户上传图片） */
    src?: string;
}

/**
 * Emoji 动画类型
 */
export type EmojiAnimation =
    | 'none'
    | 'pop'
    | 'bounce'
    | 'shake'
    | 'heartbeat'
    | 'pulse'
    | 'wave'
    | 'clap'
    | 'laugh'
    | 'sleep'
    | 'cry'
    | 'spin'
    | 'fire'

/**
 * 平台 Emoji 列表
 */
export const EMOJI_LIST: FaceItem[] = [
    // =========================
    // 表情
    // =========================

    {code: 'smile', name: '微笑', type: 'unicode', unicode: '🙂'},
    {code: 'pout', name: '撇嘴', type: 'unicode', unicode: '☹️'},
    {code: 'love_eyes', name: '色', type: 'unicode', unicode: '😍'},
    {code: 'daze', name: '发呆', type: 'unicode', unicode: '😦'},
    {code: 'smug', name: '得意', type: 'unicode', unicode: '😎'},
    {code: 'cry_loud', name: '流泪', type: 'unicode', unicode: '😭'},
    {code: 'shy', name: '害羞', type: 'unicode', unicode: '😳'},
    {code: 'shut_mouth', name: '闭嘴', type: 'unicode', unicode: '🤐'},
    {code: 'sleep', name: '睡', type: 'unicode', unicode: '😴'},
    {code: 'cry', name: '大哭', type: 'unicode', unicode: '😢'},
    {code: 'awkward', name: '尴尬', type: 'unicode', unicode: '😅'},
    {code: 'angry', name: '发怒', type: 'unicode', unicode: '😠'},
    {code: 'naughty', name: '调皮', type: 'unicode', unicode: '😜'},
    {code: 'grin', name: '呲牙', type: 'unicode', unicode: '😁'},
    {code: 'surprised', name: '惊讶', type: 'unicode', unicode: '😮'},
    {code: 'sad', name: '难过', type: 'unicode', unicode: '😞'},
    {code: 'cold_sweat', name: '冷汗', type: 'unicode', unicode: '😓'},
    {code: 'crazy', name: '抓狂', type: 'unicode', unicode: '😫'},
    {code: 'tongue', name: '吐舌', type: 'unicode', unicode: '😛'},
    {code: 'snicker', name: '偷笑', type: 'unicode', unicode: '😏'},
    {code: 'cute', name: '可爱', type: 'unicode', unicode: '😊'},
    {code: 'roll_eyes', name: '白眼', type: 'unicode', unicode: '🙄'},
    {code: 'arrogant', name: '傲慢', type: 'unicode', unicode: '😒'},
    {code: 'drool', name: '饥饿', type: 'unicode', unicode: '🤤'},
    {code: 'sleepy', name: '困', type: 'unicode', unicode: '😪'},
    {code: 'horror', name: '惊恐', type: 'unicode', unicode: '😱'},
    {code: 'laugh', name: '憨笑', type: 'unicode', unicode: '😄'},
    {code: 'hush', name: '嘘', type: 'unicode', unicode: '🤫'},
    {code: 'dizzy', name: '晕', type: 'unicode', unicode: '😵'},
    {code: 'skull', name: '骷髅', type: 'unicode', unicode: '💀'},
    {code: 'goodbye', name: '再见', type: 'unicode', unicode: '👋'},
    {code: 'yawn', name: '打哈欠', type: 'unicode', unicode: '🥱'},
    {code: 'despise', name: '鄙视', type: 'unicode', unicode: '😒'},
    {code: 'grievance', name: '委屈', type: 'unicode', unicode: '🥺'},
    {code: 'kiss', name: '亲亲', type: 'unicode', unicode: '😘'},
    {code: 'poor', name: '可怜', type: 'unicode', unicode: '🥺'},
    {code: 'sick', name: '生病', type: 'unicode', unicode: '😷'},
    {code: 'think', name: '思考', type: 'unicode', unicode: '🤔'},
    {code: 'speechless', name: '无语', type: 'unicode', unicode: '😑'},
    {code: 'laugh_tear', name: '笑哭', type: 'unicode', unicode: '😂'},
    {code: 'relieved', name: '释然', type: 'unicode', unicode: '😌'},
    {code: 'huff', name: '哼哼', type: 'unicode', unicode: '😤'},

    // =========================
    // 手势动作
    // =========================

    {code: 'thumbs_up', name: '强', type: 'unicode', unicode: '👍'},
    {code: 'thumbs_down', name: '弱', type: 'unicode', unicode: '👎'},
    {code: 'ok', name: 'OK', type: 'unicode', unicode: '👌'},
    {code: 'victory', name: '胜利', type: 'unicode', unicode: '✌️'},
    {code: 'fist', name: '拳头', type: 'unicode', unicode: '✊'},
    {code: 'wave', name: '挥手', type: 'unicode', unicode: '👋'},
    {code: 'handshake', name: '握手', type: 'unicode', unicode: '🤝'},
    {code: 'fold_hands', name: '抱拳', type: 'unicode', unicode: '🙏'},
    {code: 'muscle', name: '肌肉', type: 'unicode', unicode: '💪'},
    {code: 'point_up', name: '向上指', type: 'unicode', unicode: '👆'},
    {code: 'point_down', name: '向下指', type: 'unicode', unicode: '👇'},
    {code: 'point_left', name: '向左指', type: 'unicode', unicode: '👈'},
    {code: 'point_right', name: '向右指', type: 'unicode', unicode: '👉'},
    {code: 'clap', name: '鼓掌', type: 'unicode', unicode: '👏'},

    // =========================
    // 情感与符号
    // =========================

    {code: 'red_heart', name: '爱心', type: 'unicode', unicode: '❤️'},
    {code: 'broken_heart', name: '心碎', type: 'unicode', unicode: '💔'},
    {code: 'rose', name: '玫瑰', type: 'unicode', unicode: '🌹'},
    {code: 'withered', name: '凋谢', type: 'unicode', unicode: '🥀'},
    {code: 'sparkle', name: '闪光', type: 'unicode', unicode: '✨'},
    {code: 'star', name: '星星', type: 'unicode', unicode: '⭐'},
    {code: 'fire', name: '火焰', type: 'unicode', unicode: '🔥'},
    {code: 'hundred', name: '满分', type: 'unicode', unicode: '💯'},
    {code: 'question', name: '疑问', type: 'unicode', unicode: '❓'},
    {code: 'exclamation', name: '感叹', type: 'unicode', unicode: '❗'},
    {code: 'anger_mark', name: '愤怒', type: 'unicode', unicode: '💢'},
    {code: 'sleep_mark', name: '睡眠', type: 'unicode', unicode: '💤'},
    {code: 'dizzy_mark', name: '眩晕', type: 'unicode', unicode: '💫'},

    // =========================
    // 日常事物
    // =========================

    {code: 'cake', name: '蛋糕', type: 'unicode', unicode: '🎂'},
    {code: 'gift', name: '礼物', type: 'unicode', unicode: '🎁'},
    {code: 'coffee', name: '咖啡', type: 'unicode', unicode: '☕'},
    {code: 'beer', name: '啤酒', type: 'unicode', unicode: '🍺'},
    {code: 'moon', name: '月亮', type: 'unicode', unicode: '🌙'},
    {code: 'sun', name: '太阳', type: 'unicode', unicode: '☀️'},
    {code: 'bomb', name: '炸弹', type: 'unicode', unicode: '💣'},
    {code: 'knife', name: '刀子', type: 'unicode', unicode: '🔪'},
    {code: 'football', name: '足球', type: 'unicode', unicode: '⚽'},
    {code: 'basketball', name: '篮球', type: 'unicode', unicode: '🏀'},
    {code: 'table_tennis', name: '乒乓球', type: 'unicode', unicode: '🏓'},
    {code: 'camera', name: '相机', type: 'unicode', unicode: '📷'},
    {code: 'music', name: '音符', type: 'unicode', unicode: '🎵'},
    {code: 'bulb', name: '灯泡', type: 'unicode', unicode: '💡'},
] as const

/**
 * Emoji Unicode 集合
 *
 * 用于 O(1) 判断 Emoji 是否属于平台支持的 Emoji
 */
export const EMOJI_SET = new Set<string>(
    EMOJI_LIST.map(item => item.unicode),
)

/**
 * Unicode -> EmojiItem
 *
 * 用于快速获取 Emoji 信息
 */
export const EMOJI_MAP = new Map<string, FaceItem>(
    EMOJI_LIST.map(item => [
        item.unicode,
        item,
    ]),
)

/**
 * Emoji Unicode -> 动画
 *
 * 注意：
 * 数据库只存 Unicode。
 * 动画完全由前端负责。
 */
export const EMOJI_ANIMATION_MAP: Readonly<
    Record<string, EmojiAnimation>
> = {
    // =========================
    // 表情
    // =========================

    '🙂': 'bounce',
    '☹️': 'shake',
    '😍': 'heartbeat',
    '😦': 'pop',
    '😎': 'pop',
    '😭': 'cry',
    '😳': 'pop',
    '🤐': 'shake',
    '😴': 'sleep',
    '😢': 'cry',
    '😅': 'shake',
    '😠': 'shake',
    '😜': 'bounce',
    '😁': 'bounce',
    '😮': 'pop',
    '😞': 'pulse',
    '😓': 'shake',
    '😫': 'shake',
    '😛': 'bounce',
    '😏': 'pop',
    '😊': 'bounce',
    '🙄': 'spin',
    '😒': 'shake',
    '🤤': 'pulse',
    '😪': 'sleep',
    '😱': 'shake',
    '😄': 'laugh',
    '🤫': 'shake',
    '😵': 'spin',
    '💀': 'shake',
    '🥱': 'pulse',
    '🥺': 'pulse',
    '😘': 'heartbeat',
    '😷': 'shake',
    '🤔': 'pulse',
    '😑': 'none',
    '😂': 'laugh',
    '😌': 'pulse',
    '😤': 'shake',

    // =========================
    // 手势
    // =========================

    '👍': 'pop',
    '👎': 'pop',
    '👌': 'pop',
    '✌️': 'pop',
    '✊': 'pop',
    '👋': 'wave',
    '🤝': 'shake',
    '🙏': 'bounce',
    '💪': 'pop',
    '👆': 'bounce',
    '👇': 'bounce',
    '👈': 'bounce',
    '👉': 'bounce',
    '👏': 'clap',

    // =========================
    // 情感 / 符号
    // =========================

    '❤️': 'heartbeat',
    '💔': 'shake',
    '🌹': 'pulse',
    '🥀': 'pulse',
    '✨': 'pulse',
    '⭐': 'pulse',
    '🔥': 'fire',
    '💯': 'pop',
    '❓': 'bounce',
    '❗': 'bounce',
    '💢': 'shake',
    '💤': 'sleep',
    '💫': 'spin',

    // =========================
    // 日常
    // =========================

    '🎂': 'bounce',
    '🎁': 'pop',
    '☕': 'pulse',
    '🍺': 'bounce',
    '🌙': 'pulse',
    '☀️': 'spin',
    '💣': 'shake',
    '🔪': 'shake',
    '⚽': 'bounce',
    '🏀': 'bounce',
    '🏓': 'bounce',
    '📷': 'pop',
    '🎵': 'bounce',
    '💡': 'pulse',
}

/**
 * 获取 Emoji 信息
 */
export function getEmoji(
    unicode?: string | null,
): FaceItem | undefined {
    if (!unicode) {
        return undefined
    }

    return EMOJI_MAP.get(unicode.trim())
}

/**
 * 判断是否是平台支持的 Emoji
 */
export function isSupportedEmoji(
    unicode?: string | null,
): boolean {
    if (!unicode) {
        return false
    }

    return EMOJI_SET.has(unicode.trim())
}

/**
 * 判断内容是否只有一个平台支持的 Emoji
 *
 * 注意：
 *
 * 😂     => true
 * ❤️     => true
 * 😂😂   => false
 * 哈哈😂 => false
 * 😂 哈哈 => false
 */
export function isSupportedSingleEmoji(
    content?: string | null,
): boolean {
    if (!content) {
        return false
    }

    return EMOJI_SET.has(content.trim())
}

/**
 * 获取 Emoji 动画
 */
export function getEmojiAnimation(
    unicode?: string | null,
): EmojiAnimation {
    if (!unicode) {
        return 'pop'
    }

    return (
        EMOJI_ANIMATION_MAP[unicode.trim()]
        ?? 'pop'
    )
}

export type FaceGroup = {
    /** Tab上展示的图标 */
    icon: string;
    /** 分组名称 */
    label: string;
    list: FaceItem[];
};

// 默认表情分组
export const FACE_GROUPS: FaceGroup[] = [
    {
        icon: "😀",
        label: "默认表情",
        list: EMOJI_LIST
    },
];