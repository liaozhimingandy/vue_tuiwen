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
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99;
        color: white;
     "
    >
      <t-button theme="danger" @click="$router.push('/')">关闭树洞</t-button>
      <t-typography-title level="h4" style="color:white;">
        <SvgIcon name="snap" :size="32" color="white"/>
        深夜来一发
      </t-typography-title>
      <t-typography-text :class="{warn:isWarningTime}" style="color: white" strong>{{
          countDownText
        }}
      </t-typography-text>
    </t-header>
    <t-content style="flex: 1; overflow: hidden; padding: 60px 0 0 0;">
      <t-row justify="center" style="height: 100%">
        <t-col :md="7" :xs="11" :sm="12" style="height:100%; display:flex; flex-direction:column">
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
          <div v-else style="display:flex; flex-direction:column; flex:1; overflow:hidden">
            <t-alert theme="warning" message="天亮即焚·匿名树洞｜所有内容早上6点永久清除，发布不可撤回" close-btn/>
            <!-- 帖子列表 -->
            <t-list
                ref="list"
                style="flex: 1;"
                :async-loading="asyncLoading" split @load-more="loadMore"
            >
              <t-list-item v-for="(item, index) in snaps" :key="index" :style="{backgroundColor: emotionBgColor[item.emotion]}">
                <t-list-item-meta :title="item.alias_name" :description="item.content.text">
                  <template #image>
                    <div
                        style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                      <UserAvatar
                          :nickname="item.alias_name"
                          style="width: 100%; height: 100%;"
                      />
                    </div>
                  </template>
                </t-list-item-meta>
                <template #action>
                  <t-badge :count="item.like">
                    <t-button size="large" variant="text" shape="square" @click="()=>likeSnap(item.id)">
                      <template #icon>
                        <heart-icon size="32px"/>
                      </template>
                    </t-button>
                  </t-badge>
                </template>
              </t-list-item>
            </t-list>
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
        <edit-2-icon :fill-color='["white","white"]' :stroke-color='["white","white"]' :stroke-width="2.5" size="36px"/>
      </template>
    </t-back-top>

    <t-drawer
        v-model:visible="visible"
        header="深夜来一发"
        :show-overlay="false"
        :on-overlay-click="() => (visible = false)"
        placement="right"
        @confirm="onConfirm"
        :confirm-btn="isOpen ? '发布' : null"
        @cancel="visible = false"
    >
      <!-- 发帖卡片 -->
      <t-space direction="vertical">
        <t-space direction="horizontal" break-line>
          <t-check-tag v-for="(item, index) in emotionsOptions" :checked="emotion == item.value" :key="index" @click="fillTag(item)">{{ item.label }}</t-check-tag>
        </t-space>
        <t-textarea v-model="content" :autosize="{ minRows: 3, maxRows: 5 }"
                    placeholder="写下一句深夜心事，天亮就消失..." :maxlength="512"
                    tips="所有内容早上6点永久清除，发布不可撤回"/>
        <t-input
            v-model="alias_name"
            placeholder="填写你的匿名昵称（选填）"
            maxlength="20"
            clearable
            tips="您的网名,我们不会记录你的名字,可能会和其他人重复"
        />
      </t-space>
    </t-drawer>
  </t-layout>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted, watch} from 'vue'
import {MessagePlugin} from 'tdesign-vue-next'
import {ErrorCircleIcon, Edit2Icon, HeartIcon} from 'tdesign-icons-vue-next';
import type {ListProps, ListItemMetaProps} from 'tdesign-vue-next';
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import SvgIcon from '@/components/SvgIcon.vue'
import {emotionBgColor, emotionsOptions} from "../common/constants.ts";
import {generateRandomAlias} from "../common/utils.ts";
import UserAvatar from "../components/UserAvatar.vue";

const visible = ref(false);
const isOpen = ref(isLateNightTime())
let sec = ref(getRemainingSecondsTo6AM());
const alias_name = ref(generateRandomAlias());
const emotion = ref(0);
const content = ref('')
const snaps = ref<Array<any>>([])

// 倒计时定时器
let timer: number | null = null
// 帖子轮询定时器
let pollTimer: number | null = null
// 轮询间隔：3000ms = 3秒，可自行调整
const POLL_INTERVAL = 5000

// 5点55之后进入红色预警
const isWarningTime = computed(() => sec.value <= 300)

const countDownText = computed(() => {
  const h = Math.floor(sec.value / 3600)
  const m = Math.floor((sec.value % 3600) / 60)
  const s = sec.value % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const fillTag = (tag: any) => {
  emotion.value = tag.value;
}

const subscribeRemind = () => {
  MessagePlugin.success('已订阅每晚开板提醒')
}

function tick() {
  sec.value = getRemainingSecondsTo6AM()
  isOpen.value = isLateNightTime()
}

async function fetch_snap_latest() {
  try {
    loading.value = true;
    const res = await instance.get(apiUrls.get_snap_latest());
    const combined = [...snaps.value, ...res.data.items]

    // Map 去重（保留最后出现的那条）
    const map = new Map()
    for (const item of combined) {
      map.set(item.id, item)
    }
    // 排序：最新在前
    snaps.value = Array.from(map.values()).sort((a, b) => {
      return new Date(b.create_at).getTime() - new Date(a.create_at).getTime()
    })
  } catch (err) {
    // 请求失败静默跳过，不打断轮询
    console.error('获取帖子失败', err)
  } finally {
    loading.value = false;
  }
}


/**
 * 拉取帖子列表
 */
async function fetchSnaps() {
  try {
    loading.value = true;
    let last_cursor = snaps.value.length;
    if (last_cursor == 0) {
      await fetch_snap_latest();
      return;
    }
    if (snaps.value.length > 0) {
      last_cursor = snaps.value.at(-1).id;
    }
    const res = await instance.get(apiUrls.get_snaps(), {params: {limit: 10, cursor: last_cursor}});
    hasMore.value = res.data.total > 9;
    const combined = [...snaps.value, ...res.data.items]

    // Map 去重（保留最后出现的那条）
    const map = new Map()
    for (const item of combined) {
      map.set(item.id, item)
    }
    // 排序：最新在前
    snaps.value = Array.from(map.values()).sort((a, b) => {
      return new Date(b.create_at).getTime() - new Date(a.create_at).getTime()
    })
  } catch (err) {
    // 请求失败静默跳过，不打断轮询
    console.error('获取帖子失败', err)
  } finally {
    loading.value = false;
  }
}

/** 开启帖子轮询 */
function startPoll() {
  // 先清除旧定时器，防止重复开启
  stopPoll()
  // 立刻拉一次，不用等3秒
  fetch_snap_latest();
  pollTimer = window.setInterval(fetch_snap_latest, POLL_INTERVAL)
}

/** 停止帖子轮询 */
function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 监听开放状态，开板启动轮询、关板停止轮询
watch(isOpen, (newVal) => {
  if (newVal) {
    startPoll()
  } else {
    stopPoll()
    // 关闭板块清空列表
    snaps.value = []
  }
}, {immediate: true})

onMounted(() => {
  timer = window.setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  stopPoll()
})

/**
 * 判断当前是否属于深夜来一发开放时段：23:00 ~ 次日 06:00
 */
function isLateNightTime(): boolean {
  const hour = new Date().getHours()
  // 23点之后 或者 0‑6点
  return hour >= 15 || hour < 6
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
  if (content.value == '') return;
  const payload = {
    emotion: emotion.value,
    content: {
      text: content.value
    },
    alias_name: alias_name.value == '' ? generateRandomAlias() : alias_name.value
  }
  await instance.post(apiUrls.post_snap(), payload)
      .then(() => {
        emotion.value = 0;
        content.value = '';
        MessagePlugin.success("发布成功!");
        // 发布成功后立刻刷新列表，不需要等轮询
        fetch_snap_latest();
      })
      .finally(() => visible.value = !visible.value)
}

// 点赞函数，你后续再实现
const likeSnap = async (id: number) => {
  await instance.get(apiUrls.like_snap(id))
      .then(r => {
        MessagePlugin.success("点赞成功!");
        const snap = snaps.value.find((item) => item.id == id);
        snap.like = r.data.like;

      })
}

const loading = ref(false);
const hasMore = ref(true);
const loadMore: ListProps['onLoadMore'] = () => {
  if (loading.value || !hasMore.value) return;
  fetchSnaps();
};
const asyncLoading = computed<ListProps['asyncLoading']>(() => {
  if (loading.value) {
    return 'loading';
  }
  if (hasMore.value) {
    return 'load-more';
  }
  return '没有更多数据了';
});
</script>

<style scoped>
.closed-wrap {
  margin-top: 120px;
  text-align: center;
}
</style>
