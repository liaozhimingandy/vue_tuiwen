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