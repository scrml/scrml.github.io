let gui = scrmljs.gui,
    loadCSS = scrmljs.loadCSS,
    emptyFunction = scrmljs.emptyFunction;

loadCSS("styles/gui/loadingScreen.css");

gui.loadingScreenProto = {};

gui.loadingScreenProto.openLoadingScreen = function openLoadingScreen(message = "") {
    this.msgText.nodeValue = message;
    if (!this.isOpen) {
        this.isOpen = true;
        this.screen.removeAttribute("hide");
        this.screen.setAttribute("temporarilyinvisible", "");
        this.unblock = gui.blockEvents(this.div, gui.blockTheseEvents, false);
    }
}

gui.loadingScreenProto.closeLoadingScreen = function closeLoadingScreen() {
    this.msgText.nodeValue = "loading screen is hidden";
    this.isOpen = false;
    this.screen.setAttribute("hide", "");
    this.screen.removeAttribute("temporarilyinvisible");
    this.unblock();
    this.unblock = emptyFunction;
}

gui.loadingScreen = function loadingScreen(coverMe = document.body, insertAbove = coverMe !== document.body) {
    let returner = Object.create(gui.loadingScreenProto);
    returner.div = gui.element("div", null, ["class", "loadingscreencover"]);
    if (insertAbove) gui.insertAbove(coverMe, returner.div);
    else gui.insertBeneath(coverMe, returner.div);
    returner.screen = gui.element("div", returner.div, ["class", "loadingscreen", "hide", ""], returner.div.firstChild);
    returner.screenContents = gui.element("div", returner.screen);
    returner.isOpen = false;
    returner.unblock = emptyFunction;
    returner.icon = gui.element("div", returner.screenContents, ["class", "loadingicon"]);
    returner.loadingTitle = gui.text("Loading...", gui.element("p", returner.screenContents));
    returner.msgSpan = gui.element("p", returner.screenContents);
    returner.msgText = gui.text("loading screen is hidden", returner.msgSpan);
    returner.bailButton = gui.textShell("reset", "button", returner.screenContents);
    returner.bailButton.addEventListener("click", function(e) {
        window.localStorage.clear();
        window.location.reload();
    }, true)
    return returner;
}