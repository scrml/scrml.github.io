let scriptLoader = scrmljs.scriptLoader, editor = scrmljs.editor, gui = scrmljs.gui, idManager = scrmljs.idManager, guiWorkerLink = scrmljs.guiWorkerLink, linkProto = guiWorkerLink.linkProto, mainLink = scrmljs.mainLink, emptyFunction = scrmljs.emptyFunction, pageType = scrmljs.pageType = mainLink.newType("page");

scriptLoader.items.page.data.initialize = function() {pageType.initialize()}

pageType.initializers.host = function() {
    scrmljs.loadCSS("styles/guiLinks/page.css");
    let pageProto = pageType.linkProto;
    pageProto.isPage = true;
    pageProto.isType = "page";
    pageType.createLink = function createLink(linkId, extensionName) {
        let type = pageType.extensions[extensionName].type;
        let page = mainLink.newLink(type, linkId);
        page.div = gui.element("details", editor, ["class", page.isType, "linkid", linkId, "ispage", "", "candelete", "false"]);
        page.div.addEventListener("toggle", type.toggleListener);
        page.pageHead = gui.element("summary", page.div, ["class", "pagehead"]);
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
        //page.nicknameSpan.addEventListener("change", type.nameProcessorListener); nicknamelistener instead
        gui.absorbClicks(page.nicknameSpan);
        page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullname"]);
        page.fullNameText = gui.text("", page.fullNameSpan);
        page.pageTools = gui.element("div", page.pageHead, ["class", "pagetools"]);
        page.moveButton = gui.button("⇳", page.pageTools, type.moveModeAction, ["class", "movebutton", "disguise", "", "bigger", ""]);
        gui.shieldClicks(page.moveButton);
        page.deleteBundle = gui.deleteBundle(page.pageTools, type.deleteBundleAction);
        // if this is not the first page then create a page gap before this page
        if (linkId) pageType.extensions.chapter.type.newPageGap(page.div.parentElement, page.div);
        return page;
    }
    pageProto.getName = function getName(name) {
        gui.messages.setInputValue(this.nameSpan, name);
        this.nameSpan.removeAttribute("disabled");
        this.nicknameSpan.setAttribute("placeholder", "nickname for " + name);
        this.nameSpan.blur();
    }
    pageProto.togglePage = function togglePage(open) {
        if (open) this.div.setAttribute("open", "");
        else this.div.removeAttribute("open");
    }
    pageProto.movePage = function movePage(parentId, insertBeforeId = "none", doSmooth = scrmljs.doSmoothly) {
        let parent = mainLink.getLink(parentId), insertBefore = insertBeforeId === "none"? null: mainLink.getLink(insertBeforeId), div = gui.element("div", this.div.parentElement, [], this.div);
        div.appendChild(div.previousSibling);
        div.appendChild(div.nextSibling);
        gui.smoothMove(div, parent.div, insertBeforeId === "none"? parent.div.lastChild: insertBefore.div.previousSibling, {
            doSmoothly: doSmooth,
            onEnd: function() {
                gui.removeLayer(div);
            }
        });
    }
    pageProto.setLinkId = function setLinkId(newId, oldId = this.linkId) {
        let links = mainLink.links;
        //console.log("directly deleting " + oldId + " and moving it to " + newId);
        delete links[oldId];
        links[newId] = this;
        this.linkId = newId;
        this.div.setAttribute("linkid", newId);
    }
    pageProto.canDelete = function canDelete(can) {
        this.div.setAttribute("candelete", can);
    }
    pageProto.newNameFail = function newNameFail(goodName) {
        gui.messages.setInputValue(this.nameSpan, goodName);
        gui.messages.inputText(this.nameSpan, "name conflict");
    }
    pageProto.eraseLink = function eraseLink() {
        gui.orphan(this.div.previousSibling); // erase the preceding page gap
        gui.orphan(this.div);
        linkProto.eraseLink.call(this);
    }
    pageProto.deletePage = function deletePage() {
        this.dm("deletePage");
    }
    pageType.climber = gui.basicClimber("[ispage]", editor);
    pageType.getLinkFromEvent = function getLinkFromEvent(e) {
        e = pageType.climber(e);
        return mainLink.links[e.getAttribute("linkid")];
    }
    pageType.toggleListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        // override the toggle if it would hide the locked focus page
        if (scrmljs.lockedPageFocus && e !== scrmljs.lockedPageFocus && scrmljs.isAncestorOf(e.div, scrmljs.lockedPageFocus.div, "parentElement")) return e.div.setAttribute("open", "");
        e.dm("togglePage", e.div.hasAttribute("open"));
    }
    pageType.nameProcessorListener = function(line, e) {
        e = pageType.getLinkFromEvent(e);
        // this doesn't make sense for if nickname changed
        e.dm("tryChangeName", line);
    }
    pageType.nameBlurredListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("getName");
    }
    pageType.moveModeAction = function(e) {
        e = pageType.getLinkFromEvent(e);
        if (editor.hasAttribute("movemode")) {
            scrmljs.lockedPageFocus = false;
            editor.removeAttribute("movemode");
            e.div.removeAttribute("movingPage");
            for (let page of editor.querySelectorAll("[canacceptmove]")) page.removeAttribute("canacceptmove");
        } else {
            scrmljs.lockedPageFocus = e;
            editor.setAttribute("movemode", "");
            e.div.setAttribute("movingpage", "");
            e.dm("startMoveModeChecks");
        }
    }
    pageType.deleteBundleAction = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.deletePage();
    }   
}

pageType.initializers.worker = function() {
    let pageProto = pageType.linkProto;
    pageProto.isPage = true;
    pageProto.isType = "page";
    pageType.createLink = function createLink(page, extensionName) {
        if (page.guiLink) throw Error("gui link already set up for page id " + page.pageId);
        let link = page.guiLink = mainLink.newLink(pageType.extensions[extensionName].type);
        link.page = page;
        link.unlinks = [];
        link.unlinks.push(page.manager.linkListener("name", function(name) {link.dm("getName", name)}, true));
        link.dm("canDelete", page.canDelete());
        if (page.parent) link.dm("movePage", page.parent.guiLink.linkId, page.nextPage? page.nextPage.guiLink.linkId: "none", false);
        link.dm("togglePage", page.isOpen);
    }
    pageProto.getName = function getName() {this.dm("getName", this.page.name)};
    pageProto.togglePage = function togglePage(open) {
        this.page.togglePage(open);
    }
    pageProto.eraseLink = function eraseLink() {
        for (let unlink of this.unlinks) unlink.unlink();
        this.page.manager.flushEraseAll();
        linkProto.eraseLink.call(this);
    }
    pageProto.tryChangeName = function tryChangeName(newName) {
        if (this.page.canChangeName(newName)) this.page.manager.setVarValue("name", newName);
        else this.dm("newNameFail", this.name);
    }
    pageProto.startMoveModeChecks = function startMoveModeChecks() {
        let page = this.page;
        for (let chapter of pages.items) if (chapter.isVisible && chapter.isChapter) chapter.guiLink.dm("canAcceptMove", chapter.canAcceptMove(page));
    }
    pageProto.moveTo = function moveTo(parentId, insertBeforeId, doSmoothly) {
        this.page.moveTo(mainLink.getLink(parentId).page, insertBeforeId === "none"? "none": mainLink.getLink(insertBeforeId).page, doSmoothly);
    }
    pageProto.deletePage = function deletePage() {
        this.page.deletePage();
    }
}