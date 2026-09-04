export const APP_NAME = "推文";

export const sex_code_map = {
        0: "未知性别",
        1: "男性",
        2: "女性",
        9: "未说明的性别"
    };

export const sexListOptions = Object.entries(sex_code_map).map(([k, v]) => {
  return {"value": Number(k[0]), "label": v}
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
  return {"value": Number(k[0]), "label": v}
});
