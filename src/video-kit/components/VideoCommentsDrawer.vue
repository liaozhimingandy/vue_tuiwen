<script setup lang="ts">
/**
 * 评论抽屉（自绘，不依赖 UI 库，保证 video-kit 自包含）
 *
 * 底部弹出面板：评论列表 + 底部输入框。
 * 输入提交后追加到本地列表（演示实现），接入后端时把
 * addComment / loadComments 换成真实接口即可。
 */
import {computed, ref, watch} from 'vue';
import type {VideoInfo} from '@/video-kit/types';

interface CommentItem {
  id: number;
  username: string;
  content: string;
  time: string;
  likes: number;
}

const props = defineProps<{
  visible: boolean;
  video: VideoInfo | null;
}>();

const emit = defineEmits<{close: []}>();

/** 按 video.id 生成稳定但不重复的演示评论 */
const COMMENTS_POOL: Omit<CommentItem, 'id'>[] = [
  {username: '旅行的意义', content: '这个镜头语言绝了，前面 3 秒就把人拉进来了', time: '2小时前', likes: 321},
  {username: '夜航西飞', content: '收藏了，睡前循环播放', time: '5小时前', likes: 88},
  {username: 'Momo', content: '有人知道 BGM 是什么歌吗？', time: '8小时前', likes: 45},
  {username: '一只猫', content: '画质真清晰，用的什么拍的', time: '昨天', likes: 12},
];

const comments = ref<CommentItem[]>([]);
const inputText = ref('');

watch(
  () => props.visible,
  (visible) => {
    if (visible && props.video) {
      // 演示：实际项目替换为 fetchComments(video.id)
      comments.value = COMMENTS_POOL.map((c, i) => ({
        ...c,
        id: Number(`${props.video!.id}${i}`),
      }));
    }
  },
  {immediate: true},
);

const title = computed(() => `${comments.value.length} 条评论`);

function submit() {
  const text = inputText.value.trim();
  if (!text) return;
  comments.value.unshift({
    id: Date.now(),
    username: '我',
    content: text,
    time: '刚刚',
    likes: 0,
  });
  inputText.value = '';
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-mask" @click.self="emit('close')">
        <div class="drawer-panel">
          <div class="drawer-header">
            <span class="title">{{ title }}</span>
            <button class="close" @click="emit('close')" aria-label="关闭">✕</button>
          </div>
          <div class="comment-list">
            <div v-if="comments.length === 0" class="empty">还没有评论，来抢沙发～</div>
            <div v-for="c in comments" :key="c.id" class="comment-item">
              <div class="c-avatar">{{ c.username.slice(0, 1) }}</div>
              <div class="c-body">
                <div class="c-name">{{ c.username }}</div>
                <div class="c-content">{{ c.content }}</div>
                <div class="c-meta">{{ c.time }}</div>
              </div>
              <div class="c-like">
                ♡<span>{{ c.likes }}</span>
              </div>
            </div>
          </div>
          <form class="comment-input" @submit.prevent="submit">
            <input v-model="inputText" type="text" placeholder="说点什么…" enterkeyhint="send" />
            <button type="submit" :disabled="!inputText.trim()">发送</button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.drawer-panel {
  width: 100%;
  max-width: 560px;
  height: 62vh;
  background: #fff;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 14px 0 10px;
  border-bottom: 1px solid #f0f0f0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.close {
  position: absolute;
  right: 14px;
  top: 12px;
  border: none;
  background: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
}

.comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 40px 0;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.c-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7b5cff, #fe2c55);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.c-body {
  flex: 1;
  min-width: 0;
}

.c-name {
  font-size: 13px;
  color: #999;
}

.c-content {
  font-size: 14px;
  color: #222;
  margin: 2px 0;
  word-break: break-word;
}

.c-meta {
  font-size: 12px;
  color: #bbb;
}

.c-like {
  flex-shrink: 0;
  color: #bbb;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.comment-input {
  display: flex;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #f0f0f0;
}

.comment-input input {
  flex: 1;
  height: 36px;
  border: none;
  background: #f5f5f5;
  border-radius: 18px;
  padding: 0 14px;
  font-size: 14px;
  outline: none;
}

.comment-input button {
  border: none;
  background: #fe2c55;
  color: #fff;
  border-radius: 18px;
  padding: 0 16px;
  font-size: 14px;
  cursor: pointer;
}

.comment-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 弹入弹出动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateY(100%);
}
</style>
