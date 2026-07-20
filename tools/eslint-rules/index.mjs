const RAW_COLOR_PATTERN =
  /(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|(?<![-\w])(?:black|white|red|green|blue|gray|grey|transparent)(?![-\w]))/;

const UI_PRIMITIVES = new Set(["button", "input", "select", "textarea", "table", "form", "dialog"]);
const UI_CLASS_PATTERN = /(^|[-_\s])(?:btn|button|input|select|textarea|dialog|form|card|table)([-_\s]|$)/i;

function reportRawColor(context, node, value) {
  if (typeof value !== "string") {
    return;
  }

  if (!RAW_COLOR_PATTERN.test(value)) {
    return;
  }

  context.report({
    node,
    message:
      "不要在业务代码里写 raw color。颜色只能集中定义在 packages/ui/src/styles/tokens.css，并通过 CSS 变量使用。"
  });
}

const noRawColor = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止在 TS/TSX 中直接写颜色值"
    },
    schema: []
  },
  create(context) {
    return {
      Literal(node) {
        reportRawColor(context, node, node.value);
      },
      TemplateElement(node) {
        reportRawColor(context, node, node.value.raw);
      }
    };
  }
};

const noInlineStyle = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止 JSX inline style，避免重复样式绕过 token 和组件库"
    },
    schema: []
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "style") {
          return;
        }

        context.report({
          node,
          message: "不要使用 JSX inline style。请使用组件库能力或 token 驱动的 CSS 类。"
        });
      }
    };
  }
};

const preferUiComponents = {
  meta: {
    type: "problem",
    docs: {
      description: "应用层禁止直接使用原生表单/表格组件，必须优先使用 @person-workspace/ui"
    },
    schema: []
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name?.name;

        if (!UI_PRIMITIVES.has(elementName)) {
          return;
        }

        context.report({
          node,
          message: `应用层不要直接写 <${elementName}>。请从 @person-workspace/ui 使用对应组件。`
        });
      }
    };
  }
};

const noAdHocUiClassname = {
  meta: {
    type: "problem",
    docs: {
      description: "应用层禁止自造 button/input/card/table 等 UI class，避免重复组件样式"
    },
    schema: []
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "className") {
          return;
        }

        if (node.value?.type !== "Literal" || typeof node.value.value !== "string") {
          return;
        }

        if (!UI_CLASS_PATTERN.test(node.value.value)) {
          return;
        }

        context.report({
          node,
          message:
            "不要在应用层自造 button/input/card/table/form 等 UI class。请复用 @person-workspace/ui 组件。"
        });
      }
    };
  }
};

export default {
  rules: {
    "no-ad-hoc-ui-classname": noAdHocUiClassname,
    "no-inline-style": noInlineStyle,
    "no-raw-color": noRawColor,
    "prefer-ui-components": preferUiComponents
  }
};
