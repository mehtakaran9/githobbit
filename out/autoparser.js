"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_readdir_recursive_1 = __importDefault(require("fs-readdir-recursive"));
const typescript_1 = __importDefault(require("typescript"));
const process_1 = require("process");
const fs = __importStar(require("fs"));
const es = __importStar(require("esprima"));
const child_process_1 = require("child_process");
const PORT_NUM = 9090;
var LINTER_THRESHOLD_MARGIN = 20;
var INSERT_THRESHOLD_MARGIN = 20;
var complete_list_of_types = [];
var totalStaticInferences = 0;
var totalDeepLearnerInferences = 0;
var staticAnalysisTypes = 0;
var modelBasedAnalysisTypes = 0;
var common = 0;
var anySelected = 0;
var couldNotInfer = 0;
let importSet = new Set();
var LOCALHOST_BASE_URL = "http://127.0.0.1:";
var REMOTE_BASE_URL = "http://143.244.180.92:";
importSet.add("require");
let basicTypes = new Map();
basicTypes.set(typescript_1.default.SyntaxKind.BooleanKeyword, "boolean");
basicTypes.set(typescript_1.default.SyntaxKind.BooleanKeyword, "boolean");
basicTypes.set(typescript_1.default.SyntaxKind.TrueKeyword, "boolean");
basicTypes.set(typescript_1.default.SyntaxKind.FalseKeyword, "boolean");
basicTypes.set(typescript_1.default.SyntaxKind.NumberKeyword, "number");
basicTypes.set(typescript_1.default.SyntaxKind.StringKeyword, "string");
basicTypes.set(typescript_1.default.SyntaxKind.SymbolKeyword, "symbol");
basicTypes.set(typescript_1.default.SyntaxKind.EnumKeyword, "enum");
basicTypes.set(typescript_1.default.SyntaxKind.VoidKeyword, "void");
basicTypes.set(typescript_1.default.SyntaxKind.ObjectKeyword, "object");
basicTypes.set(typescript_1.default.SyntaxKind.BigIntKeyword, "bigint");
basicTypes.set(typescript_1.default.SyntaxKind.UndefinedKeyword, "undefined");
basicTypes.set(typescript_1.default.SyntaxKind.NullKeyword, "null");
let ignoredTypes = new Set();
ignoredTypes.add(typescript_1.default.SyntaxKind.MappedType);
ignoredTypes.add(typescript_1.default.SyntaxKind.ConditionalType);
ignoredTypes.add(typescript_1.default.SyntaxKind.ThisType);
ignoredTypes.add(typescript_1.default.SyntaxKind.UnknownKeyword);
ignoredTypes.add(typescript_1.default.SyntaxKind.IndexedAccessType);
ignoredTypes.add(typescript_1.default.SyntaxKind.UndefinedKeyword);
ignoredTypes.add(typescript_1.default.SyntaxKind.NeverKeyword);
ignoredTypes.add(typescript_1.default.SyntaxKind.TypeOperator);
// ignoredTypes.add(ts.SyntaxKind.NullKeyword);
ignoredTypes.add(typescript_1.default.SyntaxKind.IntersectionType);
ignoredTypes.add(typescript_1.default.SyntaxKind.TypeQuery);
const dirPath = process_1.argv[2];
const filteredFiles = (0, fs_readdir_recursive_1.default)(dirPath).filter((item) => item.endsWith(".js") &&
    !item.includes("node_modules") &&
    !item.includes("autoparser.js"));
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
function readfile(fileName) {
    return fs.readFileSync(fileName, "utf-8");
}
function parseEntityName(n) {
    if (n.kind === typescript_1.default.SyntaxKind.Identifier) {
        return n.text;
    }
    else {
        return parseEntityName(n.left) + "." + n.right.text;
    }
}
function parseType(node) {
    var type = undefined;
    if (node.kind === typescript_1.default.SyntaxKind.AnyKeyword) {
        return "any";
    }
    else if (typescript_1.default.isTypeReferenceNode(node)) {
        let n = node;
        type = parseEntityName(n.typeName);
    }
    else if (basicTypes.has(node.kind)) {
        type = basicTypes.get(node.kind);
    }
    else if (node.kind === typescript_1.default.SyntaxKind.ArrayType) {
        type = "array";
    }
    else if (node.kind === typescript_1.default.SyntaxKind.TypeLiteral) {
        let n = node;
        return "object";
    }
    else if (node.kind === typescript_1.default.SyntaxKind.FunctionType ||
        node.kind === typescript_1.default.SyntaxKind.ConstructorType) {
        let n = node;
        let ret = parseType(n.type);
        type = ret;
    }
    else if (node.kind === typescript_1.default.SyntaxKind.UnionType) {
        let n = node;
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
            }
            else {
                return "any";
            }
        }
        else if (typesofUnion.length === 1) {
            return typesofUnion[0];
        }
        else {
            return "any";
        }
    }
    else if (ignoredTypes.has(node.kind)) {
        return "any";
    }
    else if (node.kind === typescript_1.default.SyntaxKind.LiteralType) {
        let n = node;
        switch (n.literal.kind) {
            case typescript_1.default.SyntaxKind.StringLiteral:
                return "string";
            case typescript_1.default.SyntaxKind.TrueKeyword:
            case typescript_1.default.SyntaxKind.FalseKeyword:
                return "boolean";
            case typescript_1.default.SyntaxKind.NumericLiteral:
                return "number";
            case typescript_1.default.SyntaxKind.NullKeyword:
                return "null";
            default:
                return "any";
        }
    }
    else if (node.kind === typescript_1.default.SyntaxKind.ParenthesizedType) {
        let n = node;
        return parseType(n.type);
    }
    else if (node.kind === typescript_1.default.SyntaxKind.FirstTypeNode ||
        node.kind === typescript_1.default.SyntaxKind.LastTypeNode) {
        type = "boolean";
    }
    else if (node.kind === typescript_1.default.SyntaxKind.TupleType) {
        type = "array";
    }
    else {
        type = "any";
    }
    return type;
}
function fast_linter(checker, sourceFile, loc, word) {
    var tokens = [];
    var inferred_type = undefined;
    var word_index = undefined;
    var typeCache = undefined;
    function visit(node) {
        if (node.kind === typescript_1.default.SyntaxKind.Identifier) {
            if (node.getText() === word &&
                node.pos < loc + LINTER_THRESHOLD_MARGIN &&
                node.pos > loc - LINTER_THRESHOLD_MARGIN) {
                word_index = tokens.length - 1;
                inferred_type = typeCache;
            }
        }
        else if (node.kind === typescript_1.default.SyntaxKind.VariableDeclaration ||
            (node.kind === typescript_1.default.SyntaxKind.Parameter &&
                node.parent.kind !== typescript_1.default.SyntaxKind.FunctionType) ||
            node.kind === typescript_1.default.SyntaxKind.FunctionDeclaration ||
            node.kind === typescript_1.default.SyntaxKind.MethodDeclaration) {
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
        typescript_1.default.visitNode(sourceFile, visit);
        return [tokens, inferred_type, word_index];
    }
}
function ignoredElements(file_name) {
    var contents = readfile(file_name);
    let parsed = es.parseScript(contents, {
        range: true,
        tokens: true,
    });
    let tokens = parsed.tokens;
    for (let i = 0; i < tokens.length; i++) {
        checkElement(tokens[i], i, tokens);
    }
}
function getProgram(dir_path) {
    let project = incrementalCompile(dir_path);
    let program = project.getProgram();
    return program;
}
function identifyTokens(file_name, to_ignore, program) {
    let tokens = [];
    var sourcefile = program.getSourceFile(file_name);
    function nodeChecker(node) {
        if (node.kind === typescript_1.default.SyntaxKind.Identifier &&
            !to_ignore.has(node.getText())) {
            tokens.push([node.getText(), node.pos]);
        }
        for (var child of node.getChildren(sourcefile)) {
            nodeChecker(child);
        }
        return node;
    }
    typescript_1.default.visitNode(sourcefile, nodeChecker);
    return tokens;
}
async function automatedInserter(file_name, dir_path) {
    var to_ignore = ignoredElements(file_name);
    let starting_tokens = identifyTokens(file_name, importSet, getProgram(dir_path));
    let length = starting_tokens.length;
    let idx = 0;
    try {
        while (idx != length) {
            //getting the sourcefile
            var program = getProgram(dir_path);
            let initial_tokens = identifyTokens(file_name, importSet, program);
            var sourcefile = program.getSourceFile(file_name);
            //program checker
            let checker = program.getTypeChecker();
            //fetching idx as doc position and the word to check annotations for
            var word_of_interest = initial_tokens[idx][0];
            var document_position = initial_tokens[idx][1];
            //return tokens and static analysis result
            let tokens_and_inferred = fast_linter(checker, sourcefile, document_position, word_of_interest);
            var tokens = tokens_and_inferred[0];
            var inferred_type = tokens_and_inferred[1];
            var word_index = tokens_and_inferred[2];
            console.log(word_of_interest +
                " INFERRED TYPE: " +
                inferred_type +
                " WORD INDEX: " +
                word_index);
            if (inferred_type && word_index) {
                const result = await getTypeSuggestions(tokens, word_index);
                if (result) {
                    var complete_list_of_types = await getTypes(inferred_type, result);
                    var contents = insert(sourcefile, complete_list_of_types[0], document_position, word_of_interest);
                    file_name = changeExtension(file_name, "js", "ts");
                    writeToFile(file_name, contents);
                }
                else {
                    console.log("Could not infer type for: ", initial_tokens[idx]);
                    couldNotInfer++;
                }
            }
            idx++;
        }
    }
    catch (e) {
        console.log("Could not process the file", e);
    }
}
async function getTypes(inferred_type, data) {
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
        }
        else {
            staticAnalysisTypes++;
            complete_list_of_types = [inferred_type].concat(data);
        }
    }
    else {
        modelBasedAnalysisTypes++;
        complete_list_of_types = data.type_suggestions;
    }
    return complete_list_of_types;
}
function changeExtension(name, from, to) {
    var new_file_name = name;
    var extension = name.split(".").pop();
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
function writeToFile(destinationFilePath, textToWrite) {
    fs.writeFileSync(destinationFilePath, textToWrite);
}
function checkElement(element, idx, parsed) {
    if (element.type !== "Identifier" || importSet.has(element.value)) {
        return false;
    }
    // check for import statements. e.g const fs = require('fs');
    if (idx + 2 < parsed.length &&
        parsed[idx + 1].value === "=" &&
        parsed[idx + 2].value === "require") {
        console.log("element rejected", element.value);
        importSet.add(element.value);
        return false;
    }
    return true;
}
async function getTypeSuggestions(tokens, word_index) {
    // console.dir(tokens, {'maxArrayLength': null});
    return new Promise((resolve, reject) => {
        const apiUrl = LOCALHOST_BASE_URL + PORT_NUM + "/suggest-types";
        const jsonPayload = JSON.stringify({
            input_string: tokens,
            word_index: word_index,
        }).replace(/"/g, '\\"');
        const curlCommand = `curl -X POST -H "Content-Type: application/json" --data-raw "${jsonPayload}" ${apiUrl}`;
        (0, child_process_1.exec)(curlCommand, (error, stdout, stderr) => {
            if (error) {
                console.error("Error executing curl command:", error);
                reject(error);
            }
            else {
                try {
                    const result = JSON.parse(stdout);
                    // console.log("result from getTypeSuggesstions:", result);
                    resolve(result);
                }
                catch (parseError) {
                    console.error("Error parsing JSON response:", parseError);
                    reject(parseError);
                }
            }
        });
    });
}
function incrementalCompile(dir) {
    const configPath = typescript_1.default.findConfigFile(dir, typescript_1.default.sys.fileExists, "tsconfig.json");
    if (configPath) {
        const host = typescript_1.default.sys;
        const config = typescript_1.default.getParsedCommandLineOfConfigFile(configPath, { incremental: true }, host);
        var project = typescript_1.default.createIncrementalProgram({
            rootNames: config.fileNames,
            options: config.options,
            configFileParsingDiagnostics: typescript_1.default.getConfigFileParsingDiagnostics(config),
            projectReferences: config.projectReferences,
        });
        return project;
    }
}
function getType(deeplearnerType) {
    let source = `var t: ` + deeplearnerType + ` = null;`;
    const sourceFile = typescript_1.default.createSourceFile("test.ts", source, typescript_1.default.ScriptTarget.ES2015, true, typescript_1.default.ScriptKind.TS);
    return sourceFile
        .getChildren()[0]
        .getChildren()[0]
        .getChildren()[0]
        .getChildren()[1]
        .getChildren()[0]["type"];
}
function insert(sourceFile, type, loc, word) {
    var quickReturn = false;
    var match_identifier = false;
    if (type == "any") {
        anySelected += 1;
    }
    const transformer = (context) => (rootNode) => {
        function visit(node) {
            if (quickReturn || match_identifier) {
                return node;
            }
            for (var child of node.getChildren(sourceFile)) {
                visit(child);
            }
            if (node.kind === typescript_1.default.SyntaxKind.Identifier) {
                if (node.getText() === word &&
                    node.pos < loc + INSERT_THRESHOLD_MARGIN &&
                    node.pos > loc - INSERT_THRESHOLD_MARGIN) {
                    match_identifier = true;
                }
            }
            else if (match_identifier &&
                (node.kind === typescript_1.default.SyntaxKind.FunctionDeclaration ||
                    node.kind === typescript_1.default.SyntaxKind.MethodDeclaration)) {
                node["type"] = getType(type);
                quickReturn = true;
                match_identifier = false;
            }
            else if (match_identifier &&
                (node.kind === typescript_1.default.SyntaxKind.VariableDeclaration ||
                    node.kind === typescript_1.default.SyntaxKind.Parameter)) {
                node["type"] = getType(type);
                quickReturn = true;
                match_identifier = false;
            }
            return node;
        }
        return typescript_1.default.visitNode(rootNode, visit);
    };
    const result = typescript_1.default.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];
    const printer = typescript_1.default.createPrinter();
    return printer.printFile(transformedSourceFile);
}
filteredFiles.forEach((file) => {
    console.log("Current File: " + dirPath + "/" + file);
    automatedInserter(dirPath + "/" + file, dirPath).then(() => {
        console.log("Could not infer: ", couldNotInfer);
        console.log("Total Static Analysis Inferences: ", totalStaticInferences);
        console.log("Total Deep Learner Inferences: ", totalDeepLearnerInferences);
        console.log("Selected from static Analysis: ", staticAnalysisTypes);
        console.log("Selected from model based analysis: ", modelBasedAnalysisTypes);
        console.log("Selected 'any' data type", anySelected);
        console.log("Common selections from Static Analysis and Deep Learner: ", common);
    });
});
// calling the methods
// TEST
