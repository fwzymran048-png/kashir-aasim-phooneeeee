/**
 * Code 128 Barcode Generator (Pure TypeScript / SVG Vector Output)
 * 100% Offline, Zero external dependencies.
 * Produces crisp, laser/thermal scannable Code 128 barcodes.
 */

// Code 128 patterns (widths of bars and spaces) for symbols 0 through 106
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP)
];

const START_B = 104;
const START_C = 105;
const STOP = 106;

export interface BarcodeRenderOptions {
  width?: number;        // Width of a single unit bar (default 1.5)
  height?: number;       // Height of bars (default 40)
  displayValue?: boolean;// Show text below barcode (default true)
  fontSize?: number;     // Font size for text (default 11)
  fontFamily?: string;   // Font family (default monospace)
  textMargin?: number;   // Margin between bar and text (default 4)
  lineColor?: string;    // Bar color (default #000000)
  background?: string;   // Background color (default transparent)
  margin?: number;       // Quiet zone margin (default 4)
}

/**
 * Encode text into Code 128 symbol sequence with checksum
 */
export function encodeCode128(text: string): { symbols: number[]; patternString: string } | null {
  if (!text || text.trim().length === 0) return null;
  const cleanText = text.trim();

  // Determine if pure numeric and even length -> Code Set C (very compact)
  const isPureNumeric = /^\d+$/.test(cleanText);
  const symbols: number[] = [];

  if (isPureNumeric && cleanText.length >= 2 && cleanText.length % 2 === 0) {
    // Use Code C
    symbols.push(START_C);
    for (let i = 0; i < cleanText.length; i += 2) {
      const pair = parseInt(cleanText.substring(i, i + 2), 10);
      symbols.push(pair);
    }
  } else {
    // Use Code B (standard alphanumeric ASCII 32 to 126)
    symbols.push(START_B);
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      if (charCode >= 32 && charCode <= 126) {
        symbols.push(charCode - 32);
      } else {
        // Fallback for special chars
        symbols.push(0); // Space
      }
    }
  }

  // Calculate Checksum: (StartSymbol + Sum(i * symbol_i)) % 103
  let checkSum = symbols[0];
  for (let i = 1; i < symbols.length; i++) {
    checkSum += symbols[i] * i;
  }
  const checkDigit = checkSum % 103;
  symbols.push(checkDigit);
  symbols.push(STOP);

  // Build binary bars pattern string
  let patternString = "";
  for (const sym of symbols) {
    const pattern = CODE128_PATTERNS[sym];
    if (!pattern) continue;
    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const count = parseInt(pattern[j], 10);
      patternString += (isBar ? "1" : "0").repeat(count);
      isBar = !isBar;
    }
  }

  return { symbols, patternString };
}

/**
 * Generate SVG markup string for Code 128 barcode
 */
export function generateBarcodeSvg(text: string, options: BarcodeRenderOptions = {}): string {
  const {
    width = 1.6,
    height = 38,
    displayValue = true,
    fontSize = 11,
    fontFamily = 'Courier New, monospace',
    textMargin = 4,
    lineColor = '#000000',
    background = 'transparent',
    margin = 4
  } = options;

  const encoded = encodeCode128(text);
  if (!encoded) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="${height}" viewBox="0 0 100 ${height}"><text x="50" y="${height / 2}" font-size="10" text-anchor="middle" fill="#999">INVALID</text></svg>`;
  }

  const { patternString } = encoded;
  const barcodeWidth = patternString.length * width;
  const totalWidth = barcodeWidth + margin * 2;
  const textHeight = displayValue ? fontSize + textMargin : 0;
  const totalHeight = height + textHeight + margin * 2;

  // Build SVG rect elements for the bars
  let barsSvg = "";
  let currentX = margin;
  let inBar = false;
  let barStart = 0;

  for (let i = 0; i < patternString.length; i++) {
    const bit = patternString[i];
    if (bit === '1' && !inBar) {
      inBar = true;
      barStart = currentX;
    } else if (bit === '0' && inBar) {
      inBar = false;
      const barWidth = currentX - barStart;
      barsSvg += `<rect x="${barStart.toFixed(2)}" y="${margin}" width="${barWidth.toFixed(2)}" height="${height}" fill="${lineColor}" />`;
    }
    currentX += width;
  }

  // Last bar if ends on 1
  if (inBar) {
    const barWidth = currentX - barStart;
    barsSvg += `<rect x="${barStart.toFixed(2)}" y="${margin}" width="${barWidth.toFixed(2)}" height="${height}" fill="${lineColor}" />`;
  }

  // Text element
  let textSvg = "";
  if (displayValue) {
    const textY = margin + height + textMargin + fontSize * 0.85;
    const textX = totalWidth / 2;
    textSvg = `<text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" font-family="${fontFamily}" font-size="${fontSize}px" font-weight="bold" text-anchor="middle" fill="${lineColor}">${escapeXml(text)}</text>`;
  }

  const bgRect = background !== 'transparent'
    ? `<rect width="${totalWidth}" height="${totalHeight}" fill="${background}" />`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="display:block; max-width:100%; height:auto;">${bgRect}${barsSvg}${textSvg}</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
