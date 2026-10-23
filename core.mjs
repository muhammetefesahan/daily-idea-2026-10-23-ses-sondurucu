// Ses Söndürücü Laboratuvarı: ekrana dokunmayan hesaplar (test.mjs bunları sınar)
// Bu gerçek bir yanma fiziği değil, öğrenmek için yaptığım basit bir oyun modeli.

export const BEST_HZ = 45;          // 30–60 Hz aralığının ortası
export const OUT_LEVEL = 0.1;        // alev gücü bunun altına inerse söner
const K = 8;                         // sesin alevi bastırma katsayısı
const HIZ = 0.15;                    // ekranda izlenebilsin diye zamanı yavaşlatır

export const FIRES = {
  mum: { ad: 'Mum', boyut: 1, toparlanma: 0.15 },
  alkol: { ad: 'Küçük alkol kabı', boyut: 2, toparlanma: 0.3 },
  kamp: { ad: 'Kamp ateşi', boyut: 8, toparlanma: 0.6 }
};

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Frekans etkisi: 45 Hz çevresinde en yüksek, logaritmik çan eğrisi
export function bandFactor(hz) {
  if (!(hz > 0)) return 0;
  const x = Math.log(hz / BEST_HZ);
  return Math.exp(-(x * x) / (2 * 0.45 * 0.45));
}

// Ses gücü: 80 dB altında etkisiz, 110 dB'de tam
export function powerFactor(db) {
  return clamp((db - 80) / 30, 0, 1);
}

// Mesafe: uzaklaştıkça hızla zayıflar (30 cm'de yarıya iner)
export function distanceFactor(m) {
  if (!(m >= 0)) return 0;
  return 1 / (1 + (m / 0.3) ** 2);
}

export function effect({ hz, db, mesafe }) {
  return bandFactor(hz) * powerFactor(db) * distanceFactor(mesafe);
}

// Alev gücü 0–1 arası. Kendi kendine toparlanır, ses onu bastırır.
export function step(level, params, dt) {
  const fire = FIRES[params.ates] || FIRES.mum;
  if (level <= 0) return 0;
  const e = params.acik === false ? 0 : effect(params);
  const d = fire.toparlanma * (1 - level) - (K * e / fire.boyut) * level;
  const next = clamp(level + d * HIZ * dt, 0, 1);
  return next < OUT_LEVEL ? 0 : next;
}

// Ses hep açık kalırsa alev hangi güçte dengeye gelir?
export function balance(params) {
  const fire = FIRES[params.ates] || FIRES.mum;
  const e = effect(params);
  return fire.toparlanma / (fire.toparlanma + K * e / fire.boyut);
}

export function simulate(params, { sure = 60, dt = 0.05 } = {}) {
  let level = 1;
  for (let t = 0; t <= sure; t += dt) {
    level = step(level, { ...params, acik: true }, dt);
    if (level === 0) return { soner: true, saniye: Math.round((t + dt) * 10) / 10 };
  }
  return { soner: false, saniye: null, kalan: level };
}

// Kaydırıcı 0–1000 arası; 10 Hz ile 25.000 Hz arasını logaritmik böler
export const MIN_HZ = 10, MAX_HZ = 25000;
export function sliderToHz(v) {
  const t = clamp(v, 0, 1000) / 1000;
  return Math.round(MIN_HZ * (MAX_HZ / MIN_HZ) ** t);
}
export function hzToSlider(hz) {
  return Math.round(Math.log(clamp(hz, MIN_HZ, MAX_HZ) / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ) * 1000);
}

export function hzLabel(hz) {
  if (hz >= 20000) return 'ultrasonik (duyamam)';
  if (hz < 20) return 'infrasonik (duyamam)';
  if (hz <= 250) return 'kalın ses (bas)';
  if (hz <= 4000) return 'orta ses';
  return 'ince ses';
}

export function explain(params) {
  const b = bandFactor(params.hz), p = powerFactor(params.db), m = distanceFactor(params.mesafe);
  const notes = [];
  if (b < 0.2) notes.push(params.hz > BEST_HZ ? 'Frekans çok yüksek; alev sadece titriyor.' : 'Frekans çok düşük.');
  else if (b > 0.6) notes.push('Frekans iyi bölgede (30–60 Hz civarı).');
  if (p === 0) notes.push('Ses çok kısık, alevi etkilemiyor.');
  if (m < 0.3) notes.push('Hoparlör çok uzak; ses dağılıyor.');
  if (params.ates === 'kamp') notes.push('Büyük ateşte bu yöntem yetmez.');
  return notes;
}
