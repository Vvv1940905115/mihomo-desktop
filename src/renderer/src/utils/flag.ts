/**
 * 节点名 / 国家名 → 国旗（ISO 3166-1 alpha-2）
 *
 * 为什么不用 emoji 国旗：
 * Windows 的 Segoe UI Emoji 不支持「区域指示符（regional indicator）」组合，
 * 直接渲染 🇺🇸 只会显示成 "US" 两个字母。所以这里统一解析出 ISO 代码，
 * 交给 flag-icons 的 SVG 国旗（class: `fi fi-us`）来显示。
 */

export interface FlagInfo {
  /** 小写 ISO 3166-1 alpha-2 代码，如 `us`；无法识别时为 null */
  code: string | null
  /** 中文展示名，如 `美国`；无法识别时为 '' */
  label: string
  /** 去掉 emoji 国旗后的干净名称 */
  name: string
}

interface CountryRule {
  code: string
  label: string
  aliases: string[]
}

/**
 * 国家 / 地区别名表。
 * 别名既支持中文（子串匹配），也支持英文与 ISO 代码（按单词边界匹配）。
 * 长别名优先命中，所以 `印度尼西亚` 会先于 `印度`、`中国香港` 会先于 `中国`。
 */
const COUNTRIES: CountryRule[] = [
  // ── 中国及港澳台地区 ───────────────────────────────────────────────
  { code: 'hk', label: '中国香港', aliases: ['中国香港', '香港', 'HongKong', 'Hong Kong', 'HK', 'HKG'] },
  { code: 'mo', label: '中国澳门', aliases: ['中国澳门', '澳门', 'Macao', 'Macau', 'MO'] },
  { code: 'tw', label: '中国台湾', aliases: ['中国台湾', '台湾', '台北', 'Taiwan', 'Taipei', 'TW', 'TPE'] },
  {
    code: 'cn',
    label: '中国',
    aliases: ['中国', '大陆', '回国', '归国', '北京', '上海', '广州', '深圳', 'China', 'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'CN', 'CHN']
  },

  // ── 亚洲 ──────────────────────────────────────────────────────────
  { code: 'jp', label: '日本', aliases: ['日本', '东京', '大阪', '名古屋', 'Japan', 'Tokyo', 'Osaka', 'JP', 'JPN'] },
  { code: 'kr', label: '韩国', aliases: ['韩国', '南韩', '首尔', 'Korea', 'Seoul', 'KR', 'KOR'] },
  { code: 'sg', label: '新加坡', aliases: ['新加坡', '狮城', 'Singapore', 'SG', 'SGP'] },
  { code: 'my', label: '马来西亚', aliases: ['马来西亚', '吉隆坡', 'Malaysia', 'Kuala Lumpur', 'MY', 'MYS'] },
  { code: 'th', label: '泰国', aliases: ['泰国', '曼谷', 'Thailand', 'Bangkok', 'TH', 'THA'] },
  { code: 'vn', label: '越南', aliases: ['越南', '河内', '胡志明', 'Vietnam', 'Hanoi', 'VN', 'VNM'] },
  { code: 'ph', label: '菲律宾', aliases: ['菲律宾', '马尼拉', 'Philippines', 'Manila', 'PH', 'PHL'] },
  { code: 'id', label: '印度尼西亚', aliases: ['印度尼西亚', '印尼', '雅加达', 'Indonesia', 'Jakarta', 'ID', 'IDN'] },
  { code: 'kh', label: '柬埔寨', aliases: ['柬埔寨', '金边', 'Cambodia', 'KH', 'KHM'] },
  { code: 'mm', label: '缅甸', aliases: ['缅甸', 'Myanmar', 'Burma', 'MM', 'MMR'] },
  { code: 'la', label: '老挝', aliases: ['老挝', 'Laos', 'LA'] },
  { code: 'bn', label: '文莱', aliases: ['文莱', 'Brunei', 'BN', 'BRN'] },
  { code: 'in', label: '印度', aliases: ['印度', '孟买', '新德里', 'India', 'Mumbai', 'IN', 'IND'] },
  { code: 'pk', label: '巴基斯坦', aliases: ['巴基斯坦', 'Pakistan', 'PK', 'PAK'] },
  { code: 'bd', label: '孟加拉国', aliases: ['孟加拉国', '孟加拉', 'Bangladesh', 'BD', 'BGD'] },
  { code: 'lk', label: '斯里兰卡', aliases: ['斯里兰卡', 'Sri Lanka', 'LK', 'LKA'] },
  { code: 'np', label: '尼泊尔', aliases: ['尼泊尔', 'Nepal', 'NP', 'NPL'] },
  { code: 'mn', label: '蒙古', aliases: ['蒙古', 'Mongolia', 'MN', 'MNG'] },
  { code: 'kz', label: '哈萨克斯坦', aliases: ['哈萨克斯坦', 'Kazakhstan', 'KZ', 'KAZ'] },
  { code: 'uz', label: '乌兹别克斯坦', aliases: ['乌兹别克斯坦', 'Uzbekistan', 'UZ', 'UZB'] },

  // ── 中东 ──────────────────────────────────────────────────────────
  { code: 'ae', label: '阿联酋', aliases: ['阿拉伯联合酋长国', '阿联酋', '迪拜', 'United Arab Emirates', 'Emirates', 'Dubai', 'AE', 'ARE'] },
  { code: 'sa', label: '沙特阿拉伯', aliases: ['沙特阿拉伯', '沙特', '利雅得', 'Saudi', 'Riyadh', 'SA', 'SAU'] },
  { code: 'il', label: '以色列', aliases: ['以色列', 'Israel', 'IL', 'ISR'] },
  { code: 'ir', label: '伊朗', aliases: ['伊朗', 'Iran', 'IR', 'IRN'] },
  { code: 'qa', label: '卡塔尔', aliases: ['卡塔尔', 'Qatar', 'QA', 'QAT'] },
  { code: 'kw', label: '科威特', aliases: ['科威特', 'Kuwait', 'KW', 'KWT'] },
  { code: 'bh', label: '巴林', aliases: ['巴林', 'Bahrain', 'BH', 'BHR'] },
  { code: 'om', label: '阿曼', aliases: ['阿曼', 'Oman', 'OM', 'OMN'] },
  { code: 'jo', label: '约旦', aliases: ['约旦', 'Jordan', 'JO', 'JOR'] },
  { code: 'tr', label: '土耳其', aliases: ['土耳其', '伊斯坦布尔', 'Turkey', 'Istanbul', 'TR', 'TUR'] },
  { code: 'cy', label: '塞浦路斯', aliases: ['塞浦路斯', 'Cyprus', 'CY', 'CYP'] },

  // ── 欧洲 ──────────────────────────────────────────────────────────
  { code: 'gb', label: '英国', aliases: ['英国', '伦敦', 'United Kingdom', 'Unitedkingdom', 'Britain', 'England', 'London', 'UK', 'GB', 'GBR'] },
  { code: 'de', label: '德国', aliases: ['德国', '法兰克福', '柏林', 'Germany', 'Frankfurt', 'Berlin', 'DE', 'DEU'] },
  { code: 'fr', label: '法国', aliases: ['法国', '巴黎', 'France', 'Paris', 'FR', 'FRA'] },
  { code: 'nl', label: '荷兰', aliases: ['荷兰', '阿姆斯特丹', 'Netherlands', 'Holland', 'Amsterdam', 'NL', 'NLD'] },
  { code: 'ru', label: '俄罗斯', aliases: ['俄罗斯', '莫斯科', 'Russia', 'Moscow', 'RU', 'RUS'] },
  { code: 'se', label: '瑞典', aliases: ['瑞典', '斯德哥尔摩', 'Sweden', 'Stockholm', 'SE', 'SWE'] },
  { code: 'no', label: '挪威', aliases: ['挪威', '奥斯陆', 'Norway', 'Oslo', 'NO', 'NOR'] },
  { code: 'fi', label: '芬兰', aliases: ['芬兰', '赫尔辛基', 'Finland', 'Helsinki', 'FI', 'FIN'] },
  { code: 'dk', label: '丹麦', aliases: ['丹麦', '哥本哈根', 'Denmark', 'Copenhagen', 'DK', 'DNK'] },
  { code: 'ch', label: '瑞士', aliases: ['瑞士', '苏黎世', 'Switzerland', 'Zurich', 'CH', 'CHE'] },
  { code: 'at', label: '奥地利', aliases: ['奥地利', '维也纳', 'Austria', 'Vienna', 'AT', 'AUT'] },
  { code: 'it', label: '意大利', aliases: ['意大利', '米兰', '罗马', 'Italy', 'Milan', 'Rome', 'IT', 'ITA'] },
  { code: 'es', label: '西班牙', aliases: ['西班牙', '马德里', '巴塞罗那', 'Spain', 'Madrid', 'Barcelona', 'ES', 'ESP'] },
  { code: 'pt', label: '葡萄牙', aliases: ['葡萄牙', '里斯本', 'Portugal', 'Lisbon', 'PT', 'PRT'] },
  { code: 'pl', label: '波兰', aliases: ['波兰', '华沙', 'Poland', 'Warsaw', 'PL', 'POL'] },
  { code: 'cz', label: '捷克', aliases: ['捷克', '布拉格', 'Czech', 'Prague', 'CZ', 'CZE'] },
  { code: 'hu', label: '匈牙利', aliases: ['匈牙利', '布达佩斯', 'Hungary', 'Budapest', 'HU', 'HUN'] },
  { code: 'ro', label: '罗马尼亚', aliases: ['罗马尼亚', '布加勒斯特', 'Romania', 'Bucharest', 'RO', 'ROU'] },
  { code: 'ua', label: '乌克兰', aliases: ['乌克兰', '基辅', 'Ukraine', 'Kiev', 'UA', 'UKR'] },
  { code: 'bg', label: '保加利亚', aliases: ['保加利亚', 'Bulgaria', 'BG', 'BGR'] },
  { code: 'gr', label: '希腊', aliases: ['希腊', '雅典', 'Greece', 'Athens', 'GR', 'GRC'] },
  { code: 'ie', label: '爱尔兰', aliases: ['爱尔兰', '都柏林', 'Ireland', 'Dublin', 'IE', 'IRL'] },
  { code: 'is', label: '冰岛', aliases: ['冰岛', 'Iceland', 'IS', 'ISL'] },
  { code: 'be', label: '比利时', aliases: ['比利时', 'Belgium', 'BE', 'BEL'] },
  { code: 'lu', label: '卢森堡', aliases: ['卢森堡', 'Luxembourg', 'LU', 'LUX'] },
  { code: 'sk', label: '斯洛伐克', aliases: ['斯洛伐克', 'Slovakia', 'SK', 'SVK'] },
  { code: 'si', label: '斯洛文尼亚', aliases: ['斯洛文尼亚', 'Slovenia', 'SI', 'SVN'] },
  { code: 'hr', label: '克罗地亚', aliases: ['克罗地亚', 'Croatia', 'HR', 'HRV'] },
  { code: 'rs', label: '塞尔维亚', aliases: ['塞尔维亚', 'Serbia', 'RS', 'SRB'] },
  { code: 'ee', label: '爱沙尼亚', aliases: ['爱沙尼亚', 'Estonia', 'EE', 'EST'] },
  { code: 'lv', label: '拉脱维亚', aliases: ['拉脱维亚', 'Latvia', 'LV', 'LVA'] },
  { code: 'lt', label: '立陶宛', aliases: ['立陶宛', 'Lithuania', 'LT', 'LTU'] },
  { code: 'md', label: '摩尔多瓦', aliases: ['摩尔多瓦', 'Moldova', 'MD', 'MDA'] },

  // ── 美洲 ──────────────────────────────────────────────────────────
  {
    code: 'us',
    label: '美国',
    aliases: [
      '美国', '洛杉矶', '圣何塞', '硅谷', '西雅图', '芝加哥', '纽约', '凤凰城', '达拉斯', '波特兰',
      '迈阿密', '休斯顿', '亚特兰大', '华盛顿', '弗里蒙特', '圣克拉拉', '拉斯维加斯', '丹佛',
      'United States', 'UnitedStates', 'America', 'Los Angeles', 'San Jose', 'Silicon Valley',
      'Seattle', 'Chicago', 'New York', 'Phoenix', 'Dallas', 'Portland', 'Miami', 'Houston',
      'Atlanta', 'Washington', 'Fremont', 'Santa Clara', 'Las Vegas', 'Denver',
      'USA', 'US'
    ]
  },
  { code: 'ca', label: '加拿大', aliases: ['加拿大', '温哥华', '多伦多', '蒙特利尔', 'Canada', 'Vancouver', 'Toronto', 'Montreal', 'CA', 'CAN'] },
  { code: 'mx', label: '墨西哥', aliases: ['墨西哥', 'Mexico', 'MX', 'MEX'] },
  { code: 'br', label: '巴西', aliases: ['巴西', '圣保罗', 'Brazil', 'Sao Paulo', 'BR', 'BRA'] },
  { code: 'ar', label: '阿根廷', aliases: ['阿根廷', 'Argentina', 'AR', 'ARG'] },
  { code: 'cl', label: '智利', aliases: ['智利', 'Chile', 'CL', 'CHL'] },
  { code: 'pe', label: '秘鲁', aliases: ['秘鲁', 'Peru', 'PE', 'PER'] },
  { code: 'co', label: '哥伦比亚', aliases: ['哥伦比亚', 'Colombia', 'CO', 'COL'] },
  { code: 'ec', label: '厄瓜多尔', aliases: ['厄瓜多尔', 'Ecuador', 'EC', 'ECU'] },
  { code: 'uy', label: '乌拉圭', aliases: ['乌拉圭', 'Uruguay', 'UY', 'URY'] },
  { code: 've', label: '委内瑞拉', aliases: ['委内瑞拉', 'Venezuela', 'VE', 'VEN'] },

  // ── 大洋洲 ────────────────────────────────────────────────────────
  { code: 'au', label: '澳大利亚', aliases: ['澳大利亚', '澳洲', '悉尼', '墨尔本', 'Australia', 'Sydney', 'Melbourne', 'AU', 'AUS'] },
  { code: 'nz', label: '新西兰', aliases: ['新西兰', '奥克兰', 'New Zealand', 'NewZealand', 'Auckland', 'NZ', 'NZL'] },

  // ── 非洲 ──────────────────────────────────────────────────────────
  { code: 'za', label: '南非', aliases: ['南非', 'South Africa', 'SouthAfrica', 'Johannesburg', 'ZA', 'ZAF'] },
  { code: 'eg', label: '埃及', aliases: ['埃及', 'Egypt', 'EG', 'EGY'] },
  { code: 'ng', label: '尼日利亚', aliases: ['尼日利亚', 'Nigeria', 'NG', 'NGA'] },
  { code: 'ke', label: '肯尼亚', aliases: ['肯尼亚', 'Kenya', 'KE', 'KEN'] },
  { code: 'ma', label: '摩洛哥', aliases: ['摩洛哥', 'Morocco', 'MA', 'MAR'] },
  { code: 'et', label: '埃塞俄比亚', aliases: ['埃塞俄比亚', 'Ethiopia', 'ET', 'ETH'] },
  { code: 'tz', label: '坦桑尼亚', aliases: ['坦桑尼亚', 'Tanzania', 'TZ', 'TZA'] },
  { code: 'gh', label: '加纳', aliases: ['加纳', 'Ghana', 'GH', 'GHA'] },
  { code: 'dz', label: '阿尔及利亚', aliases: ['阿尔及利亚', 'Algeria', 'DZ', 'DZA'] },
  { code: 'tn', label: '突尼斯', aliases: ['突尼斯', 'Tunisia', 'TN', 'TUN'] },
  { code: 'mu', label: '毛里求斯', aliases: ['毛里求斯', 'Mauritius', 'MU', 'MUS'] }
]

/** 区域指示符 emoji 范围：🇦 = U+1F1E6 */
const RI_START = 0x1f1e6
const RI_END = 0x1f1ff

const EMOJI_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/gu
const LEADING_SEPARATOR_RE = /^[\s\u3000\-—–_·|｜/\\、,.，。:：[\]()（）]+/u
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

type Entry = {
  code: string
  label: string
  alias: string
  cjk: boolean
  /** 两位字母代码（如 US/JP）：严格模式下必须原样大写才匹配 */
  upperOnly: boolean
}

const ENTRIES: Entry[] = COUNTRIES.flatMap((rule) =>
  rule.aliases.map((alias) => ({
    code: rule.code,
    label: rule.label,
    alias,
    cjk: CJK_RE.test(alias),
    upperOnly: /^[A-Za-z]{2}$/.test(alias)
  }))
).sort((a, b) => b.alias.length - a.alias.length)

/** 单词边界匹配缓存，避免每次调用都重建正则 */
const REGEX_CACHE = new Map<string, RegExp>()

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function boundaryRegex(alias: string, caseInsensitive: boolean): RegExp {
  const key = `${caseInsensitive ? 'i' : 's'}:${alias}`
  let regex = REGEX_CACHE.get(key)
  if (!regex) {
    // 前后不能紧邻其他字母，但允许紧跟数字（US-01 / JP02 这类写法）
    regex = new RegExp(`(?:^|[^A-Za-z])${escapeRegExp(alias)}(?![A-Za-z])`, caseInsensitive ? 'gi' : 'g')
    REGEX_CACHE.set(key, regex)
  }
  regex.lastIndex = 0
  return regex
}

/** 从字符串里提取第一组 emoji 国旗，返回大写 ISO 代码，如 `US` */
function extractEmojiFlag(text: string): string | null {
  const chars = Array.from(text)
  for (let i = 0; i < chars.length - 1; i += 1) {
    const a = chars[i].codePointAt(0) ?? 0
    const b = chars[i + 1].codePointAt(0) ?? 0
    if (a >= RI_START && a <= RI_END && b >= RI_START && b <= RI_END) {
      return String.fromCharCode(a - RI_START + 65) + String.fromCharCode(b - RI_START + 65)
    }
  }
  return null
}

/** 去掉名称里的 emoji 国旗及残留的前导分隔符 */
export function stripFlagEmoji(name: string): string {
  return name
    .replace(EMOJI_FLAG_RE, '')
    .replace(LEADING_SEPARATOR_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 从任意文本（节点名 / 国家名）里识别国家。
 * 识别顺序：emoji 国旗 → 严格模式（中文子串、英文单词、大写两字母代码）→ 宽松模式（小写两字母代码）
 */
export function flagOf(text: string): { code: string | null; label: string } {
  if (!text) return { code: null, label: '' }

  const cached = FLAG_CACHE.get(text)
  if (cached) return cached

  const result = detectFlag(text)
  FLAG_CACHE.set(text, result)
  return result
}

/** 识别结果缓存：节点名不会频繁变化，避免每 3 秒轮询都重跑一遍规则表 */
const FLAG_CACHE = new Map<string, { code: string | null; label: string }>()
const NAME_CACHE = new Map<string, FlagInfo>()

function detectFlag(text: string): { code: string | null; label: string } {
  const emoji = extractEmojiFlag(text)
  if (emoji) {
    const code = emoji.toLowerCase()
    const hit = COUNTRIES.find((item) => item.code === code)
    return { code, label: hit ? hit.label : emoji }
  }

  for (let pass = 0; pass < 2; pass += 1) {
    for (const entry of ENTRIES) {
      if (entry.cjk) {
        if (text.includes(entry.alias)) return { code: entry.code, label: entry.label }
        continue
      }
      // 严格模式下两位字母代码必须大写，避免把 in / it / at 之类的英文单词当成国家
      const caseInsensitive = !entry.upperOnly || pass === 1
      if (boundaryRegex(entry.alias, caseInsensitive).test(text)) {
        return { code: entry.code, label: entry.label }
      }
    }
  }

  return { code: null, label: '' }
}

/**
 * 解析代理节点名，返回国旗代码、中文名与清洗后的显示名。
 * 优先用节点名里自带的 emoji 国旗，其次按别名表推断。
 */
export function parseProxyName(raw: string): FlagInfo {
  const cached = NAME_CACHE.get(raw)
  if (cached) return cached

  const name = stripFlagEmoji(raw)
  const { code, label } = flagOf(raw)
  const result: FlagInfo = { code, label, name: name || raw }
  NAME_CACHE.set(raw, result)
  return result
}
