let fileConversion = scrmljs.fileConversion = {}, gui = scrmljs.gui, storage = scrmljs.storage, xml = scrmljs.xml;

fileConversion.autosaveToDoc = function autosaveToDoc() {
    let doc = xml.newDocument("SCRML"), root = doc.documentElement, pageLines = [], saveLine;
    while (saveLine = storage.fetch("page " + pageLines.length)) pageLines.push(saveLine);
    let pageSublines;
    for (let line of pageLines) {
        pageSublines = line.split("\n");
    }
    return doc;
}