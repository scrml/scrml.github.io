let pageType = scrmljs.mainLink.types.page, statementType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    scrmljs.loadCSS("styles/guiLinks/statement.css");
    let extension = pageType.extensions.statement, statementProto = Object.create(pageType.linkProto);
    statementProto.isType = "statement";
    statementProto.isStatement = true;
    statementType = extension.type = Object.create(pageType);
    statementType.linkProto = statementProto;
    statementType.createLink = function createLink(linkId, type = statementType) {
        let page = pageType.createLink(linkId, type);
        page.graphType = "TypedGraph";
        page.simple = gui.element("div", page.div, ["class", "simple", "canmodify", "false", "genesis", ""]);
        page.emptySpan = gui.textShell("This statement is empty (Genesis)", "p", page.simple, ["class", "genesis"]);
        page.members = gui.element("div", page.simple, ["class", "members"]);
        page.newMemberType = gui.element("input", page.simple, ["class", "newmembertype", "type", "number", "min", "1", "disguise", ""]);
        page.newMemberButton = gui.button("Create", page.simple, statementType.newMemberTypeChange, ["class", "newmembertype"]);
    }
    
    statementType.newMemberTypeChange = function newMemberTypeChange(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("newMember", e.newMemberType.value);
        e.newMemberType.value = "";
    }
    
    statementProto.showMember = function showMember(memberId, memberType) {
        this.simple.removeAttribute("genesis");
        let member = gui.element("div", this.members, ["class", "member", "memberid", memberId]);
        gui.textShell("member " + memberId + " type " + memberType, "p", member, ["class", "membertitle"]);
        gui.element("div", member, ["class", "children"]);
    }
    
    statementProto.openChild = function openChild(memberId, name, type) {
        gui.element("input", this.members.querySelector("[memberid=\""+memberId+"\"]"), ["childname", name, "placeholder", "child " + name + " type " + type]).addEventListener("change", statementType.childNameListener);
    }
    
    statementType.childNameListener = function childNameListener(e) {
        let link = pageType.getLinkFromEvent(e);
        link.dm("setChild", e.target.parentElement.getAttribute("memberid"), e.target.getAttribute("childname"), e.target.value);
    }
    
    statementProto.setChild = function setChild(memberId, childName, childId) {
        let input = this.members.querySelector("[memberid=\""+memberId+"\"] [childName=\""+childName+"\"]");
        input.setAttribute("disabled", "");
        input.setAttribute("disguise", "");
        input.value = "child " + childName + " is " + childId;
    }
}

let hostReceivingFunctions = {
    showStatement: function showStatement(linkId) {
        statementType.createLink(linkId, statementType);
    }, showMember: function showMember(linkId, memberId, memberType) {
        let page = pageType.getPageFromLinkId(linkId);
        page.showMember(memberId, memberType);
    }, canModify: function canModify(linkId, can) {
        let page = pageType.getPageFromLinkId(linkId);
        page.simple.setAttribute("canmodify", can);
    }, openChild: function openChild(linkId, memberId, name, type) {
        let page = pageType.getPageFromLinkId(linkId);
        page.openChild(memberId, name, type);
    }, setChild: function setChild(linkId, memberId, childName, childId) {
        let page = pageType.getPageFromLinkId(linkId);
        page.setChild(memberId, childName, childId);
    }
}

let workerInitializer = function workerInitializer() {
    let extension = pageType.extensions.statement, statementProto = Object.create(pageType.linkProto);
    statementProto.isType = "statement";
    statementProto.isStatement = true;
    statementType = extension.statementType = Object.create(pageType);
    statementType.showPage = "showStatement";
    statementType.linkProto = statementProto;
    extension.createLink = function createLink(page, type = extension.statementType) {
        pageType.createLink(page, type);
        let link = page.guiLink, graph = page.graph;
        for (let member of graph.members.items) if (member.id) link.dm("showMember", member.saveToAutosaveString());
        link.dm("canModify", graph.canModify());
    }
}

let workerReceivingFunctions = {
    newMember: function newMember(linkId, ui) {
        let page = getPageFromLinkId(linkId), graph = page.graph;
        // need to know type and prototype. prototype can probably come from type, but need to know type.
        graph.addMember(ui);
    }, setChild: function setChild(linkId, memberId, childName, childId) {
        let page = getPageFromLinkId(linkId);
        page.graph.member(memberId).setChild(childName, childId);
    }
}

pageType.extensions.statement = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }, receivingFunctions: {
        host: hostReceivingFunctions,
        worker: workerReceivingFunctions
    }
}