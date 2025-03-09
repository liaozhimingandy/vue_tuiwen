const zeroize = (num: string) => {
        return (String(num).length == 1 ? '0' : '') + num;
    };


export const timestampFormat = (datetime: string) => {
    // 时间显示格式
    let timestamp = parseInt((new Date(datetime).getTime() / 1000).toString());
    const curTimestamp = parseInt((new Date().getTime() / 1000).toString()); //当前时间戳
    const timestampDiff = curTimestamp - timestamp; // 参数时间戳与当前时间戳相差秒数
    const curDate = new Date(curTimestamp * 1000); // 当前时间日期对象
    const tmDate = new Date(timestamp * 1000); // 参数时间戳转换成的日期对象
    const Y = tmDate.getFullYear();
    const m = tmDate.getMonth() + 1;
    const d = tmDate.getDate();
    const H = tmDate.getHours();
    const i = tmDate.getMinutes();
    //const s = tmDate.getSeconds();
    if (timestampDiff < 60) { // 一分钟以内
        return "刚刚";
    } else if (timestampDiff < 3600) { // 一小时前之内
        return Math.floor(timestampDiff / 60) + "分钟前";
    } else if (curDate.getFullYear() == Y && curDate.getMonth() + 1 == m && curDate.getDate() == d) {
        return '今天' + zeroize(String(H)) + ':' + zeroize(String(i));
    } else {
        var newDate = new Date((curTimestamp - 86400) * 1000); // 参数中的时间戳加一天转换成的日期对象
        if (newDate.getFullYear() == Y && newDate.getMonth() + 1 == m && newDate.getDate() == d) {
            return '昨天' + zeroize(String(H)) + ':' + zeroize(String(i));
        } else if (curDate.getFullYear() == Y) {
            return zeroize(String(m)) + '月' + zeroize(String(d)) + '日 ' + zeroize(String(H)) + ':' + zeroize(String(i));
        } else {
            return Y + '年' + zeroize(String(m)) + '月' + zeroize(String(d)) + '日 ' + zeroize(String(H)) + ':' + zeroize(String(i));
        }
    }
}
