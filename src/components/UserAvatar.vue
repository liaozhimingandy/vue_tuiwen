<!--
  UserAvatar - 用户头像组件

  用途：优先展示后端头像图片；图片加载失败时回退为「首字母 + 确定性背景色」占位。
  职责边界：只做头像展示与兜底，不处理点击跳转（由父级通过 $attrs 透传）。
  被谁使用：推文卡片、评论、用户资料等任意需要头像的位置。
  注意：
  - 通过 defineOptions({ inheritAttrs: true }) 把未声明属性（如 class/点击事件）透传到 t-avatar。
  - 背景色由昵称哈希取模 COLOR_POOL 决定，保证同一用户颜色稳定。
-->
<template>
  <t-avatar
    v-if="avatarUrl && !loadError"
    :image="avatarUrl"
    v-bind="$attrs"
    :size="size"
    :hide-on-load-failed="false"
    @error="handleError"
  />
  <t-avatar v-else v-bind="$attrs" :size="size" :style="{backgroundColor: bgColor}">
    {{ displayChar }}
  </t-avatar>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import {getResourceUrl} from '@/common/utils.ts';

interface Props {
  /** 头像资源原始路径 */
  avatar?: string;
  /** 用户昵称，生成首字母 */
  nickname?: string;
  /** 头像尺寸，支持数字 / 'small' | 'medium' | 'large' */
  size?: number | 'small' | 'medium' | 'large';
}

// ✅ withDefaults 设置默认值
const props = withDefaults(defineProps<Props>(), {
  size: 'large',
});

defineOptions({
  inheritAttrs: true,
});

const loadError = ref(false);

const COLOR_POOL = ['#E1F0FF', '#E8F3FF', '#F0ECFF', '#FFF1E1', '#E6F7EF', '#FFF4E6', '#F3E8FF'];

const avatarUrl = computed(() => getResourceUrl(props.avatar));

const displayChar = computed(() => {
  const name = props.nickname ?? '';
  if (!name) return '?';
  return name.charAt(0);
});

const bgColor = computed(() => {
  const name = props.nickname ?? '';
  let hash = 0;
  // 经典字符串散列：把每个字符码点累加进 hash（左移 5 近似 *33 的变体），保证同一昵称颜色稳定
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COLOR_POOL.length;
  return COLOR_POOL[idx];
});

const handleError = () => {
  loadError.value = true;
};
</script>
