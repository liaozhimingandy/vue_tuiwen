<!--
  文件：EditorSkeleton.vue
  用途：发布长文页的编辑器骨架占位

  出现时机：ArticleEditor（约 787KB，内含 wangEditor）作为异步 chunk 加载的这段时间。
  设计要点：尺寸与真实编辑器保持一致（工具栏 40px + 正文区 500px），
           编辑器就位后原地替换，不会产生高度跳动。
-->
<template>
  <div class="editor-skeleton">
    <div class="toolbar" />
    <div class="body">
      <t-loading size="small" />
      <span class="tip">编辑器加载中…</span>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  height: 40px;
  border-bottom: 1px solid #ccc;
  background: #fafafa;
}
.body {
  height: 500px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: #999;
}
.tip {
  font-size: 13px;
}
</style>
