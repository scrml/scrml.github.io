scriptLoader.ensureJS("guiWorkerLink");

scriptLoader.items.guiWorkerLink.addEphemeralListener("js", function() {
    let pageType = guiWorkerLink.types.page = {};
    pageType.protoModel = Object.create(guiWorkerLink.linkProto);
    pageType.protoModel.isType = function() {return "page"};
    pageType.protoModel.isPage = true;
    
    pageType.protoModel.fetch = function fetch(dataName) {
        guiWorkerLink.linkProto.fetch.call(this, "page", dataName);
    }
    
    pageType.protoModel.askWorker = function askWorker(questionType, proposedValue) {
        guiWorkerLink.linkProto.askWorker.call(this, "page", questionType, proposedValue);
    }
    
    pageType.protoModel.setOpen = function setOpen(open) {
        if (open) {
            this.div.setAttribute("open", "");
            if (!this.firstPageGap) this.firstPageGap = this.lastPageGap = chapterType.newPageGap(this.div);
        }
        else this.div.removeAttribute("open");
    }
    
    pageType.protoModel.movePage = function movePage(parent, insertBefore) {
        let div = gui.element("div", this.div.parentElement, [], this.div);
        div.appendChild(div.previousSibling);
        div.appendChild(div.nextSibling);
        gui.smoothMove(div, parent.div, insertBefore? insertBefore.div.previousSibling: parent.div.lastChild, {
            doSmoothly: doSmoothly,
            onEnd: function() {
                gui.removeLayer(div);
            }
        });
    }
    
    pageType.createUnit = function createUnit(linkId, loadHere, insertBefore, type = pageType) {
        let page = guiWorkerLink.newLink(linkId, loadHere, type, insertBefore);
        page.div = gui.element("details", loadHere, ["class", page.isType(), "linkid", linkId], insertBefore);
        page.div.addEventListener("toggle", type.toggleListener);
        page.div.addEventListener("mouseenter", type.focusListener);
        page.pageHead = gui.element("summary", page.div, ["class", "pageHead"]);
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
        page.pageNumberOut = gui.text(linkId, page.pageHead);
        // if this is not the first page then create a page gap before this page
        if (linkId) chapterType.newPageGap(loadHere, page.div);
        return page;
    }
    
    pageType.climber = gui.basicClimber(".page", editor);
    
    pageType.getLinkFromEvent = function getLinkFromEvent(e, type = pageType) {
        e = type.climber(e);
        return guiWorkerLink.links[e.getAttribute("linkid")];
    }
    
    pageType.toggleListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        post("togglePage", e.linkId, e.div.hasAttribute("open"));
    }
    
    pageType.focusListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        console.log("focusing");
    }
    
    pageType.nameProcessorListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        e.askWorker("name", e.nameSpan.value);
    }
    
    pageType.nameBlurredListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        e.fetch("name");
    }
    
    let chapterType = guiWorkerLink.types.chapter = Object.create(pageType);
    
    chapterType.protoModel = Object.create(pageType.protoModel);
    chapterType.protoModel.isType = function() {return "chapter"};
    chapterType.protoModel.isChapter = true;
    
    // page gaps
    {
        let gaps = chapterType.pageGaps = {};
        gaps.getPageGapFromEvent = function getPageGapFromEvent(event) {
            let gap = event.target;
            while (gap.getAttribute("class") != "pagegap") gap = gap.parentElement;
            return gap;
        }
        
        gaps.pageGapFocus = function pageGapFocus(event) {
            focusedPageGap = gaps.getPageGapFromEvent(event);
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
            if (1>0) return console.log("under construction newPageInChanged");
            if (!gui.nodeNameScreen(line)) return gui.inputOutput.inputText(newPageIn, "invalid nodeName");
            clearPageGap({target: gap});
            post("pageNameCheck", gap.parentElement.getAttribute("pagenumber"), line);
        }
        
        gaps.doMove = function doMove(event) {
            console.log("doing move");
        }

        chapterType.newPageGap = function newPageGap(loadHere, insertBefore = null) {
            let gap = gui.element("div", loadHere, ["class", "pagegap"], insertBefore);
            gap.addEventListener("focusin", gaps.pageGapFocus);
            gap.newPageIn = gui.element("input", gap, ["class", "newpagein", "placeholder", "new "+pageMode, "disguise", ""]);
            gap.newPageIn.addEventListener("blur", gaps.clearPageGap);
            gap.newPageIn.addEventListener("change", gaps.newPageInChanged);
            gui.text("❌", gui.element("button", gap, ["class", "dontmovehere", "disabled", ""]));
            gap.moveHereButton = gui.element("button", gap, ["class", "movehere"]);
            gui.text("⇦", gap.moveHereButton);
            gap.moveHereButton.addEventListener("click", gaps.doMove);
            return gap;
        }
    }
    
    chapterType.climber = gui.basicClimber(".chapter", editor);
    portTypedEventListeners(pageType, chapterType, ["getLinkFromEvent", "nameBlurredListener", "focusListener", "toggleListener", "nameProcessorListener"]);
        
    guiWorkerLink.linkCreators.chapter = function openGuiChapter(linkId, name) {
        let returner = pageType.createUnit(linkId, editor, null, chapterType);
        return returner;
    }
});

function portTypedEventListeners(proto, instance, functionNames, defaultType = instance) {
    for (let name of functionNames) instance[name] = function(e, type = defaultType) {return proto[name](e, type)};
}