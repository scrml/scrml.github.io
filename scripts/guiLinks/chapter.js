let pageType = scrmljs.mainLink.types.page, gui = scrmljs.gui;

let hostInitializer = function hostInitializer() {
    let extension = pageType.extensions.chapter, chapterProto = Object.create(pageType.linkProto);
    chapterProto.isType = "chapter";
    chapterProto.isChapter = true;
    extension.type = Object.create(pageType);
    extension.type.linkProto = chapterProto;
    extension.type.createLinkHook = function(page) {extension.newPageGap(page.div)};
    // page gaps
    let gaps = extension.pageGaps = {};
    gaps.getPageGapFromEvent = function getPageGapFromEvent(event) {
        let gap = event.target;
        while (gap.className !== "pagegap") gap = gap.parentElement;
        return gap;
    }
    gaps.pageGapFocus = function pageGapFocus(event) {
        scrmljs.focusedPageGap = gaps.getPageGapFromEvent(event);
    }
    gaps.clearPageGap = function clearPageGap(event) {
        let gap = gaps.getPageGapFromEvent(event);
        for (let child of gap.querySelectorAll(".newpagein")) {
            child.blur();
            child.value = "";
        }
    }
    gaps.getGapParentId = function getGapParentId(gap) {
        while (!gap.hasAttribute("linkid")) gap = gap.parentElement;
        return gap.getAttribute("linkid");
    }
    gaps.getGapNextPageId = function getGapNextPageId(gap) {
        if (gap.nextElementSibling) return gap.nextElementSibling.getAttribute("linkid");
        else return null;
    }
    gaps.newPageInChanged = function newPageInChanged(event) {
        let gap = gaps.getPageGapFromEvent(event), newPageIn = gap.querySelector(".newpagein"), line = newPageIn.value;
        if (!gui.nodeNameScreen(line)) return gui.messages.inputText(newPageIn, "invalid nodeName");
        let parentPage = mainLink.links[gaps.getGapParentId(gap)];
        parentPage.dm("tryNewPage", line, gaps.getGapNextPageId(gap), scrmljs.pageMode);
    }
    gaps.doMove = function doMove(event) {
        let gap = gaps.getPageGapFromEvent(event);
        scrmljs.post("movePage", editor.querySelector("[movingpage]").getAttribute("linkid"), gaps.getGapParentId(gap), gaps.getGapNextPageId(gap));
    }
    extension.newPageGap = function newPageGap(loadHere, insertBefore = null) {
        let gap = gui.element("div", loadHere, ["class", "pagegap"], insertBefore);
        gap.addEventListener("focusin", gaps.pageGapFocus);
        gap.newPageIn = gui.element("input", gap, ["class", "newpagein", "placeholder", "new "+scrmljs.pageMode, "disguise", ""]);
        gap.newPageIn.addEventListener("blur", gaps.clearPageGap);
        gap.newPageIn.addEventListener("change", gaps.newPageInChanged);
        gui.text("❌", gui.element("button", gap, ["class", "dontmovehere", "disabled", ""]));
        gap.moveHereButton = gui.element("button", gap, ["class", "movehere"]);
        gui.text("⇦", gap.moveHereButton);
        gap.moveHereButton.addEventListener("click", gaps.doMove);
        return gap;
    }
}

let workerInitializer = function workerInitializer() {
    let extension = pageType.extensions.chapter, chapterProto = Object.create(pageType.linkProto);
    chapterProto.isType = "chapter";
    chapterProto.isChapter = true;
    extension.chapterType = Object.create(pageType);
    extension.chapterType.linkProto = chapterProto;
    extension.createLink = function createLink(page, type = extension.chapterType) {
        pageType.createLink(page, type);
    }
    chapterProto.togglePage = function togglePage(open) {
        pageType.linkProto.togglePage.call(this, open);
        for (let childPage of this.page.childPages) childPage.showPage(open);
    }
    chapterProto.eraseLink = function eraseLink() {
        pageType.linkProto.eraseLink.call(this);
        for (let childPage of this.page.childPages) childPage.showPage(open);
    }
}

pageType.extensions.chapter = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}