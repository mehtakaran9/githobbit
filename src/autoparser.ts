import read from "fs-readdir-recursive";
import ts from "typescript";
import { argv } from "process";
import * as fs from "fs";
import * as es from "esprima";
import * as path from "path";
import { exec } from "child_process";

const PORT_NUM = 9090;
var LINTER_THRESHOLD_MARGIN: number = 20;
var INSERT_THRESHOLD_MARGIN: number = 20;
var complete_list_of_types = [];
var totalStaticInferences: number = 0;
var totalDeepLearnerInferences: number = 0;
var staticAnalysisTypes: number = 0;
var modelBasedAnalysisTypes: number = 0;
var common: number = 0;
var couldNotInfer: number = 0;
let importSet = new Set<String>();
var LOCALHOST_BASE_URL = "http://127.0.0.1:";
var REMOTE_BASE_URL = "http://143.244.180.92:";
importSet.add("require");
let basicTypes = new Map<ts.SyntaxKind, string>();
basicTypes.set(ts.SyntaxKind.BooleanKeyword, "boolean");
basicTypes.set(ts.SyntaxKind.BooleanKeyword, "boolean");
basicTypes.set(ts.SyntaxKind.TrueKeyword, "boolean");
basicTypes.set(ts.SyntaxKind.FalseKeyword, "boolean");
basicTypes.set(ts.SyntaxKind.NumberKeyword, "number");
basicTypes.set(ts.SyntaxKind.StringKeyword, "string");
basicTypes.set(ts.SyntaxKind.SymbolKeyword, "symbol");
basicTypes.set(ts.SyntaxKind.EnumKeyword, "enum");
basicTypes.set(ts.SyntaxKind.VoidKeyword, "void");
basicTypes.set(ts.SyntaxKind.ObjectKeyword, "object");
basicTypes.set(ts.SyntaxKind.BigIntKeyword, "bigint");
basicTypes.set(ts.SyntaxKind.UndefinedKeyword, "undefined");
basicTypes.set(ts.SyntaxKind.NullKeyword, "null");
let ignoredTypes = new Set<ts.SyntaxKind>();
ignoredTypes.add(ts.SyntaxKind.MappedType);
ignoredTypes.add(ts.SyntaxKind.ConditionalType);
ignoredTypes.add(ts.SyntaxKind.ThisType);
ignoredTypes.add(ts.SyntaxKind.UnknownKeyword);
ignoredTypes.add(ts.SyntaxKind.IndexedAccessType);
ignoredTypes.add(ts.SyntaxKind.UndefinedKeyword);
ignoredTypes.add(ts.SyntaxKind.NeverKeyword);
ignoredTypes.add(ts.SyntaxKind.TypeOperator);
// ignoredTypes.add(ts.SyntaxKind.NullKeyword);
ignoredTypes.add(ts.SyntaxKind.IntersectionType);
ignoredTypes.add(ts.SyntaxKind.TypeQuery);

const dirPath: string = argv[2];
const filteredFiles = read(dirPath).filter(
  (item) =>
    item.endsWith(".js") &&
    !item.includes("node_modules") &&
    !item.includes("autoparser.js")
);

// var filename = "src/test/test-this.js";
// var contents = readfile(filename);
// var dirPath = "/Users/karanmehta/UCD/auto/githobbit";

// function init() {
//     readfile("./annotationFilePaths.txt").split(/\r?\n/).forEach(line => {
//         var dir : string = __dirname + '/temp/';
//         if (!fs.existsSync(dir)) {
//             fs.mkdirSync(dir);
//         }
//         let jsFile : string = changeExtension(line, "ts", "js");
//         let newJsPath : string = dir + jsFile.split('/').pop();
//         let newTsPath : string = dir + "original_" + line.split('/').pop();
//         fs.copyFileSync(line, newTsPath)
//         fs.copyFileSync(jsFile, newJsPath);
//         automatedInserter(newJsPath, dir).then(() => {
//             console.log("Could not infer: ", couldNotInfer);
//             console.log("Total Static Analysis Inferences: ", totalStaticInferences);
//             console.log("Total Deep Learner Inferences: ", totalDeepLearnerInferences);
//             console.log("Selected from static Analysis: ", staticAnalysisTypes);
//             console.log("Selected from model based analysis: ", modelBasedAnalysisTypes);
//             console.log("Common selections from Static Analysis and Deep Learner: ", common);
//             fs.rmSync(dir, {recursive : true, force: true});
//         });
//     });
// }

function readfile(fileName: string): any {
  return fs.readFileSync(fileName, "utf-8");
}

function parseEntityName(n: ts.EntityName): string {
  if (n.kind === ts.SyntaxKind.Identifier) {
    return n.text;
  } else {
    return parseEntityName(n.left) + "." + n.right.text;
  }
}

function parseType(node: any) {
  var type: any = undefined;
  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    return "any";
  } else if (ts.isTypeReferenceNode(node)) {
    let n = node as ts.TypeReferenceNode;
    type = parseEntityName(n.typeName);
  } else if (basicTypes.has(node.kind)) {
    type = basicTypes.get(node.kind);
  } else if (node.kind === ts.SyntaxKind.ArrayType) {
    type = "array";
  } else if (node.kind === ts.SyntaxKind.TypeLiteral) {
    let n = node as ts.TypeLiteralNode;
    return "object";
  } else if (
    node.kind === ts.SyntaxKind.FunctionType ||
    node.kind === ts.SyntaxKind.ConstructorType
  ) {
    let n = node as ts.FunctionOrConstructorTypeNode;
    let ret = parseType(n.type);
    type = ret;
  } else if (node.kind === ts.SyntaxKind.UnionType) {
    let n = node as ts.UnionTypeNode;
    let typesofUnion = [];
    var i;
    for (i = 0; i < n.types.length; i++) {
      typesofUnion.push(parseType(n.types[String(i)]));
    }
    typesofUnion = [...new Set(typesofUnion)];
    typesofUnion = typesofUnion.filter(function (x) {
      return x !== "any";
    });
    if (typesofUnion.length === 2) {
      if (typesofUnion[1] === "null" || typesofUnion[1] === "undefined") {
        return typesofUnion[0];
      } else {
        return "any";
      }
    } else if (typesofUnion.length === 1) {
      return typesofUnion[0];
    } else {
      return "any";
    }
  } else if (ignoredTypes.has(node.kind)) {
    return "any";
  } else if (node.kind === ts.SyntaxKind.LiteralType) {
    let n = node as ts.LiteralTypeNode;
    switch (n.literal.kind) {
      case ts.SyntaxKind.StringLiteral:
        return "string";
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        return "boolean";
      case ts.SyntaxKind.NumericLiteral:
        return "number";
      case ts.SyntaxKind.NullKeyword:
        return "null";
      default:
        return "any";
    }
  } else if (node.kind === ts.SyntaxKind.ParenthesizedType) {
    let n = node as ts.ParenthesizedTypeNode;
    return parseType(n.type);
  } else if (
    node.kind === ts.SyntaxKind.FirstTypeNode ||
    node.kind === ts.SyntaxKind.LastTypeNode
  ) {
    type = "boolean";
  } else if (node.kind === ts.SyntaxKind.TupleType) {
    type = "array";
  } else {
    type = "any";
  }
  return type;
}

function fast_linter(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  loc,
  word
) {
  var tokens: any = [];
  var inferred_type = undefined;
  var word_index: any = undefined;
  var typeCache = undefined;
  function visit(node: ts.Node): ts.Node {
    if (node.kind === ts.SyntaxKind.Identifier) {
      if (
        node.getText() === word &&
        node.pos < loc + LINTER_THRESHOLD_MARGIN &&
        node.pos > loc - LINTER_THRESHOLD_MARGIN
      ) {
        word_index = tokens.length - 1;
        inferred_type = typeCache;
      }
    } else if (
      node.kind === ts.SyntaxKind.VariableDeclaration ||
      (node.kind === ts.SyntaxKind.Parameter &&
        node.parent.kind !== ts.SyntaxKind.FunctionType) ||
      node.kind === ts.SyntaxKind.FunctionDeclaration ||
      node.kind === ts.SyntaxKind.MethodDeclaration
    ) {
      if (node.hasOwnProperty("name")) {
        let symbol = checker.getSymbolAtLocation(node["name"]);
        if (symbol) {
          const ty = checker.getTypeAtLocation(node);
          const n = checker.typeToTypeNode(ty, undefined, undefined);
          typeCache = parseType(n);
        }
      }
    }
    for (var child of node.getChildren(sourceFile)) {
      if (child.getChildren().length === 0 && child.getText().length > 0) {
        tokens.push(child.getText());
      }
      visit(child);
    }
    return node;
  }
  if (loc != null) {
    ts.visitNode(sourceFile, visit);
    return [tokens, inferred_type, word_index];
  }
}

function ignoredElements(file_name: string) {
  var contents: string = readfile(file_name);
  let parsed: es.Program = es.parseScript(contents, {
    range: true,
    tokens: true,
  });
  let tokens: es.Token[] = parsed.tokens;
  for (let i = 0; i < tokens.length; i++) {
    checkElement(tokens[i], i, tokens);
  }
}

function getProgram(dir_path: string): ts.Program {
  let project = incrementalCompile(dir_path);
  let program: ts.Program = project.getProgram();
  return program;
}

function identifyTokens(
  file_name: string,
  to_ignore: Set<String>,
  program: ts.Program
) {
  let tokens = [];
  var sourcefile: ts.SourceFile = program.getSourceFile(file_name);
  function nodeChecker(node: ts.Node) {
    if (
      node.kind === ts.SyntaxKind.Identifier &&
      !to_ignore.has(node.getText())
    ) {
      tokens.push([node.getText(), node.pos]);
    }
    for (var child of node.getChildren(sourcefile)) {
      nodeChecker(child);
    }
    return node;
  }

  ts.visitNode(sourcefile, nodeChecker);
  return tokens;
}

async function automatedInserter(file_name: string, dir_path: string) {
  var to_ignore = ignoredElements(file_name);
  let starting_tokens = identifyTokens(
    file_name,
    importSet,
    getProgram(dir_path)
  );
  let length: number = starting_tokens.length;
  let idx: number = 0;
  try {
    while (idx != length) {
      //getting the sourcefile
      var program = getProgram(dir_path);
      let initial_tokens = identifyTokens(file_name, importSet, program);
      var sourcefile: ts.SourceFile = program.getSourceFile(file_name);

      //program checker
      let checker = program.getTypeChecker();
      //fetching idx as doc position and the word to check annotations for
      var word_of_interest: string = initial_tokens[idx][0];
      var document_position: number = initial_tokens[idx][1];

      //return tokens and static analysis result
      let tokens_and_inferred: Array<any> = fast_linter(
        checker,
        sourcefile,
        document_position,
        word_of_interest
      );

      var tokens = tokens_and_inferred[0];
      var inferred_type = tokens_and_inferred[1];
      var word_index = tokens_and_inferred[2];
      console.log(
        word_of_interest +
          " INFERRED TYPE: " +
          inferred_type +
          " WORD INDEX: " +
          word_index
      );
      if (inferred_type && word_index) {
        const result = await getTypeSuggestions(tokens, word_index);
        if (result) {
          var complete_list_of_types = await getTypes(inferred_type, result);
          console.log(complete_list_of_types);
          var contents = insert(
            sourcefile,
            complete_list_of_types[0],
            document_position,
            word_of_interest
          );
          file_name = changeExtension(file_name, "js", "ts");
          writeToFile(file_name, contents);
        } else {
          console.log("Could not infer type for: ", initial_tokens[idx]);
          couldNotInfer++;
        }
      }
      idx++;
    }
  } catch (e) {
    console.log("Could not process the file", e);
  }
}

async function getTypes(inferred_type: any, data: any) {
  complete_list_of_types = [];
  if (data != undefined) {
    totalDeepLearnerInferences++;
  }
  if (inferred_type !== undefined) {
    totalStaticInferences++;
    if (data.type_suggestions[0] === inferred_type) {
      common++;
    }
    if (data.probabilities[0] >= 0.9) {
      modelBasedAnalysisTypes++;
      complete_list_of_types = data.type_suggestions.concat([inferred_type]);
    } else {
      staticAnalysisTypes++;
      complete_list_of_types = [inferred_type].concat(data);
    }
  } else {
    modelBasedAnalysisTypes++;
    complete_list_of_types = data.type_suggestions;
  }
  return complete_list_of_types;
}

function changeExtension(name: string, from: string, to: string): string {
  var new_file_name: string = name;
  var extension: string = name.split(".").pop();
  if (extension === from) {
    let splitter = name.split(".");
    splitter[splitter.length - 1] = to;
    new_file_name = "";
    for (let i = 0; i < splitter.length; i++) {
      new_file_name +=
        i !== splitter.length - 1 ? splitter[i] + "." : splitter[i];
    }
  }
  return new_file_name;
}

function writeToFile(destinationFilePath: string, textToWrite: string) {
  fs.writeFileSync(destinationFilePath, textToWrite);
}

function checkElement(element: any, idx: number, parsed: any): boolean {
  if (element.type !== "Identifier" || importSet.has(element.value)) {
    return false;
  }

  // check for import statements. e.g const fs = require('fs');
  if (
    idx + 2 < parsed.length &&
    parsed[idx + 1].value === "=" &&
    parsed[idx + 2].value === "require"
  ) {
    console.log("element rejected", element.value);
    importSet.add(element.value);
    return false;
  }
  return true;
}

async function getTypeSuggestions(tokens: any, word_index: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const apiUrl: string = LOCALHOST_BASE_URL + PORT_NUM + "/suggest-types";
    const jsonData = {
      input_string: tokens,
      word_index: word_index,
    };

    const curlCommand = `curl -XPOST -H 'Content-type: application/json' -d '${JSON.stringify(
      jsonData
    )}' ${apiUrl}`;

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing curl command:", error);
        reject(error); // Reject the promise with the error
      } else {
        try {
          const result = JSON.parse(stdout);
          console.log("result from getTypeSuggesstions:", result);
          resolve(result); // Resolve the promise with the parsed result
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          reject(parseError); // Reject the promise with the parse error
        }
      }
    });
  });
}

function incrementalCompile(dir: string): any {
  const configPath = ts.findConfigFile(dir, ts.sys.fileExists, "tsconfig.json");
  if (configPath) {
    const host: ts.ParseConfigFileHost = ts.sys as any;
    const config: any = ts.getParsedCommandLineOfConfigFile(
      configPath,
      { incremental: true },
      host
    );
    var project = ts.createIncrementalProgram({
      rootNames: config.fileNames,
      options: config.options,
      configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(config),
      projectReferences: config.projectReferences,
    });
    return project;
  }
}

function getType(deeplearnerType: string) {
  let source = `var t: ` + deeplearnerType + ` = null;`;
  const sourceFile: ts.SourceFile = ts.createSourceFile(
    "test.ts",
    source,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TS
  );
  return sourceFile
    .getChildren()[0]
    .getChildren()[0]
    .getChildren()[0]
    .getChildren()[1]
    .getChildren()[0]["type"];
}

function insert(
  sourceFile: ts.SourceFile,
  type: string,
  loc: number,
  word: string
): any {
  var quickReturn: boolean = false;
  var match_identifier: boolean = false;

  const transformer =
    <T extends ts.Node>(context: ts.TransformationContext) =>
    (rootNode: T) => {
      function visit(node: ts.Node): ts.Node {
        if (quickReturn || match_identifier) {
          return node;
        }
        for (var child of node.getChildren(sourceFile)) {
          visit(child);
        }
        if (node.kind === ts.SyntaxKind.Identifier) {
          if (
            node.getText() === word &&
            node.pos < loc + INSERT_THRESHOLD_MARGIN &&
            node.pos > loc - INSERT_THRESHOLD_MARGIN
          ) {
            match_identifier = true;
          }
        } else if (
          match_identifier &&
          (node.kind === ts.SyntaxKind.FunctionDeclaration ||
            node.kind === ts.SyntaxKind.MethodDeclaration)
        ) {
          node["type"] = getType(type);
          quickReturn = true;
          match_identifier = false;
        } else if (
          match_identifier &&
          (node.kind === ts.SyntaxKind.VariableDeclaration ||
            node.kind === ts.SyntaxKind.Parameter)
        ) {
          node["type"] = getType(type);
          quickReturn = true;
          match_identifier = false;
        }
        return node;
      }
      return ts.visitNode(rootNode, visit);
    };
  const result: ts.TransformationResult<ts.SourceFile> =
    ts.transform<ts.SourceFile>(sourceFile, [transformer]);
  const transformedSourceFile: ts.SourceFile = result.transformed[0];
  const printer: ts.Printer = ts.createPrinter();
  return printer.printFile(transformedSourceFile);
}

filteredFiles.forEach((file) => {
  console.log("Current File: " + dirPath + "/" + file);
  automatedInserter(dirPath + "/" + file, dirPath).then(() => {
    console.log("Could not infer: ", couldNotInfer);
    console.log("Total Static Analysis Inferences: ", totalStaticInferences);
    console.log("Total Deep Learner Inferences: ", totalDeepLearnerInferences);
    console.log("Selected from static Analysis: ", staticAnalysisTypes);
    console.log(
      "Selected from model based analysis: ",
      modelBasedAnalysisTypes
    );
    console.log(
      "Common selections from Static Analysis and Deep Learner: ",
      common
    );
  });
});

// calling the methods
// TEST
