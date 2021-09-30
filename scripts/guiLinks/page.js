let scriptLoader = scrmljs.scriptLoader, editor = scrmljs.editor, gui = scrmljs.gui, idManager = scrmljs.idManager, guiWorkerLink = scrmljs.guiWorkerLink, linkProto = guiWorkerLink.linkProto, mainLink = scrmljs.mainLink, emptyFunction = scrmljs.emptyFunction, trueFunction = scrmljs.trueFunction, pageType = scrmljs.pageType = mainLink.newType("page");

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
        page.pageNumberSpan = gui.element("span", page.pageHead, ["class", "pagenumber"]);
        page.fullPageNumberSpan = gui.element("span", page.pageHead, ["class", "fullpagenumber"]);
        page.nameSpan = gui.screenedInput(page.pageHead, {
            atts: ["class", "name", "disguise", ""],
            placeholder: "page name",
            onchange: type.nameProcessorListener,
            absorbClicks: true
        });
        page.nameSpan.addEventListener("blur", type.nameBlurredListener);
        page.nicknameSpan = gui.screenedInput(page.pageHead, {
            atts: ["class", "nickname", "disguise", ""],
            placeholder: "nickname",
            onchange: type.nicknameProcessorListener,
            absorbClicks: true,
            screen: trueFunction
        });
        page.nicknameSpan.addEventListener("blur", type.nicknameBlurredListener);
        gui.absorbClicks(page.nicknameSpan);
        page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullname"]);
        page.pageTools = gui.element("div", page.pageHead, ["class", "pagetools"]);
        page.moveButton = gui.button("⇳", page.pageTools, type.moveButtonListener, ["class", "movebutton", "disguise", "", "bigger", ""]);
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
        this.nameSpan.fixWidth();
    }
    pageProto.getNickname = function getNickname(nickname) {
        gui.messages.setInputValue(this.nicknameSpan, nickname);
        this.nicknameSpan.removeAttribute("disabled");
        this.nicknameSpan.blur();
        this.nicknameSpan.fixWidth();
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
      this.setMoveMode(false);
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
        e.dm("tryChangeName", line);
    }
    pageType.nicknameProcessorListener = function(line, e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("setNickname", line);
    }
    pageType.nameBlurredListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("getName");
    }
    pageType.nicknameBlurredListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("getNickname");
    }
    pageType.moveButtonListener = function moveButtonListener(e) {
      e = pageType.getLinkFromEvent(e);
      e.setMoveMode(!editor.hasAttribute("movemode"));
    }
    pageProto.setMoveMode= function(moveMode) {
      // switch these cases amd get rid of the negation, i just cant copy/paste very well on this device
        if (!moveMode) {
            scrmljs.lockedPageFocus = false;
            editor.removeAttribute("movemode");
            this.div.removeAttribute("movingPage");
            for (let page of editor.querySelectorAll("[canacceptmove]")) page.removeAttribute("canacceptmove");
        } else {
            scrmljs.lockedPageFocus = this;
            editor.setAttribute("movemode", "");
            this.div.setAttribute("movingpage", "");
            this.dm("startMoveModeChecks");
        }
    }
    pageType.deleteBundleAction = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.deletePage();
    }
    pageProto.setPageNumber = function setPageNumber(pageNumber) {
        this.pageNumberSpan.textContent = pageNumber;
    }
    pageProto.setFullPageNumber = function setFullPageNumber(fullPageNumber) {
        this.fullPageNumberSpan.textContent = fullPageNumber;
    }
    pageProto.setFullName = function setFullName(fullName) {
        this.fullNameSpan.textContent = fullName;
    }
}

pageType.initializers.worker = function() {
    // first raw page stuff
    let pageProtos = scrmljs.pageProtos = {}, pageProto = pageProtos.page = {
        isPage: true,
        pageType: "page",
        hasPageNumber: true
    }, pages = scrmljs.pages;
    scrmljs.pageCreators = {};
    scrmljs.pageCreators.page = function newPage(name, nickname = "", protoModel = pageProto) {
        let returner = Object.create(protoModel);
        pages.addItem(returner);
        returner.manager = scrmljs.newVarManager();
        returner.manager.setVarValue("pageId", returner.pageId);
        returner.manager.linkProperty("pageId", returner);
        scrmljs.mainLink.postMessage("newPage", returner.pageId, protoModel.pageType);
        scrmljs.mainLink.postMessage("newPage", returner.pageId, protoModel.pageType);
        returner.manager.setVarValue("name", name);
        returner.manager.linkProperty("name", returner);
        returner.manager.linkListener("name", function(newName) {returner.updateFullName()});
        returner.manager.linkListener("name", function() {returner.preSave()});
        returner.manager.setVarValue("nickname", nickname);
        returner.manager.linkProperty("nickname", returner);
        returner.manager.linkListener("nickname", function() {returner.preSave()});
        returner.manager.setVarValue("fullName", name);
        returner.manager.linkProperty("fullName", returner);
        returner.manager.linkListener("fullName", function(newFullName, oldFullName) {
            pagesByFullName[newFullName] = returner;
            if (typeof oldFullName !== "undefined") delete pagesByFullName[oldFullName];
            if (returner.isVisible) returner.guiLink.dm("setFullName", newFullName);
        });
        
        // page numbers: siblingNumber counts all pages, pageNumber only counts visible pages
        returner.manager.setVarValue("siblingNumber", 0);
        returner.manager.linkProperty("siblingNumber", returner);
        returner.manager.setVarValue("pageNumber", 0);
        returner.manager.linkProperty("pageNumber", returner);
        returner.manager.linkListener("pageNumber", function(pageNumber) {if (returner.isVisible) returner.guiLink.dm("setPageNumber", pageNumber)});
        returner.manager.setVarValue("fullPageNumber", "");
        returner.manager.linkProperty("fullPageNumber", returner);
        returner.manager.linkListener("fullPageNumber", function(fullPageNumber) {
            returner.updateFullName();
            if (returner.isVisible) returner.guiLink.dm("setFullPageNumber", fullPageNumber);
        });
        returner.manager.setVarValue("fullSiblingNumber", 0);
        returner.manager.linkProperty("fullSiblingNumber", returner);
        returner.manager.linkListener("fullSiblingNumber", function(fullSiblingNumber) {returner.updateFullName()});
        
        returner.isOpen = false;
        returner.guiLink = false;
        returner.isVisible = false;
        returner.preSave();
        return returner;
    }
    
    pageProto.showPage = function showPage(show) {
        if (show === this.isVisible) return;
        if (show) scrmljs.mainLink.types.page.extensions[this.pageType].type.createLink(this);
        else {
            this.guiLink.eraseLink();
            this.guiLink = false;
        }
        this.isVisible = show;
    }
    
    pageProto.canChangeName = function canChangeName(newName) {
        let sibling = this;
        while (sibling = sibling.previousSibling) if (sibling.name === newName) return false;
        sibling = this;
        while (sibling = sibling.nextSibling) if (sibling.name === newName) return false;
        return true;
    }
    
    pageProto.computeFullPageNumber = function computeFullPageNumber() {
        if (this.parent) {
            if (this.parent.parent) return this.parent.fullPageNumber + "." + this.pageNumber;
            else return this.pageNumber;
        } else return "";
    }
    
    pageProto.computeFullSiblingNumber = function computeFullSiblingNumber() {
        if (this.parent) {
            if (this.parent.parent) return this.parent.fullSiblingNumber + "." + this.siblingNumber;
            else return this.siblingNumber;
        } else return "";
    }
    
    pageProto.updateFullPageNumber = function updateFullPageNumber() {
        this.manager.setVarValue("fullPageNumber", this.computeFullPageNumber());
    }
    
    pageProto.updateFullSiblingNumber = function updateFullSiblingNumber() {
        this.manager.setVarValue("fullSiblingNumber", this.computeFullSiblingNumber());
    }
    
    pageProto.computeFullName = function computeFullName() {
        if (this.parent) return this.parent.fullName + "/" + this.name;
        else return this.name;
    }
    
    pageProto.updateFullName = function updateFullName() {
        this.manager.setVarValue("fullName", this.computeFullName());
    }
    
    pageProto.moveTo = function moveTo(parent, insertBefore = "none", doSmoothly = false) {
        // some moves result in no change, so return if this is the case
        if (parent) {
            if (this === insertBefore) return;
            if (this.nextSibling === insertBefore) return;
            if (this.parent && this.parent === parent && insertBefore === "none" && !this.nextSibling) return; // last sibling
        }
        
        // notify the old parent of the move
        if (this.parent) {
            let oldParent = this.parent, sn = this.siblingNumber, ps = this.previousSibling, ns = this.nextSibling, pn = this.pageNumber, pp = this.previousPage, np = this.nextPage, fixMe;
            // fix pages and page numbers
            if (this.hasPageNumber) {
                // get leftmost sibling which needs nextPage updating
                fixMe = pp;
                if (!fixMe) fixMe = oldParent.children[0];
                while (fixMe && fixMe !== this) {
                    fixMe.nextPage = np;
                    fixMe = fixMe.nextSibling;
                }
                // get rightmost sibling which needs previousPage updating
                fixMe = np;
                if (!fixMe) fixMe = oldParent.children[oldParent.children.length - 1];
                while (fixMe && fixMe !== this) {
                    fixMe.previousPage = pp;
                    fixMe = fixMe.previousSibling;
                }
                // fix page numbers
                fixMe = ns;
                while (fixMe) {
                    fixMe.manager.setVarValue("pageNumber", fixMe.pageNumber - 1);
                    fixMe.updateFullPageNumber();
                    fixMe = fixMe.nextSibling;
                }
                // fix oldParent childPages
                oldParent.childPages.splice(this.pageNumber, 1);
            }
            // reset myself
            this.previousSibling = this.nextSibling = this.previousPage = this.nextPage = undefined;
            // fix siblings
            if (ps) ps.nextSibling = ns;
            if (ns) ns.previousSibling = ps;
            oldParent.children.splice(sn, 1);
            // fix sibling numbers
            fixMe = ns;
            while (fixMe) {
                fixMe.manager.setVarValue("siblingNumber", fixMe.siblingNumber - 1);
                fixMe.updateFullSiblingNumber();
                fixMe = fixMe.nextSibling;
            }
            // check and notify if old parent is now childless
            if (oldParent.isVisible) oldParent.guiLink.dm("canDelete", oldParent.canDelete());
            oldParent.preSave();
        }
        
        // the orphaning above is also used for page deletion, which is marked by moving to no parent
        if (!parent) return;
        
        // move to new parent
        this.parent = parent;
        if (insertBefore === "none") {
            // I am to be the last child of parent
            // fix sibling stuff
            let ps = parent.children[parent.children.length - 1];
            parent.children.push(this);
            this.previousSibling = ps;
            if (ps) ps.nextSibling = this;
            this.manager.setVarValue("siblingNumber", parent.children.length - 1);
            this.updateFullSiblingNumber();
            // fix page stuff
            if (this.isPage) {
                parent.childPages.push(this);
                let fixMe = this.previousSibling;
                while (fixMe && !fixMe.hasPageNumber) {
                    fixMe.nextPage = this;
                    fixMe = fixMe.previousSibling;
                }
                // fixMe is now my previous page
                if (fixMe) {
                    fixMe.nextPage = this;
                    this.previousPage = fixMe;
                    this.manager.setVarValue("pageNumber", fixMe.pageNumber + 1);
                } else this.manager.setVarValue("pageNumber", 1);
            }
        } else {
            // I am not going to be the last child of parent
            // fix sibling stuff
            this.nextSibling = insertBefore;
            this.previousSibling = insertBefore.previousSibling;
            if (this.previousSibling) this.previousSibling.nextSibling = this;
            insertBefore.previousSibling = this;
            parent.children.splice(insertBefore.siblingNumber, 0, this);
            this.manager.setVarValue("siblingNumber", insertBefore.siblingNumber);
            this.updateFullSiblingNumber();
            // fix other siblings' sibling numbers
            let fixMe = this;
            while (fixMe = fixMe.nextSibling) {
                fixMe.manager.setVarValue("siblingNumber", fixMe.siblingNumber + 1);
                fixMe.updateFullSiblingNumber();
            }
            // fix page stuff
            let ps = this.previousSibling;
            if (ps) this.previousPage = ps.hasPageNumber? ps: ps.previousPage;
            this.nextPage = insertBefore.hasPageNumber? insertBefore: insertBefore.nextPage;
            if (this.hasPageNumber) {
                let pp = this.previousPage, pageNumber = pp? pp.pageNumber + 1: 1;
                parent.childPages.splice(pageNumber - 1, 0, this);
                this.manager.setVarValue("pageNumber", pageNumber);
                fixMe = this;
                while (fixMe = fixMe.nextSibling) {
                    fixMe.manager.setVarValue("pageNumber", fixMe.pageNumber + 1);
                    fixMe.updateFullPageNumber();
                }
            } else this.manager.setVarValue("pageNumber", ps? ps.pageNumber: 0);
        }
        this.updateFullPageNumber();
        if (parent.isVisible) parent.guiLink.dm("canDelete", parent.canDelete());
        parent.preSave();
        
        // if this is visible, message that the icon needs to move
        if (this.isVisible) this.guiLink.dm("movePage", parent.guiLink.linkId, insertBefore === "none"? "none": insertBefore.guiLink.linkId, doSmoothly);
    }

    pageProto.togglePage = function togglePage(open = false) {
        if (this.isOpen === open) return;
        this.isOpen = open;
        if (this.isVisible) this.guiLink.dm("togglePage", open);
        this.preSave();
    }

    pageProto.setPageId = function setPageId(newPageId, oldPageId) {
        if (oldPageId == newPageId) return;
        this.pageId = newPageId;
        if (typeof oldPageId === "undefined") return;
        scrmljs.mainLink.postMessage("changePageId", newPageId, oldPageId);
        scrmljs.pageTickets.items[newPageId] = scrmljs.pageTickets.items[oldPageId];
        delete scrmljs.pageTickets.items[oldPageId];
        this.preSave();
        if (this.parent) this.parent.preSave();
    }

    pageProto.deletePage = function deletePage() {
        if (!this.canDelete()) throw Error("page " + this.pageId + " is still in use");
        // erase gui link
        this.showPage(false);
        // remove from family tree
        this.moveTo();
        
        this.parent.preSave();
        if (this.parent.isVisible) this.parent.guiLink.dm("canDelete", this.parent.canDelete());
        // remove from list of all pages
        pages.preErase(this.pageId);
        scrmljs.mainLink.postMessage("deletePage", this.pageId);
    }
    
    pageProto.canDelete = trueFunction;
    
    pageProto.preSave = function preSave() {scrmljs.pageTickets.addTicket(this.pageId, "save")};
    
    pageProto.saveToAutosaveString = function saveToAutosaveString() {
        return this.pageType + "\n" + this.name + "\n" + this.nickname + "\n" + (this.isOpen? "o": "c");
    }
    
    pageProto.saveToSCRMLString = function saveToSCRMLString(indent = "", tab = "\t") {
        let line = indent + "<"+this.name + " pageType=\"" + this.pageType + "\"";
        if (this.nickname !== "") line += " nickname=\"" + scrmljs.xmlEscape(this.nickname) + "\"";
        if (this.isOpen) line += " open=\"\"";
        line += "/>";
        return line;
    }
    
    // now for guiLink stuff
    
    let pLinkProto = pageType.linkProto;
    pLinkProto.isPage = true;
    pLinkProto.isType = "page";
    pageType.createLink = function createLink(page, extensionName) {
        if (page.guiLink) throw Error("gui link already set up for page id " + page.pageId);
        let link = page.guiLink = mainLink.newLink(pageType.extensions[extensionName].type);
        link.page = page;
        link.unlinks = [];
        link.unlinks.push(page.manager.linkListener("name", function(name) {link.dm("getName", name)}, true));
        link.unlinks.push(page.manager.linkListener("nickname", function(nickname) {link.dm("getNickname", nickname)}, true));
        link.dm("canDelete", page.canDelete());
        if (page.parent) link.dm("movePage", page.parent.guiLink.linkId, page.nextPage? page.nextPage.guiLink.linkId: "none", false);
        link.dm("togglePage", page.isOpen);
        link.dm("setPageNumber", page.pageNumber);
        link.dm("setFullPageNumber", page.fullPageNumber);
        link.dm("setFullName", page.fullName);
    }
    
    pLinkProto.getName = function getName() {this.dm("getName", this.page.name)};
    
    pLinkProto.getNickname = function getNickname() {this.dm("getNickname", this.page.nickname)};
    
    pLinkProto.togglePage = function togglePage(open) {
        this.page.togglePage(open);
    }
    
    pLinkProto.eraseLink = function eraseLink() {
        for (let unlink of this.unlinks) unlink.unlink();
        this.unlinks.splice(0, this.unlinks.length);
        linkProto.eraseLink.call(this);
    }
    
    pLinkProto.tryChangeName = function tryChangeName(newName) {
        if (this.page.canChangeName(newName)) this.page.manager.setVarValue("name", newName);
        else this.dm("newNameFail", this.name);
    }
    
    pLinkProto.setNickname = function setNickname(newNickname) {
        this.page.manager.setVarValue("nickname", newNickname);
    }
    
    pLinkProto.startMoveModeChecks = function startMoveModeChecks() {
        let page = this.page;
        for (let chapter of pages.items) if (chapter.isVisible && chapter.isChapter) chapter.guiLink.dm("canAcceptMove", chapter.canAcceptMove(page));
    }
    
    pLinkProto.moveTo = function moveTo(parentId, insertBeforeId, doSmoothly) {
        this.page.moveTo(mainLink.getLink(parentId).page, insertBeforeId === "none"? "none": mainLink.getLink(insertBeforeId).page, doSmoothly);
    }
    pLinkProto.deletePage = function deletePage() {
        this.page.deletePage();
        Graph.allGraphs.flushErase();
    }
}