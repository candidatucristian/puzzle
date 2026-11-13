// Canvas pages must be redrawn after the locally bundled CJK faces become ready.
let chineseFonts = null;
export function prepareLanguageFonts(language) {
  if (language !== 'zh-Hans' || typeof document === 'undefined' || !document.fonts) return Promise.resolve(false);
  chineseFonts ??= Promise.all([
    document.fonts.load('400 24px "Ashcombe CJK Sans"', '简体中文'),
    document.fonts.load('400 24px "Ashcombe CJK Serif"', '阿什科姆庄园'),
  ]).then(groups => {
    const loaded = groups.every(group => group.length > 0);
    if (!loaded) chineseFonts = null;
    return loaded;
  }).catch(() => { chineseFonts = null; return false; });
  return chineseFonts;
}
