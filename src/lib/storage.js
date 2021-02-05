var DataNode = class DataNode {

    constructor(variable, tree = {}) {
        Object.defineProperty(this, '_variable', { value: variable, enumerable: false });
        this.name = this.getVariableName()

        switch(variable.value.type.typeClass) {
            case 'uint':
                tree[this.name] = variable.value.value.asBN.toString();
                break;
            case 'mapping':
                if (!tree.name) {
                    tree[this.name] = {}
                }
                for (var i = 0; i < variable.value.value.length; i++) {
                    new DataNode(variable.value.value[i], tree[this.name]);
                }
                break;
            case 'array':
                tree[this.name] = [];
                for (var j = 0; j < variable.value.value.length; j++) {
                    tree[this.name].push(this.buildArrayChild(variable.value.value[j]))
                }
                break;
        }
        return tree;
    }

    getVariableName() {
        var name = 'N/A';
        if (this._variable.name)
            name = this._variable.name;
        if (this._variable.key) {
            switch (this._variable.key.type.typeClass) {
                case 'address':
                    name = this._variable.key.value.asAddress;
                    break;
                case 'uint':
                    name = this._variable.key.value.asBN;
                    break;
            }
        }
        return name;
    }

    buildArrayChild(variable) {
        var res = '';
        var base = variable.type ? variable : variable.value;
        switch(base.type.typeClass) {
            case 'uint':
                res = base.value.asBN.toString();
                break;
            case 'address':
                res = base.value.asAddress;
                break;
            case 'struct':
                res = {};
                for (var i = 0; i < base.value.length; i++) {
                    res[base.value[i].name] = this.buildArrayChild(base.value[i]);
                }
                break;
        }
        return res;        
    }
}

var StructureChild = class StructureChild {

    constructor(child, path) {
        this.path = path;
        this.children = null;

        switch (child.key.type.typeClass) {
            case 'address':
                this.label = child.key.value.asAddress;
                this.key = child.key.value.asAddress;
                break;
            case 'uint':
                this.label = child.key.value.asBN;
                this.key = child.key.value.asBN;
                break;
        }

        this.path.push(this.key);

        switch (child.value.type.typeClass) {
            case 'mapping':
                this.label += ':';
                this.children = [];
                for (var i = 0; i < child.value.value.length; i++) {
                    //[...this.path] clones the array, this.path, would just send a reference
                    this.children.push(new StructureChild(child.value.value[i], [...this.path]));
                }
                break;
            default:
                this.label += ';';
                break;

        }
    }

    getWatchedPaths() {
        var paths = [];
        if (this.children && this.children.length) {
            for (var i = 0; i < this.children.length; i++) {
                paths.push(this.children[i].getWatchedPaths());
            }
        }
        else
            paths.push(...this.path)
        return paths;
    }
}

var StructureNode = class StructureNode {

    constructor(variable, index) {
        this.path = [variable.name];
        this.label = '';
        this.key = variable.name;
        this.children = null;
        this.index = index;

        switch(variable.value.type.typeClass) {
            case 'uint':
                this.label = `${variable.value.type.typeHint} ${variable.name};`;
                break;
            case 'mapping':
                this.label = `${this.getLabelForMapping(variable.value.type)} ${variable.name}:`;
                this.children = [];
                for (var i = 0; i < variable.value.value.length; i++) {
                    //[...this.path] clones the array, this.path, would just send a reference
                    this.children.push(new StructureChild(variable.value.value[i], [...this.path]))
                }
                break;
            case 'array':
                var baseType = variable.value.type.baseType;
                this.label = `${baseType.typeName ? baseType.typeName : baseType.typeHint}[ ] ${variable.name};`
                break;
        }
    }

    getLabelForMapping(mapping) {
        var label = 'mapping(';
        label += `${mapping.keyType.typeClass} => `;
        if (mapping.valueType.typeClass == 'mapping') {
            label += this.getLabelForMapping(mapping.valueType);
        }
        else {
            label += mapping.valueType.typeHint;
        }
        label += ')';
        return label;
    }

    getWatchedPaths() {
        var paths = [];
        if (this.children && this.children.length) {
            for (var i = 0; i < this.children.length; i++) {
                paths.push(this.children[i].getWatchedPaths());
            }
        }
        else
            paths.push(...this.path)
        return paths;
    }
};

var _Structure = class Structure {

    nodes = [];
    index = 0;

    constructor(variables) {
        this.variables = variables;
        variables.forEach(this.addStructureNode, this);
    }

    addStructureNode(variable) {
        var node = new StructureNode(variable, this.index);
        this.index = node.index++;
        this.nodes.push(node);
    }
};

var _Storage = class Storage {
    structure;
    data;
    instanceDecoder;

    constructor(instanceDecoder) {
        this.instanceDecoder = instanceDecoder;
        this.data = {};
    }

    get watchedPaths() {
        var paths = []
        this.structure.nodes.forEach((node) => paths.push(node.getWatchedPaths()));
        return paths;
    }

    buildStructure() {
        return new Promise((resolve) => {
            this.instanceDecoder.variables().then((variables) => {
                this.structure = new _Structure(variables);
                resolve();
            })
        });
    }

    decodeData(blockNumber = 'latest') {
        return new Promise((resolve) => {
            var _data = {}
            this.instanceDecoder.variables(blockNumber).then((variables) => {
                variables.forEach(variable => Object.assign(_data, new DataNode(variable)));
                this.data = _data;
                resolve(_data);
            });
        });
    }

    watchNewKey(node, key) {
        return this.instanceDecoder.watchMappingKey(...node.path, key);
    }

    watchPath(path) {
        if (typeof path[0] == 'string') {
            return this.instanceDecoder.watchMappingKey(...path);
        }
        else
            for (var i = 0; i < path.length; i++) {
                this.watchPath(path[i]);
            }
    }

    watch(paths = []) {
        return new Promise((resolve) => {
            Promise.all(paths.map((path) => this.watchPath(path)))
                .then(() => this.buildStructure().then(resolve));
        });
    }
};


export const Storage = _Storage;