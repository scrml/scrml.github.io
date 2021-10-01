let pageType = scrmljs.mainLink.types.page, namelessType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    namelessType = pageType.extensions.nameless.type;
    scrmljs.loadCSS("styles/guiLinks/comment.css");
    let extension = pageType.extensions.comment, commentProto = extension.linkProto = Object.create(namelessType.linkProto);
    commentProto.isType = "comment";
    commentProto.isComment = true;
    commentType = extension.type = Object.create(namelessType);
    commentType.linkProto = commentProto;
    pageType.showComment = commentType.createLink = function createLink(linkId, extensionName = "comment") {
        let page = namelessType.createLink(linkId, extensionName);
        page.div.setAttribute("comment", "");
        page.texBox = gui.texBox(page.div, ["class", "texbox"], function(value) {
            if (value === "") page.dm("deletePage");
            else page.dm("setTex", value);
        });
    }
    
    commentProto.setTex = function setTex(tex) {
        this.texBox.setTex(tex);
        if (tex !== "") this.texBox.toOutputMode();
    }
}

let workerInitializer = function workerInitializer() {
    // first the raw comment stuff
    let pageProto = scrmljs.pageProtos.page, namelessProto = scrmljs.pageProtos.nameless, commentProto = scrmljs.pageProtos.comment = Object.create(namelessProto);
    
    commentProto.pageType = "comment";
    commentProto.isComment = true;
    commentProto.hasPageNumber = false;
    
    scrmljs.pageCreators.comment = function newComment(name, nickname, protoModel = commentProto) {
        let returner = scrmljs.pageCreators.nameless(name, nickname, protoModel);
        returner.manager.setVarValue("tex", "");
        returner.manager.linkProperty("tex", returner);
        returner.manager.linkListener("tex", function(tex) {
            if (returner.isVisible) returner.guiLink.dm("setTex", tex);
            returner.preSave();
        });
        return returner;
    }
    
    commentProto.showPage = function showPage(show) {
        namelessProto.showPage.call(this, show);
    }
    
    commentProto.saveToAutosaveString = function saveToAutosaveString() {
        let line = pageProto.saveToAutosaveString.call(this) + "\n";
        let content = this.tex.split("\n");
        line += content.length + "\n";
        for (let cline of content) line += cline + "\n";
        return line.substring(0, line.length - 1);
    }
    
    commentProto.saveToSCRMLString = function saveToSCRMLString(indent = "", tab = "\t") {
        let line = pageProto.saveToSCRMLString.call(this, indent, tab);
        line = line.replace(/\/>$/, ">");
        line += "\n" + indent + tab + "<tex>" + scrmljs.xmlEscape(this.tex) + "</tex>";
        line += "\n" + indent + "</" + this.name + ">";
        return line;
    }
    
    // now for guiLink stuff
    
    namelessType = pageType.extensions.nameless.type;
    let extension = pageType.extensions.comment, cLinkProto = extension.linkProto = Object.create(namelessType.linkProto);
    cLinkProto.isType = "comment";
    cLinkProto.isComment = true;
    commentType = extension.type = Object.create(namelessType);
    commentType.linkProto = cLinkProto;
    commentType.extensionName = "comment";
    commentType.createLink = function createLink(page, extensionName = "comment") {
        namelessType.createLink(page, extensionName);
        page.guiLink.dm("setTex", page.tex);
    }
    
    cLinkProto.setTex = function setTex(tex) {
        this.page.manager.setVarValue("tex", tex);
    }
}

pageType.extensions.comment = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}