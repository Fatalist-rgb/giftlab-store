import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';

/**
 * Placeholder character artwork for the catalog (ORIGINAL drawings — reference-site
 * imagery is copyrighted and never copied). Same canvas geometry as the flagship
 * (304×424, face zone at 92,40 120×132), so every product shares the face mechanics.
 * Run: pnpm --filter render-worker art:gen  (writes into apps/storefront/public/art)
 */
const OUT = resolve(process.env.GL_ASSET_ROOT ?? '../storefront/public', 'art');

const W = 304;
const H = 424;

function base() {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  return { c, x };
}
function save(name: string, c: ReturnType<typeof createCanvas>) {
  writeFileSync(join(OUT, name), c.toBuffer('image/png'));
  console.log('  art/' + name);
}
function roundedBody(x: SKRSContext2D, color: string, legColor: string) {
  x.fillStyle = color;
  x.beginPath();
  x.ellipse(152, 258, 100, 122, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = legColor;
  x.fillRect(120, 360, 26, 60);
  x.fillRect(158, 360, 26, 60);
}
function faceRing(x: SKRSContext2D) {
  // subtle guide where the face lands (kept from the flagship placeholders)
  x.strokeStyle = 'rgba(0,0,0,0.12)';
  x.lineWidth = 3;
  x.beginPath();
  x.ellipse(152, 106, 62, 68, 0, 0, Math.PI * 2);
  x.stroke();
}

// — superhero: body + cape + chest star —
function hero(cape: string, suit: string, star: string, name: string) {
  const { c, x } = base();
  x.fillStyle = cape;
  x.beginPath();
  x.moveTo(60, 180);
  x.quadraticCurveTo(40, 330, 90, 400);
  x.lineTo(214, 400);
  x.quadraticCurveTo(264, 330, 244, 180);
  x.closePath();
  x.fill();
  roundedBody(x, suit, suit);
  x.fillStyle = star;
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 34 : 14;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    x[i === 0 ? 'moveTo' : 'lineTo'](152 + r * Math.cos(a), 262 + r * Math.sin(a));
  }
  x.closePath();
  x.fill();
  faceRing(x);
  save(name, c);
}

// — pet: distinct head shapes per animal, face photo lands on the head —
function pet(kind: 'dog' | 'cat' | 'rabbit', body: string, inner: string, name: string) {
  const { c, x } = base();
  x.fillStyle = body;
  if (kind === 'dog') {
    x.beginPath(); x.ellipse(96, 96, 26, 54, -0.5, 0, Math.PI * 2); x.fill(); // floppy ears
    x.beginPath(); x.ellipse(208, 96, 26, 54, 0.5, 0, Math.PI * 2); x.fill();
  } else if (kind === 'cat') {
    x.beginPath(); x.moveTo(84, 96); x.lineTo(112, 24); x.lineTo(136, 84); x.closePath(); x.fill(); // pointy ears
    x.beginPath(); x.moveTo(220, 96); x.lineTo(192, 24); x.lineTo(168, 84); x.closePath(); x.fill();
  } else {
    x.beginPath(); x.ellipse(116, 44, 20, 58, -0.12, 0, Math.PI * 2); x.fill(); // long ears
    x.beginPath(); x.ellipse(188, 44, 20, 58, 0.12, 0, Math.PI * 2); x.fill();
  }
  roundedBody(x, body, body);
  x.fillStyle = inner;
  x.beginPath();
  x.ellipse(152, 282, 58, 74, 0, 0, Math.PI * 2); // belly patch
  x.fill();
  faceRing(x);
  save(name, c);
}

// — christmas outfits —
function xmas(kind: 'santa' | 'elf' | 'reindeer', name: string) {
  const { c, x } = base();
  if (kind === 'santa') {
    roundedBody(x, '#c62828', '#8e1f1f');
    x.fillStyle = '#17131a'; x.fillRect(70, 268, 164, 22); // belt
    x.fillStyle = '#f5c518'; x.fillRect(138, 264, 28, 30);
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(152, 172, 96, 20, 0, 0, Math.PI * 2); x.fill(); // trim
  } else if (kind === 'elf') {
    roundedBody(x, '#2e7d32', '#1b5e20');
    x.fillStyle = '#c62828';
    for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(92 + i * 40, 356, 10, 0, Math.PI * 2); x.fill(); } // hem dots
  } else {
    roundedBody(x, '#8d6e63', '#6d4c41');
    x.strokeStyle = '#5d4037'; x.lineWidth = 10; x.lineCap = 'round';
    x.beginPath(); x.moveTo(104, 64); x.lineTo(84, 16); x.moveTo(104, 44); x.lineTo(64, 36); x.stroke(); // antlers
    x.beginPath(); x.moveTo(200, 64); x.lineTo(220, 16); x.moveTo(200, 44); x.lineTo(240, 36); x.stroke();
    x.fillStyle = '#c62828'; x.beginPath(); x.arc(152, 236, 16, 0, Math.PI * 2); x.fill(); // nose
  }
  faceRing(x);
  save(name, c);
}

mkdirSync(OUT, { recursive: true });
hero('#c62828', '#1e5bb8', '#f5c518', 'hero-red.png');
hero('#17131a', '#c62828', '#f5c518', 'hero-black.png');
hero('#f5c518', '#2e7d32', '#ffffff', 'hero-gold.png');
pet('dog', '#8d6e63', '#d7ccc8', 'pet-dog.png');
pet('cat', '#78909c', '#eceff1', 'pet-cat.png');
pet('rabbit', '#bcaaa4', '#efebe9', 'pet-rabbit.png');
xmas('santa', 'xmas-santa.png');
xmas('elf', 'xmas-elf.png');
xmas('reindeer', 'xmas-reindeer.png');
console.log('placeholder art generated');
