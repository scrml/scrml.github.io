let scriptLoader = scrmljs.scriptLoader, editor = scrmljs.editor, gui = scrmljs.gui, idManager = scrmljs.idManager, guiWorkerLink = scrmljs.guiWorkerLink, linkProto = guiWorkerLink.linkProto, mainLink = scrmljs.mainLink, emptyFunction = scrmljs.emptyFunction, pageType = scrmljs.pageType = mainLink.newType("page");

scriptLoader.items.page.data.initialize = function() {pageType.initialize()}

pageType.initializers.host = function() {
    scrmljs.loadCSS("styles/guiLinks/page.css");
    let pageProto = pageType.linkProto;
    pageProto.isPage = true;
    pageProto.isType = "page";
    pageProto.togglePage = function togglePage(open) {
        if (open) this.div.setAttribute("open", "");
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
    pageProto.eraseLink = function eraseLink() {
        gui.orphan(this.div.previousSibling); // erase the preceding page gap
        gui.orphan(this.div);
        linkProto.eraseLink.call(this);
    }
    pageProto.deletePage = function deletePage() {
        scrmljs.post("deletePage", this.linkId);
    }
    pageType.createLink = function createLink(linkId, type = pageType) {
        let page = mainLink.newLink(type, linkId);
        page.div = gui.element("details", editor, ["class", page.isType, "linkid", linkId, "ispage", "", "candelete", "false"]);
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
        if (linkId) pageType.extensions.chapter.newPageGap(page.div.parentElement, page.div);
        type.createLinkHook(page);
        return page;
    }
    pageType.createLinkHook = emptyFunction;
    pageType.climber = gui.basicClimber("[ispage]", editor);
    pageType.getLinkFromEvent = function getLinkFromEvent(e) {
        e = pageType.climber(e);
        return mainLink.links[e.getAttribute("linkid")];
    }
    pageType.getPageFromLinkId = function getPageFromLinkId(linkId) {
        let page = mainLink.links[linkId];
        if (!page || !page.isPage) throw Error("link " + linkId + " is not a page");
        return page;
    }
    pageType.toggleListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        // override the toggle if it would hide the locked focus page
        if (scrmljs.lockedPageFocus && e !== scrmljs.lockedPageFocus && scrmljs.isAncestorOf(e.div, scrmljs.lockedPageFocus.div, "parentElement")) return e.div.setAttribute("open", "");
        e.dm("togglePage", e.div.hasAttribute("open"));
    }
    pageType.focusListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        //e.askWorker("canDelete");
    }
    pageType.nameProcessorListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("tryChangeName", e.nameSpan.value);
    }
    pageType.nameBlurredListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("getName");
    }
    pageType.moveModeAction = function(e) {
        if (editor.hasAttribute("movemode")) scrmljs.moveModeOff();
        else scrmljs.moveModeOn(pageType.getLinkFromEvent(e));
    }
    pageType.deleteBundleAction = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.deletePage();
    }   
}

pageType.receivingFunctions.host = {
    getName: function getName(linkId, name) {
        let page = pageType.getPageFromLinkId(linkId);
        if (page.nameSpan.hasAttribute("messagerevertto")) page.nameSpan.setAttribute("messagerevertto", name);
        else {
            page.nameSpan.value = name;
            page.nameSpan.removeAttribute("disabled");
            page.nameSpan.blur();
        }
        page.nicknameSpan.setAttribute("placeholder", "nickname for " + name);
    }, getNickname: function getNickname(linkId, nickname) {
        pageType.getPageFromLinkId(linkId).nicknameSpan.value = nickname;
    }, setFullName: function setFullName(linkId, fullName) {
        pageType.getPageFromLinkId(linkId).fullNameText.nodeValue = fullName;
    }, togglePage: function togglePage(linkId, open) {
        pageType.getPageFromLinkId(linkId).togglePage(open);
    }, pageNameCheckFail: function pageNameCheckFail(linkId, line) {
        pageType.getPageFromLinkId(linkId).newNameFail(line);
    }, newPageFail: function newPageNameCheckFail(parentLinkId, newName, insertBefore) {
        console.log("marking fail");
        if (1>0) return;
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
    }, showPage: function showPage(linkId, extensionName) {
        pageType.createLink(linkId, pageType.extensions[extensionName].type);
    }, eraseLink: function eraseLink(linkId) {
        pageType.getPageFromLinkId(linkId).eraseLink();
    }
}

pageType.initializers.worker = function() {
    let pageProto = pageType.linkProto;
    pageProto.isPage = true;
    pageProto.isType = "page";
    pageType.createLink = function createLink(page, type = pageType) {
        if (page.guiLink) throw Error("gui link already set up for page id " + page.pageId);
        let link = page.guiLink = mainLink.newLink(type);
        link.page = page;
        page.manager.setVarValue("linkId", link.linkId);
        page.manager.linkProperty("linkId", page);
        link.dm("showPage", type.linkProto.isType);
        link.unlinks = [];
        link.unlinks.push(page.manager.linkListener("name", function(name) {link.dm("getName", name)}, true));
        link.dm("canDelete", page.canDelete());
        if (page.parent) link.dm("movePage", page.parent.linkId, page.nextPage? page.nextPage.linkId: null, false);
        link.togglePage(page.isOpen);
    }
    pageProto.togglePage = function togglePage(open) {
        this.dm("togglePage", open);
    }
    pageProto.eraseLink = function eraseLink() {
        for (let unlink of this.unlinks) unlink();
        linkProto.eraseLink.call(this);
        this.dm("eraseLink");
    }
}

pageType.receivingFunctions.worker = {
    getName: function(linkId) {
        let page = getPageFromLinkId(linkId);
        page.guiLink.dm("getName", page.name);
    }, getNickname: function(linkId) {
        let page = getPageFromLinkId(linkId);
        page.guiLink.dm("getNickname", page.nickname);
    }, togglePage: function(linkId, open) {
        let page = getPageFromLinkId(linkId);
        page.togglePage(open);
    }, canDelete: function(linkId) {
        let page = getPageFromLinkId(linkId);
        page.guiLink.dm("canDelete", page.canDelete());
    }, tryChangeName: function(linkId, newName) {
        let page = getPageFromLinkId(linkId);
        if (page.canChangeName(newName)) page.manager.setVarValue("name", newName);
        else page.guiLink.dm("pageNameCheckFail", newName);
    }, tryNewPage: function tryNewPage(linkId, newName, insertBeforeId, pageMode) {
        let parent = getPageFromLinkId(linkId);
        for (let child of parent.childPages) if (child.name === newName) return parent.guiLink.dm("newPageFail", newName, insertBeforeId);
        let page = newPageByType[pageMode](newName);
        page.showPage(true);
        page.moveTo(parent.pageId, getPageFromLinkId(insertBeforeId));
    }
}