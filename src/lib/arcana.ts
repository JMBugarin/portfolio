// The deck's artwork: five Major Arcana and a shared back, drawn as SVG when the site is built.
// A silver and gray-green palette keeps the illustrated deck close to aged stone.
// Every card is 300 x 520. Gradients and the window clip come from defs(), which a page includes once.

export type ArcanaId = 'fool' | 'wheel' | 'hermit' | 'star' | 'temperance'

const SILVER = 'url(#silver)'
const INK = '#111715'
const BONE = '#e3e5dc'
const PALE = '#d5dcd2'
const SAGE = '#7f9386'
const MIST = '#b4c2b5'
const VERDIGRIS = '#81988c'
const WINDOW = 'M34,412 V150 A116,78 0 0 1 266,150 V412 Z'

const r2 = (v: number) => Math.round(v * 100) / 100
const rad = (d: number) => (d * Math.PI) / 180
// A point at radius r from (cx, cy). Zero degrees is straight up and angles run clockwise.
const xy = (cx: number, cy: number, r: number, a: number): [number, number] => [r2(cx + r * Math.sin(rad(a))), r2(cy - r * Math.cos(rad(a)))]
const at = (cx: number, cy: number, r: number, a: number) => xy(cx, cy, r, a).join(',')
const times = <T,>(count: number, each: (i: number) => T) => Array.from({ length: count }, (_, i) => each(i))
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const starPoints = (cx: number, cy: number, outer: number, inner: number, points: number, turn = 0) =>
  times(points * 2, (i) => at(cx, cy, i % 2 ? inner : outer, turn + (i * 180) / points)).join(' ')
const sparkle = (cx: number, cy: number, r: number, fill: string, opacity = 1) =>
  `<path d="M${cx},${r2(cy - r)} Q${cx},${cy} ${r2(cx + r)},${cy} Q${cx},${cy} ${cx},${r2(cy + r)} Q${cx},${cy} ${r2(cx - r)},${cy} Q${cx},${cy} ${cx},${r2(cy - r)}Z" fill="${fill}" opacity="${opacity}"/>`
const sector = (cx: number, cy: number, inner: number, outer: number, from: number, to: number) =>
  `M${at(cx, cy, outer, from)} A${outer},${outer} 0 0 1 ${at(cx, cy, outer, to)} L${at(cx, cy, inner, to)} A${inner},${inner} 0 0 0 ${at(cx, cy, inner, from)}Z`
// A crescent with its horns up.
const crescent = (cx: number, cy: number, r: number) =>
  `<path d="M${r2(cx - r * 0.76)},${r2(cy - r * 0.65)} A${r},${r} 0 1 0 ${r2(cx + r * 0.76)},${r2(cy - r * 0.65)} A${r2(r * 0.8)},${r2(r * 0.8)} 0 1 1 ${r2(cx - r * 0.76)},${r2(cy - r * 0.65)}Z" fill="${SILVER}"/>`
const rays = (cx: number, cy: number, count: number, long: number, short: number, width: number, opacity: number, fill = PALE) =>
  `<g fill="${fill}" opacity="${opacity}">${times(count, (i) => {
    const a = (i * 360) / count
    return `<path d="M${cx},${cy} L${at(cx, cy, i % 2 ? short : long, a - width)} L${at(cx, cy, i % 2 ? short : long, a + width)}Z"/>`
  }).join('')}</g>`

// Small stars scattered over the sky, kept clear of whatever the card is about.
const sky = (seed: number, count: number, clear: (x: number, y: number) => boolean, bottom = 330) => {
  const rand = rng(seed)
  const out: string[] = []
  while (out.length < count) {
    const x = r2(40 + rand() * 220)
    const y = r2(80 + rand() * (bottom - 80))
    const size = rand()
    if (clear(x, y)) continue
    out.push(size > 0.86 ? sparkle(x, y, 5.5, BONE, 0.9) : `<circle cx="${x}" cy="${y}" r="${r2(0.7 + size * 1.1)}" fill="${BONE}" opacity="${r2(0.45 + size * 0.5)}"/>`)
  }
  return out.join('')
}

// A bank of fog: a row of rounded crests, filled down to the bottom of the window.
const bank = (seed: number, y: number, rise: number, fill: string, opacity = 1) => {
  const rand = rng(seed)
  let x = 24
  let d = `M24,420 L24,${y}`
  while (x < 276) {
    const w = 24 + rand() * 30
    d += ` q${r2(w / 2)},${r2(-rise * (0.5 + rand() * 0.7))} ${r2(w)},0`
    x += w
  }
  return `<path d="${d} L${r2(x)},420Z" fill="${fill}" opacity="${opacity}"/>`
}
// One curl of fog, the contorted line.
const curl = (x: number, y: number, size: number, flip = false, opacity = 0.85) =>
  `<path transform="translate(${x} ${y}) scale(${flip ? -size : size} ${size})" d="M0,0 C7,-11 26,-13 28,0 C29,10 17,13 14,5 C12,0 17,-4 20,0" fill="none" stroke="${BONE}" stroke-width="${r2(2.6 / size)}" stroke-linecap="round" opacity="${opacity}"/>`

const fool = () => {
  const cx = 150
  const crown = times(22, (i) => `<circle cx="${xy(cx, 198, 104, -84 + i * 8)[0]}" cy="${xy(cx, 198, 104, -84 + i * 8)[1]}" r="${i === 0 || i === 21 ? 2.6 : 1.8}"/>`).join('')
  return `
  <rect x="30" y="66" width="240" height="350" fill="url(#sky-fool)"/>
  ${sky(11, 20, (x, y) => Math.hypot(x - cx, y - 198) < 112 || y > 310)}
  ${[[62, 150], [84, 108], [236, 160], [214, 104], [58, 250], [244, 262]].map(([x, y], i) => sparkle(x, y, i % 2 ? 6 : 8, MIST, 0.95)).join('')}
  <circle cx="${cx}" cy="198" r="150" fill="url(#halo-mist)"/>
  <circle cx="${cx}" cy="198" r="86" fill="url(#moon)"/>
  <g fill="#273b30" opacity=".34"><ellipse cx="118" cy="170" rx="17" ry="12"/><ellipse cx="184" cy="236" rx="22" ry="14"/><ellipse cx="196" cy="160" rx="9" ry="7"/><ellipse cx="112" cy="232" rx="9" ry="12"/><ellipse cx="150" cy="130" rx="12" ry="6"/></g>
  <circle cx="${cx}" cy="198" r="86" fill="none" stroke="${SILVER}" stroke-width="2.5"/>
  <g fill="${SILVER}">${crown}</g>
  ${bank(3, 356, 16, '#373f3a', 0.95)}
  <g stroke="${SILVER}" stroke-width="2.6" stroke-linejoin="round" fill="${INK}">
    <path d="M124,214 C111,216 102,226 99,242 L84,400 L216,400 L201,242 C198,226 189,216 176,214 L159,205 L150,232 L141,205Z" fill="url(#coat)"/>
    <path d="M131,134 L169,134 L166,168 L134,168Z"/>
    <path d="M117,169 Q150,176 183,169 L183,174 Q150,182 117,174Z"/>
  </g>
  <path d="M134.6,161 L165.4,161 L166,168 L134,168Z" fill="${SAGE}"/>
  <ellipse cx="${cx}" cy="191" rx="12.5" ry="14.5" fill="${INK}"/>
  <path d="M141,205 L159,205 L150,232Z" fill="${BONE}"/>
  <path d="M143,207 L150,211 L157,207 L157,215 L150,211 L143,215Z" fill="${SAGE}"/>
  <g fill="none" stroke="${SILVER}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M141,205 L133,244 L147,268 M159,205 L167,244 L153,268"/>
    <path d="M103,238 C108,262 124,282 143,290 M197,238 C192,262 176,282 157,290"/>
  </g>
  <g fill="${SILVER}"><circle cx="132" cy="312" r="2.6"/><circle cx="168" cy="312" r="2.6"/><circle cx="130" cy="334" r="2.6"/><circle cx="170" cy="334" r="2.6"/><circle cx="128" cy="356" r="2.6"/><circle cx="172" cy="356" r="2.6"/></g>
  <path d="M150,292 V404" stroke="${SILVER}" stroke-width="4" stroke-linecap="round"/>
  <g fill="${BONE}"><ellipse cx="144" cy="291" rx="7" ry="5.4"/><ellipse cx="156" cy="291" rx="7" ry="5.4"/></g>
  <circle cx="150" cy="285" r="5.2" fill="${SILVER}" stroke="${INK}" stroke-width="1"/>
  ${bank(5, 378, 18, '#575f5a', 0.96)}
  ${bank(8, 396, 14, '#838b86', 0.95)}
  ${curl(46, 372, 1.15)}${curl(254, 366, 1.05, true)}${curl(96, 396, 0.9)}${curl(214, 398, 0.85, true)}${curl(150, 388, 0.7, false, 0.7)}`
}

const wheel = () => {
  const cx = 150
  const cy = 238
  const ring = 91
  const dark = new Set([2, 7, 12])
  const body = `M${at(cx, cy, ring, 5)} A${ring},${ring} 0 1 1 ${at(cx, cy, ring, 343)}`
  const cells = times(16, (i) => {
    const d = sector(cx, cy, 44, 61, i * 22.5 + 2.2, (i + 1) * 22.5 - 2.2)
    return dark.has(i) ? `<path d="${d}" fill="none" stroke="${SILVER}" stroke-width="1.7"/>` : `<path d="${d}" fill="${SILVER}"/>`
  }).join('')
  const spokes = times(8, (i) => `<path d="M${at(cx, cy, 14, i * 45)} L${at(cx, cy, 39, i * 45)}"/>`).join('')
  const studs = times(8, (i) => `<circle cx="${xy(cx, cy, 27, i * 45 + 22.5)[0]}" cy="${xy(cx, cy, 27, i * 45 + 22.5)[1]}" r="2.3"/>`).join('')
  const [hx, hy] = xy(cx, cy, ring, 15)
  return `
  <rect x="30" y="66" width="240" height="350" fill="url(#sky-wheel)"/>
  ${rays(cx, cy, 36, 190, 150, 1.5, 0.11)}
  ${sky(23, 22, (x, y) => Math.hypot(x - cx, y - cy) < 112 || y > 340)}
  <circle cx="${cx}" cy="${cy}" r="130" fill="url(#halo-silver)" opacity=".5"/>
  <g fill="none" stroke-linecap="butt">
    <path d="${body}" stroke="${SILVER}" stroke-width="21"/>
    <path d="${body}" stroke="#353d38" stroke-width="15.5"/>
    <path d="${body}" stroke="${VERDIGRIS}" stroke-width="9" stroke-dasharray="3.4 6.6" opacity=".95"/>
  </g>
  <path d="M${at(cx, cy, ring + 7.75, 343)} L${at(cx, cy, ring, 357)} L${at(cx, cy, ring - 7.75, 343)}Z" fill="#353d38" stroke="${SILVER}" stroke-width="2.6" stroke-linejoin="round"/>
  <g transform="translate(${hx} ${hy}) rotate(15)">
    <path d="M-23,0 C-21,-8 -10,-14 2,-14 C10,-14 15,-11 18,-7.5 L18,7.5 C15,11 10,14 2,14 C-10,14 -21,8 -23,0Z" fill="#4e5651" stroke="${SILVER}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-2,0 l6,-4 l6,4 l-6,4Z" fill="${SILVER}"/>
    <circle cx="-7" cy="-7" r="2.6" fill="${MIST}"/><circle cx="-7" cy="7" r="2.6" fill="${MIST}"/>
    <circle cx="-17.5" cy="-2.2" r="1" fill="${INK}"/><circle cx="-17.5" cy="2.2" r="1" fill="${INK}"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="72" fill="#0e1611" opacity=".78"/>
  <circle cx="${cx}" cy="${cy}" r="72" fill="none" stroke="${SILVER}" stroke-width="4"/>
  <circle cx="${cx}" cy="${cy}" r="66" fill="none" stroke="${SILVER}" stroke-width="1.5"/>
  ${cells}
  <circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="${SILVER}" stroke-width="2.2"/>
  <g stroke="${SILVER}" stroke-width="3.2" stroke-linecap="round">${spokes}</g>
  <g fill="${SILVER}">${studs}</g>
  <circle cx="${cx}" cy="${cy}" r="14" fill="${SILVER}"/>
  <circle cx="${cx}" cy="${cy}" r="8" fill="url(#moon)"/>
  ${crescent(cx, 108, 14)}
  ${sparkle(cx, 100, 5, BONE)}
  ${bank(31, 372, 15, '#373f3a', 0.95)}
  ${bank(37, 392, 16, '#646c67', 0.95)}
  ${curl(52, 384, 1.05)}${curl(248, 382, 1, true)}${curl(138, 402, 0.8, false, 0.75)}`
}

const hermit = () => {
  const vx = 150
  const horizon = 338
  const rows = [338, 347, 359, 375, 396, 424]
  const column = (k: number, y: number) => r2(vx + (k * 46 * (y - horizon)) / 74)
  const cone = (x: number, y: number) => y > 250 && x > 188 - (y - 250) * 0.8 && x < 204 + (y - 250) * 0.5
  const words = ['', '', 'TILE', 'LENS']
  const tiles: string[] = []
  const letters: string[] = []
  for (let j = 0; j < rows.length - 1; j++) {
    for (let k = -6; k < 6; k++) {
      const [top, low] = [rows[j], rows[j + 1]]
      const mx = (column(k, (top + low) / 2) + column(k + 1, (top + low) / 2)) / 2
      const my = (top + low) / 2
      const lit = cone(mx, my)
      const slot = k + 2
      const letter = words[j]?.[slot]
      const doubt = j === 3 && slot === 4
      const fill = doubt ? SAGE : (j + k) % 2 ? (lit ? '#58605b' : '#1d2520') : lit ? '#404843' : '#111914'
      tiles.push(`<path d="M${column(k, top)},${top} L${column(k + 1, top)},${top} L${column(k + 1, low)},${low} L${column(k, low)},${low}Z" fill="${fill}"/>`)
      if (letter || doubt) {
        const lean = r2((Math.atan((mx - vx) / (my - horizon + 30)) * 180) / Math.PI)
        const size = j === 3 ? 15 : 10
        letters.push(`<text class="a-letter" transform="translate(${r2(mx)} ${r2(my + size * 0.24)}) skewX(${-lean}) scale(1 .7)" font-size="${size}" text-anchor="middle" fill="${doubt ? BONE : PALE}">${doubt ? '?' : letter}</text>`)
      }
    }
  }
  const lines = [...rows.slice(0, -1).map((y) => `M30,${y} H270`), ...times(13, (i) => `M${vx},${horizon} L${column(i - 6, 424)},424`)].join(' ')
  return `
  <rect x="30" y="66" width="240" height="350" fill="url(#sky-hermit)"/>
  ${sky(41, 30, (x, y) => (x > 76 && x < 170 && y > 130) || Math.hypot(x - 196, y - 236) < 46 || y > 268)}
  <path d="M30,340 L30,306 L62,262 L88,292 L122,244 L150,282 L176,300 L206,258 L236,296 L270,270 L270,340Z" fill="#272f2a" stroke="#575f5a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M30,340 L30,322 L70,300 L104,318 L150,300 L196,322 L236,304 L270,318 L270,340Z" fill="#111914"/>
  ${tiles.join('')}
  <path d="${lines}" stroke="#060e09" stroke-width="1.6" fill="none"/>
  <path d="M190,252 L52,424 L276,424 L276,356 L206,252Z" fill="${PALE}" opacity=".13"/>
  ${letters.join('')}
  <path d="M30,${horizon} H270" stroke="${SILVER}" stroke-width="2"/>
  <path d="M79,170 L70,356" stroke="${SILVER}" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="79.4" cy="166" r="5" fill="${SILVER}"/>
  <path d="M118,134 C102,142 92,164 91,190 C82,208 72,254 63,304 C59,326 55,342 50,356 L186,356 C180,332 174,300 168,264 C164,238 158,216 150,198 C149,166 136,142 118,134Z" fill="url(#cloak)" stroke="${SILVER}" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M100,222 C96,262 90,312 82,354 M129,246 C131,292 136,330 143,354 M112,252 C110,300 108,330 105,354" fill="none" stroke="#151d18" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
  <path d="M118,150 C106,156 101,172 102,190 C104,200 110,206 118,206 C126,206 132,200 134,190 C135,172 130,156 118,150Z" fill="${INK}"/>
  <path d="M104,190 C103,212 109,232 118,246 C127,232 133,212 132,190 C126,199 110,199 104,190Z" fill="${BONE}"/>
  <path d="M111,204 C113,218 116,230 118,238 M125,204 C123,218 120,230 118,238" fill="none" stroke="#8f9792" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M148,202 C164,196 180,196 193,200 L196,210 C182,216 172,234 164,254 C158,240 152,222 148,202Z" fill="url(#cloak)" stroke="${SILVER}" stroke-width="2.6" stroke-linejoin="round"/>
  <ellipse cx="76" cy="248" rx="6.5" ry="5" fill="${BONE}"/>
  <circle cx="196" cy="236" r="62" fill="url(#halo-silver)"/>
  <path d="M196,210 V220" stroke="${SILVER}" stroke-width="2.4"/>
  <ellipse cx="195" cy="207" rx="6" ry="5" fill="${BONE}"/>
  <path d="M184,224 L196,214 L208,224Z" fill="${SILVER}"/>
  <rect x="185.5" y="224" width="21" height="27" rx="2" fill="#e4e8de" fill-opacity=".3" stroke="${SILVER}" stroke-width="2.6"/>
  <rect x="182" y="251" width="28" height="4.5" rx="1.5" fill="${SILVER}"/>
  <polygon points="${starPoints(196, 237.5, 9, 4.4, 6)}" fill="#eef1e7"/>
  ${bank(47, 404, 10, '#646c67', 0.5)}`
}

const star = () => {
  const cx = 150
  const cy = 148
  const tree = (x: number, base: number, tall: number, wide: number) => {
    const tiers = 6
    const left: string[] = []
    const right: string[] = []
    for (let i = 0; i < tiers; i++) {
      const y = base - (tall * i) / tiers
      const w = (wide / 2) * (1 - i / (tiers + 0.6))
      const up = tall / tiers
      left.push(`${r2(x - w)},${r2(y)} ${r2(x - w * 0.42)},${r2(y - up * 0.9)}`)
      right.unshift(`${r2(x + w * 0.42)},${r2(y - up * 0.9)} ${r2(x + w)},${r2(y)}`)
    }
    return `<polygon points="${left.join(' ')} ${x},${r2(base - tall - 6)} ${right.join(' ')}" fill="#262e29" stroke="#6a726d" stroke-width="1.6" stroke-linejoin="round"/><path d="M${x},${base} V${r2(base - tall * 0.2)}" stroke="#131b16" stroke-width="3"/>`
  }
  const small = [[84, 112, 9], [66, 172, 11], [98, 222, 8], [216, 112, 9], [234, 172, 11], [202, 222, 8], [150, 236, 10]]
  return `
  <rect x="30" y="66" width="240" height="350" fill="url(#sky-star)"/>
  ${sky(59, 26, (x, y) => Math.hypot(x - cx, y - cy) < 74 || y > 268 || small.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 16))}
  <circle cx="${cx}" cy="${cy}" r="118" fill="url(#halo-silver)"/>
  ${rays(cx, cy, 32, 150, 104, 1.1, 0.16)}
  <polygon points="${starPoints(cx, cy, 36, 11, 4, 45)}" fill="${SILVER}" opacity=".8"/>
  <polygon points="${starPoints(cx, cy, 60, 12, 4)}" fill="${SILVER}"/>
  <polygon points="${starPoints(cx, cy, 60, 12, 4)}" fill="none" stroke="#eef1e7" stroke-width="1.2" opacity=".7"/>
  <polygon points="${starPoints(cx, cy, 24, 5.5, 4)}" fill="#eef1e7"/>
  <circle cx="${cx}" cy="${cy}" r="4.6" fill="${SAGE}"/>
  ${small.map(([x, y, s]) => `<polygon points="${starPoints(x, y, s, s * 0.34, 4)}" fill="${BONE}"/><circle cx="${x}" cy="${y}" r="${r2(s * 0.2)}" fill="${SILVER}"/>`).join('')}
  ${tree(50, 368, 172, 38)}${tree(250, 350, 186, 40)}
  <path d="M30,362 C74,348 108,306 164,296 C202,290 238,302 270,322 L270,420 L30,420Z" fill="#171f1a"/>
  <path d="M30,362 C74,348 108,306 164,296 C202,290 238,302 270,322" fill="none" stroke="${SILVER}" stroke-width="2.4"/>
  <g fill="none" stroke="${SILVER}" stroke-width="1.3" opacity=".34"><path d="M30,378 C82,366 118,326 168,314 C206,306 240,318 270,338"/><path d="M30,396 C90,384 126,348 172,334 C210,324 244,336 270,354"/><path d="M52,416 C100,400 136,370 176,356 C214,344 246,354 270,372"/></g>
  ${tree(76, 372, 128, 30)}${tree(226, 340, 132, 30)}
  <g stroke="${SILVER}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M141,296 V274 H191 V297" fill="#2c342f"/>
    <path d="M136,274 L166,254 L196,274Z" fill="#363e39"/>
  </g>
  <path d="M149,277 V295 M158,277 V295 M174,277 V296 M183,277 V296" stroke="${SILVER}" stroke-width="2"/>
  <path d="M162,296 V284 A4,4.4 0 0 1 170,284 V296Z" fill="${PALE}"/>
  <path d="M150,424 C150,398 104,392 108,366 C111,346 168,344 167,322 C166.5,312 166,304 166,298" fill="none" stroke="${PALE}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="7.5 6.5"/>
  <circle cx="108.5" cy="368" r="4" fill="${BONE}"/><circle cx="164" cy="333" r="3.4" fill="${BONE}"/>
  <g transform="translate(166 250)"><path d="M0,0 C-9,-11 -11,-17 -11,-22 A11,11 0 1 1 11,-22 C11,-17 9,-11 0,0Z" fill="${SAGE}" stroke="${INK}" stroke-width="1.2"/><circle cx="0" cy="-22" r="4.2" fill="${BONE}"/></g>
  ${bank(61, 404, 12, '#646c67', 0.55)}`
}

const temperance = () => {
  const plume = (x: number, y: number, angle: number, long: number, wide: number, fill: string) => {
    const [mx, my] = xy(x, y, long / 2, angle)
    return `<ellipse cx="${mx}" cy="${my}" rx="${wide}" ry="${r2(long / 2)}" transform="rotate(${angle} ${mx} ${my})" fill="${fill}"/>`
  }
  const wing = (side: 1 | -1) => {
    const x = 150 + side * 16
    const flight = times(7, (i) => plume(x, 252, side * (83 - i * 11.5), 114 + i * 9, 9.5, i % 2 ? '#40584a' : '#4d6354')).join('')
    const cover = times(6, (i) => plume(x, 252, side * (82 - i * 12.4), 79 + i * 5, 10, i % 2 ? '#637c6a' : '#778e7b')).join('')
    const down = times(5, (i) => plume(x, 252, side * (78 - i * 13), 48 + i * 3, 10, i % 2 ? '#94a592' : '#adbba6')).join('')
    return `<g stroke="${SILVER}" stroke-width="1.8">${flight}${cover}${down}</g>`
  }
  const cup = (x: number, y: number, turn: number) => `<g transform="translate(${x} ${y}) rotate(${turn}) scale(1.18)">
    <path d="M-11,-13 L11,-13 C11,3 5,9 0,9 C-5,9 -11,3 -11,-13Z" fill="${SILVER}" stroke="${INK}" stroke-width="1.3"/>
    <ellipse cx="0" cy="-13" rx="11" ry="3.2" fill="#19211c" stroke="${SILVER}" stroke-width="1.6"/>
    <path d="M-2,9 H2 V17 H-2Z M-9,21 L-4.5,17 H4.5 L9,21Z" fill="${SILVER}" stroke="${INK}" stroke-width="1"/>
  </g>`
  return `
  <rect x="30" y="66" width="240" height="350" fill="url(#sky-temperance)"/>
  ${sky(71, 16, (x, y) => y > 200 || Math.abs(x - 150) < 60)}
  ${rays(150, 338, 40, 250, 196, 1.4, 0.2)}
  <circle cx="150" cy="338" r="40" fill="${SILVER}"/>
  <path d="M30,340 L30,312 L66,282 L98,318 L118,304 L138,340Z M162,340 L186,300 L208,322 L238,286 L270,316 L270,340Z" fill="#161e19"/>
  <rect x="30" y="338" width="240" height="90" fill="#111914"/>
  <path d="M30,338 H150 C144,356 128,372 126,392 C125,404 128,414 130,424 L30,424Z" fill="#2f3732"/>
  <g fill="none" stroke="${VERDIGRIS}" stroke-width="2" stroke-linecap="round" opacity=".8"><path d="M40,354 q8,-5 16,0 t16,0 t16,0 t16,0"/><path d="M36,372 q8,-5 16,0 t16,0 t16,0"/><path d="M44,390 q8,-5 16,0 t16,0 t16,0 t16,0"/><path d="M36,408 q8,-5 16,0 t16,0 t16,0"/></g>
  <path d="M30,338 H270" stroke="${SILVER}" stroke-width="2"/>
  ${wing(-1)}${wing(1)}
  <circle cx="150" cy="170" r="29" fill="none" stroke="${SILVER}" stroke-width="3.4"/>
  <circle cx="150" cy="170" r="23" fill="${PALE}" opacity=".16"/>
  <path d="M127,206 C134,196 166,196 173,206 L180,236 C190,290 198,340 204,386 L96,386 C102,340 110,290 120,236Z" fill="${BONE}" stroke="${SILVER}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M138,246 C136,300 132,346 126,384 M162,246 C164,300 168,346 174,384 M150,262 V384" fill="none" stroke="#9ba39e" stroke-width="2" stroke-linecap="round"/>
  <rect x="139" y="214" width="22" height="22" fill="none" stroke="#6b736e" stroke-width="2.2"/>
  <path d="M150,217 L158.5,233 H141.5Z" fill="${SAGE}"/>
  <circle cx="150" cy="176" r="15.5" fill="#c9d0c5" stroke="${INK}" stroke-width="1.2"/>
  <path d="M134.6,174 C134,162 142,157 150,157 C158,157 166,162 165.4,174 C160,166 140,166 134.6,174Z" fill="${SILVER}" stroke="${INK}" stroke-width="1"/>
  <path d="M142.5,178.5 q2.6,2.4 5.2,0 M152.3,178.5 q2.6,2.4 5.2,0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M129,210 C116,216 104,230 100,246 L112,252 C118,240 126,232 136,228Z M171,210 C186,222 196,250 198,276 L186,280 C182,262 174,244 164,232Z" fill="${BONE}" stroke="${SILVER}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M116,250 C132,250 150,268 166,278 C176,284 184,286 190,288" fill="none" stroke="${VERDIGRIS}" stroke-width="7" stroke-linecap="round"/>
  <path d="M116,248 C132,248 150,266 166,276 C176,282 184,284 190,286" fill="none" stroke="#d9e1d8" stroke-width="2" stroke-linecap="round" stroke-dasharray="9 6"/>
  ${cup(100, 243, 112)}${cup(195, 300, 0)}
  <g fill="#4b534e" stroke="#8f9792" stroke-width="1.4" stroke-linejoin="round"><path d="M226,424 Q220,384 232,360 Q236,390 234,424Z"/><path d="M240,424 Q246,376 256,364 Q254,396 250,424Z"/><path d="M214,424 Q206,398 210,378 Q220,400 222,424Z"/></g>
  <path d="M232,360 q-7,-7 -2,-15 q7,5 2,15Z M256,364 q-2,-10 6,-14 q3,9 -6,14Z" fill="#6b736e" stroke="${INK}" stroke-width="1"/>
  ${bank(77, 408, 10, '#646c67', 0.45)}`
}

const cards: Record<ArcanaId, { numeral: string; title: string; label: string; size: number; art: () => string }> = {
  fool: { numeral: '0', title: 'The Fool', label: 'The Fool', size: 17.5, art: fool },
  wheel: { numeral: 'X', title: 'Wheel of Fortune', label: 'Wheel <tspan class="a-of">of</tspan> Fortune', size: 16, art: wheel },
  hermit: { numeral: 'IX', title: 'The Hermit', label: 'The Hermit', size: 17.5, art: hermit },
  star: { numeral: 'XVII', title: 'The Star', label: 'The Star', size: 17.5, art: star },
  temperance: { numeral: 'XIV', title: 'Temperance', label: 'Temperance', size: 17.5, art: temperance },
}
export const arcana = (id: ArcanaId) => ({ numeral: cards[id].numeral, title: cards[id].title })
export const isArcana = (id: string): id is ArcanaId => id in cards

const corner = (x: number, y: number, turn: number) =>
  `<g transform="translate(${x} ${y}) rotate(${turn})" fill="none" stroke="${SILVER}" stroke-linecap="round"><path d="M0,22 A22,22 0 0 1 22,0" stroke-width="1.8"/><path d="M5,5 L13,13 M2.5,12 L9,16.5 M12,2.5 L16.5,9" stroke-width="1.6"/><circle cx="4" cy="4" r="2.4" fill="${SILVER}" stroke="none"/></g>`

const border = `
  <rect x="8.5" y="8.5" width="283" height="503" rx="11" fill="none" stroke="${SILVER}" stroke-width="3.2"/>
  <rect x="15.5" y="15.5" width="269" height="489" rx="6.5" fill="none" stroke="${SILVER}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.01 6.6"/>
  <path d="M36,22.5 H264 A13.5,13.5 0 0 0 277.5,36 V484 A13.5,13.5 0 0 0 264,497.5 H36 A13.5,13.5 0 0 0 22.5,484 V36 A13.5,13.5 0 0 0 36,22.5Z" fill="none" stroke="${SILVER}" stroke-width="1.9"/>`

const seal = `<g transform="translate(247 397) rotate(-14) scale(.9)">
  <path d="M-7,10 L-15,44 L-6,38 L0,47 L5,14Z M6,12 L20,42 L22,31 L32,34 L16,8Z" fill="#334c3d"/>
  <polygon points="${starPoints(0, 0, 27, 24, 14)}" fill="url(#wax)" stroke="#273b30" stroke-width="1.4" stroke-linejoin="round"/>
  <circle r="18" fill="none" stroke="#334c3d" stroke-width="2.2"/>
  <path d="M-12,0 Q0,-10 12,0 Q0,10 -12,0Z" fill="none" stroke="#334c3d" stroke-width="2.2" stroke-linejoin="round"/>
  <circle r="3.6" fill="#334c3d"/>
</g>`

// A card face. `caption` is the line under the title: the project's name, or the owner's.
export const face = (id: ArcanaId, caption: string, options: { sealed?: boolean } = {}) => {
  const card = cards[id]
  // The display face draws a lone zero with a stroke through it, so the Fool's nought is set as a letter.
  const numeral = card.numeral === '0' ? 'O' : card.numeral
  const half = [...numeral].reduce((w, c) => w + (c === 'I' ? 9.5 : 18.5), 0) / 2
  const side = (dir: 1 | -1) => {
    const x = 150 + dir * (half + 13)
    return `<path d="M${x},41 l5,5 l-5,5 l-5,-5Z"/><path d="M${x + dir * 11},46 H${x + dir * 50}" stroke="${SILVER}" stroke-width="1.8" stroke-linecap="round"/><circle cx="${x + dir * 56}" cy="46" r="2.2"/>`
  }
  const reach = caption.length * 3.95 + 9
  return `<svg class="arcana" viewBox="0 0 300 520" aria-hidden="true" focusable="false">
  <rect width="300" height="520" rx="17" fill="url(#stock)"/>
  ${border}
  <g fill="${SILVER}">${side(-1)}${side(1)}</g>
  <text class="a-num" x="150" y="54.5" text-anchor="middle" fill="${SILVER}">${numeral}</text>
  <g clip-path="url(#win)">${card.art()}</g>
  <path d="${WINDOW}" fill="none" stroke="${SILVER}" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M29,417 V150 A121,83 0 0 1 271,150 V417Z" fill="none" stroke="${SILVER}" stroke-width="1.3" opacity=".7"/>
  ${sparkle(46, 88, 7, SILVER)}${sparkle(254, 88, 7, SILVER)}
  <g fill="${SILVER}"><circle cx="38" cy="104" r="1.7"/><circle cx="62" cy="76" r="1.7"/><circle cx="262" cy="104" r="1.7"/><circle cx="238" cy="76" r="1.7"/></g>
  <path d="M35,430 H265 L257,445 L265,460 H35 L43,445Z" fill="#1d2520" stroke="${SILVER}" stroke-width="1.9" stroke-linejoin="round"/>
  <text class="a-title" x="150" y="${r2(445 + card.size * 0.36)}" style="font-size:${card.size}px" text-anchor="middle" fill="${BONE}">${card.label}</text>
  <text class="a-sub" x="150" y="481.5" text-anchor="middle" fill="${PALE}">${caption}</text>
  <path d="M${r2(150 - reach)},476.5 h-17 M${r2(150 + reach)},476.5 h17" stroke="${SILVER}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
  ${options.sealed ? seal : ''}
</svg>`
}

// The back every card shares: an eye with a silver moon for an iris and no pupil, inside a ring of twenty-two seats.
// It reads the same either way up.
export const back = () => {
  const half = `
    ${sparkle(150, 82, 8, SILVER)}
    <circle cx="150" cy="99" r="1.9" fill="${SILVER}"/>
    ${crescent(150, 118, 15)}
    <g fill="none" stroke="${SILVER}" stroke-linecap="round">
      <path d="M120,130 C110,113 87,117 89,131 C90,140 101,140 102,133 M180,130 C190,113 213,117 211,131 C210,140 199,140 198,133" stroke-width="2.6"/>
      <path d="M82,146 C66,158 54,180 52,206 M218,146 C234,158 246,180 248,206" stroke-width="2.2"/>
      <path d="M62,128 C54,134 48,144 46,156 M238,128 C246,134 252,144 254,156" stroke-width="1.8" opacity=".8"/>
    </g>
    <g fill="${SILVER}"><path d="M52,212 l4,6 l-4,6 l-4,-6Z M248,212 l4,6 l-4,6 l-4,-6Z"/><circle cx="46" cy="162" r="2"/><circle cx="254" cy="162" r="2"/></g>`
  const lashes = times(9, (i) => `<path d="M${at(150, 260, 39, -48 + i * 12)} L${at(150, 260, i % 2 ? 49 : 55, -48 + i * 12)}"/>`).join('')
  return `<svg class="arcana" viewBox="0 0 300 520" aria-hidden="true" focusable="false">
  <rect width="300" height="520" rx="17" fill="url(#stock)"/>
  <rect x="24" y="24" width="252" height="472" rx="4" fill="url(#lattice)"/>
  ${border}
  ${corner(30, 30, 0)}${corner(270, 30, 90)}${corner(270, 490, 180)}${corner(30, 490, 270)}
  <g>${half}</g><g transform="rotate(180 150 260)">${half}</g>
  <g stroke="${SILVER}" stroke-width="2" stroke-linecap="round">${times(48, (i) => `<path d="M${at(150, 260, 103.5, i * 7.5)} L${at(150, 260, i % 2 ? 108 : 111.5, i * 7.5)}"/>`).join('')}</g>
  <circle cx="150" cy="260" r="98" fill="#101813"/>
  <circle cx="150" cy="260" r="98" fill="none" stroke="${SILVER}" stroke-width="3.2"/>
  <circle cx="150" cy="260" r="76" fill="none" stroke="${SILVER}" stroke-width="1.6"/>
  <g fill="${SILVER}">${times(22, (i) => `<path transform="translate(${at(150, 260, 87, (i * 360) / 22).replace(',', ' ')}) rotate(${r2((i * 360) / 22)})" d="M0,-5.4 L3.6,0 L0,5.4 L-3.6,0Z"/>`).join('')}</g>
  <g stroke="${SILVER}" stroke-width="2.4" stroke-linecap="round">${lashes}<g transform="rotate(180 150 260)">${lashes}</g></g>
  <path d="M86,260 Q150,206 214,260 Q150,314 86,260Z" fill="#111715" stroke="${SILVER}" stroke-width="3.6" stroke-linejoin="round"/>
  <circle cx="150" cy="260" r="23" fill="url(#moon)"/>
  <circle cx="150" cy="260" r="23" fill="none" stroke="${SILVER}" stroke-width="1.8"/>
</svg>`
}

// The emblem by itself, for the wordmark and small marks.
export const sigil = () => `<svg class="sigil" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <circle cx="24" cy="24" r="21.5" fill="none" stroke="currentColor" stroke-width="2.4"/>
  <path d="M6,24 Q24,8 42,24 Q24,40 6,24Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
  <circle cx="24" cy="24" r="6.4" fill="${SAGE}"/>
</svg>`

export const defs = () => `
  <linearGradient id="silver" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="290" y2="520"><stop offset="0" stop-color="#e4e8de"/><stop offset=".2" stop-color="#b8c4b7"/><stop offset=".43" stop-color="#718579"/><stop offset=".6" stop-color="#d6ddd2"/><stop offset=".8" stop-color="#8b9c8e"/><stop offset="1" stop-color="#c3cfc2"/></linearGradient>
  <linearGradient id="stock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#19211c"/><stop offset="1" stop-color="#0d1510"/></linearGradient>
  <linearGradient id="sky-fool" gradientUnits="userSpaceOnUse" x1="0" y1="66" x2="0" y2="416"><stop offset="0" stop-color="#0f1712"/><stop offset=".55" stop-color="#171f1a"/><stop offset="1" stop-color="#212924"/></linearGradient>
  <linearGradient id="sky-wheel" gradientUnits="userSpaceOnUse" x1="0" y1="66" x2="0" y2="416"><stop offset="0" stop-color="#131b16"/><stop offset=".6" stop-color="#1b231e"/><stop offset="1" stop-color="#212924"/></linearGradient>
  <linearGradient id="sky-hermit" gradientUnits="userSpaceOnUse" x1="0" y1="66" x2="0" y2="416"><stop offset="0" stop-color="#0e1611"/><stop offset=".6" stop-color="#1c241f"/><stop offset=".8" stop-color="#2a322d"/><stop offset="1" stop-color="#161e19"/></linearGradient>
  <linearGradient id="sky-star" gradientUnits="userSpaceOnUse" x1="0" y1="66" x2="0" y2="416"><stop offset="0" stop-color="#131b16"/><stop offset=".5" stop-color="#212924"/><stop offset=".78" stop-color="#333b36"/><stop offset="1" stop-color="#1b231e"/></linearGradient>
  <linearGradient id="sky-temperance" gradientUnits="userSpaceOnUse" x1="0" y1="66" x2="0" y2="416"><stop offset="0" stop-color="#121a15"/><stop offset=".42" stop-color="#1f2722"/><stop offset=".7" stop-color="#4c6356"/><stop offset=".8" stop-color="#899c87"/><stop offset="1" stop-color="#111914"/></linearGradient>
  <linearGradient id="coat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b231e"/><stop offset=".5" stop-color="#111715"/><stop offset="1" stop-color="#131b16"/></linearGradient>
  <linearGradient id="cloak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#777f7a"/><stop offset="1" stop-color="#313934"/></linearGradient>
  <radialGradient id="moon" cx=".36" cy=".32" r=".85"><stop offset="0" stop-color="#d5ded1"/><stop offset=".5" stop-color="#9eaea0"/><stop offset="1" stop-color="#576c60"/></radialGradient>
  <radialGradient id="wax" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#8a9c8d"/><stop offset="1" stop-color="#4d6355"/></radialGradient>
  <radialGradient id="halo-mist"><stop offset="0" stop-color="#9baea0" stop-opacity=".62"/><stop offset=".55" stop-color="#9baea0" stop-opacity=".22"/><stop offset="1" stop-color="#9baea0" stop-opacity="0"/></radialGradient>
  <radialGradient id="halo-silver"><stop offset="0" stop-color="#e4e8de" stop-opacity=".62"/><stop offset=".5" stop-color="#e4e8de" stop-opacity=".2"/><stop offset="1" stop-color="#e4e8de" stop-opacity="0"/></radialGradient>
  <pattern id="lattice" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(45 150 260)"><path d="M0,0 H15 M0,0 V15" stroke="#9bafa0" stroke-width="1.1" opacity=".2"/><circle cx="7.5" cy="7.5" r="1.5" fill="#9bafa0" opacity=".3"/></pattern>
  <clipPath id="win"><path d="${WINDOW}"/></clipPath>`
