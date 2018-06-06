const template = require("babel-template");

let buildModule = template(`
bento.define(MODULE_PATH, [IMPORT_PATHS], function(IMPORT_VARS) {
    NAMED_IMPORTS;
    BODY;
});
`);

function filenameToBento(filename) {
    return filename.split('.js')[0]  // trim extension
           .split('\\').join('/')    // Windows compatibility
}

module.exports = function({ types: t }) {
    return {
        visitor: {
            Program: {
                exit(path, file) {
                    let body = path.get("body"),
                        sources = [],
                        anonymousSources = [],
                        vars = [],
                        namedImports = [],
                        isModular = false,
                        middleDefaultExportID = false;

                    for (let i = 0; i < body.length; i++) {
                        let path = body[i],
                            isLast = i == body.length - 1;

                        if (path.isExportDefaultDeclaration()) {
                            let declaration = path.get("declaration");
                            let exp = declaration.node;

                            // allow `export default function(){}`
                            if (t.isFunctionDeclaration(exp)) {
                                exp = t.functionExpression(null, exp.params, exp.body);
                            }

                            if (isLast) {
                                path.replaceWith(t.returnStatement(exp));
                            } else {
                                middleDefaultExportID = path.scope.generateUidIdentifier("export_default");
                                path.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(middleDefaultExportID, exp)]));
                            }

                            isModular = true;
                        }

                        if (path.isImportDeclaration()) {
                            let specifiers = path.node.specifiers;

                            if (specifiers.length == 0) {
                                anonymousSources.push(path.node.source);
                            } else if (specifiers.length == 1 && specifiers[0].type == 'ImportDefaultSpecifier') {
                                sources.push(path.node.source);
                                vars.push(specifiers[0]);
                            } else {
                                let importedID = path.scope.generateUidIdentifier(path.node.source.value);
                                sources.push(path.node.source);
                                vars.push(importedID);

                                specifiers.forEach(({imported, local}) => {
                                    namedImports.push(t.variableDeclaration("var", [
                                        t.variableDeclarator(t.identifier(local.name), t.identifier(importedID.name + '.' + imported.name))
                                    ]));
                                });
                            }

                            path.remove();

                            isModular = true;
                        }

                        if (isLast && middleDefaultExportID) {
                            path.insertAfter(t.returnStatement(middleDefaultExportID));
                        }
                    }

                    if (isModular) {
                        var filename = filenameToBento(this.file.opts.filenameRelative);
                        path.node.body = [
                            buildModule({
                                MODULE_PATH: t.stringLiteral(filename),
                                IMPORT_PATHS: sources.concat(anonymousSources),
                                IMPORT_VARS: vars,
                                BODY: path.node.body,
                                NAMED_IMPORTS: namedImports
                            })
                        ];
                    }
                }
            }
        }
    };
};
