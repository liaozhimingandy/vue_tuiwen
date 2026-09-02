<template>
  <t-layout style="height: 100vh">
    <!-- 自定义顶部头部 -->
    <t-header style="
      height: 56px;
      background: rgba(20, 20, 35, 0.95);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      position: sticky;
      top: 0;
      z-index: 99;
      color: white;
    "
    >
      <t-button theme="danger" @click="$router.push('/')">关闭树洞</t-button>
      <t-typography-title level="h4" style="color:white;">🌙深夜来一发</t-typography-title>
      <t-typography-text :class="{warn:isWarningTime}" style="color: white" strong>{{
          countDownText
        }}
      </t-typography-text>
    </t-header>
    <t-content>
      <t-row justify="center">
        <t-col :md="7" :xs="11" :sm="12">
          <!-- 非开放时段 -->
          <div v-if="!isOpen" class="closed-wrap">
            <t-empty description="板块休息中,每日23:00‑次日06:00开放" size="large">
              <template #image>
                <error-circle-icon size="64" color="var(--td-text-color-placeholder)"/>
              </template>
            </t-empty>
            <div class="closed-tip">距离开板还有:{{ countDownText }}</div>
            <t-button theme="primary" @click="subscribeRemind">订阅开板提醒</t-button>
          </div>

          <!-- 开放时段 -->
          <div v-else>
            <t-alert theme="warning" message="天亮即焚·匿名树洞｜所有内容早上6点永久清除，发布不可撤回" close-btn/>
            <!-- 帖子列表 -->
            <div class="post-list">
              <div v-for="item in postList" :key="item.id" class="post-item">
                <div class="post-header">
                  <span class="code-name">{{ item.aliasName }}</span>
                </div>
                <div class="emoji-sticker">{{ item.emotion }}</div>
                <div class="text">{{ item.content }}</div>
                <div class="post-footer">
                  <span>{{ item.relativeTime }}</span>
                  <t-icon name="heart" @click="likePost(item.id)"/>
                  <t-icon name="more"/>
                </div>
              </div>
            </div>
          </div>
        </t-col>
      </t-row>
    </t-content>
    <t-back-top
        :offset="[20, 0]"
        :visible-height="0"
        shape="circle"
        style="position: absolute; right: 20px; bottom: 20px"
        theme="primary"
        @click="visible=!visible"
    >
      <template #content>
        <edit-icon :fill-color='["white","white"]' :stroke-color='["white","white"]' :stroke-width="2.5" size="36px"/>
      </template>
    </t-back-top>
  </t-layout>
  <t-drawer
      v-model:visible="visible"
      header="深夜来一发"
      :show-overlay="false"
      :on-overlay-click="() => (visible = false)"
      placement="right"
      size="400px"
      @confirm="onConfirm"
      @cancel="visible = false"
  >
    <!-- 发帖卡片 -->
    <t-space direction="vertical">
      <t-space direction="horizontal" break-line>
        <t-tag v-for="tag in emotionTags" :key="tag" @click="fillTag(tag)">{{ tag }}</t-tag>
      </t-space>
      <t-textarea v-model="postContent" :autosize="{ minRows: 3, maxRows: 5 }"
                  placeholder="写下一句深夜心事，天亮就消失..." :maxlength="512"
                  tips="所有内容早上6点永久清除，发布不可撤回"/>
    </t-space>
  </t-drawer>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {MessagePlugin} from 'tdesign-vue-next'
import {ErrorCircleIcon, EditIcon} from 'tdesign-icons-vue-next';
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";

const visible = ref(false);
const isOpen = ref(isLateNightTime())
let sec = ref(getRemainingSecondsTo6AM())
const postContent = ref('')
const emotionTags = ['失眠', '委屈', '心动', '放空', '吐槽', '开心', '失眠', '委屈', '心动', '放空', '吐槽', '开心']
const postList = ref<Array<any>>([])
let timer: number | null = null

// 5点55之后进入红色预警
const isWarningTime = computed(() => sec.value <= 300)

const countDownText = computed(() => {
  const h = Math.floor(sec.value / 3600)
  const m = Math.floor((sec.value % 3600) / 60)
  const s = sec.value % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const fillTag = (tag: string) => {
  postContent.value = tag + ': '
}


const subscribeRemind = () => {
  MessagePlugin.success('已订阅每晚开板提醒')
}


function tick() {
  sec.value = getRemainingSecondsTo6AM()
  isOpen.value = isLateNightTime()
}

onMounted(() => {
  timer = window.setInterval(tick, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})


/**
 * 判断当前是否属于深夜来一发开放时段：23:00 ~ 次日 06:00
 */
function isLateNightTime(): boolean {
  const hour = new Date().getHours()
  // 23点之后 或者 0‑6点
  return hour >= 11 || hour < 6
}

/**
 * 获取距离板块关闭(早上6点)剩余倒计时秒数
 */
function getRemainingSecondsTo6AM(): number {
  const now = new Date()
  let target = new Date()
  if (now.getHours() >= 6) {
    // 如果现在>=6点，则关闭，目标为明天6点
    target.setDate(target.getDate() + 1)
  }
  target.setHours(6, 0, 0, 0)
  const diff = target.getTime() - now.getTime()
  return Math.max(0, Math.floor(diff / 1000))
}


const onConfirm = async () => {
  const payload = {
    emotion: 1,
    content: {
      text: postContent.value
    },
    alias_name: "test"
  }
 await instance.post(apiUrls.post_night(), payload)
      .then(() => MessagePlugin.success("发布成功!"))
      .finally(() => visible.value = !visible.value)

}
</script>

<style scoped>


.post-item {
  margin: 12px 0;
  padding: 20px;
  background: #1e1e2f;
  border-radius: 12px;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  color: #aaa;
}

.closed-wrap {
  margin-top: 120px;
  text-align: center;
}
</style>
