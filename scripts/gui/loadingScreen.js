gui.moduleDependency("loadingScreen", ["disabler"], function() {
    gui.absorbClicks(gui.loadingScreenParts.div1);
});


gui.loadingScreenParts = {
    div1: gui.element("div", document.body, ["id", "loadingScreen", "hide", "", "temporarilyInvisible", ""]),
    isLoad: false
}
gui.loadingScreenParts.div2 = gui.element("div", gui.loadingScreenParts.div1);
gui.loadingScreenParts.icon = gui.element("div", gui.loadingScreenParts.div2, ["id", "loadingIcon"]);
gui.loadingScreenParts.msgSpan = gui.element("p", gui.loadingScreenParts.div2);
gui.loadingScreenParts.msgText = gui.text("loading screen is hidden", gui.loadingScreenParts.msgSpan);
gui.text("Loading...", gui.element("p", gui.loadingScreenParts.div2));

gui.setLoadingScreen = function setLoadingScreen(message = "") {
    gui.loadingScreenParts.msgText.nodeValue = message;
    if (!gui.loadingScreenParts.isLoad) {
        gui.loadingScreenParts.isLoad = true;
        gui.loadingScreenParts.div1.removeAttribute("hide");
        gui.suppressKeys();
    }
}

gui.closeLoadingScreen = function closeLoadingScreen() {
    gui.loadingScreenParts.isLoad = false;
    gui.loadingScreenParts.div1.setAttribute("hide", "");
    gui.releaseKeySuppression();
    gui.loadingScreenParts.msgText.nodeValue = "loading screen is hidden";
}