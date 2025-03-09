import appStore from "@/stores";
import instance from '@/services';
import type {IAccount} from "@/interface";

// 获取帐户信息
export  const get_account = async (account_id: string) => {
  await instance.get(`/accounts/${account_id}/`).then((r: any) => {
    r.data.sex = r.data.sex + '';
    appStore.useAccountStore.update_account(r.data as IAccount);
    localStorage.setItem('nick_name', r.data.nick_name);
    localStorage.setItem('avatar', r.data.avatar);
  });
}