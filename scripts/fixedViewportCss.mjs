import postcss from "postcss";

// Chromium 38 invalidates viewport-relative styles during subtree changes.
// This port has two fixed app planes: resolve their units once at packaging.
export async function fixedViewportCss(source, width, height) {
  if (![[1920,1080],[1280,720]].some(v=>v[0]===width&&v[1]===height)) throw Error("Unsupported fixed viewport");
  const plugin={postcssPlugin:"uj630-fixed-viewport",OnceExit(root){
    root.walkDecls(decl=>{
      if(decl.prop==="content" || /url\(/i.test(decl.value))return;
      decl.value=decl.value.replace(/(-?\d*\.?\d+)(vw|vh)\b/g,(_,n,unit)=>`${Number((Number(n)*(unit==="vw"?width:height)/100).toFixed(4))}px`);
    });
  }};
  return (await postcss([plugin]).process(source,{from:undefined})).css;
}
