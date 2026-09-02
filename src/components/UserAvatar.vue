<template>
  <t-avatar
    v-if="avatarUrl && !loadError"
    :image="avatarUrl"
    v-bind="$attrs"
    :hide-on-load-failed="false"
    @error="handleError"
  />
  <t-avatar
    v-else
    v-bind="$attrs"
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
}

const props = defineProps<Props>()
// 接收 t‑avatar 所有事件、属性透传
defineOptions({
  inheritAttrs: true
})

const loadError = ref(false)

// 低饱和柔和配色池，社交头像专用
const COLOR_POOL = [
  '#E1F0FF',
  '#E8F3FF',
  '#F0ECFF',
  '#FFF1E1',
  '#E6F7EF',
  '#FFF4E6',
  '#F3E8FF'
]

// 最终头像url
const avatarUrl = computed(() => getResourceUrl(props.avatar))

// 获取首字符
const displayChar = computed(() => {
  const name = props.nickname ?? ''
  if(!name) return '?'
  return name.charAt(0)
})

// 昵称哈希 → 固定背景色
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