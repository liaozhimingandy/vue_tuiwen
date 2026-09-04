<template>
  <t-avatar
    v-if="avatarUrl && !loadError"
    :image="avatarUrl"
    v-bind="$attrs"
    :size="size"
    :hide-on-load-failed="false"
    @error="handleError"
  />
  <t-avatar
    v-else
    v-bind="$attrs"
    :size="size"
    :style="{backgroundColor: bgColor}"
  >
    {{displayChar}}
  </t-avatar>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue'
import {getResourceUrl} from "@/common/utils.ts";

interface Props {
  /** 头像资源原始路径 */
  avatar?: string
  /** 用户昵称，生成首字母 */
  nickname?: string
  /** 头像尺寸，支持数字 / 'small' | 'medium' | 'large' */
  size?: number | 'small' | 'medium' | 'large'
}

// ✅ withDefaults 设置默认值
const props = withDefaults(defineProps<Props>(), {
  size: 'large'
})

defineOptions({
  inheritAttrs: true
})

const loadError = ref(false)

const COLOR_POOL = [
  '#E1F0FF',
  '#E8F3FF',
  '#F0ECFF',
  '#FFF1E1',
  '#E6F7EF',
  '#FFF4E6',
  '#F3E8FF'
]

const avatarUrl = computed(() => getResourceUrl(props.avatar))

const displayChar = computed(() => {
  const name = props.nickname ?? ''
  if(!name) return '?'
  return name.charAt(0)
})

const bgColor = computed(() => {
  const name = props.nickname ?? ''
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % COLOR_POOL.length
  return COLOR_POOL[idx]
})

const handleError = () => {
  loadError.value = true
}
</script>
