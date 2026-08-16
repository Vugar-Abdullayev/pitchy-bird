# Dəyişikliklər tarixçəsi

Format [Keep a Changelog](https://keepachangelog.com/) prinsipinə əsaslanır.
Tarixlər 2026-cı ilin avqustuna aiddir.

---

## [0.6.0] — 2026-08-16 — Vizual və oyun balansı

### Əlavə edildi
- **Nota qlifi (♪)** oyunçu fiquru kimi. Toqquşma **tam qlifi** əhatə edir:
  baş, quyruq və bayraq. Ölçülər `difficulty.js`-dəki `GLYPH` sabitindən gəlir;
  həm çəkim, həm toqquşma eyni mənbədən oxuyur, ona görə görünən forma ilə
  dəyən forma ayrıla bilməz.
- **Görünən tolerantlıq zolağı** — boşluğun içində solğun qırmızı sahə.
  Fiqur böyük olduğu üçün boşluq göz üçün olduğundan daha bağışlayan görünürdü;
  zolaq həqiqi hədəf sahəsini göstərir.
- **Zəmin zolağı** ən pes notanın altında.

### Dəyişdirildi
- **Tonallıq: Sol major → Do major.** Artıq heç bir səviyyədə diyez yoxdur.
  F#4 yerinə F4. Bu, ayrı-ayrı notaları dəyişməklə yox, gamı dəyişməklə edildi —
  F# Sol majorun tərifinin bir hissəsidir, onu zorla dəyişmək gamı pozardı.
- **Zəmin artıq öldürmür.** Susan oyunçu ən pes notanın ALTINA düşür və növbəti
  borunun gövdəsinə dəyir. Cəzanı fizika yox, notalar verir.
- **Diapazonun aşağı payı 1 → 3 yarım ton.** Susan fiqurun düşəcəyi yer artıq
  xəritədən kənar "zəmin bandı" deyil, xəritənin içindədir. Nəticədə boş sahə
  ekranın 13%-indən 3%-inə düşdü.
- Zəmin zolağının eni **hesablanır**, təxmin edilmir.
- HUD paneli hər kadrda yenidən qurulmur, yalnız mətnlər dəyişir.

### Düzəldildi
- **HUD-da `undefined`** — HUD `filteredFrequency` və `detectedNote`
  gözləyirdi, `main.js` isə `filteredFreq` göndərirdi və nota adını heç
  göndərmirdi. Sözləşmə tək yerdə sənədləşdirildi.
- **`∞ st`** əvəzinə `-- st`.
- Ham (raw) Hz sətri paneldən çıxarıldı.

### Aradan qaldırılan səhvlər (regresiyalar)
- **Fiqur tamamilə yoxa çıxdı və borular öldürmürdü.** Səbəb: toqquşma modeli
  asimmetrik edilərkən `difficulty.js` göndərildi, `Bird.js` göndərilmədi.
  Köhnə `Bird.js` artıq mövcud olmayan `birdRadiusPx` sahəsini oxuyub
  `undefined` alırdı → mövqe **NaN** olurdu. NaN ilə hər müqayisə `false`
  qaytardığı üçün nə çəkilirdi, nə dəyirdi — heç bir xəta mesajı olmadan.
  *Dərs: bir dəyişiklik bir neçə fayla toxunursa, hamısı birlikdə verilməlidir.*
- Eyni səbəbdən `Pipe.js`-də qalan ikinci qalıq da tapıldı (`gapAbovePx`).
  İndi hər dəyişiklikdən sonra köhnə sahə adlarına referans axtarılır.

---

## [0.5.0] — 2026-08-16 — Çətinlik sistemi və tam ekran

### Əlavə edildi
- **`src/game/difficulty.js`** — bütün çətinlik parametrləri tək yerdə,
  MUSİQİ vahidində (sent), piksel ilə yox.
- **`src/game/pitchMapping.js`** — perdə ↔ ekran çevirməsi. Əvvəl bu iş
  `audio/constants.js`-də idi, yəni piksel hesabı səs qatında yaşayırdı.
- **`src/audio/scales.js`** — tonallıq sistemi. Gam artıq sabit siyahı deyil,
  MƏLUMATDIR: kök nota + interval şablonu.
- **`src/game/MelodySource.js`** — məşq şablonları (qamma, arpeggio, qonşu
  notalar). Əvvəl notalar `Math.random()` ilə seçilirdi.
- **5 səviyyəli irəliləyiş:** ±50 → ±40 → ±30 → ±25 → ±20 sent.
- **Boru eni** yeni çətinlik oxu kimi: notanı nə qədər TƏMİZ TUTMAQ lazımdır.
- Tam ekran / duyarlı canvas, ekran sıxlığı (DPR) dəstəyi, ölçü dəyişəndə
  modelin yenidən qurulması.

### Dəyişdirildi
- **Tolerantlıq ±299 sentdən ±50 sentə.** Köhnə oyunda A4 tələb olunan yerdə
  F#4 və ya C5 çalmaq kifayət edirdi — yəni entonasiya faktiki olaraq
  yoxlanmırdı.
- **Boru sürəti kadr tezliyindən asılı deyil.** Əvvəl kadr başına sabit piksel
  idi; 120 Hz ekranda oyun iki dəfə sürətli işləyirdi.
- Kadrlar arası fərq 50 ms-ə məhdudlaşdırıldı (sekmə dəyişəndə teleport).
- **Həndəsə sabitləri tək mənbədə.** Əvvəl `pipeGap`, `pipeWidth`, `birdRadius`
  həm `Bird`, həm `Pipe`, həm `Renderer` fayllarında AYRI yazılmışdı —
  birini dəyişəndə toqquşma ilə ekranda görünən şey səssizcə fərqlənə bilirdi.
- `CollisionSystem` sadələşdirildi: yalnız həndəsə. Əvvəl toqquşma, entonasiya
  mühakiməsi və xal qərarı — üç iş görürdü.

### Silindi
- **Səhv notaya görə ayrıca ölüm.** Boşluq onsuz da düzgün notanın
  hündürlüyündə açılır, deməli boşluqdan keçmək ELƏ entonasiya imtahanıdır.
  Yalnız divara dəymək öldürür.

---

## [0.4.0] — 2026-08-13 — Səs tanımanın yenidən qurulması

### Dəyişdirildi
- **Perdə tapma alqoritmi McLeod Pitch Method (MPM) ilə əvəzləndi.**

  Köhnə məntiq: "ilk enişi keç, rast gəldiyin İLK təpəni götür".
  İki halda dağılırdı — küy saxta təpə yaradanda, və əsas ton zəif olanda
  (telefon dinamiki) üst tonun təpəsi əvvəl gəlirdi.

  Yeni məntiq üç şeyi dəyişir: NSDF normallaşdırması (uzaq lag-larda sönmür),
  yalnız açar təpələr (küy dalğalanmaları avtomatik kənarda qalır) və
  ən güclü təpənin 90%-ni keçən İLK təpənin seçilməsi (üst tonlar həmişə
  sonra gəldiyi üçün əsas ton qalib gəlir).

| Senari | Əvvəl | Sonra |
|---|---|---|
| Skripka + fon küyü | 31% | **100%** |
| Telefon dinamiki | 0% | **100%** |
| Oktav səhvi (936 ölçmə) | çoxlu | **0** |

### Düzəldildi
- **E5 heç vaxt oyuna çatmırdı.** E5 əslində 659.25 Hz-dir, üst sərhəd isə
  659 yazılmışdı — düzgün kökləndirilmiş E5 sərhədi 0.25 Hz aşıb atılırdı.
  Eyni problem aşağıda da vardı (G3 = tam 196, sərhəd = 196).
  Səbəb: layihədə diapazonun İKİ fərqli tərifi vardı. Tək mənbəyə bağlandı.
- **Böyük perdə sıçrayışları sistemi əbədi kilidləyirdi.** Köhnə "oktav
  qorunması" 2.2 dəfədən böyük dəyişikliyi rədd edirdi; G3→E5 keçidi 3.36
  dəfədir, yəni real musiqi sıçrayışı səhv sayılırdı. Üstəlik rədd ediləndə
  müqayisə referansı yenilənmirdi. İndi böyük sıçrayış rədd edilmir, 2 kadrda
  (~33 ms) TƏSDİQ edilir.
- Diapazonun hər iki ucuna yarım ton pay verildi: bemol çalan şagird artıq
  "səsin yoxdur" yox, real geri bildiriş alır.

---

## [0.3.0] — 2026-08-13 — Ölçmə infrastrukturu

Bu mərhələ heç bir oynanış dəyişikliyi gətirmir. Məqsəd: səs tərəfində
"deyəsən yaxşılaşdı" demək əvəzinə ölçə bilmək.

### Əlavə edildi
- **`test/signal.js`** — süni siqnal generatoru: təmiz sinus, skripkaya
  bənzər harmonik ton, telefon dinamiki modeli (əsas ton zəif), fon küyü,
  vibrato, zəif səs, DC sürüşmə. Küy təkrarlana bilən toxumla yaradılır.
- **`test/report.mjs`** — alqoritm karnesi. 6 senari × 13 nota, nəticə sentlə.
- **`test/stress.mjs`** — 12 çətin şərait × 6 küy toxumu = 936 ölçmə.
- **`test/pipeline.mjs`** — tam zəncir testi: səs → alqoritm → süzgəc → oyun.

Sonuncu ona görə lazım oldu ki, `report.mjs` yalnız `correlate()`-i yoxlayırdı.
E5 səhvi məhz bu boşluqda gizlənmişdi: alqoritm E5-i düzgün tapırdı, süzgəc
onu atırdı. Zəncirin ilk halqasını yoxlayıb "zəncir sağlamdır" demək olmaz.

### Qeyd
Heç bir yeni asılılıq əlavə edilmədi — sadə Node kifayət etdi.

---

## [0.2.0] — 2026-08-13 — Kritik səhvlərin düzəldilməsi

### Düzəldildi
- **Sükut heç vaxt oyuna çatmırdı.** `getReading()` cari tezlik yoxdursa
  `lastValidFreq`-ə qayıdırdı, o isə heç vaxt sıfırlanmırdı. Nəticədə ilk
  uğurlu tanımadan sonra proqram əbədi olaraq həmin notanı "eşidirdi".
  Üç şey birdən ölü idi: quşun düşməsi, "səni eşidirəm" göstəricisi və
  entonasiya pəncərəsi.
- **Cazibə faktiki olaraq işləmirdi.** Sükut düzəlişindən sonra üzə çıxdı:
  hamarlama quşu son notanın hündürlüyündə saxlayır, cazibə isə aşağı çəkirdi;
  iki qüvvə ~21 piksel sonra tarazlaşırdı. İndi iki ayrı rejim var, heç vaxt
  eyni anda: səs varsa hamarlama, səs yoxsa cazibə.
- **Mikrofon açılmasa da oyun başlayırdı.** Xəta udulurdu, istifadəçi 2 saniyəyə
  ölür və səbəbini görmürdü. Brauzerin texniki xəta adları (`NotAllowedError`
  və s.) istifadəçinin başa düşəcəyi mesajlara çevrildi.
- **Retry zamanı xəta mesajı görünmürdü** — mesaj sahəsi gizlədilmiş overlay-in
  içində idi.
- İkiqat klik iki paralel oyun döngüsü başladırdı (fizika ikiqat sürətlənirdi).
- Oyun bitəndən sonra mikrofon açıq qalırdı; brauzerin qeyd nişanı sönmürdü.

### Silindi
- **`bird.html`** — oyunun ikinci, tərk edilmiş tam kopyası (520 sətir).
- **`dist/`** git izləməsindən çıxarıldı. Commit edilmiş build kaynak koddan
  fərqlənirdi (fərqli hamarlama, fərqli eşiklər, fərqli confidence düsturu) —
  deploy edilsəydi köhnə alqoritm yayına çıxardı.
- `node_modules/` git izləməsindən çıxarıldı.

### Dəyişdirildi
- README yenidən yazıldı: pozulmuş mətn təmizləndi, işləməyən ayar
  parametrləri açıq şəkildə "işləmir" kimi qeyd edildi.

---

## [0.1.0] — ilkin vəziyyət

İşlək prototip. Mikrofondan perdə tutulur, quş hərəkət edir, borular gəlir.

Denetimdə aşkarlanan vəziyyət:
- Toqquşma həndəsəsi üç ayrı faylda təkrarlanmışdı
- Perdə → piksel çevirməsi səs qatında yaşayırdı
- Test yox, ölçmə yox, CI yox
- Faktiki tolerantlıq ±299 sent (≈3 yarım ton)
- Oyunun ikinci bir kopyası (`bird.html`) və köhnəlmiş `dist/` repoda idi

Maturity qiymətləndirməsi: **Reorganized Prototype** — MVP-nin ŞƏKLİ vardı,
maddəsi yox idi.