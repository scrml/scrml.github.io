let pageType = scrmljs.mainLink.types.page, statementType, gui = scrmljs.gui, editor = scrmljs.editor, getPageIdFromFullName = scrmljs.getPageIdFromFullName, fullPageNameOptionsByName = scrmljs.fullPageNameOptionsByName;

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
        page.typeNames = {};
        page.typeNamesDiv = gui.element("table", page.simple, ["class", "typenames"]);
        gui.textShell("Type Names", "caption", page.typeNamesDiv);
        page.typeNamesHeader = gui.element("tr", page.typeNamesDiv);
        gui.textShell("Name", "th", page.typeNamesHeader);
        gui.textShell("Full Name", "th", page.typeNamesHeader);
        page.emptySpan = gui.textShell("This statement is empty (Genesis)", "p", page.simple, ["class", "genesis"]);
        page.members = {};
        page.membersDiv = gui.element("table", page.simple, ["class", "members"]);
        gui.textShell("Members", "caption", page.membersDiv);
        page.membersDivHeader = gui.element("tr", page.membersDiv);
        gui.textShell("Type", "th", page.membersDivHeader);
        gui.textShell("Name", "th", page.membersDivHeader);
        page.newMemberName = gui.screenedInput(page.simple, {placeholder: "name", atts: ["class", "newmembername"]});
        page.newMemberName.addEventListener("change", statementType.newMemberNameChangeListener);
        page.newMemberType = gui.element("input", page.simple, ["class", "newmembertype", "type", "text", "list", "allfullpagenames", "disguise", "", "placeholder", "type"]);
        page.newMemberType.addEventListener("change", statementType.newMemberTypeChangeListener);
        page.newMemberButton = gui.button("Create", page.simple, statementType.newMemberEntered, ["class", "newmembertype", "disabled", ""]);
        page.graphIdSpan = gui.textShell("graph id", "span", page.pageHead, [], page.pageTools);
        page.inUniverseButton = gui.button("Insert into universe", page.pageTools, statementType.inUniverseListener, [], page.moveButton);
    }
    
    statementType.newMemberNameChangeListener = function newMemberNameChangeListener(e) {
        let input = e.target, link = pageType.getLinkFromEvent(e);
        if (!gui.nodeNameScreen(input.value)) {
            link.newMemberButton.setAttribute("disabled", "");
            return gui.messages.inputText(input, "invalid node name");
        }
        if (input.value in link.members) {
            link.newMemberButton.setAttribute("disabled", "");
            return gui.messages.inputText(input, "name conflict");
        }
        if (link.newMemberType.value !== "") link.newMemberButton.removeAttribute("disabled");
        input.blur();
    }
    
    statementType.newMemberTypeChangeListener = function newMemberTypeChangeListener(e) {
        let input = e.target, link = pageType.getLinkFromEvent(e);
        if (!gui.nodeNameScreen(input.value)) {
            let option = fullPageNameOptionsByName[input.value];
            if (!option) {
                input.removeAttribute("title");
                link.newMemberButton.setAttribute("disabled", "");
                return gui.messages.inputText(input, "cannot find that type");
            }
            let popup = gui.popups.inputText(editor, function() {
                let popupInput = popup.input;
                if (!gui.nodeNameScreen(popupInput.value)) return gui.messages.inputText(popupInput, "invalid nodeName");
                for (let typeName in link.typeNames) if (typeName === popupInput.value) {
                    link.newMemberButton.setAttribute("disabled", "");
                    return gui.messages.inputText(popupInput, "name conflict");
                }
                input.title = input.value;
                input.value = popupInput.value;
                popup.closePopup();
                if (link.newMemberName.value !== "") link.newMemberButton.removeAttribute("disabled");
            }, {
                label: "Pick a name for " + input.value,
                labelId: "page" + link.linkId + "newtypenamepicker"
            });
        } else {
            if (!(input.value in link.typeNames)) {
                input.removeAttribute("title");
                link.newMemberButton.setAttribute("disabled", "");
                return gui.messages.inputText(input, "choose the full name first");
            }
            input.setAttribute("title", link.typeNames[input.value]);
            if (link.newMemberName.value !== "") link.newMemberButton.removeAttribute("disabled");
            input.blur();
        }
    }
    
    statementType.newMemberEntered = function newMemberEntered(e) {
        e = pageType.getLinkFromEvent(e);
        e.dm("newMember", e.newMemberName.value, e.newMemberType.value, fullPageNameOptionsByName[e.newMemberType.title].getAttribute("pageid"));
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
    
    statementProto.setTypeName = function setTypeName(typeName, typeFullName) {
        if (!this.typeNames[typeName]) {
            let type = this.typeNames[typeName] = {name: typeName};
            type.div = gui.element("tr", this.typeNamesDiv);
            type.nameSpot = gui.textShell(typeName, "td", type.div);
            type.fullNameSpot = gui.textShell(typeFullName, "td", type.div);
        }
        let type = this.typeNames[typeName], oldName = type.fullName;
        type.fullName = typeFullName;
        if (typeof oldName === "string") for (let td of this.membersDiv.querySelectorAll("td:nth-child(1)[typename=\""+oldName+"\"]")) {
            td.firstChild.nodeValue = typeName;
            td.setAttribute("typename", typeName);
        }
    }
    
    statementProto.eraseTypeName = function eraseTypeName(typeName) {
        delete this.typeNames[typeName];
    }
    
    statementProto.newMember = function newMember(name, typeName) {
        this.simple.removeAttribute("genesis");
        let member = this.members[name] = {};
        member.div = gui.element("tr", this.membersDiv, ["class", "member"]);
        member.typeSpot = gui.textShell(typeName, "td", member.div, ["typename", typeName]);
        member.nameSpot = gui.textShell(name, "td", member.div);
    }
    
    statementProto.openChild = function openChild(memberId, name, type) {
        gui.element("input", this.members.querySelector("[memberid=\""+memberId+"\"]"), ["childname", name, "placeholder", "child " + name + ", must be type " + type]).addEventListener("change", statementType.childNameListener);
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
    
    statementProto.setMemberName = function setMemberName(memberId, name) {
        //this.simple.querySelector("[memberid=\""+memberId+"\"] .newmembername").value = name;
    }
    
    statementType.inUniverseListener = function inUniverseToggle(e) {
        let link = pageType.getLinkFromEvent(e);
        link.dm("inUniverse", link.inUniverseButton.textContent === "Insert into universe");
    }
    
    statementProto.isInUniverse = function isInUniverse(isIn) {
        this.inUniverseButton.textContent = isIn? "Remove from universe": "Insert into universe";
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
        for (let member of graph.members.items) if (member.id) link.showMember(member);
        link.dm("canModify", graph.canModify());
        link.dm("setGraphId", graph.ui);
    }
    statementProto.canModify = function canModify() {
        this.dm("canModify", this.page.graph.canModify());
    }
    statementProto.newMember = function newMember(name, typeName, typePageId) {
        this.page.graph.addMember(name, getGraphFromPageId(typePageId).ui, typeName);
    }
    statementProto.showMember = function showMember(member) {
        let graph = this.page.graph;
        this.dm("setTypeName", graph.usesTypes[member.type], Graph.graph(member.type).page.fullName);
        this.dm("newMember", member.name, graph.usesTypes[member.type]);
    }
    statementProto.setChild = function setChild(memberId, childName, childMemberName) {
        this.page.graph.member(memberId).setChild(childName, this.page.graph.membersByName[childMemberName]);
    }
    statementProto.inUniverse = function inUniverse(putIn) {
        let graph = this.page.graph;
        if (graph.isInUniverse == putIn) return;
        else graph.putInUniverse(putIn);
    }
}

pageType.extensions.statement = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}