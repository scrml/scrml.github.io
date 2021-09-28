let varManager = scrmljs.varManager = {}, protoModel = varManager.protoModel = {}, idManager = scrmljs.idManager;

scrmljs.newVarManager = function newVarManager(protoModel = varManager.protoModel) {
    let returner = Object.create(protoModel);
    returner.vars = {};
    returner.byNames = {};
    return returner;
}

protoModel.setVarValue = function setVarValue(name, value) {
    if (!this.vars[name]) this.vars[name] = idManager.newManager("varManagerId");
    let varPart = this.vars[name];
    let oldValue = varPart.value;
    if (oldValue === value) return;
    varPart.value = value;
    for (let item of varPart.items) item.updateValue(value, oldValue);
    if (name in this.byNames) {
        console.log("managing byName " + name);
    }
}

let updateValue = function updateValue(newValue) {this.object[this.property] = newValue};
let unlink = function unlink() {this.varManager.unlink(this.varName, this.varManagerId)};

protoModel.linkProperty = function linkProperty(varName, object, property = varName) {
    if (!this.vars[varName]) throw Error("varManager cannot find varName " + varName);
    let adder = {
        varManager: this,
        varName: varName,
        updateValue: function(newValue) {object[property] = newValue},
        unlink: unlink
    }
    this.vars[varName].addItem(adder);
    object[property] = this.vars[varName].value;
    return adder;
}

protoModel.linkListener = function linkListener(varName, listener, fireWith = undefined) {
    if (!this.vars[varName]) throw Error("varManager cannot find varName " + varName);
    let adder = {
        varManager: this,
        varName: varName,
        updateValue: listener,
        unlink: unlink
    }
    this.vars[varName].addItem(adder);
    if (typeof fireWith !== "undefined") listener(this.vars[varName].value, undefined, fireWith);
    return adder;
}

protoModel.unlink = function unlink(varName, adder) {
    this.vars[varName].preErase(adder.id);
    this.vars[varName].flushErase();
}
protoModel.deleteVar = function deleteVar(name) {delete this.vars[name]}
protoModel.clearAll = function clearAll() {for (let varName of Object.keys(this.vars)) this.deleteVar(varName)}