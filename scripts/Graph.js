// First we create plain graphs. Structure consists of ui (universal identifier), typed members, named edges, and ancestry.
let Graph = scrmljs.Graph = {}, idManager = scrmljs.idManager, isEmpty = scrmljs.isEmpty, emptyFunction = scrmljs.emptyFunction, trueFunction = scrmljs.trueFunction;

Graph.allGraphs = [];

Graph.protoModel = {thisIs: "Graph"};// object to be used as prototype of instances of graph
    
Graph.newGraph = function newGraph(protoModel = Graph.protoModel) {
    let returner = Object.create(protoModel);
    returner.ui = Graph.allGraphs.length;
    Graph.allGraphs.push(returner);
    returner.members = idManager.newManager();
    returner.membersByName = {};
    if (Graph.universe) {
        Graph.universe.addMember(returner.ui);
        returner.updateUniverse();
    } else returner.ui = 0;
    //this.originalUi = this.ui;
    return returner;
}

Graph.protoModel.usesTypes = function usesTypes() {return Graph.universe.member(this.ui).descendants}
Graph.protoModel.usedByTypes = function usedByTypes() {return Graph.universe.member(this.ui).ancestors}
Graph.protoModel.usesType = function usesType(type) {return type in this.usesTypes()}

Graph.protoModel.canDelete = function canDelete() {return isEmpty(this.usedByTypes())}
Graph.protoModel.updateCanDelete = emptyFunction;

Graph.protoModel.deleteGraph = function deleteGraph() {
    if (!this.canDelete()) throw Error("cannot delete graph");
    let graph;
    Graph.universe.member(this.ui).deleteMember();
}

let memberProto = Graph.memberProto = {checkChildOrder: true};

// The only place a member is stored is in the graph's members manager. Everywhere else members are referred to by id
Graph.protoModel.addMember = function addMember(name, type, protoModel = this.memberProto) {
    if (type == 0 && this.ui !== 0) throw Error("cannot use universe as the type of a member");
    let member = Object.create(protoModel);
    member.graph = this;
    member.children = {};
    member.ancestors = {};
    member.descendants = {};
    member.type = type;
    // Update the universe if this member makes me depend on another graph. The universe does not depend on any graph and I am allowed to not depend on myself even if my first member is my own type. This is for the root of typed graphs.
    if (this.ui && !((this.members.items.length == 0 && this.ui == type) || this.usesType(type))) {
        Graph.universe.member(this.ui).setChild(type, type);
        this.updateUniverse();
    }
    this.members.addItem(member);
    member.setName(name);
    member.originalId = member.id;
    return member;
}

// Called any time Graph.universe is modified. It defaults to reset ancestry each time but putting it here on the prototype chain allows for overriding that behavior and postponing the universe reset ancestry until later.
Graph.protoModel.updateUniverse = function updateUniverse() {Graph.universe.resetAncestry()}

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
    Graph.protoModel.resetAncestry = function resetAncestry() {
        let members = this.members.items;
        for (let member of members) {
            member.ancestors = {};
            member.descendants = {};
        }
        for (let member of members) for (let childName in member.children) relate(members, member.id, member.children[childName]);
    }
}

Graph.protoModel.canModify = trueFunction;

// this is only called by Graph.universe's manager, it is here to be overridden in case the ui needs to be updated anywhere else
Graph.protoModel.setUi = function setUi(ui) {this.ui = ui}
Graph.protoModel.member = function member(id) {return this.members.items[id]}
Graph.protoModel.eraseMember = function eraseMember(id) {this.member(id).deleteMember()}
Graph.protoModel.flushEraseMember = function flushEraseMember() {this.members.flushErasePreserveOrder()}

Graph.protoModel.saveToAutosaveString = function saveToAutosaveString() {
    let line = this.members.items.length;
    for (let member of this.members.items) line += "\n" + member.saveToAutosaveString();
    return line;
}

memberProto.setName = function setName(name) {
    if (name == this.name) return;
    let byName = this.graph.membersByName;
    if (name in byName) throw Error("name " + name + " is already in use");
    delete byName[this.name];
    byName[name] = this.id;
    this.name = name;
}

memberProto.setChild = function setChild(childName, child) {
    if (this.checkChildOrder && this.id <= child) throw Error("can only be parent of a lower member");
    let members = this.graph.members.items;
    if (!members[child]) throw Error(child + " is not a member of graph " + this.graph.ui);
    if (childName in this.children) throw Error("already have a child named " + childName);
    this.children[childName] = child;
    this.graph.resetAncestry();
}

memberProto.unsetChild = function unsetChild(childName) {
    if (!(childName in this.children)) throw Error("trying to unset a child which is not a child");
    delete this.children[childName];
    this.graph.resetAncestry();
}

memberProto.canDelete = function canDelete() {return isEmpty(this.ancestors)}
memberProto.updateCanDelete = emptyFunction;

memberProto.deleteMember = function deleteMember() {
    if (!this.canDelete()) throw Error("cannot delete member");
    let graph = this.graph, members = graph.members, myType = this.type, inUse = false;
    for (let d in this.descendants) delete graph.member(d).ancestors[this.ui];
    for (let member of members.items) inUse = inUse || (member.type == myType && member.id !== this.id);
    if (!inUse && this.graph.ui) Graph.universe.member(graph.ui).unsetChild(myType);
    members.preErase(this.id);
    graph.flushEraseMember();
}

// to be called by the idManager only
memberProto.setId = function setId(newId) {
    let oldId = this.id, graph = this.graph, members = graph.members.items;
    this.id = newId;
    if (typeof oldId == "undefined") return;
    for (let member of members) {
        for (let childName in member.children) if (member.children[childName] == oldId) member.children[childName] = newId;
        if (oldId in member.ancestors) {
            member.ancestors[newId] = undefined;
            delete member.ancestors[oldId];
        } else if (oldId in member.descendants) {
            member.descendants[newId] = undefined;
            delete member.descendants[oldId];
        }
    }
}

memberProto.saveToAutosaveString = function saveToAutosaveString() {
    let line = this.name + " " + this.type;
    for (let childName in this.children) line += " " + childName + " " + this.children[childName];
    return line;
}

Graph.universeMemberProto = Object.create(memberProto);
Graph.universeMemberProto.checkChildOrder = false;

Graph.universeMemberProto.setId = function setUi(newUi) {
    let oldUi = this.id;
    memberProto.setId.call(this, newUi);
    if (typeof oldUi == "undefined") return;
    for (let member of this.graph.members.items) if (oldUi in member.children) {
        member.children[newUi] = member.children[oldUi];
        delete member.children[oldUi];
    }
    Graph.allGraphs[newUi] = Graph.allGraphs[oldUi];
    Graph.allGraphs[newUi].setUi(newUi);
    for (let graph of Graph.allGraphs) for (let member of graph.members.items) if (member.type == oldUi) member.type = newUi;
}

Graph.universe = Graph.newGraph();
Graph.universe.name = "universe";
Graph.universe.addMember = function addMember(type) {Graph.protoModel.addMember.call(this, type, type, Graph.universeMemberProto)};
Graph.universeMemberProto.setChild = function setChild(name, id) {
    try {memberProto.setChild.call(this, name, id)} catch (e) {
        if (e.message == "can only be parent of a lower member" || e.message === "graph must be acyclic") throw Error("created cyclic definition");
        else throw e;
    }
}
Graph.universe.addMember(0);

Graph.universe.members.flushErasePreserveOrder = function flushErasePreserveOrder() {
    let eraseCount = this.eraseThese.length;
    idManager.protoModel.flushErasePreserveOrder.call(this);
    Graph.allGraphs.splice(Graph.allGraphs.length - eraseCount);
}

function printGraphs() {
    for (let graph of Graph.allGraphs) {
        console.log("graph " + graph.ui + ": " + graph.name);
        console.log(graph.saveToAutosaveString());
    }
    console.log("_________________________________________________________________________");
}