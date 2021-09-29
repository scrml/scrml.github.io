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
    }
}

let workerInitializer = function workerInitializer() {
    // first the raw comment stuff
    let pageProto = scrmljs.pageProtos.page, namelessProto = scrmljs.pageProtos.nameless, commentProto = Object.create(namelessProto);
    
    commentProto.pageType = "comment";
    commentProto.isComment = true;
    
    scrmljs.pageCreators.comment = function newComment(name, nickname, protoModel = commentProto) {
        let returner = scrmljs.pageCreators.nameless(name, nickname, protoModel);
        return returner;
    }
    
    commentProto.showPage = function showPage(show) {
        namelessProto.showPage.call(this, show);
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
    }
}

pageType.extensions.comment = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}