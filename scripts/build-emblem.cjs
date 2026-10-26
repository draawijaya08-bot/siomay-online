const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Math for Top Arch (SIOMAY ONLINE) - well spaced
function renderTopArchMath(text, cx, cy, radius, spanDeg, fontSize, fill, fontWeight = '900') {
  const chars = text.split('');
  const span = spanDeg * Math.PI / 180;
  return chars.map((c, i) => {
    if (c === ' ') return '';
    const t = -span + (i / (chars.length - 1)) * 2 * span;
    const x = cx + radius * Math.sin(t);
    const y = cy - radius * Math.cos(t);
    const deg = t * 180 / Math.PI;
    return `<text transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" font-family="'Plus Jakarta Sans', 'Outfit', 'Arial Black', sans-serif">${c}</text>`;
  }).join('\n    ');
}

// 2. Math for Bottom Arch (★ RESEP ASLI • SEGAR GURIH ★)
function renderBottomArchMath(text, cx, cy, radius, spanDeg, fontSize, fill, fontWeight = '800') {
  const chars = text.split('');
  const span = spanDeg * Math.PI / 180;
  return chars.map((c, i) => {
    if (c === ' ') return '';
    const t = -span + (i / (chars.length - 1)) * 2 * span;
    const x = cx + radius * Math.sin(t);
    const y = cy + radius * Math.cos(t);
    const deg = -t * 180 / Math.PI;
    return `<text transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" font-family="'Plus Jakarta Sans', Arial, sans-serif">${c}</text>`;
  }).join('\n    ');
}

const topTextSvg = renderTopArchMath('SIOMAY ONLINE', 300, 300, 218, 54, 34, '#FFFDF8', '900');
const bottomTextSvg = renderBottomArchMath('★ RESEP ASLI • SEGAR GURIH ★', 300, 300, 218, 48, 20.5, '#FBBF24', '800');

const emblemSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <!-- Drop shadow for badge -->
    <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#1A0B06" flood-opacity="0.32"/>
    </filter>

    <!-- Outer ring gradient: deep authentic roast espresso -->
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D150D"/>
      <stop offset="50%" stop-color="#220F07"/>
      <stop offset="100%" stop-color="#160803"/>
    </linearGradient>

    <!-- Inner medallion gradient: rich culinary terracotta -->
    <linearGradient id="medallionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EA580C"/>
      <stop offset="45%" stop-color="#DE4A1D"/>
      <stop offset="100%" stop-color="#B93810"/>
    </linearGradient>

    <!-- Bamboo wood gradient -->
    <linearGradient id="bambooGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E29E57"/>
      <stop offset="25%" stop-color="#F3C68E"/>
      <stop offset="70%" stop-color="#E29E57"/>
      <stop offset="100%" stop-color="#B8732E"/>
    </linearGradient>

    <!-- Gold accent gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>

    <!-- Peanut sauce glaze gradient -->
    <linearGradient id="sauceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>

  <!-- ======================================================================
       1. VINTAGE CULINARY SEAL FRAME
       ====================================================================== -->
  <!-- Outer Double Ring -->
  <circle cx="300" cy="300" r="286" fill="#FFFDF8" stroke="#2D150D" stroke-width="4.5" filter="url(#badgeShadow)"/>
  <circle cx="300" cy="300" r="278" fill="none" stroke="#D97706" stroke-width="2.5"/>

  <!-- Dark Roast Ring with Golden Borders -->
  <circle cx="300" cy="300" r="270" fill="url(#ringGrad)" stroke="url(#goldGrad)" stroke-width="5"/>
  <circle cx="300" cy="300" r="262" fill="none" stroke="#FFFDF8" stroke-width="1.8" stroke-dasharray="4,4"/>

  <!-- ======================================================================
       2. TOP & BOTTOM ARCHED TYPOGRAPHY
       ====================================================================== -->
  <!-- Top Arch Text: SIOMAY ONLINE -->
  <g id="topArchedText">
    ${topTextSvg}
  </g>

  <!-- Left & Right Gold Star Clusters -->
  <g fill="url(#goldGrad)" stroke="#1A0B06" stroke-width="0.8">
    <!-- Left Star Group -->
    <polygon points="74,300 77,306 84,307 79,312 80,319 74,315 68,319 69,312 64,307 71,306"/>
    <circle cx="90" cy="274" r="3.5"/>
    <circle cx="90" cy="326" r="3.5"/>

    <!-- Right Star Group -->
    <polygon points="526,300 529,306 536,307 531,312 532,319 526,315 520,319 521,312 516,307 523,306"/>
    <circle cx="510" cy="274" r="3.5"/>
    <circle cx="510" cy="326" r="3.5"/>
  </g>

  <!-- Bottom Arch Text: RESEP ASLI • SEGAR GURIH -->
  <g id="bottomArchedText">
    ${bottomTextSvg}
  </g>

  <!-- ======================================================================
       3. INNER TERRACOTTA MEDALLION
       ====================================================================== -->
  <circle cx="300" cy="300" r="166" fill="url(#goldGrad)" stroke="#1A0B06" stroke-width="3"/>
  <circle cx="300" cy="300" r="160" fill="#FFFDF8" stroke="#2D150D" stroke-width="2.5"/>
  <circle cx="300" cy="300" r="152" fill="url(#medallionGrad)" stroke="#FFE8D6" stroke-width="2.5"/>

  <!-- Subtle Sunburst Ray Flares -->
  <g stroke="#FB923C" stroke-width="1.4" opacity="0.32">
    <line x1="300" y1="152" x2="300" y2="448"/>
    <line x1="152" y1="300" x2="448" y2="300"/>
    <line x1="195" y1="195" x2="405" y2="405"/>
    <line x1="195" y1="405" x2="405" y2="195"/>
    <line x1="162" y1="242" x2="438" y2="358"/>
    <line x1="162" y1="358" x2="438" y2="242"/>
    <line x1="242" y1="162" x2="358" y2="438"/>
    <line x1="358" y1="162" x2="242" y2="438"/>
  </g>

  <!-- ======================================================================
       4. CENTER CULINARY ILLUSTRATION: BAMBOO STEAMER & STEAMING SIOMAY
       ====================================================================== -->
  <g id="centerIllustration" transform="translate(0, -2)">
    <!-- Base Shadow -->
    <ellipse cx="300" cy="390" rx="112" ry="24" fill="#5A1A05" opacity="0.6"/>

    <!-- Bamboo Steamer Body (Klakat) -->
    <path d="M 190,338 C 190,366 239,388 300,388 C 361,388 410,366 410,338 L 410,310 C 410,336 361,354 300,354 C 239,354 190,336 190,310 Z" 
          fill="url(#bambooGrad)" stroke="#3D1D05" stroke-width="3.5" stroke-linejoin="round"/>

    <!-- Steamer Bamboo Slat Ribs -->
    <path d="M 191,334 C 218,354 258,364 300,364 C 342,364 382,354 409,334" fill="none" stroke="#9C5B23" stroke-width="2.2"/>
    <path d="M 193,356 C 222,374 260,382 300,382 C 340,382 378,374 407,356" fill="none" stroke="#7A3F10" stroke-width="2.5"/>

    <!-- Bamboo Joints / Vertical Slats -->
    <rect x="296" y="318" width="8" height="46" rx="3" fill="#6E3B0F" stroke="#2D150D" stroke-width="1.5"/>
    <rect x="236" y="324" width="6" height="38" rx="2.5" fill="#6E3B0F" stroke="#2D150D" stroke-width="1.2"/>
    <rect x="358" y="324" width="6" height="38" rx="2.5" fill="#6E3B0F" stroke="#2D150D" stroke-width="1.2"/>

    <!-- Steamer Interior Rim -->
    <ellipse cx="300" cy="310" rx="110" ry="28" fill="#422006" stroke="#2D150D" stroke-width="3.5"/>
    
    <!-- Fresh Steamer Liner Leaf (Daun Pisang Segar) -->
    <path d="M 212,306 C 238,298 268,295 300,295 C 332,295 362,298 388,306 C 381,320 341,328 300,328 C 259,328 219,320 212,306 Z" 
          fill="#4D7C0F" stroke="#274004" stroke-width="2"/>

    <!-- 3 ARTISAN SIOMAY PIECES -->
    <!-- Left Siomay -->
    <g transform="translate(240, 290)">
      <ellipse cx="0" cy="20" rx="26" ry="10" fill="#1C0C04" opacity="0.45"/>
      <path d="M -24,13 C -26,4 -22,-11 -13,-18 C -7,-21 7,-21 13,-18 C 22,-11 26,4 24,13 C 20,22 -20,22 -24,13 Z" 
            fill="#FFF6E8" stroke="#4A2508" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- Skin Pleats -->
      <path d="M -15,-15 C -13,-4 -16,9 -15,16 M -4,-20 C -2,-7 -4,7 -3,18 M 7,-19 C 9,-7 7,7 9,17 M 16,-14 C 14,-4 15,9 16,15" 
            fill="none" stroke="#D8B182" stroke-width="2" stroke-linecap="round"/>
      <!-- Peanut sauce drip -->
      <path d="M -10,-8 C -8,-2 -6,4 -5,8 C -4,11 -1,11 -1,7 C -1,3 2,3 3,6" fill="none" stroke="url(#sauceGrad)" stroke-width="3.2" stroke-linecap="round"/>
      <!-- Meat filling top -->
      <ellipse cx="0" cy="-15" rx="14" ry="7" fill="#C26A32" stroke="#4A2508" stroke-width="2.2"/>
      <circle cx="-1" cy="-16" r="3.8" fill="#EF4444"/>
      <circle cx="3" cy="-14" r="2.8" fill="#F97316"/>
    </g>

    <!-- Right Siomay -->
    <g transform="translate(360, 290)">
      <ellipse cx="0" cy="20" rx="26" ry="10" fill="#1C0C04" opacity="0.45"/>
      <path d="M -24,13 C -26,4 -22,-11 -13,-18 C -7,-21 7,-21 13,-18 C 22,-11 26,4 24,13 C 20,22 -20,22 -24,13 Z" 
            fill="#FFF6E8" stroke="#4A2508" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- Skin Pleats -->
      <path d="M -15,-15 C -13,-4 -16,9 -15,16 M -4,-20 C -2,-7 -4,7 -3,18 M 7,-19 C 9,-7 7,7 9,17 M 16,-14 C 14,-4 15,9 16,15" 
            fill="none" stroke="#D8B182" stroke-width="2" stroke-linecap="round"/>
      <!-- Peanut sauce drip -->
      <path d="M 6,-8 C 4,-2 2,4 1,8 C 0,11 -3,11 -3,7" fill="none" stroke="url(#sauceGrad)" stroke-width="3.2" stroke-linecap="round"/>
      <!-- Meat filling top -->
      <ellipse cx="0" cy="-15" rx="14" ry="7" fill="#C26A32" stroke="#4A2508" stroke-width="2.2"/>
      <circle cx="0" cy="-16" r="3.8" fill="#EF4444"/>
      <circle cx="-3" cy="-14" r="2.8" fill="#F97316"/>
    </g>

    <!-- Center Hero Siomay (Larger, in front) -->
    <g transform="translate(300, 304)">
      <ellipse cx="0" cy="24" rx="30" ry="11" fill="#1C0C04" opacity="0.55"/>
      <path d="M -28,15 C -31,4 -26,-13 -15,-22 C -8,-26 8,-26 15,-22 C 26,-13 31,4 28,15 C 23,26 -23,26 -28,15 Z" 
            fill="#FFFDF7" stroke="#3D1D05" stroke-width="3.4" stroke-linejoin="round"/>
      <!-- Pleats -->
      <path d="M -18,-19 C -15,-4 -18,10 -17,20 M -6,-24 C -4,-9 -6,8 -5,23 M 8,-23 C 10,-9 8,8 10,22 M 19,-18 C 17,-4 18,10 19,19" 
            fill="none" stroke="#DDB88C" stroke-width="2.2" stroke-linecap="round"/>
      <!-- Peanut sauce drape on hero siomay -->
      <path d="M -12,-10 C -9,0 -6,10 -4,15 C -3,18 2,18 4,14 C 5,10 8,12 10,16" fill="none" stroke="url(#sauceGrad)" stroke-width="4.2" stroke-linecap="round"/>
      <!-- Filling top -->
      <ellipse cx="0" cy="-18" rx="17" ry="8" fill="#B45722" stroke="#3D1D05" stroke-width="2.6"/>
      <circle cx="0" cy="-19" r="4.8" fill="#DC2626"/>
      <circle cx="-4" cy="-17" r="3.2" fill="#EA580C"/>
      <circle cx="4" cy="-17" r="3" fill="#FBBF24"/>
    </g>

    <!-- Fresh Lime Slice (Jeruk Limau Khas) -->
    <g transform="translate(202, 314) rotate(-18)">
      <circle cx="0" cy="0" r="14" fill="#10B981" stroke="#064E3B" stroke-width="2.2"/>
      <circle cx="0" cy="0" r="11" fill="#A7F3D0"/>
      <path d="M 0,0 L 0,-10 M 0,0 L 9,-5 M 0,0 L 9,5 M 0,0 L 0,10 M 0,0 L -9,5 M 0,0 L -9,-5" stroke="#059669" stroke-width="1.6"/>
      <circle cx="0" cy="0" r="2.8" fill="#FFF"/>
    </g>

    <!-- Fresh Red Chili Garnish -->
    <g transform="translate(396, 312) rotate(16)">
      <path d="M -5,-9 C 5,-4 9,9 0,18 C -3,11 -1,2 -5,-9 Z" fill="#DC2626" stroke="#7F1D1D" stroke-width="2"/>
      <path d="M -5,-9 C -7,-12 -6,-15 -5,-17" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round"/>
    </g>

    <!-- Stylized Rising Aromatic Steam Waves (Uap Panas Menggoda) -->
    <g stroke="#FFFDF8" stroke-width="4.8" stroke-linecap="round" fill="none" opacity="0.95">
      <path d="M 300,258 C 291,238 293,222 306,208 C 320,192 319,176 304,162 C 296,153 295,143 301,134"/>
      <path d="M 260,250 C 252,234 254,220 264,206 C 275,192 273,178 261,164" stroke-width="3.8" opacity="0.82"/>
      <path d="M 340,250 C 348,234 346,220 336,206 C 325,192 327,178 339,164" stroke-width="3.8" opacity="0.82"/>
    </g>
  </g>
</svg>`;

const publicImagesDir = path.join(__dirname, '../public/images');
const imagesDir = path.join(__dirname, '../images');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

fs.writeFileSync(path.join(imagesDir, 'logo.svg'), emblemSvg);
fs.writeFileSync(path.join(publicImagesDir, 'logo.svg'), emblemSvg);
console.log('Saved master logo.svg to images/ and public/images/');

async function generateAllAssets() {
  const svgBuffer = Buffer.from(emblemSvg);

  // 1. High-Resolution Logo PNG (1024x1024)
  console.log('Generating 1024x1024 logo.png...');
  const logo1024 = await sharp(svgBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(imagesDir, 'logo.png'), logo1024);
  fs.writeFileSync(path.join(publicImagesDir, 'logo.png'), logo1024);

  // 2. Favicon PNG 512x512
  console.log('Generating 512x512 favicon.png...');
  const favicon512 = await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(imagesDir, 'favicon.png'), favicon512);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon512);

  // 3. Favicon 32x32 & 16x16
  console.log('Generating favicon-32x32.png and favicon-16x16.png...');
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), favicon32);

  const favicon16 = await sharp(svgBuffer)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), favicon16);

  // 4. Favicon.ico
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);

  console.log('ALL ASSETS GENERATED SUCCESSFULLY!');
}

generateAllAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
