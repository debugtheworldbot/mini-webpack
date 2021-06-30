const fs = require("fs");
const parser = require("@babel/parser");
const path = require("path");
const config = require("../webpack.config");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;
const { entries } = require("lodash");

const parseFile = (file) => {
  const fileContent = fs.readFileSync(file, "utf-8");
  const ast = parser.parse(fileContent, { sourceType: "module" });
  let importFilePath = "";
  let importVarName = "";
  let importCovertVarName = "";
  traverse(ast, {
    ImportDeclaration(p) {
      const fileName = p.node.source.value;

      importFilePath = path.join(path.dirname(config.entry), fileName);
      importFilePath = `./${importFilePath}.js`;

      importVarName = p.node.specifiers[0].local.name;

      importCovertVarName = `__${path.basename(
        fileName
      )}__WEBPACK_IMPORTED_MODULE_0__`;

      const variableDelacration = t.variableDeclaration("var", [
        t.variableDeclarator(
          t.identifier(importCovertVarName),
          t.callExpression(t.identifier("__webpack_require__"), [
            t.stringLiteral(importFilePath),
          ])
        ),
      ]);
      p.replaceWith(variableDelacration);
    },
    CallExpression(p) {
      if (p.node.callee.name === importVarName) {
        p.node.callee.name = `${importCovertVarName}.default`;
      }
    },
  });

  const newCode = generate(ast).code;
  return {
    file,
    dependences: [importFilePath],
    code: newCode,
  };
};

const parseFiles = (entryFile) => {
  const entry = parseFile(entryFile);
  const results = [entry];

  for (const r of results) {
    const dependence = r.dependences;
    dependence.map((d) => (d ? results.push(parseFile(d)) : undefined));
  }
  return results;
};

console.log(parseFiles(config.entry));
