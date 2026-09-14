// ES5 / Node 0.12: explicitly own sockets across probes and redirects.
function createRequestContext() {
  return { cancelled: false, requests: [] };
}
function addRequest(context, request) {
  if (!context) return;
  if (context.cancelled) { request.destroy(); return; }
  context.requests.push(request);
}
function removeRequest(context, request) {
  if (!context) return;
  var index = context.requests.indexOf(request);
  if (index >= 0) context.requests.splice(index, 1);
}
function cancelRequestContext(context) {
  if (!context || context.cancelled) return;
  context.cancelled = true;
  var requests = context.requests.slice(); context.requests.length = 0;
  requests.forEach(function (request) { try { request.destroy(); } catch (_) {} });
}
module.exports = { create: createRequestContext, add: addRequest, remove: removeRequest, cancel: cancelRequestContext };
