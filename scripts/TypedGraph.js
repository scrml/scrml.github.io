// Typed graphs are the structures of statements as graphs. Added functionality over Graph is type matching and the root element
let Graph = scrmljs.Graph, TypedGraph = scrmljs.Graph.TypedGraph = {}, isEmpty = scrmljs.isEmpty, emptyFunction = scrmljs.emptyFunction, subset = scrmljs.subset, universeProto, universe;

TypedGraph.protoModel = Object.create(Graph.protoModel);
TypedGraph.protoModel.thisIs = "TypedGraph";

TypedGraph.newGraph = function newGraph(protoModel = TypedGraph.protoModel) {
    let returner = Graph.newGraph(protoModel);
    returner.isInUniverse = false;
    returner.changeUsedByType = returner.changeUsesType = emptyFunction; // don't do the type dependency thing for the root element
    returner.addMember(0, returner.ui, returner.ui, memberProto); // root element
    // undo override
    delete returner.changeUsedByType;
    delete returner.changeUsesType;
    return returner;
}

let memberProto = TypedGraph.protoModel.memberProto = Object.create(Graph.protoModel.memberProto);

TypedGraph.protoModel.addMember = function addMember(name, type, typeName = type, protoModel = this.memberProto) {
    let member = Graph.protoModel.addMember.call(this, name, type, typeName, protoModel);
    if (member.memberId) this.member(0).setChild(name, member.memberId);
    return member;
}

memberProto.setChild = function setChild(childName, childMemberId, protoModel = this.childProto) {
    Graph.protoModel.memberProto.setChild.call(this, childName, childMemberId, protoModel);
    if (this.memberId == 0) return;
    let graph = this.graph, root = graph.member(0), childMember = graph.member(childMemberId);
    if (childMember.name in root.childrenByName) root.unsetChild(childMember.name); 
}

memberProto.unsetChild = function unsetChild(childName) {
    if (!(childName in this.childrenByName)) throw Error("cannot find child " + childName);
    let graph = this.graph, root = graph.member(0), oldChild = graph.member(this.childrenByName[childName].memberId);
    Graph.protoModel.memberProto.unsetChild.call(this, childName);
    if (this.memberId == 0) return;
    if (isEmpty(oldChild.ancestors)) root.setChild(oldChild.name, oldChild.memberId);
}

TypedGraph.protoModel.maximalTerms = function maximalTerms() {
    let returner = [];
    for (let max of this.member(0).children.items) returner.push(this.member(max.memberId));
    return returner;
}

TypedGraph.protoModel.usesType = function usesType(type) {
    for (let member of this.members.items) if (member.memberId && (member.type == type)) return true;
    return false;
}

// get a list of all possible next terms
/*TypedGraph.protoModel.canFits = function canFits() {
    let returner = {};
    for (let graph of allGraphs) if (this.canFit(graph)) returner[graph.ui] = undefined;
    return returner;
}*/

/*TypedGraph.protoModel.allHomomorphismsFromGraph = function allHomomorphismsFromGraph(graph) {
    
}*/

TypedGraph.protoModel.isGenesis = function isGenesis() {return this.members.items.length === 1};

// type is the definition graph, term is the term currently being checked in this graph, template is the corresponding term in the definition
TypedGraph.protoModel.checkTerm = function checkTerm(type, term, template, encountered) {
    let member = this.member(term), inType = type.member(template);
    if (!(type === Graph.graph(member.type))) throw Error("cannot find type " + member.type + " from " + term);
    // check that types are the same
    if (member.type !== inType.type) throw Error("type of " + term + " is " + member.type + " but it should be " + inType.type);
    // check that the required descendant sctructure is present
    for (let childName in inType.childrenByName) {
        if (!(childName in member.childrenByName)) throw Error(term + " does not have child named " + childName);
        let child = member.childrenByName[childName], typeChild = inType.childrenByName[childName];
        if (!(typeChild in encountered)) encountered[typeChild] = child;
        if (child !== encountered[typeChild]) throw Error("definition mismatch, " + child + " should be " + encountered[typeChild]);
        // recursive step to exhaust the descendants
        this.checkTerm(type, child, typeChild, encountered);
    }
}
// check that the terms in this typed graph match their types
TypedGraph.protoModel.checkMatchType = function checkMatchType() {
    for (let term of this.members.items) if (term.memberId === 0) continue; else this.checkTerm(Graph.graph(term.type), term.memberId, 0, {});
}

universeProto = TypedGraph.universeProto = Object.create(Graph.protoModel);
universe = TypedGraph.universe = Graph.newGraph(universeProto);

TypedGraph.protoModel.putInUniverse = function putInUniverse(putIn) {
    if (this.isInUniverse == putIn) return;
    this.isInUniverse = putIn;
    if (putIn) {
        universe.addMember(this.ui);
    } else {
        universe.member(universe.membersByName[this.ui]).deleteMember();
    }
}

TypedGraph.protoModel.setUi = function setUi(newUi, oldUi) {
    Graph.protoModel.setUi.call(this, newUi, oldUi);
}

TypedGraph.protoModel.saveToAutosaveString = function saveToAutosaveString() {
    let line = this.members.items.length-1, encounteredTypes = {};
    for (let member of this.members.items) if (member.memberId) line += "\n" + member.saveToAutosaveString((member.type in encounteredTypes)? undefined: encounteredTypes[member.type] = this.usesTypes[member.type]);
    return line;
}