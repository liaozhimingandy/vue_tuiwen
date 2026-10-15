/**
 * 业务枚举 / 常量表
 *
 * 这里的数字编码必须与后端保持一致，修改需同步后端字典。
 * 说明：应用名称统一以 `common/config.ts` 的 `config.NAME` 为唯一来源，
 * 原先这里另有一份 `APP_NAME`（全项目零引用），已删除以免再次出现两套"推文"字面量。
 */

/** 性别编码 → 文案 */
export const sex_code_map: Record<number, string> = {
  0: '未知性别',
  1: '男性',
  2: '女性',
  9: '未说明的性别',
};

/** 性别下拉选项（由编码表自动派生，避免两处维护） */
export const sexListOptions = Object.entries(sex_code_map).map(([k, v]) => {
  return {value: Number(k), label: v};
});

/**
 * 帖子可见范围：0 仅自己可见，1 公开
 *
 * 显式标注 Record<number, string>，否则 TS 会把键推断成字面量 0|1，
 * 用 number 变量索引时会报 TS7053。
 */
export const post_right_map: Record<number, string> = {
  0: '仅自己可见',
  1: '公开',
};

/** 情绪编码 → 文案（发帖时选择的"此刻心情"） */
export const emotions = {
  1: '失眠',
  2: '委屈',
  3: '心动',
  4: '放空',
  5: '吐槽',
  6: '开心',
  7: '难过',
  8: '孤独',
  9: '焦虑',
  10: '迷茫',
  11: '生气',
  12: '疲惫',
  13: '感动',
  14: '愧疚',
  15: '抱有期待',
};

/** 情绪下拉选项（由编码表自动派生） */
export const emotionsOptions = Object.entries(emotions).map(([k, v]) => {
  return {value: Number(k), label: v};
});

/** 情绪标签对应的背景色（低透明度色块，transparent 表示不额外着色） */
export const emotionBgColor: Record<number, string> = {
  1: 'rgba(0, 82, 204, 0.08)',
  2: 'rgba(222, 53, 11, 0.08)',
  3: 'rgba(0, 135, 90, 0.08)',
  4: 'transparent',
  5: 'rgba(255, 140, 0, 0.08)',
  6: 'rgba(0, 135, 90, 0.08)',
  7: 'rgba(222, 53, 11, 0.08)',
  8: 'rgba(0, 82, 204, 0.08)',
  9: 'rgba(255, 140, 0, 0.08)',
  10: 'transparent',
  11: 'rgba(222, 53, 11, 0.08)',
  12: 'transparent',
  13: 'rgba(0, 135, 90, 0.08)',
  14: 'rgba(255, 140, 0, 0.08)',
  15: 'rgba(0, 82, 204, 0.08)',
};
