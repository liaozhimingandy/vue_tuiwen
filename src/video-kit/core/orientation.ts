import type {VideoInfo} from "@/video-kit/types";

/**
 * 视频横竖屏判断
 *
 * 以 VideoInfo 声明的宽高为准（元数据最快、无需等待视频加载）；
 * 宽高缺失时回退为竖屏（信息流场景的主流形态）。
 * 正方形与横屏统一按「宽屏」处理布局。
 */
export function getOrientation(video: VideoInfo): "portrait" | "landscape" | "square" {
    if (!video.width || !video.height) return "portrait";
    const ratio = video.width / video.height;
    if (ratio > 1.2) return "landscape";
    if (ratio >= 0.9) return "square";
    return "portrait";
}
