let gui = scrmljs.gui;

gui.nodeNameScreen = function nodeNameScreen(line) {
    // block these separation characters explicitly
    if (line.includes(".") || line.includes("/")) return false;
    try {
        document.createElement(line);
        return true;
    } catch (e) {return false;}
}

gui.dataListScreen = function dataListScreen(dataList) {
    return function(line) {
        for (let i = 0; i < dataList.childNodes.length; ++i) {
            let o = dataList.childNodes[i];
            if (o.getAttribute("value") == line) return !o.hasAttribute("disabled");
        }
        return false;
    }
}