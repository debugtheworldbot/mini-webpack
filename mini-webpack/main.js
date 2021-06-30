const fs = require("fs");
const parser = require("@babel/parser");
const path = require("path");
const config = require("../webpack.config");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;
const file = fs.readFileSync(config.entry, "utf-8");

const ast = parser.parse(file, { sourceType: "module" });
traverse(ast, {
  ImportDeclaration(p) {
    const fileName = p.node.source.value;
    let importFilePath = path.join(path.dirname(config.entry), fileName);
    importFilePath = `./${importFilePath}.js`;
    const variableDelacration = t.variableDeclaration("var", [
      t.variableDeclarator(
        t.identifier(
          `__${path.basename(fileName)}__WEBPACK_IMPORTED_MODULE_0__`
        ),
        t.callExpression(t.identifier("__webpack_require__"), [
          t.stringLiteral(importFilePath),
        ])
      ),
    ]);
    p.replaceWith(variableDelacration);
  },
});
const newCode = generate(ast).code;
console.log(newCode);
