// common/detectPersist.ts
const STORAGE_KEY = '__endpoint_detect_state';

interface DetectState {
  failCount: number;
  nextDetectTimestamp: number;
}

function getDefaultState(): DetectState {
  return {
    failCount: 0,
    nextDetectTimestamp: 0,
  };
}

export function loadDetectState(): DetectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return JSON.parse(raw) as DetectState;
  } catch {
    return getDefaultState();
  }
}

export function saveDetectState(state: DetectState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * 退避档位：3次连续失败之后开始使用
 * [10min, 30min, 1h, 2h, 之后一直2h]
 */
const BACKOFF_DELAYS = [
  10 * 60 * 1000, // 10分钟
  30 * 60 * 1000, // 30分钟
  60 * 60 * 1000, // 1小时
  120 * 60 * 1000, // 2小时
];
const MAX_BACKOFF_DELAY = BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];

/** 记录一次探测失败，设置对应退避时间 */
export function recordDetectFail() {
  const s = loadDetectState();
  s.failCount += 1;

  let delay: number;
  // 前3次失败：无退避，立刻可以继续探测
  if (s.failCount <= 3) {
    delay = 0;
  } else {
    // 超过3次，进入退避策略
    // offset: 第4次失败对应数组下标0(10min)
    const offset = s.failCount - 4;
    if (offset < BACKOFF_DELAYS.length) {
      delay = BACKOFF_DELAYS[offset];
    } else {
      // 超过档位，固定2小时
      delay = MAX_BACKOFF_DELAY;
    }
  }

  s.nextDetectTimestamp = Date.now() + delay;
  saveDetectState(s);
  return s;
}

/** 探测成功，重置全部状态 */
export function resetDetectState() {
  saveDetectState(getDefaultState());
}

/**
 * 是否允许执行自动探测
 * 不再直接禁止，判断当前时间是否到达下次探测时间
 */
export function canAutoDetect(): boolean {
  const s = loadDetectState();
  return Date.now() >= s.nextDetectTimestamp;
}

export function getDetectState(): DetectState {
  return loadDetectState();
}
