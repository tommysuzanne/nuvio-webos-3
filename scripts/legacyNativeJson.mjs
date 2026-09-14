// Chromium 38's missing native Symbol makes core-js disable its native JSON
// fast path, even without a reviver. Profiling UJ630 found ~8 s spent cloning
// collections through the JS parser. Retain the native parser for plain string
// input without a callable reviver; all enhanced/coercion cases stay in core-js.
export function wrapLegacyNativeJson(bundle) {
  return `;(function(nativeParse,nativeStringify){\n${bundle}\n(function(){
  globalThis.__NUVIO_NATIVE_STRINGIFY__=nativeStringify;
  var enhancedParse=JSON.parse;
  if(typeof nativeParse!=="function")return;
  try { if(1/nativeParse("-0 \\t")!==-Infinity)return; } catch(error) { return; }
  JSON.parse=function parse(text,reviver){
    return typeof text==="string"&&typeof reviver!=="function"
      ? nativeParse(text) : enhancedParse(text,reviver);
  };
})();\n})(JSON.parse,JSON.stringify);\n`;
}
