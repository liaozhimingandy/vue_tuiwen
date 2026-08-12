import face01 from '@/assets/emoji/default/face01.svg'

// 本地表情包映射
export interface FaceItem {
  code: string; // 文本标记 [code]
  src: string;  // 图片地址
  name: string; // 表情名称（可选）
}

// 默认表情分组
export const DEFAULT_FACE_GROUP: FaceItem[] = [
  { code: "face01", src: face01, name: "微笑" },
];

// 多分组扩展（可做标签栏切换，和微信一致）
export const FACE_GROUPS = [
  { label: "基础表情", list: DEFAULT_FACE_GROUP }
];

// 正则：匹配 [face01] 格式
export const FACE_REG = /\[([a-zA-Z0-9_]+)\]/g;

// 快速根据code查找表情
export function getFaceByCode(code: string): FaceItem | undefined {
  const all = FACE_GROUPS.flatMap(g => g.list);
  return all.find(item => item.code === code);
}
