'use strict';

var template = require('babel-template');

var buildModule = template('\nbento.define(MODULE_PATH, [IMPORT_PATHS], function(IMPORT_VARS) {\n\tNAMED_IMPORTS;\n\tBODY;\n});\n');

function filenameToBento(filename) {
	return filename.split('.js')[0] // trim extension
	.split('\\').join('/'); // Windows compatibility
}

module.exports = function (_ref) {
	var t = _ref.types;

	return {
		visitor: {
			Program: {
				exit: function exit(path, file) {
					var body = path.get('body'),
					    sources = [],
					    anonymousSources = [],
					    vars = [],
					    namedImports = [],
					    isModular = false,
					    middleDefaultExportID = false;

					for (var i = 0; i < body.length; i++) {
						var _path = body[i],
						    isLast = i == body.length - 1;

						// if we deleted a semicolon ahead of us we might have to skip it
						if (_path.shouldSkip) {
							continue;
						}

						if (_path.isExportDefaultDeclaration()) {
							var declaration = _path.get('declaration');
							var exp = declaration.node;

							// allow `export default function(){}`
							if (t.isFunctionDeclaration(exp)) {
								exp = t.functionExpression(null, exp.params, exp.body);
								// clean up semicolon after function
								if (t.isEmptyStatement(body[i + 1])) {
									body[i + 1].remove();
									isLast = i == body.length - 2;
								}
							}

							if (isLast) {
								_path.replaceWith(t.returnStatement(exp));
							} else {
								middleDefaultExportID = _path.scope.generateUidIdentifier('export_default');
								_path.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(middleDefaultExportID, exp)]));
							}

							isModular = true;
						}

						if (_path.isImportDeclaration()) {
							var specifiers = _path.node.specifiers;

							if (specifiers.length == 0) {
								anonymousSources.push(_path.node.source);
							} else if (specifiers.length == 1 && specifiers[0].type == 'ImportDefaultSpecifier') {
								sources.push(_path.node.source);
								vars.push(specifiers[0]);
							} else {
								(function () {
									var importedID = _path.scope.generateUidIdentifier(_path.node.source.value);
									sources.push(_path.node.source);
									vars.push(importedID);

									specifiers.forEach(function (_ref2) {
										var imported = _ref2.imported,
										    local = _ref2.local;

										namedImports.push(t.variableDeclaration('var', [t.variableDeclarator(t.identifier(local.name), t.identifier(importedID.name + '.' + imported.name))]));
									});
								})();
							}

							_path.remove();

							isModular = true;
						}

						if (isLast && middleDefaultExportID) {
							_path.insertAfter(t.returnStatement(middleDefaultExportID));
						}
					}

					if (isModular) {
						var filename = filenameToBento(this.file.opts.sourceFileName);
						path.node.body = [buildModule({
							MODULE_PATH: t.stringLiteral(filename),
							IMPORT_PATHS: sources.concat(anonymousSources),
							IMPORT_VARS: vars,
							BODY: path.node.body,
							NAMED_IMPORTS: namedImports
						})];
					}
				}
			}
		}
	};
};