import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["FrontProject", "apps", "packages"];
const rawColorPattern =
  /(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|(?<![-\w])(?:black|white|red|green|blue|gray|grey|transparent)(?![-\w]))/;
const inlineStylePattern = /\bstyle\s*=\s*\{/;
const nativePrimitivePattern = /<\s*(button|input|select|textarea|table|form|dialog)\b/;
const adHocUiSelectorPattern = /\.(?:btn|button|input|select|textarea|dialog|form|card|table)(?:[-_\s{.:#]|$)/i;
const allowedRawColorFiles = new Set([path.join("packages", "ui", "src", "styles", "tokens.css")]);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute);

    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === ".next" || entry.name === "node_modules") {
        continue;
      }

      files.push(...(await collectFiles(absolute)));
      continue;
    }

    if (/\.(css|ts|tsx)$/.test(entry.name)) {
      files.push(relative);
    }
  }

  return files;
}

function pushError(errors, file, message) {
  errors.push(`${file}: ${message}`);
}

const files = [];

for (const scanRoot of scanRoots) {
  files.push(...(await collectFiles(path.join(root, scanRoot))));
}

const errors = [];
const projectUsage = new Map();

function projectKeyFor(file) {
  if (file.startsWith(`FrontProject${path.sep}`)) {
    return "FrontProject";
  }

  if (file.startsWith(`apps${path.sep}`)) {
    const [, appName] = file.split(path.sep);
    return path.join("apps", appName);
  }

  return undefined;
}

for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");
  const isCss = file.endsWith(".css");
  const isAppFile = file.startsWith(`apps${path.sep}`) || file.startsWith(`FrontProject${path.sep}`);
  const projectKey = projectKeyFor(file);

  if (projectKey && /\.(tsx|ts)$/.test(file)) {
    const usage = projectUsage.get(projectKey) ?? { usesUi: false, importsStyles: false };
    usage.usesUi = usage.usesUi || /from\s+["']@person-workspace\/ui["']/.test(source);
    usage.importsStyles = usage.importsStyles || /["']@person-workspace\/ui\/styles\.css["']/.test(source);
    projectUsage.set(projectKey, usage);
  }

  if (!allowedRawColorFiles.has(file) && rawColorPattern.test(source)) {
    pushError(errors, file, "raw color 只能写在 packages/ui/src/styles/tokens.css");
  }

  if (/\.(tsx|ts)$/.test(file) && inlineStylePattern.test(source)) {
    pushError(errors, file, "禁止 JSX inline style，请使用组件库 props 或 CSS token");
  }

  if (isAppFile && file.endsWith(".tsx") && nativePrimitivePattern.test(source)) {
    pushError(errors, file, "应用层禁止直接写原生表单/表格控件，请使用 @front/ui");
  }

  if (isAppFile && isCss && adHocUiSelectorPattern.test(source)) {
    pushError(errors, file, "应用层禁止自造 button/input/card/table/form 等重复 UI 样式");
  }
}

for (const [projectKey, usage] of projectUsage) {
  if (usage.usesUi && !usage.importsStyles) {
    pushError(errors, projectKey, "使用 @person-workspace/ui 时必须引入 @person-workspace/ui/styles.css");
  }
}

if (errors.length > 0) {
  console.error("Design rule check failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log("Design rule check passed.");
