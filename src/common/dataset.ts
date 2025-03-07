import {reactive} from "vue";

export const sex_code_list = () => {
    const sex_code_list = reactive({
        0: "未知性别",
        1: "男性",
        2: "女性",
        9: "未说明的性别"
    }
  );
  return {
    sex_code_list
  };
}