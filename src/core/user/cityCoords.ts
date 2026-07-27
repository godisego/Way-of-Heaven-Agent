/**
 * 中国主要城市经度表（粗略值，足够真太阳时校正用）。
 * 真太阳时 = 北京时间 + (经度 - 120) × 4 分钟
 */

export type City = {
  /** 城市名（用于 select 选项） */
  name: string;
  /** 经度（东经，度） */
  longitude: number;
  /** 省份（用于分组） */
  province: string;
};

export const CITY_COORDS: City[] = [
  // 直辖市
  { name: "北京", longitude: 116.4, province: "北京" },
  { name: "上海", longitude: 121.5, province: "上海" },
  { name: "天津", longitude: 117.2, province: "天津" },
  { name: "重庆", longitude: 106.5, province: "重庆" },
  // 省会 / 副省级
  { name: "广州", longitude: 113.3, province: "广东" },
  { name: "深圳", longitude: 114.1, province: "广东" },
  { name: "杭州", longitude: 120.2, province: "浙江" },
  { name: "南京", longitude: 118.8, province: "江苏" },
  { name: "苏州", longitude: 120.6, province: "江苏" },
  { name: "武汉", longitude: 114.3, province: "湖北" },
  { name: "成都", longitude: 104.1, province: "四川" },
  { name: "西安", longitude: 108.9, province: "陕西" },
  { name: "哈尔滨", longitude: 126.6, province: "黑龙江" },
  { name: "长春", longitude: 125.3, province: "吉林" },
  { name: "沈阳", longitude: 123.4, province: "辽宁" },
  { name: "大连", longitude: 121.6, province: "辽宁" },
  { name: "济南", longitude: 117.0, province: "山东" },
  { name: "青岛", longitude: 120.4, province: "山东" },
  { name: "厦门", longitude: 118.1, province: "福建" },
  { name: "福州", longitude: 119.3, province: "福建" },
  { name: "长沙", longitude: 112.9, province: "湖南" },
  { name: "郑州", longitude: 113.6, province: "河南" },
  { name: "石家庄", longitude: 114.5, province: "河北" },
  { name: "太原", longitude: 112.6, province: "山西" },
  { name: "兰州", longitude: 103.8, province: "甘肃" },
  { name: "西宁", longitude: 101.8, province: "青海" },
  { name: "乌鲁木齐", longitude: 87.6, province: "新疆" },
  { name: "昆明", longitude: 102.7, province: "云南" },
  { name: "贵阳", longitude: 106.7, province: "贵州" },
  { name: "南宁", longitude: 108.4, province: "广西" },
  { name: "海口", longitude: 110.3, province: "海南" },
  { name: "拉萨", longitude: 91.1, province: "西藏" },
  { name: "银川", longitude: 106.3, province: "宁夏" },
  { name: "呼和浩特", longitude: 111.7, province: "内蒙古" },
  { name: "香港", longitude: 114.2, province: "香港" },
  { name: "澳门", longitude: 113.5, province: "澳门" },
  { name: "台北", longitude: 121.5, province: "台湾" },
  { name: "宁波", longitude: 121.6, province: "浙江" },
  { name: "温州", longitude: 120.8, province: "浙江" },
  { name: "无锡", longitude: 120.3, province: "江苏" },
  { name: "烟台", longitude: 121.4, province: "山东" },
  { name: "泉州", longitude: 118.7, province: "福建" },
  { name: "佛山", longitude: 113.1, province: "广东" },
  { name: "东莞", longitude: 113.7, province: "广东" },
];

/** 模糊匹配城市名 → 经度（不命中返回 undefined） */
export function findCityLongitude(name: string): number | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  // 精确匹配
  const exact = CITY_COORDS.find((c) => c.name === trimmed);
  if (exact) return exact.longitude;
  // 包含匹配（如"浙江杭州" → 杭州）
  const contains = CITY_COORDS.find((c) => trimmed.includes(c.name));
  if (contains) return contains.longitude;
  return undefined;
}
