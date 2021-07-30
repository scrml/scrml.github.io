let pageType = scrmljs.mainLink.types.page, gui = scrmljs.gui, editor = scrmljs.editor;

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
        scrmljs.lockedPageFocus.dm("moveTo", gaps.getGapParentId(gap), gaps.getGapNextPageId(gap), true);
        editor.removeAttribute("movemode");
        for (let div of editor.querySelectorAll("[canacceptmove]")) div.removeAttribute("canacceptmove");
        //scrmljs.post("movePage", editor.querySelector("[movingpage]").getAttribute("linkid"), gaps.getGapParentId(gap), gaps.getGapNextPageId(gap));
        /*let doMove = function doMove(e) {
            let gap = e.target.parentElement, movingPage = getPage(document.querySelector("[movingpage]").getAttribute("pagenumber"));
            post("move", movingPage.pageNumber, getGapParentNumber(gap), getGapNextPageNumber(gap));
            scrmljs.moveModeOff();
        }*/
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
        if (scrmljs.moveMode) page.guiLink.dm("canAcceptMove", page.canAcceptMove(scrmljs.moveMode));
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
    }, receivingFunctions: {
        host: {
            newPageFail: function newPageNameCheckFail(parentLinkId, newName, insertBefore) {
                if (parentLinkId != pageType.extensions.chapter.pageGaps.getGapParentId(scrmljs.focusedPageGap)) throw Error("checking new page name message mismatch");
                gui.messages.inputText(scrmljs.focusedPageGap.newPageIn, "name conflict");
            }, clearPageGap: function clearPageGap() {
                if (!scrmljs.focusedPageGap) return;
                mainLink.types.chapter.pageGaps.clearPageGap({target: scrmljs.focusedPageGap});
                scrmljs.focusedPageGap = false;
            }, canAcceptMove: function canAcceptMove(linkId, accept) {
                pageType.getPageFromLinkId(linkId).div.setAttribute("canacceptmove", accept);
            }
        }, worker: {
            tryNewPage: function tryNewPage(linkId, newName, insertBeforeId, pageMode) {
                let parent = getPageFromLinkId(linkId);
                for (let child of parent.childPages) if (child.name === newName) return parent.guiLink.dm("newPageFail", newName, insertBeforeId);
                let page = newPageByType[pageMode](newName);
                page.showPage(true);
                page.moveTo(parent, getPageFromLinkId(insertBeforeId));
            }, startMoveModeChecks: function startMoveModeChecks(linkId) {
                let page = scrmljs.moveMode = getPageFromLinkId(linkId);
                for (let link of mainLink.links.items) if (link.page.isChapter) link.dm("canAcceptMove", link.page.canAcceptMove(page));
            }
        }
    }
}