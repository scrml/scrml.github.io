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
    gaps.newNamelessInAction = function newNamelessInAction(event) {
        let gap = gaps.getPageGapFromEvent(event);
        mainLink.links[gaps.getGapParentId(gap)].dm("newNameless", gaps.getGapNextPageId(gap), scrmljs.pageMode);
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
        gap.newNamelessIn = gui.textShell("⇦", "button", gap, ["class", "newnamelessin"]);
        gap.newNamelessIn.addEventListener("click", gaps.newNamelessInAction);
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
    
    // first the raw chapter stuff
    
    let pageProto = scrmljs.pageProtos.page, chapterProto = scrmljs.pageProtos.chapter = Object.create(pageProto);
    
    chapterProto.pageType = "chapter";
    chapterProto.isChapter = true;
    
    scrmljs.pageCreators.chapter = function newChapter(name, nickname, protoModel = chapterProto) {
        let returner = scrmljs.pageCreators.page(name, nickname, protoModel);
        returner.children = [];
        returner.childPages = [];
        return returner;
    }
    
    chapterProto.isAncestorOf = function isAncestorOf(page) {
        while (page) {
            if (this === page) return true;
            page = page.parent;
        }
        return false;
    }
    
    chapterProto.updateFullName = function updateFullName() {
        pageProto.updateFullName.call(this);
        for (let child of this.children) child.updateFullName();
    }
    
    chapterProto.updateFullSiblingNumber = function updateFullSiblingNumber(siblingNumber) {
        pageProto.updateFullSiblingNumber.call(this, siblingNumber);
        for (let child of this.children) child.updateFullSiblingNumber(child.siblingNumber);
    }
    
    chapterProto.updateFullPageNumber = function updateFullPageNumber(pageNumber) {
        pageProto.updateFullPageNumber.call(this, pageNumber);
        for (let child of this.children) child.updateFullPageNumber(child.pageNumber);
    }
    
    chapterProto.canAcceptMove = function canAcceptMove(page) {
        if (page.isChapter && page.isAncestorOf(this)) return false;
        for (let child of this.children) if (page !== child && child.name === page.name) return false;
        return true;
    }
    
    chapterProto.showPage = function showPage(open) {
        pageProto.showPage.call(this, open);
        if (this.isOpen) for (let childPage of this.children.slice().reverse()) childPage.showPage(open);
    }
    
    chapterProto.togglePage = function togglePage(open = false) {
        if (open === this.isOpen) return;
        pageProto.togglePage.call(this, open);
        // add the children in reverse order so that nextPage already exists in gui
        if (this.isVisible) for (let childPage of this.children.slice().reverse()) childPage.showPage(open);
    }
    
    chapterProto.saveToSCRMLString = function saveToSCRMLString(indent = "", tab = "\t") {
        let line = pageProto.saveToSCRMLString.call(this, indent, tab);
        if (this.children.length) {
            line = line.replace(/\/>$/, ">");
            for (let childPage of this.children) line += "\n" + childPage.saveToSCRMLString(indent + tab, tab);
            line += "\n" + indent + "</" + this.name + ">";
        }
        return line;
    }
    
    chapterProto.saveToAutosaveString = function saveToAutosaveString() {
        let line = pageProto.saveToAutosaveString.call(this) + "\n";
        for (let child of this.children) line += child.pageId + " ";
        if (this.children.length > 0) line = line.substring(0, line.length - 1);
        return line;
    }
    
    chapterProto.canDelete = function canDelete() {
        return this.children.length === 0;
    }
    
    
    // now for guiLink stuff
    
    let extension = pageType.extensions.chapter, cLinkProto = extension.linkProto = Object.create(pageType.linkProto);
    cLinkProto.isType = "chapter";
    cLinkProto.isChapter = true;
    chapterType = extension.type = Object.create(pageType);
    chapterType.linkProto = cLinkProto;
    chapterType.extensionName = "chapter";
    chapterType.createLink = function createLink(page, extensionName = "chapter") {
        pageType.createLink(page, extensionName);
        if (scrmljs.moveMode) page.guiLink.dm("canAcceptMove", page.canAcceptMove(scrmljs.moveMode));
    }
    cLinkProto.eraseLink = function eraseLink() {
        for (let childPage of this.page.children) childPage.showPage(false);
        pageType.linkProto.eraseLink.call(this);
    }
    cLinkProto.tryNewPage = function tryNewPage(name, insertBefore, pageType) {
        let page = this.page;
        for (let child of page.children) if (child.name === name) return this.dm("newPageFail", insertBefore);
        let newPage = scrmljs.pageCreators[pageType](name);
        newPage.togglePage(true);
        newPage.moveTo(page, insertBefore === "none"? "none": mainLink.getLink(insertBefore).page, false);
        newPage.showPage(true);
    }
    cLinkProto.newNameless = function newNameless(insertBefore, pageType) {
        cLinkProto.tryNewPage.call(this, undefined, insertBefore, pageType);
    }
}

pageType.extensions.chapter = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}