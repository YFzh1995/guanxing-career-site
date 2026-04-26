import type { Props } from "astro";
import IconWeChat from "@/assets/icons/IconWeChat.svg";
import IconXiaohongshu from "@/assets/icons/IconXiaohongshu.svg";
import IconBilibili from "@/assets/icons/IconBilibili.svg";
import IconZhihu from "@/assets/icons/IconZhihu.svg";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

export const SOCIALS: Social[] = [
  {
    name: "小红书",
    href: "https://xhslink.com/m/1mz1H2wVnkU",
    linkTitle: `${SITE.title} on 小红书`,
    icon: IconXiaohongshu,
  },
  {
    name: "微信",
    href: "/wechat-qr.jpg",
    linkTitle: `${SITE.title} on 微信`,
    icon: IconWeChat,
  },
  {
    name: "B站",
    href: "https://space.bilibili.com/",
    linkTitle: `${SITE.title} on B站`,
    icon: IconBilibili,
  },
  {
    name: "知乎",
    href: "https://www.zhihu.com/",
    linkTitle: `${SITE.title} on 知乎`,
    icon: IconZhihu,
  },
] as const;

export const SHARE_LINKS: Social[] = [];
