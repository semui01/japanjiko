// Loads the CSV datasets and works out the derived figures (shares, changes, index).
/* global d3 */

export const DATASETS = ['long_run', 'by_type', 'age_rates', 'traffic_mode', 'place', 'home_type',
  'age_groups_2025', 'detail_causes', 'explorer'];

const round1 = (v) => Math.round(v * 10) / 10;
const pct = (a, b) => (b ? round1((100 * a) / b) : null);
const chg = (now, then) => (then ? round1((100 * (now - then)) / then) : null);

export async function loadAll(base = 'data/') {
  const entries = await Promise.all(DATASETS.map(async (id) => {
    const rows = await d3.csv(`${base}${id}.csv`, d3.autoType);
    return [id, rows];
  }));
  const d = Object.fromEntries(entries);
  derive(d);
  return d;
}

function derive(d) {
  const yr = (rows, y) => rows.find((r) => r.year === y);

  d.changes = Object.fromEntries(['total', 'traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning'].map((k) => {
    const a = yr(d.by_type, 1995)[k], b = yr(d.by_type, 2008)[k], c = yr(d.by_type, 2025)[k];
    return [k, { y1995: a, y2008: b, y2025: c, vs1995: chg(c, a), vs2008: chg(c, b), pctOf1995: pct(c, a) }];
  }));

  const total = d3.sum(d.age_groups_2025, (r) => r.total);
  const sumAges = (ages) => d3.sum(d.age_groups_2025.filter((r) => ages.includes(String(r.age_group))), (r) => r.total);
  d.ageShare = { s65: pct(sumAges(['65–79', '80 and over']), total), s80: pct(sumAges(['80 and over']), total) };

  d.age_mix = d.age_groups_2025.filter((r) => r.age_group !== 'unknown').map((r) => {
    const o = { age_group: r.age_group };
    ['traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'other'].forEach((k) => { o[k] = pct(r[k], r.total) || 0; });
    return o;
  });

  d.home_share = d.home_type.map((h) => {
    const t = yr(d.by_type, h.year), p = yr(d.place, h.year);
    return {
      year: h.year, overall: pct(h.total, p.total), falls: pct(h.falls, t.falls), drowning: pct(h.drowning, t.drowning),
      choking: pct(h.choking, t.choking), fire: pct(h.fire, t.fire), poisoning: pct(h.poisoning, t.poisoning),
    };
  });

  const base = yr(d.traffic_mode, 1995);
  d.traffic_index = d.traffic_mode.map((r) => ({
    year: r.year,
    pedestrian: pct(r.pedestrian, base.pedestrian), car: pct(r.car, base.car),
    motorcycle: pct(r.motorcycle, base.motorcycle), cyclist: pct(r.cyclist, base.cyclist),
    pedestrian_share: pct(r.pedestrian, r.total),
  }));

  // explorer index: key "year|cause|sex|age" -> row
  d.exIndex = new Map(d.explorer.map((r) => [`${r.year}|${r.cause}|${r.sex}|${r.age}`, r]));
}

// Named numbers used in the narrative: name -> [value, format].
export function numbers(d) {
  const by = (y, k) => d.by_type.find((r) => r.year === y)[k];
  const lr = (y, k) => d.long_run.find((r) => r.year === y)[k];
  const ar = (y, age, k) => d.age_rates.find((r) => r.year === y && r.age === age)[k];
  const tm = (y, k) => d.traffic_mode.find((r) => r.year === y)[k];
  const ti = (y, k) => d.traffic_index.find((r) => r.year === y)[k];
  const pl = (y, k) => d.place.find((r) => r.year === y)[k];
  const ht = (y, k) => d.home_type.find((r) => r.year === y)[k];
  const hs = (y, k) => d.home_share.find((r) => r.year === y)[k];
  const ag = (a, k) => d.age_groups_2025.find((r) => String(r.age_group) === a)[k];
  const dc = (c, y) => d.detail_causes.find((r) => r.code === c && r.year === y).deaths;
  const c = d.changes;
  return {
    tot25: [by(2025, 'total'), 'int'], tot_vs08: [Math.abs(c.total.vs2008), 'pct'], rate24: [lr(2024, 'accidental_rate'), 'rate'],
    d_total: [c.total.vs2008, 'signed'], d_traffic: [c.traffic.vs2008, 'signed'], d_falls: [c.falls.vs2008, 'signed'],
    d_drowning: [c.drowning.vs2008, 'signed'],
    trf_pct95: [c.traffic.pctOf1995, 'pct'], bath25: [dc('W65-W66', 2025), 'int'],
    age65: [d.ageShare.s65, 'pct'], age80: [d.ageShare.s80, 'pct'],
    d1923: [lr(1923, 'accidental_deaths'), 'int'], d2011: [lr(2011, 'accidental_deaths'), 'int'],
    d2024: [lr(2024, 'accidental_deaths'), 'int'], d2025: [lr(2025, 'accidental_deaths'), 'int'],
    d1970: [lr(1970, 'accidental_deaths'), 'int'], r2024: [lr(2024, 'accidental_rate'), 'rate'], r1970: [lr(1970, 'accidental_rate'), 'rate'],
    trf95: [by(1995, 'traffic'), 'int'], trf25: [by(2025, 'traffic'), 'int'], chk12: [by(2012, 'choking'), 'int'],
    chk25: [by(2025, 'choking'), 'int'], fal25: [by(2025, 'falls'), 'int'], drw25: [by(2025, 'drowning'), 'int'],
    ratio: [round1(by(2025, 'falls') / by(2025, 'traffic')), 'x'],
    drw0884: [ar(2008, '80–84', 'drowning'), 'rate'], drw2484: [ar(2024, '80–84', 'drowning'), 'rate'],
    fal0889: [ar(2008, '85–89', 'falls'), 'rate'], fal2489: [ar(2024, '85–89', 'falls'), 'rate'],
    car95: [tm(1995, 'car'), 'int'], car25: [tm(2025, 'car'), 'int'], car_idx25: [ti(2025, 'car'), 'pct'],
    ped95: [tm(1995, 'pedestrian'), 'int'], ped25: [tm(2025, 'pedestrian'), 'int'], ped_share25: [ti(2025, 'pedestrian_share'), 'pct'],
    pl_tot25: [pl(2025, 'total'), 'int'], home25: [pl(2025, 'home'), 'int'], res25: [pl(2025, 'residential_institution'), 'int'],
    home08: [pl(2008, 'home'), 'int'], res08: [pl(2008, 'residential_institution'), 'int'],
    unk08: [pl(2008, 'unknown_place'), 'int'], unk25: [pl(2025, 'unknown_place'), 'int'],
    hd25: [ht(2025, 'drowning'), 'int'], hd08: [ht(2008, 'drowning'), 'int'], hc08: [ht(2008, 'choking'), 'int'],
    hc25: [ht(2025, 'choking'), 'int'], hf08: [ht(2008, 'fire'), 'int'], hf25: [ht(2025, 'fire'), 'int'], hfa25: [ht(2025, 'falls'), 'int'],
    sh_drw25: [hs(2025, 'drowning'), 'pct'], sh_fire25: [hs(2025, 'fire'), 'pct'], sh_drw08: [hs(2008, 'drowning'), 'pct'],
    sh_fire08: [hs(2008, 'fire'), 'pct'], sh_fal08: [hs(2008, 'falls'), 'pct'], sh_fal25: [hs(2025, 'falls'), 'pct'],
    a0_chk: [ag('0', 'choking'), 'int'], a0_tot: [ag('0', 'total'), 'int'],
    a1529_trf: [ag('15–29', 'traffic'), 'int'], a1529_tot: [ag('15–29', 'total'), 'int'],
    w01_25: [dc('W01', 2025), 'int'], w01_95: [dc('W01', 1995), 'int'], bath95: [dc('W65-W66', 1995), 'int'],
    x30_25: [dc('X30', 2025), 'int'], x30_24: [dc('X30', 2024), 'int'],
  };
}
