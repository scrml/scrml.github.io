{
    let unitProto = {
        unlink: function() {
            this.next.previous = this.previous;
            this.previous.next = this.next;
        }
    }

    let changeProto = {
        addUnit: function(lastOne, unit) {
            lastOne.previous.next = unit;
            unit.previous = lastOne.previous;
            lastOne.previous = unit;
            unit.next = lastOne;
        }
    }

    let varManagerProtoModel = {
        setVarValue: function setVarValue(name, value) {
            if (!(name in this.vars)) {
                let linkedLists = Object.create(changeProto);
                this.vars[name] = linkedLists;
                linkedLists.firstProperty = {};
                linkedLists.lastProperty = {previous: linkedLists.firstProperty, object: linkedLists, propertyName: "value"};
                linkedLists.firstProperty.next = linkedLists.lastProperty;
                linkedLists.firstListener = {};
                linkedLists.lastListener = {previous: linkedLists.firstListener, listener: emptyFunction};
                linkedLists.firstListener.next = linkedLists.lastListener;
                linkedLists.firstUnlink = {};
                linkedLists.lastUnlink = {previous: linkedLists.firstUnlink, unlink: emptyFunction};
                linkedLists.firstUnlink.next = linkedLists.lastUnlink;
            }
            let change = this.vars[name], unit = change.firstProperty, oldValue = change.value;
            while (unit = unit.next) unit.object[unit.propertyName] = value;
            unit = change.firstListener;
            while (unit = unit.next) unit.listener(value, oldValue);
        },

        deleteVar: function deleteVar(varName) {
            let unit = this.vars[varName].firstUnlink;
            while (unit = unit.next) unit.unlink();
            delete this.vars[varName];
        },

        linkProperty: function linkProperty(varName, object, propertyName = varName) {
            let change = this.vars[varName];
            object[propertyName] = change.value;
            let unit = Object.create(unitProto);
            unit.object = object;
            unit.propertyName = propertyName;
            change.addUnit(change.lastProperty, unit);
            let unlinkUnit = {};
            unlinkUnit.unlink = function() {
                unit.unlink();
                unit.unlink.call(unlinkUnit);
            }
            change.addUnit(change.lastUnlink, unlinkUnit);
            return unlinkUnit.unlink;
        },

        linkListener: function linkListener(varName, listener, fireWith = undefined) {
            let change = this.vars[varName];
            if (typeof fireWith != "undefined") listener(change.value, fireWith);
            let unit = Object.create(unitProto);
            unit.listener = listener;
            change.addUnit(change.lastListener, unit);
            let unlinkUnit = {};
            unlinkUnit.unlink = function() {
                unit.unlink();
                unit.unlink.call(unlinkUnit);
            }
            change.addUnit(change.lastUnlink, unlinkUnit);
            return unlinkUnit.unlink;
        },

        clearAll: function clearAll() {
            for (let v in this.vars) this.deleteVar(v);
        },

        numLinkeds: function numLinkeds(varName) {
            let returner = 0;
            if (varName === undefined) {
                for (let name in this.vars) returner += this.numLinkeds(name);
                return returner;
            }
            let change = this.vars[varName];
            let unit = change.firstProperty.next;
            while (unit) {
                ++returner;
                unit = unit.next;
            }
            unit = change.firstListener.next;
            while (unit) {
                ++returner;
                unit = unit.next;
            }
            unit = change.firstUnlink.next;
            while (unit) {
                ++returner;
                unit = unit.next;
            }
            return returner;
        },

        numAllLinkeds: function numAllLinkeds() {
            let returner = 0;
            for (let name in this.vars) returner += this.numLinkeds(name);
            return returner;
        }
    }
    
    function newVarManager() {
        let returner = Object.create(varManagerProtoModel);
        returner.vars = {};
        return returner;
    }
}