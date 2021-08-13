let pageType = scrmljs.mainLink.types.page, chapterType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    scrmljs.loadCSS("styles/guiLinks/chapter.css");
    let extension = pageType.extensions.chapter, chapterProto = extension.linkProto = Object.create(pageType.linkProto);
    chapterProto.isType = "chapter";
    chapterProto.isChapter = true;
    chapterType = extension.type = Object.create(pageType);
    chapterType.linkProto = chapterProto;
    pageType.showChapter = chapterType.createLink = function createLink(linkId, extensionName = "chapter") {
        let page = pageType.createLink(linkId, extensionName);
        chapterType.newPageGap(page.div);
        if (scrmljs.moveMode) page.guiLink.dm("canAcceptMove", page.canAcceptMove(scrmljs.moveMode));
    }
    // page gaps
    let gaps = chapterType.pageGaps = {};
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
            gui.messages.setInputValue(child, "");
        }
    }
    gaps.getGapParentId = function getGapParentId(gap) {
        while (!gap.hasAttribute("linkid")) gap = gap.parentElement;
        return gap.getAttribute("linkid");
    }
    gaps.getGapNextPageId = function getGapNextPageId(gap) {
        if (gap.nextElementSibling) return gap.nextElementSibling.getAttribute("linkid");
        else return "none";
    }
    gaps.newPageInChanged = function newPageInChanged(event) {
        let gap = gaps.getPageGapFromEvent(event), newPageIn = gap.querySelector(".newpagein"), line = newPageIn.value;
        if (!gui.nodeNameScreen(line)) return gui.messages.inputText(newPageIn, "invalid nodeName");
        let parentPage = mainLink.links[gaps.getGapParentId(gap)];
        parentPage.dm("tryNewPage", line, gaps.getGapNextPageId(gap), scrmljs.pageMode);
    }
    gaps.doMove = function doMove(event) {
        let gap = gaps.getPageGapFromEvent(event);
        editor.removeAttribute("movemode");
        for (let div of editor.querySelectorAll("[canacceptmove]")) div.removeAttribute("canacceptmove");
        scrmljs.lockedPageFocus.dm("moveTo", gaps.getGapParentId(gap), gaps.getGapNextPageId(gap), true);
    }
    chapterType.newPageGap = function newPageGap(loadHere, insertBefore = null) {
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
    chapterProto.newPageFail = function newPageFail() {
        console.log("noting new page fail");
    }
    chapterProto.canAcceptMove = function canAcceptMove(can) {
        this.div.setAttribute("canacceptmove", can);
    }
}

let workerInitializer = function workerInitializer() {
    let extension = pageType.extensions.chapter, chapterProto = extension.linkProto = Object.create(pageType.linkProto);
    chapterProto.isType = "chapter";
    chapterProto.isChapter = true;
    chapterType = extension.type = Object.create(pageType);
    chapterType.linkProto =chapterProto;
    chapterType.extensionName = "chapter";
    chapterType.createLink = function createLink(page, extensionName = "chapter") {
        pageType.createLink(page, extensionName);
        if (scrmljs.moveMode) page.guiLink.dm("canAcceptMove", page.canAcceptMove(scrmljs.moveMode));
    }
    chapterProto.eraseLink = function eraseLink() {
        for (let childPage of this.page.childPages) childPage.showPage(false);
        pageType.linkProto.eraseLink.call(this);
    }
    chapterProto.tryNewPage = function tryNewPage(name, insertBefore, pageType) {
        let page = this.page;
        for (let child of page.childPages) if (child.name === name) return this.dm("newPageFail", insertBefore);
        let newPage = newPageByType[pageType](name);
        newPage.togglePage(true);
        newPage.moveTo(page, insertBefore === "none"? "none": mainLink.getLink(insertBefore).page, false);
        newPage.showPage(true);
    }
}

pageType.extensions.chapter = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}