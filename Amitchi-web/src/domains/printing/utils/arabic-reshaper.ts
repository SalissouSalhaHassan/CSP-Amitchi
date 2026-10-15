const arabicMap: Record<number, { isolated: number; initial: number; medial: number; final: number; connectsLeft: boolean; connectsRight: boolean }> = {
  0x0621: { isolated: 0xFE80, initial: 0xFE80, medial: 0xFE80, final: 0xFE80, connectsLeft: false, connectsRight: false }, // Hamza
  0x0622: { isolated: 0xFE81, initial: 0xFE81, medial: 0xFE82, final: 0xFE82, connectsLeft: false, connectsRight: true },  // Alef Madda
  0x0623: { isolated: 0xFE83, initial: 0xFE83, medial: 0xFE84, final: 0xFE84, connectsLeft: false, connectsRight: true },  // Alef Hamza Above
  0x0624: { isolated: 0xFE85, initial: 0xFE85, medial: 0xFE86, final: 0xFE86, connectsLeft: false, connectsRight: true },  // Waw Hamza Above
  0x0625: { isolated: 0xFE87, initial: 0xFE87, medial: 0xFE88, final: 0xFE88, connectsLeft: false, connectsRight: true },  // Alef Hamza Below
  0x0626: { isolated: 0xFE89, initial: 0xFE8B, medial: 0xFE8C, final: 0xFE8A, connectsLeft: true,  connectsRight: true },  // Yeh Hamza Above
  0x0627: { isolated: 0xFE8D, initial: 0xFE8D, medial: 0xFE8E, final: 0xFE8E, connectsLeft: false, connectsRight: true },  // Alef
  0x0628: { isolated: 0xFE8F, initial: 0xFE91, medial: 0xFE92, final: 0xFE90, connectsLeft: true,  connectsRight: true },  // Beh
  0x0629: { isolated: 0xFE93, initial: 0xFE93, medial: 0xFE94, final: 0xFE94, connectsLeft: false, connectsRight: true },  // Teh Marbuta
  0x062A: { isolated: 0xFE95, initial: 0xFE97, medial: 0xFE98, final: 0xFE96, connectsLeft: true,  connectsRight: true },  // Teh
  0x062B: { isolated: 0xFE99, initial: 0xFE9B, medial: 0xFE9C, final: 0xFE9A, connectsLeft: true,  connectsRight: true },  // Theh
  0x062C: { isolated: 0xFE9D, initial: 0xFE9F, medial: 0xFEA0, final: 0xFE9E, connectsLeft: true,  connectsRight: true },  // Jeem
  0x062D: { isolated: 0xFEA1, initial: 0xFEA3, medial: 0xFEA4, final: 0xFEA2, connectsLeft: true,  connectsRight: true },  // Hah
  0x062E: { isolated: 0xFEA5, initial: 0xFEA7, medial: 0xFEA8, final: 0xFEA6, connectsLeft: true,  connectsRight: true },  // Khah
  0x062F: { isolated: 0xFEA9, initial: 0xFEA9, medial: 0xFEAA, final: 0xFEAA, connectsLeft: false, connectsRight: true },  // Dal
  0x0630: { isolated: 0xFEAB, initial: 0xFEAB, medial: 0xFEAC, final: 0xFEAC, connectsLeft: false, connectsRight: true },  // Thal
  0x0631: { isolated: 0xFEAD, initial: 0xFEAD, medial: 0xFEAE, final: 0xFEAE, connectsLeft: false, connectsRight: true },  // Reh
  0x0632: { isolated: 0xFEAF, initial: 0xFEAF, medial: 0xFEB0, final: 0xFEB0, connectsLeft: false, connectsRight: true },  // Zain
  0x0633: { isolated: 0xFEB1, initial: 0xFEB3, medial: 0xFEB4, final: 0xFEB2, connectsLeft: true,  connectsRight: true },  // Seen
  0x0634: { isolated: 0xFEB5, initial: 0xFEB7, medial: 0xFEB8, final: 0xFEB6, connectsLeft: true,  connectsRight: true },  // Sheen
  0x0635: { isolated: 0xFEB9, initial: 0xFEBB, medial: 0xFEBC, final: 0xFEBA, connectsLeft: true,  connectsRight: true },  // Sad
  0x0636: { isolated: 0xFEBD, initial: 0xFEBF, medial: 0xFEC0, final: 0xFEBE, connectsLeft: true,  connectsRight: true },  // Dad
  0x0637: { isolated: 0xFEC1, initial: 0xFEC3, medial: 0xFEC4, final: 0xFEC2, connectsLeft: true,  connectsRight: true },  // Tah
  0x0638: { isolated: 0xFEC5, initial: 0xFEC7, medial: 0xFEC8, final: 0xFEC6, connectsLeft: true,  connectsRight: true },  // Zah
  0x0639: { isolated: 0xFEC9, initial: 0xFECB, medial: 0xFECC, final: 0xFECA, connectsLeft: true,  connectsRight: true },  // Ain
  0x063A: { isolated: 0xFECD, initial: 0xFECF, medial: 0xFED0, final: 0xFECE, connectsLeft: true,  connectsRight: true },  // Ghain
  0x0641: { isolated: 0xFED1, initial: 0xFED3, medial: 0xFED4, final: 0xFED2, connectsLeft: true,  connectsRight: true },  // Feh
  0x0642: { isolated: 0xFED5, initial: 0xFED7, medial: 0xFED8, final: 0xFED6, connectsLeft: true,  connectsRight: true },  // Qaf
  0x0643: { isolated: 0xFED9, initial: 0xFEDB, medial: 0xFEDC, final: 0xFEDA, connectsLeft: true,  connectsRight: true },  // Kaf
  0x0644: { isolated: 0xFEDD, initial: 0xFEDF, medial: 0xFEE0, final: 0xFEDE, connectsLeft: true,  connectsRight: true },  // Lam
  0x0645: { isolated: 0xFEE1, initial: 0xFEE3, medial: 0xFEE4, final: 0xFEE2, connectsLeft: true,  connectsRight: true },  // Meem
  0x0646: { isolated: 0xFEE5, initial: 0xFEE7, medial: 0xFEE8, final: 0xFEE6, connectsLeft: true,  connectsRight: true },  // Noon
  0x0647: { isolated: 0xFEE9, initial: 0xFEEB, medial: 0xFEEC, final: 0xFEEA, connectsLeft: true,  connectsRight: true },  // Heh
  0x0648: { isolated: 0xFEED, initial: 0xFEED, medial: 0xFEEE, final: 0xFEEE, connectsLeft: false, connectsRight: true },  // Waw
  0x0649: { isolated: 0xFEEF, initial: 0xFEEF, medial: 0xFEF0, final: 0xFEF0, connectsLeft: false, connectsRight: true },  // Alef Maksura
  0x064A: { isolated: 0xFEF1, initial: 0xFEF3, medial: 0xFEF4, final: 0xFEF2, connectsLeft: true,  connectsRight: true },  // Yeh
};

// Returns true if the string has any Arabic characters
export function hasArabicCharacters(text: string): boolean {
  return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

// Simple Arabic reshaper for jsPDF / LTR PDF engines
export function reshapeArabicText(text: string): string {
  if (!text) return "";

  // 1. Process Ligatures (Lam-Alef)
  let chars: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const nextCode = i < text.length - 1 ? text.charCodeAt(i + 1) : 0;

    if (code === 0x0644) { // Lam
      if (nextCode === 0x0622) { chars.push(0xFEF5); i++; continue; } // Lam-Alef Madda
      if (nextCode === 0x0623) { chars.push(0xFEF7); i++; continue; } // Lam-Alef Hamza Above
      if (nextCode === 0x0625) { chars.push(0xFEF9); i++; continue; } // Lam-Alef Hamza Below
      if (nextCode === 0x0627) { chars.push(0xFEFB); i++; continue; } // Lam-Alef
    }
    chars.push(code);
  }

  // 2. Determine contextual shapes (Isolated, Initial, Medial, Final)
  const shapedChars: number[] = [];
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const code = chars[i];
    const map = arabicMap[code];

    if (!map) {
      shapedChars.push(code);
      continue;
    }

    // Check preceding character's left connectivity
    const prevCode = i > 0 ? chars[i - 1] : 0;
    const prevMap = arabicMap[prevCode];
    const prevConnectsLeft = prevMap ? prevMap.connectsLeft : false;

    // Check succeeding character's right connectivity
    const nextCode = i < len - 1 ? chars[i + 1] : 0;
    const nextMap = arabicMap[nextCode];
    const nextConnectsRight = nextMap ? nextMap.connectsRight : false;

    if (prevConnectsLeft && nextConnectsRight) {
      shapedChars.push(map.medial);
    } else if (prevConnectsLeft && !nextConnectsRight) {
      shapedChars.push(map.final);
    } else if (!prevConnectsLeft && nextConnectsRight) {
      shapedChars.push(map.initial);
    } else {
      shapedChars.push(map.isolated);
    }
  }

  return String.fromCharCode(...shapedChars);
}
