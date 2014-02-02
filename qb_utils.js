function xmlEncode(unsafe) {
    return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlDecode(unsafe) {
    return unsafe
    .replace("&amp;", /&/g)
    .replace("&lt;", /</g)
    .replace("&gt;", />/g)
    .replace("&quot;", /"/g);
}