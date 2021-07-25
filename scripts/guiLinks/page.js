let scriptLoader = scrmljs.scriptLoader, gui = scrmljs.gui, idManager = scrmljs.idManager, mainLink = scrmljs.mainLink, pageType = scrmljs.pageType = mainLink.newType("page");

scriptLoader.items.page.data.initialize = function() {
    pageType.initializers[mainLink.side]();
}

pageType.initializers.host = function() {
    let pageProto = pageType.linkProto;
    pageProto.isPage = true;
    pageProto.isType = "page";
    pageProto.setOpen = function setOpen(open) {
        if (open) {
            this.div.setAttribute("open", "");
            if (!this.firstPageGap) this.firstPageGap = this.lastPageGap = chapterType.newPageGap(this.div);
        }
        else this.div.removeAttribute("open");
    }
    pageProto.movePage = function movePage(parent, insertBefore, doSmooth = scrmljs.doSmoothly) {
        let div = gui.element("div", this.div.parentElement, [], this.div);
        div.appendChild(div.previousSibling);
        div.appendChild(div.nextSibling);
        gui.smoothMove(div, parent.div, insertBefore? insertBefore.div.previousSibling: parent.div.lastChild, {
            doSmoothly: doSmooth,
            onEnd: function() {
                gui.removeLayer(div);
            }
        });
    }
    pageProto.setLinkId = function setLinkId(newId, oldId = this.linkId) {
        pageProto.prototype.setLinkId.call(this, newId, oldId);
        this.div.setAttribute("linkid", newId);
    }
    pageProto.canDelete = function canDelete(can) {
        this.div.setAttribute("candelete", can);
    }
    pageProto.newNameFail = function newNameFail(line) {
        this.nameSpan.value = line;
        gui.messages.inputText(this.nameSpan, "name conflict");
    }
    pageProto.erase = function erase() {
        gui.orphan(this.div.previousSibling); // erase the preceding page gap
        gui.orphan(this.div);
        pageProto.prototype.erase.call(this);
    }
    pageProto.deletePage = function deletePage() {
        scrmljs.post("deletePage", this.linkId);
    }
    pageType.createLink = function createLink(linkId, type = pageType) {
        let page = mainLink.newLink(type, linkId);
        page.div = gui.element("details", scrmljs.editor, ["class", page.isType, "linkid", linkId, "ispage", "", "candelete", "false"]);
        page.div.addEventListener("toggle", type.toggleListener);
        page.div.addEventListener("mouseenter", type.focusListener);
        page.pageHead = gui.element("summary", page.div, ["class", "pagehead"]);
        page.pageHead.addEventListener("mouseenter", type.focusListener);
        page.siblingNumberSpan = gui.element("span", page.pageHead, ["class", "siblingnumber"]);
        page.siblingNumberText = gui.text("", page.siblingNumberSpan);
        page.fullPageNumberSpan = gui.element("span", page.pageHead, ["class", "fullpagenumber"]);
        page.fullPageNumberText = gui.text("", page.fullPageNumberSpan);
        page.nameSpan = gui.screenedInput(page.pageHead, {
            atts: ["class", "name", "disguise", ""],
            placeholder: "page name",
            onchange: type.nameProcessorListener,
            absorbClicks: true
        });
        page.nameSpan.addEventListener("blur", type.nameBlurredListener);
        page.nicknameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "nickname", "class", "nickname", "disguise", ""]);
        page.nicknameSpan.addEventListener("change", type.nameProcessorListener);
        gui.absorbClicks(page.nicknameSpan);
        page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullname"]);
        page.fullNameText = gui.text("", page.fullNameSpan);
        page.pageTools = gui.element("div", page.pageHead, ["class", "pagetools"]);
        page.moveButton = gui.button("⇳", page.pageTools, type.moveModeAction, ["disguise", "", "bigger", ""]);
        gui.shieldClicks(page.moveButton);
        page.deleteBundle = gui.deleteBundle(page.pageTools, type.deleteBundleAction);
        // if this is not the first page then create a page gap before this page
        if (linkId) chapterType.newPageGap(page.div.parentElement, page.div);
        page.dm("canDelete");
        return page;
    }
    pageType.climber = gui.basicClimber("[ispage]", editor);
    pageType.getLinkFromEvent = function getLinkFromEvent(e) {
        e = pageType.climber(e);
        return mainLink.links[e.getAttribute("linkid")];
    }
    pageType.getPageFromLinkId = function getPageFromLinkId(linkId) {
        let page = mainLink.links[linkId];
        if (!page.isPage) throw Error("link " + linkId + " is not a page");
        return page;
    }
    pageType.toggleListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        if (scrmljs.lockedPageFocus && e !== scrmljs.lockedPageFocus && scrmljs.isAncestorOf(e.div, scrmljs.lockedPageFocus.div, "parentElement")) return e.div.setAttribute("open", "");
        scrmljs.post("togglePage", e.linkId, e.div.hasAttribute("open"));
    }
    pageType.focusListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        //e.askWorker("canDelete");
    }
    pageType.nameProcessorListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        //e.askWorker("name", e.nameSpan.value);
    }
    pageType.nameBlurredListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        //e.fetch("name");
    }
    pageType.moveModeAction = function(e) {
        if (scrmljs.editor.hasAttribute("movemode")) scrmljs.moveModeOff();
        else scrmljs.moveModeOn(pageType.getLinkFromEvent(e));
    }
    pageType.deleteBundleAction = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.deletePage();
    }   
}

pageType.receivingFunctions.host = {
    setName: function setName(linkId, name) {
        let page = pageType.getPageFromLinkId(linkId);
        if (page.nameSpan.hasAttribute("messagerevertto")) page.nameSpan.setAttribute("messagerevertto", name);
        else {
            page.nameSpan.value = name;
            page.nameSpan.removeAttribute("disabled");
            page.nameSpan.blur();
        }
        page.nicknameSpan.setAttribute("placeholder", "nickname for " + name);
    }, setNickname: function setNickname(linkId, nickname) {
        pageType.getPageFromLinkId(linkId).nicknameSpan.value = nickname;
    }, setFullName: function setFullName(linkId, fullName) {
        pageType.getPageFromLinkId(linkId).fullNameText.nodeValue = fullName;
    }, setOpen: function setOpen(linkId, open) {
        pageType.getPageFromLinkId(linkId).setOpen(open);
    }, pageNameCheckFail: function pageNameCheckFail(linkId, line) {
        pageType.getPageFromLinkId(linkId).newNameFail(line);
    }, newPageNameCheckFail: function newPageNameCheckFail(parentLinkId) {
        if (parentLinkId != getLinkFromElement(scrmljs.focusedPageGap).linkId) throw Error("checking new page name message mismatch");
        gui.messages.inputText(scrmljs.focusedPageGap.newPageIn, "name conflict");
    }, clearPageGap: function clearPageGap() {
        if (!scrmljs.focusedPageGap) return;
        mainLink.types.chapter.pageGaps.clearPageGap({target: scrmljs.focusedPageGap});
        scrmljs.focusedPageGap = false;
    }, movePage: function movePage(linkId, parentId, insertBeforeId, doSmoothly) {
        pageType.getPageFromLinkId(linkId).movePage(pageType.getPageFromLinkId(parentId), insertBeforeId == +insertBeforeId? pageType.getPageFromLinkId(insertBeforeId): null, doSmoothly);
    }, canAcceptMove: function canAcceptMove(linkId, accept) {
        pageType.getPageFromLinkId(linkId).div.setAttribute("canacceptmove", accept);
    }, canDelete: function canDelete(linkId, can) {
        let item = mainLink.links[linkId];
        if (item.isPage) {
            item.canDelete(can);
        }
    }, showPage: function(linkId) {
        pageType.createLink(linkId);
    }
}

if (1<0) {
    // chapter stuff
    
    let chapterType = /*mainLink.types.chapter =*/ Object.create(pageType);
    chapterType.protoModel = Object.create(pageProto);
    chapterType.protoModel.isType = function() {return "chapter"};
    chapterType.protoModel.isChapter = true;
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
        scrmljs.post("newPageNameCheck", gap.parentElement.getAttribute("linkid"), line, gaps.getGapNextPageId(gap), scrmljs.pageMode);
    }
    gaps.doMove = function doMove(event) {
        let gap = gaps.getPageGapFromEvent(event);
        scrmljs.post("movePage", editor.querySelector("[movingpage]").getAttribute("linkid"), gaps.getGapParentId(gap), gaps.getGapNextPageId(gap));
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
}

pageType.initializers.worker = function() {
    let pageProto = pageType.linkProto;
    pageProto.isPage = true;
    pageProto.isType = "page";
    pageType.createLink = function createLink(page, type = pageType) {
        if (page.link) throw Error("gui link already set up for page id " + page.pageId);
        let link = page.link = mainLink.newLink(type);
        link.page = page;
        page.manager.setVarValue("linkId", link.linkId);
        page.manager.linkProperty("linkId", page);
        link.dm("showPage", page.name);
        if (1>0) return;
        if (chapter.parent) guiLinkTickets.addTicket(chapter.linkId, "moveTo", chapter.parent.linkId, chapter.nextPage? chapter.nextPage.linkId: null, false);
        chapter.guiUnlinks.push(chapter.manager.linkListener("name", function(name) {
            guiLinkTickets.addTicket(chapter.linkId, "name", name);
        }, true));
        chapter.guiUnlinks.push(chapter.manager.linkListener("nickname", function(nickname) {
            guiLinkTickets.addTicket(chapter.linkId, "nickname", nickname);
        }, true));
        chapter.guiUnlinks.push(chapter.manager.linkListener("fullName", function(fullName) {
            guiLinkTickets.addTicket(chapter.linkId, "fullName", fullName);
        }, true));
        if (chapter.isOpen) chapter.showToggle();
    }
}

pageType.receivingFunctions.worker = {
    canDelete: function(linkId) {
        let page = getPageFromLinkId(linkId);
        page.link.dm("canDelete", page.canDelete());
    }
}

pageType.initialize();