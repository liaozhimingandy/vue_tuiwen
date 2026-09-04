export const APP_NAME = "推文";

export const sex_code_map = {
        0: "未知性别",
        1: "男性",
        2: "女性",
        9: "未说明的性别"
    };

export const sexListOptions = Object.entries(sex_code_map).map(([k, v]) => {
  return {"value": Number(k), "label": v}
});

export const post_right_map = {
        0: "仅自己可见",
        1: "公开"
    }

export const emotions = {
    1: "失眠",
    2: "委屈",
    3: "心动",
    4: "放空",
    5: "吐槽",
    6: "开心",
    7: "难过",
    8: "孤独",
    9: "焦虑",
    10: "迷茫",
    11: "生气",
    12: "疲惫",
    13: "感动",
    14: "愧疚",
    15: "抱有期待"
};
export const emotionsOptions = Object.entries(emotions).map(([k, v]) => {
  return {"value": Number(k), "label": v}
});

export const emotionBgColor: Record<number, string> = {
  1: "rgba(0, 82, 204, 0.08)",
  2: "rgba(222, 53, 11, 0.08)",
  3: "rgba(0, 135, 90, 0.08)",
  4: "transparent",
  5: "rgba(255, 140, 0, 0.08)",
  6: "rgba(0, 135, 90, 0.08)",
  7: "rgba(222, 53, 11, 0.08)",
  8: "rgba(0, 82, 204, 0.08)",
  9: "rgba(255, 140, 0, 0.08)",
  10: "transparent",
  11: "rgba(222, 53, 11, 0.08)",
  12: "transparent",
  13: "rgba(0, 135, 90, 0.08)",
  14: "rgba(255, 140, 0, 0.08)",
  15: "rgba(0, 82, 204, 0.08)"
}