// Text for both languages. Narrative strings use {name} placeholders filled with numbers from the data.

export const LANGS = ['ja', 'en'];

const STORE_KEY = 'jk-lang';

export function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (e) { /* storage blocked */ }
  return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export function saveLang(lang) {
  try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* storage blocked */ }
}

// ───────────────────────────────────────────── labels shared by charts, explorer and exports
export const LABELS = {
  en: {
    total: 'All accidents', traffic: 'Traffic', falls: 'Falls', drowning: 'Drowning', choking: 'Choking',
    fire: 'Smoke and fire', poisoning: 'Poisoning', other: 'Other',
    pedestrian: 'Pedestrians', car: 'Car occupants', motorcycle: 'Motorcyclists', cyclist: 'Cyclists',
    unknown_place: 'Place not recorded', home: 'Home', other_place: 'Other specified place',
    residential_institution: 'Residential institution', public_area: 'School, institution or public area',
    industrial: 'Industrial or construction site', overall: 'All accidents other than traffic',
    all: 'Both sexes', male: 'Male', female: 'Female',
    deaths: 'Deaths', rate: 'Rate per 100,000',
  },
  ja: {
    total: '不慮の事故（総数）', traffic: '交通事故', falls: '転倒・転落・墜落', drowning: '溺死・溺水', choking: '窒息',
    fire: '煙・火災', poisoning: '中毒', other: 'その他',
    pedestrian: '歩行者', car: '乗用車乗員', motorcycle: 'オートバイ乗員', cyclist: '自転車乗員',
    unknown_place: '詳細不明の場所', home: '家庭', other_place: 'その他の明示された場所',
    residential_institution: '居住施設', public_area: '学校・施設・公共の地域',
    industrial: '工業用地域・建築現場', overall: '交通事故以外の不慮の事故（総数）',
    all: '男女計', male: '男性', female: '女性',
    deaths: '死亡数', rate: '死亡率（人口10万対）',
  },
};

// Japanese term shown beside English labels in the English edition.
export const JA_TERM = {
  total: '不慮の事故', traffic: '交通事故', falls: '転倒・転落・墜落', drowning: '溺死・溺水', choking: '窒息',
  fire: '煙・火災', poisoning: '中毒', other: 'その他', pedestrian: '歩行者', car: '乗用車乗員',
  motorcycle: 'オートバイ乗員', cyclist: '自転車乗員', unknown_place: '詳細不明', home: '家庭',
  other_place: 'その他', residential_institution: '居住施設', public_area: '公共の地域', industrial: '工業用地域',
};

export function ageLabel(age, lang) {
  if (age === 'all') return lang === 'ja' ? '全年齢' : 'All ages';
  if (age === '90+') return lang === 'ja' ? '90歳以上' : '90 and over';
  if (age === '80 and over') return lang === 'ja' ? '80歳以上' : '80 and over';
  if (String(age) === '0') return lang === 'ja' ? '0歳' : 'Under 1';
  return lang === 'ja' ? String(age).replace('–', '〜') + '歳' : String(age);
}

// ───────────────────────────────────────────── number formatting
const n0 = (v) => Math.round(v).toLocaleString('en-US');
export function fmt(kind, v, lang) {
  if (v == null || Number.isNaN(v)) return '—';
  switch (kind) {
    case 'int': return n0(v);
    case 'rate': return (+v).toFixed(1);
    case 'pct': return (+v).toFixed(1) + '%';
    case 'x': return (+v).toFixed(1) + (lang === 'ja' ? '' : '×');
    case 'signed': return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1) + '%';
    case 'year': return lang === 'ja' ? `${v}年` : String(v);
    default: return String(v);
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Fill {name} placeholders. vals[name] = [value, kind]; wraps each number in <b class="n">.
export function tpl(str, vals, lang) {
  return esc(str).replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in vals)) return m;
    const [v, kind] = vals[k];
    return `<b class="n">${esc(fmt(kind, v, lang))}</b>`;
  });
}

// ───────────────────────────────────────────── interface and narrative
export const T = {
  en: {
    appName: 'Accidental Deaths in Japan',
    appSub: 'Vital statistics, 1899–2025',
    navReport: 'Report', navExplorer: 'Data explorer',
    langSwitch: '日本語', langSwitchLabel: 'Switch to Japanese',
    install: 'Install app',
    copyLink: 'Copy link', copied: 'Link copied', copyFail: 'Copy this link:',
    png: 'PNG', csv: 'CSV', pngTitle: 'Download chart as PNG', csvTitle: 'Download data as CSV',
    loading: 'Loading data…', loadError: 'The data could not be loaded. Check your connection and reload.',
    offlineReady: 'Saved for offline use',
    source: 'Source: MHLW Vital Statistics of Japan (e-Stat); MHLW FY2009 accidental death report.',
    footer: 'Data: Ministry of Health, Labour and Welfare. Built from public e-Stat tables.',
    repo: 'Source code and data',

    eyebrow: 'Vital Statistics of Japan · An update of MHLW\'s 2009 special report 「不慮の事故死亡統計」',
    title: 'Accidental deaths in Japan, 1899–2025',
    lede: 'In 2025, {tot25} people in Japan died from unintentional injuries (不慮の事故), {tot_vs08} more than in 2008, the last year the 2009 report covered. Falls and drowning account for the rise, while road deaths have more than halved.',
    meta: 'Final data (確定数) for 2025, published 30 September 2026. Japanese nationals in Japan.',
    kpi: {
      total: ['Accidental deaths, 2025', '{d} vs 2008', '{rate24} per 100,000 in 2024'],
      traffic: ['Traffic accidents', '{d} vs 2008', '{trf_pct95} of the 1995 level'],
      falls: ['Falls', '{d} vs 2008', 'Largest type since 2017'],
      drowning: ['Drowning', '{d} vs 2008', '{bath25} in a bathtub'],
      age: ['Aged 65 or over', 'of all accidental deaths in 2025', '{age80} were 80 or over'],
    },
    toc: ['Long-run trend', 'By type', 'Rates by age', 'Road users', 'Place', 'At home', 'Home share', 'Age, 2025', 'Detailed causes'],
    figure: 'Figure', ref: '2009 report:', newFig: 'New in this edition',
    s1: {
      h: 'Deaths now exceed the 1970 peak, but the death rate does not',
      p: [
        'Leaving aside the 1923 Great Kantō earthquake ({d1923} deaths) and the 2011 Great East Japan earthquake and tsunami ({d2011}), 2024 recorded the most accidental deaths of any year since 1899: {d2024}. 2025 was slightly lower at {d2025}.',
        'Deaths peaked at {d1970} in 1970, fell to between 28,000 and 30,000 a year from 1977 to 1988, and have climbed since as the population aged. Measured per 100,000 people, the rate was {r2024} in 2024, still below {r1970} in 1970.',
      ],
      card: 'Accidental deaths per year, 1899–2025',
      modes: ['Deaths', 'Rate per 100,000'],
      note: 'Red bars: 1923 Great Kantō earthquake, 1995 Great Hanshin-Awaji earthquake, 2011 Great East Japan earthquake and tsunami. No records survive for 1944–1946. 1947–1972 excludes Okinawa. MHLW has not yet published rates for 2025.',
      noRecord: 'No record', notPublished: 'not yet published',
    },
    s2: {
      h: 'Falls overtook choking in 2017, and road deaths are under a quarter of their 1995 level',
      p: [
        'Traffic accidents were the largest type until 2005 and fell in almost every year, from {trf95} in 1995 to {trf25} in 2025. Choking led from 2006 to 2016, peaking at {chk12} in 2012, and has since fallen to {chk25}.',
        'Falls have led since 2017 and reached {fal25} in 2025, about {ratio} as many as traffic. Drowning rose to {drw25}. The step up in falls in 2017 coincides with Japan\'s switch to ICD-10 (2013 version) coding that January, so part of it may reflect classification rather than more falls.',
      ],
      card: 'Deaths by main type of accident, 1995–2025',
      note: 'Dashed line at 2008: the last year in the 2009 report. Dotted line at 2017: ICD-10 (2013 version) coding begins.',
    },
    s3: {
      h: 'Risk fell at most ages, except drowning among older people',
      p: [
        'The 2009 report found that deaths from falls, drowning and choking were rising because there were more older people, not because the risk at any given age was rising. Comparing 2024, the latest year with official rates, against 2008 shows that this still holds for traffic, choking and fire, where rates fell in every age group.',
        'Drowning is the exception. Its rate rose in every age group from 65–69 to 85–89, for example from {drw0884} to {drw2484} per 100,000 at ages 80–84. The fall rate at 85–89 also rose, from {fal0889} to {fal2489}.',
      ],
      card: 'Death rate per 100,000 by age group',
      note: 'Each panel has its own scale. Ages 0–4 to 85–89, as in the 2009 report. 1995 and 2008 rates come from that report; 2024 rates from MHLW table 5-16. Rates for 2025 are not yet published.',
      agesPrefix: 'Ages',
    },
    s4: {
      h: 'Car occupant deaths fell the most, and pedestrians are now the largest group',
      p: ['Between 1995 and 2025, deaths of car occupants fell from {car95} to {car25}, to {car_idx25} of the 1995 level. Pedestrian deaths fell less steeply, from {ped95} to {ped25}, so pedestrians made up {ped_share25} of traffic deaths in 2025.'],
      card: 'Traffic deaths by road user, 1995–2025',
      modes: ['Deaths', 'Index, 1995 = 100'],
      note: 'Traffic deaths here cover all transport accidents (ICD-10 V01–V98), including those off public roads.',
    },
    s5: {
      h: 'Home is still the most common recorded place, but more deaths now have no place recorded',
      p: [
        'Of {pl_tot25} accidental deaths other than traffic in 2025, {home25} happened at home (家庭) and {res25} in residential institutions such as care homes (居住施設), up from {home08} and {res08} in 2008.',
        'Deaths with no place recorded (詳細不明) rose from {unk08} to {unk25} and have outnumbered deaths at home every year since 2019. Shares by place in figures 5 to 7 are therefore lower bounds.',
      ],
      card: 'Accidental deaths other than traffic, by place of injury, 1995–2025',
      note: 'The 1995 and 2011 spikes in "place not recorded" and "other" are the Great Hanshin-Awaji and Great East Japan earthquakes. Streets, shops, farms and sports facilities are left out of the chart; they are in the data.',
    },
    s6: {
      h: 'Drowning at home has nearly doubled since 2008',
      p: ['Most of the growth in deaths at home is drowning, mainly in the bath. {hd25} people drowned at home in 2025, against {hd08} in 2008. Over the same period choking at home fell from {hc08} to {hc25}, house-fire deaths from {hf08} to {hf25}, and falls at home changed little ({hfa25} in 2025).'],
      card: 'Accidental deaths at home by main type, 1995–2025',
      note: '',
    },
    s7: {
      h: 'Four in five drownings now happen at home, the same share as fire deaths',
      p: ['In 2025, {sh_drw25} of drowning deaths and {sh_fire25} of fire deaths happened at home, against {sh_drw08} and {sh_fire08} in 2008. The home share of falls dropped from {sh_fal08} to {sh_fal25}, partly because more fall deaths have no place recorded.'],
      card: 'Share of deaths that happened at home, by type, 1995–2025',
      note: 'Deaths at home divided by all deaths of that type, wherever they happened.',
    },
    s8: {
      h: 'Nearly nine in ten accidental deaths are people aged 65 or over',
      p: ['{age65} of the people who died in accidents in 2025 were 65 or over, and {age80} were 80 or over. The mix of causes changes sharply with age: choking caused {a0_chk} of the {a0_tot} deaths of babies under one, and traffic {a1529_trf} of the {a1529_tot} deaths at ages 15–29.'],
      card: 'Accidental deaths in 2025 by age group and type',
      modes: ['Deaths', 'Share within age group'],
      note: 'Age groups as published in MHLW table 5-31. Deaths of unknown age are left out.',
    },
    s9: {
      h: 'Slips on level ground and bathtub drowning drive the rise',
      p: ['Slips, trips and stumbles on the same level (ICD-10 W01) killed {w01_25} people in 2025, against {w01_95} in 1995. Drowning in a bathtub (W65–W66) rose from {bath95} to {bath25}. Exposure to natural heat (X30) killed {x30_25} in 2025 after {x30_24} in 2024, against a few hundred a year in the 1990s.'],
      card: 'Deaths from selected detailed causes, 1995 and 2025',
      legend: ['1995', '2025, higher', '2025, lower'],
      note: 'From MHLW table 5-30. Choking on other objects (W80) and unspecified suffocation (W84) are left out because their 2017 coding change makes 1995 and 2025 not comparable.',
      causes: {
        W01: 'Slips, trips and stumbles on level ground', 'W65-W66': 'Drowning in a bathtub', W79: 'Choking on food',
        'V01-V98': 'All transport accidents', X30: 'Natural heat', X31: 'Natural cold', X00: 'Fire in a building',
        W10: 'Falls on stairs or steps', 'W69-W70': 'Drowning in natural water', W13: 'Falls from a building',
      },
    },
    about: {
      summary: 'About the data: sources, method and caveats',
      sources: 'Sources',
      sourceItems: [
        'Ministry of Health, Labour and Welfare (MHLW), Vital Statistics of Japan, final data, deaths (人口動態調査 人口動態統計 確定数 死亡), editions 1995 to 2025, tables 5-12, 5-16, 5-30, 5-31, 5-33, 5-34, 5-35 and volume 2 table 2, via e-Stat.',
        'MHLW, Overview of accidental death statistics, FY2009 special report (平成21年度「不慮の事故死亡統計」の概況), statistical tables 2 to 6, for 1995–2008 and for the 1995 and 2008 age-specific rates.',
      ],
      method: 'Method',
      methodItems: [
        '1995–2008 values in the report are taken from the 2009 report. 2009–2025 values come from e-Stat, using the newest edition that prints each year. Place and home tables are published one year at a time, so each year comes from its own edition.',
        'Types follow the 2009 report: traffic V01–V98, falls W00–W17, drowning W65–W74, choking W75–W84, smoke and fire X00–X09, poisoning X40–X49. "Other" is the total minus these.',
        'Shares, changes and the 1995 index are worked out from the published counts.',
        'In the data explorer, rates for ages 90 and over in 2005–2024 are not published as one group; they are worked out from published deaths and rates (marked * in the table).',
      ],
      caveats: 'Caveats',
      caveatItems: [
        'In March 2019 MHLW recounted 2004, 2006 and 2009–2017 after some prefectures under-reported. Values for 2012–2017 here are recounted; 2004, 2006, 2009 and 2011 are as first published. Where both versions exist, totals match.',
        'From 2017 Japan codes causes of death with ICD-10 (2013 version). Falls and the split between choking subcodes changed at that point.',
        'MHLW has not yet published 2025 death rates, so rates stop at 2024.',
        'The share of non-traffic accidental deaths with no place recorded rose from about 30% in 2008 to over 40% in 2025, so counts by place understate every specific place.',
        'Figures cover Japanese nationals who died in Japan, as in the vital statistics.',
      ],
    },
    ex: {
      title: 'Data explorer',
      intro: 'Choose causes, sex, age group and years. Deaths are available for 1995–2025, rates per 100,000 for 1995–2024.',
      view: 'View', overTime: 'Over time', byAge: 'By age',
      causes: 'Causes', sex: 'Sex', compareSex: 'Male vs female', age: 'Age group', measure: 'Measure',
      from: 'From', to: 'To', year: 'Year', compareYear: 'Compare with', none: 'None',
      pickCause: 'Pick at least one cause.',
      summary: '{series}: {a} in {y0}, {b} in {y1} ({chg}).',
      summaryAge: '{series}, {year}: highest at ages {age} ({v}).',
      derived: '* Rate for ages 90 and over worked out from published deaths and rates.',
      noRate2025: 'Rates for 2025 are not yet published.',
      tableYear: 'Year', tableAge: 'Age',
      chartTitleTime: '{measure}, {sex}, {age}, {y0}–{y1}',
      chartTitleAge: '{measure} by age group, {sex}, {year}',
      reset: 'Reset',
    },
  },

  ja: {
    appName: '日本の不慮の事故死亡統計',
    appSub: '人口動態統計 1899〜2025年',
    navReport: 'レポート', navExplorer: 'データ探索',
    langSwitch: 'English', langSwitchLabel: '英語に切り替え',
    install: 'アプリをインストール',
    copyLink: 'リンクをコピー', copied: 'リンクをコピーしました', copyFail: 'このリンクをコピーしてください：',
    png: 'PNG', csv: 'CSV', pngTitle: 'グラフをPNGで保存', csvTitle: 'データをCSVで保存',
    loading: 'データを読み込んでいます…', loadError: 'データを読み込めませんでした。接続を確認して再読み込みしてください。',
    offlineReady: 'オフラインでも利用できます',
    source: '出典：厚生労働省「人口動態統計」（e-Stat）、「平成21年度 不慮の事故死亡統計の概況」',
    footer: 'データ：厚生労働省。e-Statの公開統計表から作成。',
    repo: 'ソースコードとデータ',

    eyebrow: '人口動態統計 · 厚生労働省「不慮の事故死亡統計」（平成21年度）の最新データ版',
    title: '日本の不慮の事故による死亡 1899〜2025年',
    lede: '2025年に不慮の事故で亡くなった人は{tot25}人で、2009年の報告書が対象とした最終年である2008年より{tot_vs08}増えました。増加の主な要因は転倒・転落と溺死で、交通事故による死亡は半分以下に減っています。',
    meta: '2025年確定数（2026年9月30日公表）。日本における日本人。',
    kpi: {
      total: ['不慮の事故による死亡数（2025年）', '2008年比 {d}', '2024年の死亡率（人口10万対）{rate24}'],
      traffic: ['交通事故', '2008年比 {d}', '1995年の{trf_pct95}の水準'],
      falls: ['転倒・転落・墜落', '2008年比 {d}', '2017年以降、最も多い種類'],
      drowning: ['溺死・溺水', '2008年比 {d}', 'うち浴槽内 {bath25}人'],
      age: ['65歳以上の割合', '2025年の不慮の事故死亡に占める割合', '80歳以上は{age80}'],
    },
    toc: ['長期推移', '種類別', '年齢別死亡率', '交通事故の種類', '発生場所', '家庭内の事故', '家庭の割合', '年齢（2025年）', '詳細な死因'],
    figure: '図', ref: '2009年報告書：', newFig: '今回の新規',
    s1: {
      h: '死亡数は1970年のピークを超えたが、死亡率は下回る',
      p: [
        '1923年の関東大震災（{d1923}人）と2011年の東日本大震災（{d2011}人）を除くと、2024年の{d2024}人は1899年以降で最も多い死亡数でした。2025年は{d2025}人とわずかに減りました。',
        '死亡数は1970年の{d1970}人をピークに減少し、1977〜1988年は年間2万8千〜3万人台で推移した後、高齢化とともに増えてきました。人口10万対の死亡率は2024年が{r2024}で、1970年の{r1970}を下回っています。',
      ],
      card: '不慮の事故による死亡数の年次推移 1899〜2025年',
      modes: ['死亡数', '死亡率（人口10万対）'],
      note: '赤い棒は1923年関東大震災、1995年阪神・淡路大震災、2011年東日本大震災。1944〜1946年は資料不備のため欠落。1947〜1972年は沖縄県を含まない。2025年の死亡率は未公表。',
      noRecord: '資料なし', notPublished: '未公表',
    },
    s2: {
      h: '2017年に転倒・転落が窒息を抜いて最多に。交通事故死は1995年の4分の1未満',
      p: [
        '交通事故は2005年まで最も多い種類で、1995年の{trf95}人から2025年の{trf25}人へと、ほぼ毎年減ってきました。窒息は2006〜2016年に最多で、2012年の{chk12}人をピークに、2025年は{chk25}人まで減っています。',
        '転倒・転落・墜落は2017年以降最も多く、2025年は{fal25}人と交通事故の約{ratio}倍です。溺死・溺水は{drw25}人に増えました。2017年の転倒・転落の急増は同年1月のICD-10（2013年版）適用と重なっており、一部は分類変更の影響の可能性があります。',
      ],
      card: '主な不慮の事故の種類別にみた死亡数 1995〜2025年',
      note: '破線は2008年（2009年報告書の最終年）、点線は2017年（ICD-10（2013年版）の適用開始）。',
    },
    s3: {
      h: '多くの年齢で死亡率は低下。ただし高齢者の溺死は上昇',
      p: [
        '2009年の報告書は、転倒・転落、溺死、窒息による死亡数の増加は、年齢別の死亡率が上がったためではなく、死亡率の高い高齢者が増えたためだと結論づけました。公式の死亡率がある最新年の2024年を2008年と比べると、交通事故、窒息、火災ではすべての年齢階級で死亡率が下がっており、この結論は今も当てはまります。',
        '例外は溺死です。65〜69歳から85〜89歳までのすべての年齢階級で死亡率が上がり、たとえば80〜84歳では人口10万対{drw0884}から{drw2484}になりました。85〜89歳の転倒・転落の死亡率も{fal0889}から{fal2489}に上がっています。',
      ],
      card: '年齢（5歳階級）別死亡率（人口10万対）',
      note: 'パネルごとに縦軸の目盛りが異なります。年齢は2009年報告書と同じ0〜4歳から85〜89歳。1995年と2008年は同報告書、2024年は上巻5-16表による。2025年の死亡率は未公表。',
      agesPrefix: '年齢',
    },
    s4: {
      h: '乗用車乗員の死亡が最も大きく減り、今は歩行者が最多',
      p: ['1995年から2025年にかけて、乗用車乗員の死亡は{car95}人から{car25}人へ、1995年の{car_idx25}の水準まで減りました。歩行者の死亡は{ped95}人から{ped25}人と減り方が緩やかで、2025年には交通事故による死亡の{ped_share25}を占めています。'],
      card: '交通事故の種類別にみた死亡数 1995〜2025年',
      modes: ['死亡数', '指数（1995年＝100）'],
      note: '交通事故は道路外を含むすべての交通事故（ICD-10 V01–V98）。',
    },
    s5: {
      h: '記録された場所では家庭が最多だが、発生場所が不明な死亡が増えている',
      p: [
        '2025年の交通事故以外の不慮の事故による死亡{pl_tot25}人のうち、{home25}人が家庭で、{res25}人が老人ホームなどの居住施設で起きました。2008年はそれぞれ{home08}人、{res08}人でした。',
        '発生場所が詳細不明の死亡は{unk08}人から{unk25}人に増え、2019年以降は毎年、家庭での死亡を上回っています。そのため図5〜7の場所別の割合は下限とみる必要があります。',
      ],
      card: '発生場所別にみた交通事故以外の不慮の事故による死亡数 1995〜2025年',
      note: '1995年と2011年の「詳細不明」と「その他」の急増は阪神・淡路大震災と東日本大震災による。街路、商業施設、農場、スポーツ施設は図から省略（データには含む）。',
    },
    s6: {
      h: '家庭での溺死は2008年からほぼ倍増',
      p: ['家庭での死亡の増加の大部分は溺死で、主に浴槽で起きています。2025年に家庭で溺死した人は{hd25}人で、2008年の{hd08}人から増えました。同じ期間に、家庭での窒息は{hc08}人から{hc25}人に、火災による死亡は{hf08}人から{hf25}人に減り、家庭での転倒・転落はほぼ横ばい（2025年は{hfa25}人）でした。'],
      card: '家庭における主な不慮の事故の種類別にみた死亡数 1995〜2025年',
      note: '',
    },
    s7: {
      h: '溺死の5人に4人は家庭で発生し、火災と同じ水準に',
      p: ['2025年は溺死の{sh_drw25}、火災による死亡の{sh_fire25}が家庭で起きました（2008年はそれぞれ{sh_drw08}、{sh_fire08}）。転倒・転落で家庭が占める割合は{sh_fal08}から{sh_fal25}に下がりましたが、一因は発生場所の記録がない死亡が増えたことです。'],
      card: '種類別にみた発生場所が家庭の割合 1995〜2025年',
      note: '家庭での死亡数を、発生場所を問わない同じ種類の死亡数で割った割合。',
    },
    s8: {
      h: '不慮の事故で亡くなる人の約9割が65歳以上',
      p: ['2025年に不慮の事故で亡くなった人の{age65}が65歳以上、{age80}が80歳以上でした。死因の構成は年齢で大きく変わり、0歳の死亡{a0_tot}人のうち{a0_chk}人が窒息、15〜29歳の死亡{a1529_tot}人のうち{a1529_trf}人が交通事故でした。'],
      card: '年齢階級・種類別にみた不慮の事故による死亡数 2025年',
      modes: ['死亡数', '年齢階級内の割合'],
      note: '年齢階級は上巻5-31表による。年齢不詳は除く。',
    },
    s9: {
      h: '同一平面上での転倒と浴槽内での溺死が増加をけん引',
      p: ['スリップ、つまずき、よろめきによる同一平面上での転倒（ICD-10 W01）による死亡は2025年に{w01_25}人で、1995年の{w01_95}人から増えました。浴槽内での溺死（W65–W66）は{bath95}人から{bath25}人に増えています。自然の過度の高温への曝露（X30）による死亡は2024年に{x30_24}人、2025年に{x30_25}人で、1990年代の年間数百人から大きく増えました。'],
      card: '主な詳細死因別にみた死亡数 1995年と2025年',
      legend: ['1995年', '2025年（増加）', '2025年（減少）'],
      note: '上巻5-30表による。その他の物体の誤えん（W80）と詳細不明の窒息（W84）は、2017年の分類変更で1995年と比べられないため除外。',
      causes: {
        W01: '同一平面上での転倒', 'W65-W66': '浴槽内での溺死及び溺水', W79: '食物の誤えんによる窒息',
        'V01-V98': '交通事故（総数）', X30: '自然の過度の高温への曝露', X31: '自然の過度の低温への曝露', X00: '建物内の火災',
        W10: '階段・ステップからの転落・転倒', 'W69-W70': '自然の水域での溺死及び溺水', W13: '建物からの転落',
      },
    },
    about: {
      summary: 'データについて：出典・方法・注意点',
      sources: '出典',
      sourceItems: [
        '厚生労働省「人口動態調査 人口動態統計 確定数 死亡」各年版（1995〜2025年。上巻5-12、5-16、5-30、5-31、5-33、5-34、5-35表、下巻第2表）、e-Stat掲載。',
        '厚生労働省「平成21年度『不慮の事故死亡統計』の概況」統計表第2〜6表（1995〜2008年、1995年・2008年の年齢別死亡率）。',
      ],
      method: '方法',
      methodItems: [
        'レポートの1995〜2008年の値は2009年報告書から、2009〜2025年の値は各年を収録するe-Statの最新版から取得。発生場所と家庭内事故の表は年ごとに公表されるため、各年版から取得。',
        '種類の区分は2009年報告書に合わせた：交通事故 V01–V98、転倒・転落 W00–W17、溺死 W65–W74、窒息 W75–W84、煙・火災 X00–X09、中毒 X40–X49。「その他」は総数からこれらを引いた値。',
        '割合、変化率、1995年を100とする指数は公表値から算出。',
        'データ探索の90歳以上の死亡率は、2005〜2024年は1つの階級として公表されていないため、公表された死亡数と死亡率から算出（表で＊印）。',
      ],
      caveats: '注意点',
      caveatItems: [
        '2019年3月、都道府県からの報告漏れにより2004・2006・2009〜2017年が再集計されました。本サイトの2012〜2017年は再集計後、2004・2006・2009・2011年は当初の公表値です。両方がある年では総数は一致します。',
        '2017年からICD-10（2013年版）を適用。転倒・転落や窒息の細分類はこの時点で変わりました。',
        '2025年の死亡率は未公表のため、死亡率は2024年までです。',
        '交通事故以外の不慮の事故のうち発生場所が詳細不明の割合は、2008年の約30%から2025年は40%超に上がっており、個別の場所の数は少なめに表れます。',
        '対象は日本における日本人の死亡です（人口動態統計と同じ）。',
      ],
    },
    ex: {
      title: 'データ探索',
      intro: '死因、性別、年齢階級、期間を選んでください。死亡数は1995〜2025年、人口10万対の死亡率は1995〜2024年に対応しています。',
      view: '表示', overTime: '年次推移', byAge: '年齢別',
      causes: '死因', sex: '性別', compareSex: '男女比較', age: '年齢階級', measure: '指標',
      from: '開始年', to: '終了年', year: '年', compareYear: '比較する年', none: 'なし',
      pickCause: '死因を1つ以上選んでください。',
      summary: '{series}：{y0} {a} → {y1} {b}（{chg}）',
      summaryAge: '{series}（{year}）：最も高いのは{age}（{v}）',
      derived: '＊ 90歳以上の死亡率は公表された死亡数と死亡率から算出。',
      noRate2025: '2025年の死亡率は未公表です。',
      tableYear: '年', tableAge: '年齢',
      chartTitleTime: '{measure}・{sex}・{age}（{y0}〜{y1}年）',
      chartTitleAge: '年齢階級別{measure}・{sex}（{year}年）',
      reset: 'リセット',
    },
  },
};
