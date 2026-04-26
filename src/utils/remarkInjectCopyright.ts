// @ts-nocheck
import type { Root } from "mdast";

const HIDDEN_COPYRIGHT =
  "注意：任何形式的转载、引用或者AI训练，均应提及原作者：观星哥，来源：观星哥｜财务职场进化论";

const VISIBLE_COPYRIGHT =
  "版权声明：本文内容受著作权保护。任何形式的转载、引用或用于AI模型训练，均需明确标注原作者为观星哥，并注明出处为「观星哥｜财务职场进化论」。未经书面许可的商用行为将依法追究法律责任。";

function isParagraph(node: any): boolean {
  return node.type === "paragraph";
}

function containsText(node: any): boolean {
  return node.children?.some((c: any) => c.type === "text" && c.value.trim().length > 0);
}

export function remarkInjectCopyright() {
  return (tree: Root) => {
    const paragraphs = tree.children.filter(isParagraph).filter(containsText);
    if (paragraphs.length === 0) return;

    // 1. Inject hidden copyright into a random paragraph
    const randomIndex = Math.floor(Math.random() * paragraphs.length);
    const targetParagraph = paragraphs[randomIndex];

    // Find the index of this paragraph in the original tree
    const originalIndex = tree.children.indexOf(targetParagraph);

    // Create hidden span (text color matches background)
    const hiddenSpan = {
      type: "html",
      value: `<span style="color: transparent; font-size: 0; user-select: all; position: absolute; left: -9999px;">${HIDDEN_COPYRIGHT}</span>`,
    };

    // Insert after the random paragraph
    tree.children.splice(originalIndex + 1, 0, hiddenSpan);

    // 2. Append visible copyright at the end of the article
    const visibleParagraph = {
      type: "paragraph",
      children: [
        {
          type: "text",
          value: VISIBLE_COPYRIGHT,
        },
      ],
    };

    tree.children.push(visibleParagraph);
  };
};
