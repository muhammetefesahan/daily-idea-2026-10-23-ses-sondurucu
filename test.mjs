import assert from 'node:assert/strict';
import {
  BEST_HZ, bandFactor, powerFactor, distanceFactor, effect, step, balance, simulate,
  sliderToHz, hzToSlider, hzLabel, explain
} from './core.mjs';

let checks = 0;
const ok = fn => { fn(); checks++; };

// 1. Frekans eğrisi 45 Hz'de en yüksek, 30–60 Hz iyi, yüksek ve çok düşük frekans zayıf
ok(() => assert.equal(bandFactor(BEST_HZ), 1));
ok(() => assert.ok(bandFactor(30) > 0.6 && bandFactor(60) > 0.6));
ok(() => assert.ok(bandFactor(440) < 0.01));
ok(() => assert.ok(bandFactor(25000) < 1e-6));
ok(() => assert.ok(bandFactor(10) < 0.01));
ok(() => assert.equal(bandFactor(0), 0));

// 2. Güç ve mesafe
ok(() => assert.equal(powerFactor(70), 0));
ok(() => assert.equal(powerFactor(110), 1));
ok(() => assert.equal(powerFactor(95), 0.5));
ok(() => assert.equal(distanceFactor(0.3), 0.5));
ok(() => assert.ok(distanceFactor(1) < 0.1));

// 3. Mum: yakından kalın sesle söner, uzaktan sönmez
const close = simulate({ ates: 'mum', hz: 45, db: 110, mesafe: 0.1 });
ok(() => assert.equal(close.soner, true));
ok(() => assert.equal(close.saniye, 2.3));
ok(() => assert.equal(simulate({ ates: 'mum', hz: 45, db: 110, mesafe: 1 }).soner, false));

// 4. Aynı yerden ultrason ve 440 Hz mumu söndüremiyor
ok(() => assert.equal(simulate({ ates: 'mum', hz: 25000, db: 120, mesafe: 0.05 }).soner, false));
ok(() => assert.equal(simulate({ ates: 'mum', hz: 440, db: 120, mesafe: 0.05 }).soner, false));

// 5. Alkol kabı daha zor: 10 cm'de söner, 30 cm'de sönmez
ok(() => assert.equal(simulate({ ates: 'alkol', hz: 45, db: 110, mesafe: 0.1 }).soner, true));
ok(() => assert.equal(simulate({ ates: 'alkol', hz: 45, db: 110, mesafe: 0.3 }).soner, false));

// 6. Kamp ateşi en iyi ayarla bile sönmüyor
ok(() => assert.equal(simulate({ ates: 'kamp', hz: 45, db: 120, mesafe: 0.05 }).soner, false));
ok(() => assert.ok(balance({ ates: 'kamp', hz: 45, db: 120, mesafe: 0.05 }) > 0.3));

// 7. Ses kapalıyken alev kendini toparlıyor, sönmüş alev kendiliğinden yanmıyor
ok(() => assert.ok(step(0.5, { ates: 'mum', hz: 45, db: 110, mesafe: 0.1, acik: false }, 1) > 0.5));
ok(() => assert.equal(step(0, { ates: 'mum', hz: 45, db: 110, mesafe: 0.1, acik: false }, 1), 0));
ok(() => assert.ok(effect({ hz: 45, db: 110, mesafe: 0.1 }) > 0.89));

// 8. Kaydırıcı dönüşümü
ok(() => assert.equal(sliderToHz(0), 10));
ok(() => assert.equal(sliderToHz(1000), 25000));
ok(() => assert.ok(Math.abs(sliderToHz(hzToSlider(45)) - 45) <= 1));
ok(() => assert.equal(hzLabel(25000), 'ultrasonik (duyamam)'));
ok(() => assert.equal(hzLabel(45), 'kalın ses (bas)'));

// 9. Açıklamalar doğru uyarıyı veriyor
ok(() => assert.ok(explain({ ates: 'mum', hz: 25000, db: 110, mesafe: 0.1 }).some(n => n.includes('çok yüksek'))));
ok(() => assert.ok(explain({ ates: 'kamp', hz: 45, db: 110, mesafe: 0.1 }).some(n => n.includes('yetmez'))));

console.log(`${checks} kontrol geçti.`);
