/**
 * Descobre, lendo os primeiros KB do arquivo, se um MP4 declara Dolby Vision no
 * sample entry — o unico sinal que separa o que toca do que nao toca nesta TV.
 *
 * POR QUE ISTO EXISTE, medido na OLED65C9 (webOS 4.10) com dois arquivos do
 * mesmo tipo de conteudo:
 *
 *   arquivo A  sample entry `dvhe`  -> MEDIA_ERR_DECODE (codigo 3)
 *   arquivo B  sample entry `hev1`  -> toca, e o usuario confirmou que engata
 *                                      Dolby Vision de verdade na TV
 *
 * Os dois sao HEVC Main 10, dv_profile 5, bl_signal_compatibility_id 0, ambos
 * 4K com bitrate parecido. A unica diferenca e o fourcc do sample entry. Ou
 * seja, a etiqueta "correta" para DV e justamente a que o pipeline HTML5 recusa,
 * enquanto a etiqueta generica passa e ainda ativa DV.
 *
 * DUAS COISAS QUE NAO SERVEM PARA ISTO, ambas verificadas:
 * 1. `canPlayType` responde "probably" para TUDO, inclusive
 *    'video/mp4; codecs="dvhe.05.06"', que e exatamente o caso que falha. Usar a
 *    resposta do navegador como filtro daria uma lista sem nenhum aviso.
 * 2. O nome do release nao separa os dois: os dois arquivos medidos trazem
 *    "DoVi"/"DV.P5" no nome. O bonus de DV que o ranking ja da por nome nao tem
 *    como distinguir quem toca de quem quebra.
 *
 * LIMITE HONESTO: so ha resposta quando o indice (`moov`) esta no inicio do
 * arquivo. No arquivo B ele esta no fim, entao 128KB de leitura nao revelaram
 * nada — e esse justamente tocou. Por isso o retorno tem tres estados e o
 * "desconhecido" NUNCA bloqueia nada: sem evidencia, nao se afirma.
 */

const BYTES_DE_LEITURA = 4096;
const TIMEOUT_MS = 2500;

export const DOLBY_VISION_INCOMPATIVEL = "dolby-vision-sample-entry";
export const DOLBY_VISION_COMPATIVEL = "compativel";
export const DOLBY_VISION_DESCONHECIDO = "desconhecido";

function pareceMp4(url) {
  const limpa = String(url || "")
    .split("?")[0]
    .toLowerCase();
  return /\.(mp4|m4v|mov)$/.test(limpa) || limpa.indexOf("/playback/") >= 0;
}

/**
 * Le os primeiros bytes e procura o fourcc no texto cru. Comparar bytes seria
 * mais elegante, mas o sample entry aparece como ASCII dentro do `stsd` e a
 * busca em texto e o que roda igual em qualquer engine que este app suporta.
 */
export function detectarEntradaDolbyVision(url) {
  const alvo = String(url || "").trim();
  if (!alvo || !pareceMp4(alvo)) {
    return Promise.resolve(DOLBY_VISION_DESCONHECIDO);
  }
  return new Promise((resolve) => {
    let encerrado = false;
    let pedido;
    let relogio;
    const encerrar = (valor, abortar = false) => {
      if (encerrado) return;
      encerrado = true;
      clearTimeout(relogio);
      if (pedido) {
        pedido.onload = pedido.onerror = pedido.onabort = pedido.ontimeout = null;
        pedido.onreadystatechange = pedido.onprogress = null;
        if (abortar) {
          try { pedido.abort(); } catch (_) {}
        }
      }
      resolve(valor);
    };
    relogio = setTimeout(() => encerrar(DOLBY_VISION_DESCONHECIDO, true), TIMEOUT_MS);
    try {
      pedido = new XMLHttpRequest();
      pedido.open("GET", alvo, true);
      pedido.setRequestHeader("Range", `bytes=0-${BYTES_DE_LEITURA - 1}`);
      pedido.timeout = TIMEOUT_MS;
    } catch (_) {
      encerrar(DOLBY_VISION_DESCONHECIDO, true);
      return;
    }
    // A server may ignore Range. Refuse its body before buffering the movie;
    // timeout must abort the real request as well as resolving the promise.
    pedido.onreadystatechange = () => {
      if (pedido.readyState !== 2) return;
      const length = Number(pedido.getResponseHeader("Content-Length") || 0);
      if (pedido.status !== 206 || length > BYTES_DE_LEITURA) {
        encerrar(DOLBY_VISION_DESCONHECIDO, true);
      }
    };
    pedido.onprogress = (event) => {
      if (event.loaded > BYTES_DE_LEITURA) encerrar(DOLBY_VISION_DESCONHECIDO, true);
    };
    pedido.ontimeout = () => encerrar(DOLBY_VISION_DESCONHECIDO, true);
    pedido.onabort = () => encerrar(DOLBY_VISION_DESCONHECIDO);
    pedido.onload = () => {
      const inicio = String(pedido.responseText || "");
      if (pedido.status !== 206 || inicio.length > BYTES_DE_LEITURA) {
        encerrar(DOLBY_VISION_DESCONHECIDO, true);
        return;
      }
      // `moov` ausente = indice no fim do arquivo: nao da para afirmar nada.
      if (inicio.indexOf("moov") < 0) {
        encerrar(DOLBY_VISION_DESCONHECIDO);
        return;
      }
      if (inicio.indexOf("dvhe") >= 0 || inicio.indexOf("dvh1") >= 0) {
        encerrar(DOLBY_VISION_INCOMPATIVEL);
        return;
      }
      encerrar(DOLBY_VISION_COMPATIVEL);
    };
    pedido.onerror = () => {
      encerrar(DOLBY_VISION_DESCONHECIDO, true);
    };
    try {
      pedido.send(null);
    } catch (_) {
      encerrar(DOLBY_VISION_DESCONHECIDO, true);
    }
  });
}
