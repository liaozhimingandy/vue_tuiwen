import {useRoute, useRouter} from 'vue-router';

/**
 * 短视频深链同步（YouTube `?v=<id>` 同款）
 *
 * 两个方向：
 * 1. **入站**：读地址栏的 `v` 参数，作为信息流的初始定位目标；
 * 2. **出站**：当前视频变化时把 id 写回地址栏 —— 这样地址栏永远指向
 *    「正在看的那一条」，用户直接复制就能分享，刷新也还在原地。
 *
 * 为什么用 replace 而不是 push：
 * 短视频是逐个滑动消费的，push 会在历史里堆几十条记录，
 * 而且本页自带返回按钮（语义是「离开信息流」），push 会让它退化成「上一个视频」。
 * 若确实想要 YouTube 那种「浏览器后退 = 回到上一条」，把 replace 换成 push 即可，
 * 但同时要把页面的返回按钮改成固定跳首页，否则两个出口语义会打架。
 */
export function useVideoDeepLink() {
  const route = useRoute();
  const router = useRouter();

  /**
   * 入站目标 id（空字符串表示普通进入）
   *
   * ⚠️ 只在 setup 时取一次：地址栏随后会被我们自己改写，
   * 若持续跟随，用户每滑一条都会被拽回同一个目标。
   */
  const raw = route.query.v;
  const initialVideoId = (Array.isArray(raw) ? raw[0] : raw) ?? '';

  /** 把当前视频 id 写回地址栏（同值不重复导航，避免刷历史） */
  function syncToUrl(id: string | number): void {
    const next = String(id);
    if (route.query.v === next) return;
    void router.replace({query: {...route.query, v: next}});
  }

  return {initialVideoId, syncToUrl};
}
