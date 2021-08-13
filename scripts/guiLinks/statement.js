let pageType = scrmljs.mainLink.types.page, statementType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    scrmljs.loadCSS("styles/guiLinks/statement.css");
    let extension = pageType.extensions.statement, statementProto = extension.linkProto = Object.create(pageType.linkProto);
    statementProto.isType = "statement";
    statementProto.isStatement = true;
    statementType = extension.type = Object.create(pageType);
    statementType.linkProto = statementProto;
    pageType.showStatement = statementType.createLink = function createLink(linkId, extensionName = "statement") {
        let page = pageType.createLink(linkId, extensionName);
        page.graphType = "TypedGraph";
        page.simple = gui.element("div", page.div, ["class", "simple", "canmodify", "false", "genesis", ""]);
        page.simple.addEventListener("mouseenter", statementType.focusListener);
        page.emptySpan = gui.textShell("This statement is empty (Genesis)", "p", page.simple, ["class", "genesis"]);
        page.members = gui.element("div", page.simple, ["class", "members"]);
        page.newMemberName = gui.screenedInput(page.simple, {placeholder: "name", atts: ["class", "newmembername"]});
        page.newMemberType = gui.element("input", page.simple, ["class", "newmembertype", "type", "number", "min", "1", "disguise", "", "placeholder", "type (graph id)"]);
        page.newMemberButton = gui.button("Create", page.simple, statementType.newMemberEntered, ["class", "newmembertype"]);
        page.graphIdSpan = gui.textShell("graph id", "span", page.pageHead, [], page.pageTools);
    }
    
    statementType.newMemberEntered = function newMemberEntered(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("newMember", e.newMemberName.value, e.newMemberType.value);
        e.newMemberName.value = "";
        e.newMemberType.value = "";
    }
    
    statementProto.canModify = function canModify(can) {
        this.simple.setAttribute("canmodify", can);
    }
    
    statementType.focusListener = function(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("canModify");
    }
    
    statementProto.newMember = function newMember(memberId, name, type) {
        this.simple.removeAttribute("genesis");
        let member = gui.element("div", this.members, ["class", "member", "memberid", memberId]);
        gui.textShell("member " + memberId + ": " + name + ", type " + type, "p", member, ["class", "membertitle"]);
        gui.element("div", member, ["class", "children"]);
    }
    
    statementProto.showMember = function showMember(memberId, line) {
        let lines = line.split("\t"), childLines = lines[0].split(" ");
        while (childLines[childLines.length-1] === "") childLines.pop();
        this.newMember(memberId, childLines[0], childLines[1]);
        for (let childIndex = 2; childIndex < childLines.length; childIndex += 2) {
            this.openChild(memberId, childLines[childIndex], "skip");
            this.setChild(memberId, childLines[childIndex], childLines[childIndex+1]);
        }
    }
    
    statementProto.openChild = function openChild(memberId, name, type) {
        gui.element("input", this.members.querySelector("[memberid=\""+memberId+"\"]"), ["childname", name, "placeholder", "child " + name + ", must be type (graph id) " + type]).addEventListener("change", statementType.childNameListener);
    }
    
    statementType.childNameListener = function childNameListener(e) {
        let link = pageType.getLinkFromEvent(e);
        link.dm("setChild", e.target.parentElement.getAttribute("memberid"), e.target.getAttribute("childname"), e.target.value);
    }
    
    statementProto.setChild = function setChild(memberId, childName, childMemberName) {
        let input = this.members.querySelector("[memberid=\""+memberId+"\"] [childName=\""+childName+"\"]");
        input.setAttribute("disabled", "");
        input.setAttribute("disguise", "");
        input.value = "child " + childName + " is " + childMemberName;
    }
    
    statementProto.setGraphId = function setGraphId(id) {
        this.graphIdSpan.firstChild.nodeValue = "graph id: " + id;
    }
    
    statementProto.setName = function setName(memberId, name) {
        //this.simple.querySelector("[memberid=\""+memberId+"\"] .newmembername").value = name;
    }
}

let workerInitializer = function workerInitializer() {
    let extension = pageType.extensions.statement, statementProto = extension.linkProto = Object.create(pageType.linkProto);
    statementProto.isType = "statement";
    statementProto.isStatement = true;
    statementType = extension.type = Object.create(pageType);
    statementType.linkProto = statementProto;
    statementType.extensionName = "statement";
    pageType.showStatement = statementType.createLink = function createLink(page, extensionName = "statement") {
        pageType.createLink(page, extensionName);
        let link = page.guiLink, graph = page.graph;
        for (let member of graph.members.items) if (member.id) link.dm("showMember", member.id, member.saveToAutosaveString());
        link.dm("canModify", graph.canModify());
        link.dm("setGraphId", graph.ui);
    }
    statementProto.canModify = function canModify() {
        this.dm("canModify", this.page.graph.canModify());
    }
    statementProto.newMember = function newMember(name, type) {
        this.page.graph.addMember(name, type);
    }
    statementProto.setChild = function setChild(memberId, childName, childMemberName) {
        this.page.graph.member(memberId).setChild(childName, this.page.graph.membersByName[childMemberName]);
    }
}

pageType.extensions.statement = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}