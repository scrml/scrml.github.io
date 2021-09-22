let pageType = scrmljs.mainLink.types.page, statementType, gui = scrmljs.gui, editor = scrmljs.editor, getPageIdFromFullName = scrmljs.getPageIdFromFullName, fullPageNameOptionsByName = scrmljs.fullPageNameOptionsByName, allFullPageNames = scrmljs.allFullPageNames;

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
        page.simple = gui.element("div", page.div, ["class", "simple", "canmodify", "false", "genesis", "", "notypes", ""]);
        page.inUniverseButton = gui.button("Insert into universe", page.simple, statementType.inUniverseListener);
        page.typeNames = {};
        page.typeNamesOptions = gui.element("datalist", null);
        page.typeNamesDiv = gui.element("table", page.simple, ["class", "typenames"]);
        gui.textShell("Type Names", "caption", page.typeNamesDiv);
        page.typeNamesHeader = gui.element("thead", page.typeNamesDiv);
        gui.textShell("Name", "th", page.typeNamesHeader);
        gui.textShell("Full Name", "th", page.typeNamesHeader);
        page.emptySpan = gui.textShell("This statement is empty (Genesis)", "p", page.simple, ["class", "genesis"]);
        page.members = {};
        page.membersDiv = gui.element("table", page.simple, ["class", "members"]);
        gui.textShell("Members", "caption", page.membersDiv);
        page.membersDivHeader = gui.element("thead", page.membersDiv);
        gui.textShell("Type", "th", page.membersDivHeader);
        gui.textShell("Name", "th", page.membersDivHeader);
        page.childrenTitle = gui.textShell("Children", "th", page.membersDivHeader, ["colspan", "0"]);
        page.newMemberDiv = gui.element("div", page.simple, ["class", "newmember"]);
        page.newMemberName = gui.screenedInput(page.newMemberDiv, {placeholder: "name", atts: ["class", "newmembername"]});
        page.newMemberName.addEventListener("change", statementType.newMemberNameChangeListener);
        page.newMemberType = gui.element("input", page.newMemberDiv, ["class", "newmembertype", "type", "text", "list", "allfullpagenames", "disguise", "", "placeholder", "type"]);
        page.newMemberType.addEventListener("change", statementType.newMemberTypeChangeListener);
        page.newMemberType.addEventListener("focus", statementType.newMemberTypeFocusListener);
        page.newMemberType.addEventListener("blur", statementType.newMemberTypeBlurListener);
        page.newMemberButton = gui.button("Create", page.newMemberDiv, statementType.newMemberEntered, ["class", "newmembertype", "disabled", ""]);
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
            let popup = gui.popups.inputText(link.div, function() {
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
            input.setAttribute("title", link.typeNames[input.value].fullName);
            if (link.newMemberName.value !== "") link.newMemberButton.removeAttribute("disabled");
            input.blur();
        }
    }
    
    statementType.newMemberTypeFocusListener = function newMemberTypeFocusListener(e) {
        e = pageType.getLinkFromEvent(e);
        allFullPageNames.insertBefore(e.typeNamesOptions, allFullPageNames.firstChild);
    }
    
    statementType.newMemberTypeBlurListener = function newMemberTypeBlurListener(e) {
        e = pageType.getLinkFromEvent(e);
        allFullPageNames.removeChild(e.typeNamesOptions);
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
    
    statementProto.setTypeName = function setTypeName(typeName, typeFullName, oldTypeName) {
        this.simple.removeAttribute("notypes");
        if (!this.typeNames[typeName]) {
            let type = this.typeNames[typeName] = {name: typeName, memberOptions: gui.element("datalist")};
            type.div = gui.element("tr", this.typeNamesDiv, ["typename", typeName]);
            //type.nameSpot = gui.textShell(typeName, "td", type.div);
            type.nameSpot = gui.element("td", type.div);
            type.nameIn = gui.element("input", type.nameSpot, ["disguise", ""]);
            gui.dynamizeWidth(type.nameIn);
            type.nameIn.addEventListener("change", statementType.typeNameNameChangeListener);
            type.fullNameSpot = gui.textShell("", "td", type.div);
            type.option = gui.textShell("", "option", this.typeNamesOptions);
        }
        let type = this.typeNames[typeName];
        type.name = typeName;
        type.fullName = typeFullName;
        type.nameIn.value = typeName;
        type.nameIn.fixWidth();
        type.fullNameSpot.firstChild.nodeValue = typeFullName;
        type.option.value = typeName;
        type.fullName = typeFullName;
        let member;
        for (let memberName in this.members) {
            member = this.members[memberName];
            if (member.div.getAttribute("typename") === oldTypeName) {
                member.div.setAttribute("typename", typeName);
                member.typeSpot.textContent = typeName;
            }
            for (let element of member.div.querySelectorAll("[typename=\""+oldTypeName+"\"]")) element.setAttribute("typename", typeName);
            for (let element of member.div.querySelectorAll("[childtype=\""+oldTypeName+"\"]")) element.setAttribute("childtype", typeName);
        }
    }
    
    statementProto.eraseTypeName = function eraseTypeName(typeName) {
        let type = this.typeNames[typeName];
        gui.orphan(type.div);
        gui.orphan(type.option);
        delete this.typeNames[typeName];
        if (isEmpty(this.typeNames)) this.simple.setAttribute("notypes", "");
    }
    
    statementType.typeNameNameChangeListener = function changeTypeName(e) {
        let input = e.target, link = pageType.getLinkFromEvent(e), value = input.value, row = statementType.typeNameClimber(input), oldTypeName = row.getAttribute("typename");
        if (!gui.nodeNameScreen(value)) return gui.messages.inputText(input, "invalid nodename");
        for (let type in link.typeNames) if (value === type) return gui.messages.inputText(input, "name conflict");
        link.typeNames[value] = link.typeNames[oldTypeName];
        delete link.typeNames[oldTypeName];
        row.setAttribute("typename", value);
        link.dm("changeTypeName", oldTypeName, value);
        input.blur();
    }
    
    statementType.typeNameClimber = gui.basicClimber("[typename]", editor);
    
    statementProto.newMember = function newMember(typeName, memberName) {
        this.simple.removeAttribute("genesis");
        let member = this.members[memberName] = {name: memberName, type: typeName};
        member.div = gui.element("tr", this.membersDiv, ["class", "member", "membername", memberName, "typename", typeName]);
        member.typeSpot = gui.textShell(typeName, "td", member.div);
        member.nameSpot = gui.element("input", gui.element("td", member.div), ["type", "text", "disguise", ""]);
        member.nameSpot.value = memberName;
        gui.dynamizeWidth(member.nameSpot);
        member.nameSpot.addEventListener("change", statementType.memberNameListener);
        member.nameSpot.addEventListener("blur", statementType.memberBlurListener);
        let type = this.typeNames[typeName];
        member.nameOption = gui.textShell(memberName, "option", type.memberOptions);
        gui.sortTextShells(type.memberOptions);
    }
    
    statementType.memberNameListener = function memberNameListener(e) {
        let input = e.target, link = pageType.getLinkFromEvent(e), value = input.value, row = statementType.typeNameClimber(e);
        if (!gui.nodeNameScreen(value)) return gui.messages.inputText(input, "invalid nodeName");
        for (let memberName in link.members) if (memberName === value) return gui.messages.inputText(input, "name conflict");
        link.dm("tryChangeMemberName", row.getAttribute("membername"), value);
        input.blur();
    }
    
    statementProto.memberNameChangeFail = function memberNameChangeFail(oldName, newName) {
        let member = this.members[oldName];
        gui.messages.inputText(member.nameSpot, "name conflict");
    }
    
    statementProto.changeMemberName = function changeMemberName(oldName, newName) {
        let member = this.members[oldName];
        delete this.members[oldName];
        this.members[newName] = member;
        member.div.setAttribute("membername", newName);
        gui.messages.setInputValue(member.nameSpot, newName);
        member.nameOption.textContent = newName;
        gui.sortTextShells(member.nameOption.parentElement);
        let childNode, labelId, childName;
        for (let i = 2; i < member.div.childNodes.length; ++i) {
            childNode = member.div.childNodes[i];
            childName = childNode.getAttribute("childname");
            labelId = "page"+this.linkId+".member"+newName+".child"+childName;
            childNode.setAttribute("labelid", labelId);
            childNode.firstChild.setAttribute("for", labelId);
            childNode.lastChild.setAttribute("id", labelId);
        }
        let otherMember;
        for (let otherMemberName in this.members) {
            otherMember = this.members[otherMemberName];
            for (let i = 2; i < otherMember.div.childNodes.length; ++i) {
                childNode = otherMember.div.childNodes[i];
                if (childNode.getAttribute("childmember") === oldName) {
                    childNode.setAttribute("childmember", newName);
                    for (let option of childNode.lastChild.childNodes) if (option.textContent === oldName) option.textContent = newName;
                }
            }
        }
    }
    
    statementType.memberBlurListener = function memberBlurListener(e) {
        let input = e.target, row = statementType.typeNameClimber(input);
        gui.messages.setInputValue(input, row.getAttribute("membername"));
    }
    
    statementProto.setChildren = function setChildren(memberName, childrenInfo) {
        let member = this.members[memberName], row = member.div, nameChild = member.nameSpot.parentElement;
        while (row.lastChild !== nameChild) row.removeChild(row.lastChild);
        let td, labelId, select;
        for (let child of childrenInfo) {
            labelId = "page"+this.linkId+".member"+memberName+".child"+child.name;
            td = gui.element("td", row, ["childname", child.name, "childmember", child.member, "childtype", this.members[child.member].type, "labelid", labelId]);
            gui.textShell(child.name, "label", td, ["for", labelId]);
            select = gui.element("select", td, ["id", labelId]);
            gui.textShell(child.member, "option", select);
            select.addEventListener("focus", statementType.childSelectFocusListener);
            select.addEventListener("blur", statementType.childSelectBlurListener);
            select.addEventListener("change", statementType.childSelectChangeListener);
        }
        let maxChildren = 0;
        for (let otherMemberName in this.members) {
            member = this.members[otherMemberName];
            maxChildren = Math.max(maxChildren, member.div.children.length);
        }
        this.childrenTitle.setAttribute("colspan", maxChildren - 2);
    }
    
    statementProto.hideMember = function hideMember(memberName) {
        let member = this.members[memberName];
        gui.orphan(member.div);
        delete this.members[memberName];
    }
    
    statementType.childSelectFocusListener = function childSelectFocusListener(e) {
        let select = e.target, link = pageType.getLinkFromEvent(e), value = select.value;
        gui.filicide(select);
        for (let option of link.typeNames[link.members[value].type].memberOptions.childNodes) {
            gui.textShell(option.value, "option", select);
            if (option.value === value) select.selectedIndex = select.childElementCount - 1;
        }
    }
    
    statementType.childSelectBlurListener = function childSelectBlurListener(e) {
        let select = e.target, value = select.value;
        gui.filicide(select);
        gui.textShell(value, "option", select);
    }
    
    statementType.childSelectChangeListener = function childSelectChangeListener(e) {
        let select = e.target, link = pageType.getLinkFromEvent(e), td = statementType.childNameClimber(select), row = statementType.typeNameClimber(select);
        link.dm("setChild", row.getAttribute("membername"), td.getAttribute("childname"), select.value);
    }
    
    statementType.childNameClimber = gui.basicClimber("[childname]", editor);
    
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
        link.memberUnlinks = {};
        link.visibleTypes = {};
        for (let type in graph.usesTypes) link.showType(type);
        for (let member of graph.members.items) if (member.id) link.showMember(member);
        link.dm("canModify", graph.canModify());
    }
    
    statementProto.canModify = function canModify() {
        this.dm("canModify", this.page.graph.canModify());
    }
    
    statementProto.showType = function showType(type) {
        if (type in this.visibleTypes) return;
        let me = this, graph = this.page.graph, typeGraph = Graph.graph(type);
        this.visibleTypes[type] = typeGraph.page.manager.linkListener("fullName", function(newFullName) {
            me.dm("setTypeName", graph.usesTypes[pagesByFullName[newFullName].graph.ui], newFullName);
        }, true);
    }
    
    statementProto.changeTypeName = function changeTypeName(oldTypeName, newTypeName) {
        let graph = this.page.graph;
        graph.changeUsesType(graph.typesByName[oldTypeName], true, newTypeName);
        this.page.preSave();
    }
    
    statementProto.newMember = function newMember(name, typeName, typePageId) {
        this.page.graph.addMember(name, getGraphFromPageId(typePageId).ui, typeName);
    }
    
    statementProto.showMember = function showMember(member) {
        if (member.isVisible) throw Error("member " + member.name + " already visible");
        member.isVisible = true;
        let unlinks = member.guiUnlinks = [], graph = this.page.graph;
        if (member.graph !== graph) throw Error("cannot show member of a different graph");
        this.dm("newMember", graph.usesTypes[member.type], member.name);
        let me = this;
        unlinks.push(member.manager.linkListener("name", function(newName, oldName) {
            me.dm("changeMemberName", oldName, newName);
        }));
        let childInfo = [];
        for (let child of member.children.items) {
            let childMember = graph.member(child.memberId);
            childInfo.push({
                name: child.name,
                member: graph.member(child.memberId).name
            });
        }
        this.dm("setChildren", member.name, childInfo);
    }
    
    statementProto.hideMember = function hideMember(member) {
        if (!member.isVisible) throw Error("member " + member.name + " already hidden");
        member.isVisible = false;
        for (let unlink of member.guiUnlinks) unlink.unlink();
        member.guiUnlinks.splice(0, member.guiUnlinks.length);
        this.dm("hideMember", member.name);
    }
    
    statementProto.tryChangeMemberName = function tryChangeMemberName(oldName, newName) {
        let graph = this.page.graph, member = graph.memberByName(oldName);
        if (member.canChangeName(newName)) member.manager.setVarValue("name", newName);
        else this.dm("memberNameChangeFail", oldName, newName);
    }
    
    statementProto.setChild = function setChild(memberName, childName, childMemberName) {
        let graph = this.page.graph;
        graph.memberByName(memberName).setChild(childName, graph.membersByName[childMemberName]);
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