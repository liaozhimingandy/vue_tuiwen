<script lang="ts" setup>
</script>

<template>
  <div style="min-height: 100vh; display: flex; justify-content: center; align-items: center;">
    <div class="result-wrap">
      <div class="emoji-icon">
        <span class="emoji">❓</span>
      </div>
      <!-- 副标题 -->
      <div class="sub-title">非常抱歉,你请求的页面不存在.</div>
      <!-- 操作按钮区域，等价 #extra 插槽 -->
      <div class="extra-wrap">
        <router-link :to="{name: 'home'}">
          <t-button type="primary">返回到首页</t-button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-wrap {
  text-align: center;
}
.sub-title {
  margin: 24px 0 32px;
  color: #666;
  font-size: 14px;
}
.emoji-icon {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff7c8, #ffe58a);
  animation: bounce 2s ease-in-out infinite;
}

.emoji {
  font-size: 52px;
  animation: swing 2s ease-in-out infinite, glow 3s ease-in-out infinite;
  transform-origin: center bottom;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes swing {
  0%, 100% {
    transform: rotate(-6deg);
  }
  50% {
    transform: rotate(6deg);
  }
}

@keyframes glow {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(255, 200, 0, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(255, 200, 0, 0.8));
  }
}
</style>
