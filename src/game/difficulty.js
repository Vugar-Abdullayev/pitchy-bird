/*
 * ÇƏTİNLİK SİSTEMİ
 *
 * Bütün parametrlər MUSİQİ vahidində təyin olunub, piksel ilə yox.
 * Səbəb: piksel ekrandan ekrana dəyişir, sent dəyişmir. Əgər
 * tolerantlığı piksel ilə yazsaq, oyun böyük ekranda asanlaşar,
 * kiçik ekranda çətinləşər — bu isə ölçmə aləti üçün yolverilməzdir.
 *
 * İki növ ox var:
 *
 *   TƏHSİL OXLARI — çətinlik artanda şagird nəsə öyrənir
 *     toleranceCents   entonasiya dəqiqliyi
 *     holdMs           notanı nə qədər TƏMİZ TUTMAQ lazımdır
 *     maxLeapSemitones barmaq keçidlərinin böyüklüyü
 *     scale            hansı tonallıqda işləyir
 *
 *   ARCADE OXLARI — çətinlik artır, amma skripka öyrənilmir
 *     scrollSpeedPxPerSec, gapSpacingMs, fallSpeed
 *
 * Prinsip: çətinlik əsasən TƏHSİL oxlarında artmalıdır.
 * Oyunu sürətləndirmək skripka öyrətmir; tolerantlığı daraltmaq
 * və notanı daha uzun tutmağı tələb etmək öyrədir.
 */

export const LEVELS = [
  {
    id: 1,
    name: 'Başlanğıc',
    /* ±50 sent = yarım yarım ton. Bu sərhəddən içəridəsənsə
       çaldığın nota mübahisəsiz həmin notadır. Həm də bizim ölçmə
       xətamızdan (real şəraitdə ~10-20 sent) 3-5 dəfə böyükdür —
       yəni şagird öz səhvinə görə cəzalanır, bizim səhvimizə görə yox. */
    toleranceCents: 50,
    holdMs: 700,
    maxLeapSemitones: 4,
    scaleId: 'cMajor',
    scrollSpeedPxPerSec: 130,
    gapSpacingMs: 2600,
    passesToAdvance: 8
  },
  {
    id: 2,
    name: 'İkinci addım',
    toleranceCents: 40,
    holdMs: 900,
    maxLeapSemitones: 7,
    scaleId: 'cMajor',
    scrollSpeedPxPerSec: 145,
    gapSpacingMs: 2400,
    passesToAdvance: 10
  },
  {
    id: 3,
    name: 'Orta',
    toleranceCents: 30,
    holdMs: 1100,
    maxLeapSemitones: 12,
    scaleId: 'aMinor',
    scrollSpeedPxPerSec: 160,
    gapSpacingMs: 2200,
    passesToAdvance: 12
  },
  {
    id: 4,
    name: 'İrəli',
    toleranceCents: 25,
    holdMs: 1300,
    maxLeapSemitones: 16,
    scaleId: 'cMajor',
    scrollSpeedPxPerSec: 175,
    gapSpacingMs: 2000,
    passesToAdvance: 15
  },
  {
    id: 5,
    name: 'Usta',
    /* ±20 sent — ölçmə xətamızın sərhəddinə yaxınlaşırıq.
       Bundan aşağı düşmək hazırda dürüst deyil: şagirdi öz
       səhvinə görə yox, bizim ölçmə xətamıza görə cəzalandırarıq. */
    toleranceCents: 20,
    holdMs: 1500,
    maxLeapSemitones: 21,
    scaleId: 'aMinor',
    scrollSpeedPxPerSec: 190,
    gapSpacingMs: 1900,
    passesToAdvance: Infinity
  }
];

/*
 * Quşun ölçüsü də çətinlik parametridir, dekorasiya deyil.
 *
 * Quş nə qədər böyükdürsə, tolerantlıq büdcəsindən o qədər yeyir —
 * çünki boşluqdan keçmək üçün quşun BÜTÜN gövdəsi sığmalıdır.
 * Köhnə quş (radius 14 px) təxminən ±75 sent tuturdu, yəni
 * ±50 sentlik tolerantlıqdan İRİ idi. Mümkünsüz vəziyyət.
 *
 * Qayda: quşun radiusu tolerantlığın 40%-ni keçməsin.
 * Amma piksel həddi də var — görünməyəcək qədər kiçik olmasın.
 */
/*
 * OYUNÇU NİŞANI — NOTA QLİFİ
 *
 * Dairə əvəzinə minimal nota işarəsi. Nota BAŞI perdənin tam
 * hündürlüyündə oturur — məhz notada olduğu kimi.
 *
 * Qlif SİMMETRİK DEYİL: quyruq yuxarı uzanır, baş isə aşağıda qalır.
 * Ona görə toqquşma da simmetrik olmamalıdır. Əks halda ya quyruq
 * borudan keçərdi (ədalətsiz asan), ya da baş boşluqdan aşağı
 * sayılardı (ədalətsiz çətin).
 *
 * Bütün ölçülər `u` vahidinin qatıdır — Renderer eyni nisbətləri
 * işlədir, yəni görünən şey ilə toqquşan şey eynidir.
 */
/*
 * NOTA QLİFİ (♪) — oyunçu fiquru.
 *
 * Bütün ölçülər "u" vahidinin qatı kimi verilib. Renderer də,
 * toqquşma da EYNİ bu sabitlərdən oxuyur — yəni çəkilən forma ilə
 * dəyən forma riyazi olaraq eynidir.
 *
 * Başlanğıc nöqtəsi: nota BAŞININ mərkəzi. Perde məhz oradadır.
 * Quyruq yuxarı çıxdığı üçün qlif şaquli olaraq SİMMETRİK DEYİL —
 * ona görə toqquşma tək radiusla yox, yuxarı/aşağı ayrı uzantılarla
 * hesablanır.
 */
export const GLYPH = {
  headA: 1.30,        // nota başı — böyük yarımox
  headB: 0.95,        // nota başı — kiçik yarımox
  headTilt: -20 * Math.PI / 180,
  stemX: 1.16,        // quyruğun yeri
  stemTopY: -3.20,    // quyruğun ucu
  stemWidth: 0.17,
  flagW: 1.05,        // bayrağın sağa çıxıntısı
  flagH: 1.25         // bayrağın aşağı uzunluğu
};

/* Maili ellipsin həqiqi uzantıları — göz qərarı ilə yox, düsturla */
const _s2 = Math.sin(GLYPH.headTilt) ** 2;
const _c2 = Math.cos(GLYPH.headTilt) ** 2;
GLYPH.headExtentY = Math.sqrt(GLYPH.headA ** 2 * _s2 + GLYPH.headB ** 2 * _c2);
GLYPH.headExtentX = Math.sqrt(GLYPH.headA ** 2 * _c2 + GLYPH.headB ** 2 * _s2);

/* TAM hitbox: baş, quyruq və bayraq — hamısı daxildir */
GLYPH.extentUp = -GLYPH.stemTopY;
GLYPH.extentDown = GLYPH.headExtentY;
GLYPH.extentX = Math.max(GLYPH.headExtentX, GLYPH.stemX + GLYPH.flagW);

/* Qlifin ölçüsü ekrana görə. Kompakt saxlayırıq: tam hündürlük
   ≈ 4.2u, yəni 25–46 px arası. */
export const GLYPH_UNIT_RATIO = 0.0105;
export const GLYPH_UNIT_MIN_PX = 6;
export const GLYPH_UNIT_MAX_PX = 11;

export function glyphUnitPx(playHeight) {
  return Math.max(GLYPH_UNIT_MIN_PX,
    Math.min(GLYPH_UNIT_MAX_PX, playHeight * GLYPH_UNIT_RATIO));
}

/*
 * Boruların həndəsəsi — TƏK MƏNBƏ.
 *
 * Boşluq mərkəzə görə simmetrik DEYİL:
 *     yuxarı = tolerantlıq + qlifin yuxarı uzantısı
 *     aşağı  = tolerantlıq + qlifin aşağı uzantısı
 *
 * Bu vacibdir: boşluğu simmetrik saxlasaq (max uzantı ilə), aşağıya
 * doğru tolerantlıq süni olaraq genişlənərdi və ölçü əyri olardı.
 * Nota başının mərkəzi hər halda ±tolerantlıq daxilində qalmalıdır.
 */
export function pipeGeometry(level, mapping) {
  const u = glyphUnitPx(mapping.playHeight);
  const tolPx = mapping.centsToPx(level.toleranceCents);

  const extentUp = GLYPH.extentUp * u;
  const extentDown = GLYPH.extentDown * u;
  const extentX = GLYPH.extentX * u;

  return {
    glyphUnitPx: u,
    extentUp,
    extentDown,
    extentX,
    tolerancePx: tolPx,
    gapAbovePx: tolPx + extentUp,
    gapBelowPx: tolPx + extentDown,
    gapPx: 2 * tolPx + extentUp + extentDown,
    widthPx: (level.holdMs / 1000) * level.scrollSpeedPxPerSec,
    toleranceCents: level.toleranceCents,
    effectiveToleranceCents: mapping.pxToCents(tolPx)
  };
}

export function getLevel(index) {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
}