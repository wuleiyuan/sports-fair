interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
}

const data: ISiteMetadataResult = {
  siteTitle: 'Sports Fair - 运动集市',
  siteUrl: 'https://sports-fair.vercel.app',
  logo: '/images/favicon-1024.png', // v2.5.26: 升级到 1024x1024 主图 (LANCZOS 上采样, 仍为集市彩条设计)
  description:
    'Sports Fair 是一个通用的运动数据可视化仪表盘。支持跑步、跳绳、爬楼、徒步、骑行等多种运动类型，从 Keep / Apple Health / Garmin / Strava 等数据源一键同步。',
  navLinks: [
    {
      name: 'GitHub',
      url: 'https://github.com/wuleiyuan/sports-fair',
    },
    {
      name: 'About',
      url: 'https://github.com/wuleiyuan/sports-fair#readme',
    },
  ],
};

export default data;
