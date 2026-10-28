/**
 * 时间展示公共模块 —— 全站时区处理的唯一入口
 *
 * 契约（与后端 `src/tuiwen/utils/datetime_utils.py` 对应）：
 * - 后端一律返回 **UTC**，形如 `2026-10-29T06:32:10.123456Z`；
 * - 展示前必须换成**浏览器本地时区**，服务端不做任何本地化；
 * - 因此本模块做两件事：把服务端字符串解析成正确的"瞬间"，再按本地时区渲染。
 *
 * 为什么不能直接 `new Date(str)`：
 * ES2015 之后，不带时区偏移的日期时间串（如 `2026-10-29T06:32:10`）会被当成**本地时间**解析。
 * 若后端某天漏了下发 `Z`，前端就会把 UTC 当成本地时间，东八区用户看到的时间直接早 8 小时，
 * 而且不会有任何报错。所以这里统一兜底：没有偏移 = UTC。
 *
 * 另外两处坑也在这里一并处理：
 * - Safari 对 `2026-10-29T06:32:10.123456Z` 这种 6 位小数秒会返回 Invalid Date，统一截到 3 位；
 * - `birthday` 这类**纯日期**（`YYYY-MM-DD`）表示"日历上的某一天"，不是某个瞬间，
 *   不能被时区换算推动一天，必须按本地日历原样解析。
 */

/** 合法的时区后缀：Z 或 ±HH:mm / ±HHmm */
const TZ_SUFFIX_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** 纯日期（只有年月日，没有时分秒） */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 小数秒超过 3 位时截断，避免 Safari 解析失败 */
const LONG_FRACTION_RE = /(\.\d{3})\d+/;

/** 时间展示预设 */
export type TimePreset = 'datetime' | 'date' | 'time' | 'full';

/**
 * 展示时区覆盖值（null = 跟随浏览器）
 *
 * 只给两种场景用：单元测试要固定时区跑用例；以后若做"手动选择显示时区"的设置项。
 * 业务代码不要改它 —— 默认跟随用户系统时区才是正确行为。
 */
let displayTimeZoneOverride: string | null = null;

/**
 * 覆盖展示时区，传 null 恢复为跟随浏览器
 *
 * @param zone IANA 时区名，如 `America/New_York`；非法值会让 Intl 抛错，这里直接忽略
 */
export function setDisplayTimeZone(zone: string | null): void {
  if (zone === null) {
    displayTimeZoneOverride = null;
    return;
  }
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: zone});
    displayTimeZoneOverride = zone;
  } catch {
    // 非法时区名保持原状，不让一个笔误把整页时间搞崩
  }
}

/**
 * 取当前展示时区的 IANA 名称，如 `Asia/Shanghai`、`Europe/London`
 *
 * 默认是浏览器/系统时区；只有调过 `setDisplayTimeZone` 才会不同。
 *
 * 注意：返回的是**时区名**而不是偏移量。偏移量会随夏令时变化
 * （例如伦敦冬天 +00:00、夏天 +01:00），用名字才能让每个时间点都算对。
 */
export function getLocalTimeZone(): string {
  if (displayTimeZoneOverride) return displayTimeZoneOverride;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * 取指定时刻在当前展示时区的 UTC 偏移，格式如 `+08:00`
 *
 * 用 Intl 反向推算而不是 `Date.prototype.getTimezoneOffset`：
 * 后者只认系统时区，覆盖时区（setDisplayTimeZone）后就不准了；
 * 而且 Intl 会自动处理夏令时，伦敦在 3 月和 10 月会给出不同的偏移。
 *
 * @param date 目标时刻，默认取当前时间
 */
export function getLocalTimeZoneOffset(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: getLocalTimeZone(),
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    // longOffset 给的是 "GMT+08:00"；UTC 则只有 "GMT"
    const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
    const matched = name.match(/GMT([+-]\d{2}:\d{2})/);
    if (matched) return matched[1];
    if (name === 'GMT' || name === 'UTC') return '+00:00';
  } catch {
    // 老浏览器不支持 longOffset，退回系统时区算法
  }

  // getTimezoneOffset() 返回"UTC 减本地"的分钟数，符号与直觉相反，取反后才是 UTC+8 这种写法
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(totalMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/**
 * 把服务端时间解析成 Date（正确的瞬间）
 *
 * 支持的输入：
 * - 带偏移的 ISO 串：`2026-10-29T06:32:10.123456Z`、`2026-10-29T14:32:10+08:00`
 * - 不带偏移的串：`2026-10-29T06:32:10`、`2026-10-29 06:32:10` —— **按 UTC 解释**
 * - 纯日期：`2026-10-29` —— 按本地日历的 0 点解析（用于生日这类字段，不参与时区换算）
 * - 时间戳（毫秒/秒均可传 Date/数字）、Date 实例
 *
 * @returns 解析失败或输入为空时返回 null，调用方据此渲染空字符串而不是 `NaN年NaN月`
 */
export function parseServerTime(input?: string | number | Date | null): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;

  if (typeof input === 'number') {
    // 10 位秒级时间戳补齐成毫秒：后端偶尔会返回秒级（JWT exp 之类）
    const ms = input < 1e12 ? input * 1000 : input;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  let text = String(input).trim();
  if (!text) return null;

  // 纯日期：生日 / 纪念日这类"日历日期"，用本地年月日构造，避免跨时区偏一天
  if (DATE_ONLY_RE.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // `2026-10-29 06:32:10` → ISO 的 T 分隔，否则部分浏览器按非法串处理
  text = text.replace(' ', 'T').replace(LONG_FRACTION_RE, '$1');

  // 没有时区信息就按 UTC 解释（后端契约），而不是浏览器默认的"当本地时间"
  if (!TZ_SUFFIX_RE.test(text)) text += 'Z';

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 在当前时区取某个时刻的各字段（用 Intl 取，避免手写 getFullYear 这类依赖运行环境的写法） */
function localParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: getLocalTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  // 个别时区在 24 点整会给出 hour=24，归一成 0
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** 补零 */
const pad = (value: number): string => String(value).padStart(2, '0');

/** 日历日期（不含时分秒，也就没有时区概念） */
interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/**
 * 取"上一天"的日历日期
 *
 * 用 UTC 只当纯日历计算器（不参与任何时区换算），跨月/跨年由 Date 自己归一。
 * 不能用"当前时间减 86400 秒"：夏令时切换当天一天并不是 86400 秒。
 */
function previousDay(date: CalendarDate): CalendarDate {
  const anchor = new Date(Date.UTC(date.year, date.month - 1, date.day - 1));
  return {year: anchor.getUTCFullYear(), month: anchor.getUTCMonth() + 1, day: anchor.getUTCDate()};
}

/** 判断两个日历日期是不是同一天 */
const isSameDay = (a: CalendarDate, b: CalendarDate): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day;

/**
 * 按预设格式化（始终使用浏览器本地时区）
 *
 * @param input 服务端时间
 * @param preset datetime=`2026-10-29 14:32` / date=`2026-10-29` / time=`14:32` / full=`2026-10-29 14:32:10`
 * @returns 解析失败时返回空字符串
 */
export function formatDateTime(input?: string | number | Date | null, preset: TimePreset = 'datetime'): string {
  // 纯日期（`2026-10-29`）本来就是"给人看的那一天"，直接原样返回：
  // 走一遍时区换算只会把它推到前一天/后一天，生日、纪念日这类字段不能这么干
  const raw = typeof input === 'string' ? input.trim() : '';
  if (preset === 'date' && DATE_ONLY_RE.test(raw)) return raw;

  const date = parseServerTime(input);
  if (!date) return '';
  const {year, month, day, hour, minute, second} = localParts(date);
  const ymd = `${year}-${pad(month)}-${pad(day)}`;
  const hm = `${pad(hour)}:${pad(minute)}`;

  switch (preset) {
    case 'date':
      return ymd;
    case 'time':
      return hm;
    case 'full':
      return `${ymd} ${hm}:${pad(second)}`;
    default:
      return `${ymd} ${hm}`;
  }
}

/**
 * 格式化并附上时区偏移，用于"设置 / 调试"这类需要明确告知口径的地方
 *
 * 例：`2026-10-29 14:32 (UTC+08:00)`
 */
export function formatDateTimeWithZone(input?: string | number | Date | null): string {
  const date = parseServerTime(input);
  if (!date) return '';
  return `${formatDateTime(date, 'datetime')} (UTC${getLocalTimeZoneOffset(date)})`;
}

/**
 * 站内展示用的相对时间（原来的 `timestampFormat` 实现迁到这里）
 *
 * 规则：1 分钟内 → "刚刚"；1 小时内 → "N分钟前"；
 * 当天 → "今天14:32"；前一天 → "昨天14:32"；
 * 同年 → "10月29日 14:32"；跨年 → "2026年10月29日 14:32"
 *
 * 所有判断都在**本地时区**的日历上做：
 * - "当天"用年月日比较，而不是"现在减 86400 秒"，后者在夏令时切换当天会算错；
 * - 凌晨 00:30 看昨晚 23:59 的内容，必须判成"昨天"而不是"前天"。
 */
export function formatSmartTime(input?: string | number | Date | null, now: Date = new Date()): string {
  const date = parseServerTime(input);
  if (!date) return '';

  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  // 服务端时钟略快时 diff 为负，按"刚刚"处理，别显示 "-1分钟前"
  if (diffSeconds < 60) return '刚刚';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}分钟前`;

  const target = localParts(date);
  const today = localParts(now);
  const hhmm = `${pad(target.hour)}:${pad(target.minute)}`;

  if (isSameDay(target, today)) {
    return `今天${hhmm}`;
  }

  // 用日历上的前一天做比较，跨月/跨年由 Date 自己归一
  if (isSameDay(target, previousDay(today))) {
    return `昨天${hhmm}`;
  }

  if (target.year === today.year) {
    return `${pad(target.month)}月${pad(target.day)}日 ${hhmm}`;
  }
  return `${target.year}年${pad(target.month)}月${pad(target.day)}日 ${hhmm}`;
}

/**
 * 按时间倒序比较两个时间字符串（最新在前），供 `Array.prototype.sort` 使用
 *
 * 与直接 `new Date(a) - new Date(b)` 的差别：解析失败的值会被排到最后，
 * 而不是产生 NaN 让整个排序结果变得不确定。
 */
export function compareTimeDesc(a?: string | null, b?: string | null): number {
  const left = parseServerTime(a);
  const right = parseServerTime(b);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.getTime() - left.getTime();
}
