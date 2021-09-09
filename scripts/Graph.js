// First we create plain graphs. Structure consists of ui (universal identifier), typed members, named edges, and ancestry.
let Graph = scrmljs.Graph = {}, idManager = scrmljs.idManager, newVarManager = scrmljs.newVarManager, isEmpty = scrmljs.isEmpty, emptyFunction = scrmljs.emptyFunction, trueFunction = scrmljs.trueFunction;

Graph.allGraphs = idManager.newManager("ui");
Graph.graph = function graph(ui) {
    if (!Graph.allGraphs.items[ui]) throw Error("cannot find graph " + ui);
    return Graph.allGraphs.items[ui];
};

Graph.protoModel = {thisIs: "Graph"};// object to be used as prototype of instances of graph
    
Graph.newGraph = function newGraph(protoModel = Graph.protoModel) {
    let returner = Object.create(protoModel), manager = returner.manager = newVarManager();
    returner.usesTypes = {};
    returner.typesByName = {};
    returner.usedByTypes = {};
    // override setUi, the prototype wants to update the manager but the manager can't be initialized yet
    returner.setUi = function(ui) {this.ui = ui};
    Graph.allGraphs.addItem(returner);
    // undo the override
    delete returner.setUi;
    manager.setVarValue("ui", returner.ui);
    returner.members = idManager.newManager("memberId");
    returner.membersByName = {};
    return returner;
}

// Test directly if this type is in use, instead of checking usesTypes, in case it is ever necessary. Usually just check if type is in this.usesTypes
Graph.protoModel.usesType = function usesType(type) {
    for (let member of this.members.items) if (member.type == type) return true;
    return false;
}

Graph.protoModel.isEmpty = function isEmpty() {return this.members.items.length === 0}
Graph.protoModel.canDelete = function canDelete() {return isEmpty(this.usedByTypes)}

Graph.protoModel.deleteGraph = function deleteGraph() {
    if (!this.canDelete()) throw Error("cannot delete graph");
    for (let ui in this.usesTypes) Graph.graph(ui).changeUsedByType(this.ui, false);
    Graph.allGraphs.preErase(this.ui);
}

let memberProto = Graph.protoModel.memberProto = {}, childProto = memberProto.childProto = {};

// The only place a member is stored is in the graph's members manager. Everywhere else members are referred to by memberId.
Graph.protoModel.addMember = function addMember(name, type = name, typeName = type, protoModel = this.memberProto) {
    if (name in this.membersByName) throw Error("already have a member named " + name);
    if (type in this.usesTypes && this.usesTypes[type] != typeName) throw Error("type name conflict");
    let typeGraph = Graph.graph(type);
    let member = Object.create(protoModel);
    member.graph = this;
    let manager = member.manager = newVarManager();
    member.unlinks = [];
    manager.setVarValue("name", name);
    manager.linkProperty("name", member);
    manager.linkListener("name", function(newName, oldName) {member.moveInByName(newName, oldName)}, true);
    member.unlinks.push(typeGraph.manager.linkListener("ui", function(newUi) {manager.setVarValue("type", newUi)}, true));
    manager.linkProperty("type", member);
    // children is an idManager list of (name, memberId) pairs
    member.children = idManager.newManager("childId");
    member.childrenByName = {};
    member.ancestors = {};
    member.descendants = {};
    this.members.addItem(member);
    member.originalId = member.id; // for testing member erasing, to be removed later
    typeGraph.changeUsedByType(this.ui, true, typeName);
    this.changeUsesType(type, true, typeName);
    this.saveStringChangedHook();
    return member;
}

// don't call these marks directly, instead call change below
Graph.protoModel.markUsesType = function markUsesType(type, typeName, oldTypeName) {
    this.usesTypes[type] = typeName;
    this.typesByName[typeName] = type;
    if (typeof oldTypeName !== "undefined") delete this.typesByName[oldTypeName];
}
Graph.protoModel.markNotUsesType = function markNotUsesType(type) {
    delete this.typesByName[this.usesTypes[type]];
    delete this.usesTypes[type];
}
Graph.protoModel.markUsedByType = function markUsedByType(type, typeName) {this.usedByTypes[type] = typeName}
Graph.protoModel.markNotUsedByType = function markNotUsedByType(type) {delete this.usedByTypes[type]}

Graph.protoModel.changeUsesType = function changeUsesType(type, use, typeName) {
    if (use) {
        if (!(type in this.usesTypes) || (this.usesTypes[type] !== typeName)) this.markUsesType(type, typeName, this.usesTypes[type]);
    } else {
        if (type in this.usesTypes) this.markNotUsesType(type);
    }
}

Graph.protoModel.changeUsedByType = function changeUsedByType(type, use, typeName) {
    if (use) {
        if (!(type in this.usedByTypes)) this.markUsedByType(type, typeName);
    } else {
        if (type in this.usedByTypes) this.markNotUsedByType(type);
    }
}

Graph.protoModel.canAddMember = function canAddMember(name, type) {
    if (!this.canModify()) return false;
    if (name in this.membersByName) return false;
}

{
    let relate = function relate(members, old, young) {
        let oldM = members[old], youngM = members[young], omd = oldM.descendants, oma = oldM.ancestors, ymd = youngM.descendants, yma = youngM.ancestors;
        if (old in ymd) throw Error("graph must be acyclic");
        if (old in yma) return;
        omd[young] = undefined;
        yma[old] = undefined;
        for (let younger in ymd) relate(members, old, younger);
        for (let older in oma) relate(members, older, young);
    }
    // this can probably be made orders of magnitude faster with a different algorithm
    Graph.protoModel.resetAncestry = function resetAncestry(...theseMembers) {
        let relevants = {}, members = this.members;
        // the only ones which could possibly change are the members given and their families so collect these
        for (let member of theseMembers) {
            relevants[member] = undefined;
            for (let ancestor in members.items[member].ancestors) relevants[ancestor] = undefined;
            for (let descendant in members.items[member].descendants) relevants[descendant] = undefined;
        }
        // get the members instead of just their ids
        for (let member in relevants) relevants[member] = members.items[member];
        // reset the families of the relevant members
        for (let member in relevants) {
            member = relevants[member];
            member.ancestors = {};
            member.descendants = {};
        }
        // relate all the relevant members
        for (let member in relevants) {
            member = relevants[member];
            for (let childName of member.children.items) relate(members.items, member.memberId, childName.memberId);
        }
        for (let member in relevants) relevants[member].notifyFamilyUpdate();
    }
}

// check if I have all the required types to create a new term
Graph.protoModel.canFit = function canFit(graph) {
    for (let required in graph.usesTypes) if (!(required in this.usesTypes)) return false;
    return true;
}

Graph.protoModel.canModify = trueFunction;
Graph.protoModel.setUi = function setUi(ui) {this.manager.setVarValue("ui", ui)}
Graph.protoModel.member = function member(id) {return this.members.items[id]}
Graph.protoModel.memberByName = function memberByName(name) {return this.member(this.membersByName[name])}
Graph.protoModel.eraseMember = function eraseMember(id) {this.member(id).deleteMember()}
Graph.protoModel.eraseMemberByName = function eraseMember(name) {this.memberByName(name).deleteMember()}
Graph.protoModel.saveStringChangedHook = emptyFunction;

Graph.protoModel.saveToAutosaveString = function saveToAutosaveString() {
    let line = this.members.items.length, encounteredTypes = {};
    for (let member of this.members.items) line += "\n" + member.saveToAutosaveString((member.type in encounteredTypes)? undefined: encounteredTypes[member.type] = this.usesTypes[member.type]);
    return line;
}

memberProto.moveInByName = function moveInByName(name, oldName) {
    if (name == oldName) return;
    let byName = this.graph.membersByName;
    if (name in byName) throw Error("name " + name + " is already in use");
    byName[name] = this.memberId;
    if (typeof oldName === "undefined") return;
    delete byName[oldName];
}

memberProto.canChangeName = function canChangeName(newName) {
    let graph = this.graph, typeGraph = Graph.graph(this.type);
    if (newName in graph.membersByName) return false;
    return true;
}

// Set child named childName to childMemberId. If I already have a child named childName I first unset then child. Then I reset my own ancestry to check for cycles.
memberProto.setChild = function setChild(childName, childMemberId, protoModel = this.childProto) {
    let graph = this.graph, members = graph.members.items, byName = this.childrenByName;
    if (!members[childMemberId]) throw Error(childMemberId + " is not a member of graph " + graph.ui);
    if (childName in byName) this.unsetChild(childName);
    let child = Object.create(protoModel);
    let manager = child.manager = newVarManager();
    manager.setVarValue("name", childName);
    manager.linkProperty("name", child);
    manager.linkListener("name", function(newName, oldName) {
        delete byName[oldName];
        byName[newName] = child;
    }, true);
    manager.setVarValue("memberId", childMemberId);
    manager.linkProperty("memberId", child);
    this.children.addItem(child);
    graph.resetAncestry(this.memberId);
    graph.saveStringChangedHook();
}

// check if setting this child is allowed, i.e. won't introduce any cycles
memberProto.canSetChild = function canSetChild(childName, childMemberId) {
    if (this.memberId == childMemberId) return false;
    let graph = this.graph, newChild = graph.member(childMemberId);
    for (let child of this.children.items) if (child.name !== childName && (childMemberId in graph.member(child.memberId).descendants)) return false;
}

memberProto.unsetChild = function unsetChild(childName) {
    let children = this.children, byName = this.childrenByName, child = byName[childName];
    if (!(child)) throw Error(childName + " is not a child");
    children.preErase(child.childId);
    delete byName[childName];
    children.flushErasePreserveOrder();
    let graph = this.graph;
    graph.resetAncestry(this.memberId, child.memberId);
    graph.saveStringChangedHook();
}

memberProto.canDelete = function canDelete() {return isEmpty(this.ancestors)}
// to be overridden if anything later wants to keep updated with a member's family
memberProto.notifyFamilyUpdate = emptyFunction;

memberProto.deleteMember = function deleteMember() {
    if (!this.canDelete()) throw Error("cannot delete member");
    for (let unlink of this.unlinks) unlink.unlink();
    let graph = this.graph, members = graph.members, myType = this.type, inUse = false;
    for (let d in this.descendants) delete graph.member(d).ancestors[this.memberId];
    members.preErase(this.id);
    members.flushErasePreserveOrder();
    delete graph.membersByName[this.name];
    for (let member of members.items) inUse = inUse || (member.type == myType);
    if (!inUse) {
        graph.changeUsesType(myType, false);
        Graph.graph(myType).changeUsedByType(graph.ui, false);
    }
}

// to be called by the idManager only
memberProto.setMemberId = function setMemberId(newMemberId, oldMemberId) {
    let graph = this.graph, members = graph.members.items;
    this.memberId = newMemberId;
    graph.membersByName[this.name] = newMemberId;
    if (typeof oldMemberId !== "undefined") {
        for (let member of members) {
            for (let child of member.children.items) if (child.memberId == oldMemberId) child.memberId = newMemberId;
            if (oldMemberId in member.ancestors) {
                member.ancestors[newMemberId] = undefined;
                delete member.ancestors[oldMemberId];
            } else if (oldMemberId in member.descendants) {
                member.descendants[newMemberId] = undefined;
                delete member.descendants[oldMemberId];
            }
        }
    }
    graph.saveStringChangedHook();
}

memberProto.saveToAutosaveString = function saveToAutosaveString(typeName) {
    let line = this.name + " " + this.type + (typeof typeName === "undefined"? "": " " + typeName);
    for (let child of this.children.items) line += " " + child.name + " " + child.memberId;
    return line;
}

function printGraphs() {
    for (let graph of Graph.allGraphs.items) {
        console.log("graph " + graph.ui + ": " + graph.name);
        console.log(graph.saveToAutosaveString());
    }
    console.log("_________________________________________________________________________");
}