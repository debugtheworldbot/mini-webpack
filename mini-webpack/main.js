const fs = require("fs");
const parser = require("@babel/parser");
const path = require("path");
const config = require("../webpack.config");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;
const ejs = require("ejs");

let moduleNum = 0;
const EXPORT_DEFAULT_FUN = `
__webpack_require__.d(__webpack_exports__, {
   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
});\n
`;
const ESMODULE_TAG_FUN = `
__webpack_require__.r(__webpack_exports__);\n
`;

const parseFile = (file) => {
  const fileContent = fs.readFileSync(file, "utf-8");
  const ast = parser.parse(fileContent, { sourceType: "module" });
  let importFilePath = "";
  let importVarName = "";
  let importCovertVarName = "";
  let hasExport = false;
  traverse(ast, {
    ImportDeclaration(p) {
      const fileName = p.node.source.value;

      importFilePath = path.join(path.dirname(config.entry), fileName);
      importFilePath = `./${importFilePath}.js`;

      importVarName = p.node.specifiers[0].local.name;

      importCovertVarName = `__${path.basename(
        fileName
      )}__WEBPACK_IMPORTED_MODULE_${moduleNum}__`;
      moduleNum++;
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
    Identifier(p) {
      if (p.node.name === importVarName) {
        p.node.name = `${importCovertVarName}.default`;
      }
    },
    ExportDefaultDeclaration(p) {
      hasExport = true;
      const variableDelacration = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier("__WEBPACK_DEFAULT_EXPORT__"),
          t.identifier(p.node.declaration.name)
        ),
      ]);
      p.replaceWith(variableDelacration);
    },
  });

  let newCode = generate(ast).code;
  if (hasExport) {
    newCode = `${EXPORT_DEFAULT_FUN} ${newCode}`;
  }
  newCode = `${ESMODULE_TAG_FUN} ${newCode}`;
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

const generateCode = (allAst, entry) => {
  const tempFile = fs.readFileSync(
    path.join(__dirname, "./templete.js"),
    "utf-8"
  );
  const codes = ejs.render(tempFile, {
    __TO_REPLACE_WEBPACK_MODULES__: allAst,
    __TO_REPLACE_WEBPACK_ENTRY__: entry,
  });
  return codes;
};

const allAst = parseFiles(config.entry);
const codes = generateCode(allAst, config.entry);
fs.writeFileSync(path.join(config.output.path, config.output.filename), codes);
