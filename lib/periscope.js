var scopeStarters = ['Program', 'BlockStatement', 'FunctionDeclaration', 'FunctionExpression'];

function Scope(parent) {
    // initialise the definitions
    this.definitions = parent ? [].concat(parent.definitions) : [];

    // define the children
    this._children = [];
    
    // if we have a parent, um, let it know
    if (parent) {
        parent._children.push(this);
    }
}

Scope.prototype = {
    add: function(name) {
        if (this.definitions.indexOf(name) < 0) {
            this.definitions.push(name);
        }
        
        this._children.forEach(function(child) {
            child.add(name);
        });
    },
    
    toJSON: function() {
        return this.definitions.sort();
    }
};

// breadth first traversal
function traverse(object, visitor, master, scope) {
    var key, child, parent, path;

    parent = (typeof master === 'undefined') ? [] : master;
    scope = scope || object.scope;

    if (visitor.call(null, object, parent, scope) === false) {
        return;
    }
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            path = [ object ];
            path.push(parent);
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor, path, object.scope || scope);
            }
        }
    }
}

module.exports = function(ast) {
    // add scope to the root of the tree
    ast.scope = new Scope();
    
    traverse(ast, function(node, path, scope) {
        var ii;

        // if this is a function declaration add to the outer scope
        if (node.type === 'FunctionDeclaration') {
            scope.add(node.id.name);
        }
        
        // check for a new scope start
        if (node.type && scopeStarters.indexOf(node.type) >= 0) {
            node.scope = new Scope(scope);
            scope = node.scope;
        }
        
        // if this is a function declaration node, then add the params to the 
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
            for (ii = node.params.length; ii--; ) {
                scope.add(node.params[ii].name);
            }
        }
        else if (node.type === 'VariableDeclaration') {
            for (ii = node.declarations.length; ii--; ) {
                scope.add(node.declarations[ii].id.name);
            }
        }
    });
};