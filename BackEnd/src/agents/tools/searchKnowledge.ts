import { readFile } from "node:fs/promises";
import { tool } from "@openai/agents";
import { z } from "zod";

type KnowledgeChunk = {
    title: string;
    content: string;
    startLine: number;
    endLine: number;
};

const knowledgeFile =
    process.env.KNOWLEDGE_BASE_FILE ||
    "/Users/zhengjiameng/项目资源/malong/运营端创建规则梳理.md";

let knowledgeChunks: Promise<KnowledgeChunk[]> | null = null;

function loadKnowledgeChunks() {
    if (!knowledgeChunks) {
        knowledgeChunks = readFile(knowledgeFile, "utf8").then(splitMarkdown);
    }

    return knowledgeChunks;
}

function splitMarkdown(markdown: string) {
    const lines = markdown.split(/\r?\n/);
    const chunks: KnowledgeChunk[] = [];
    const headings: string[] = [];
    let current: { title: string; lines: string[]; startLine: number } | null = null;

    function flush(endLine: number) {
        if (!current) {
            return;
        }

        const content = current.lines.join("\n").trim();

        if (content.length > 20) {
            chunks.push({
                title: current.title,
                content,
                startLine: current.startLine,
                endLine
            });
        }
    }

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);

        if (heading) {
            flush(index);

            const level = heading[1].length;
            headings.length = level - 1;
            headings[level - 1] = heading[2].trim();

            current = {
                title: headings.filter(Boolean).join(" / "),
                lines: [line],
                startLine: lineNumber
            };

            return;
        }

        current?.lines.push(line);
    });

    flush(lines.length);

    return chunks;
}

function buildTokens(query: string) {
    const normalized = query.toLowerCase().trim();
    const tokens = new Set<string>();

    for (const token of normalized.split(/[\s,，。；;：:？?、/\\|()[\]{}<>]+/)) {
        if (token.length >= 2) {
            tokens.add(token);
        }
    }

    for (const token of normalized.match(/[a-z0-9_.:-]{2,}/g) || []) {
        tokens.add(token);
    }

    for (const phrase of normalized.match(/[\u4e00-\u9fa5]{2,}/g) || []) {
        tokens.add(phrase);

        for (let size = 2; size <= 4; size += 1) {
            for (let index = 0; index <= phrase.length - size; index += 1) {
                tokens.add(phrase.slice(index, index + size));
            }
        }
    }

    return Array.from(tokens);
}

function countOccurrences(text: string, token: string) {
    let count = 0;
    let index = text.indexOf(token);

    while (index !== -1) {
        count += 1;
        index = text.indexOf(token, index + token.length);
    }

    return count;
}

function scoreChunk(chunk: KnowledgeChunk, query: string, tokens: string[]) {
    const title = chunk.title.toLowerCase();
    const content = chunk.content.toLowerCase();
    const fullText = `${title}\n${content}`;
    let score = fullText.includes(query.toLowerCase()) ? 20 : 0;

    for (const token of tokens) {
        const titleHits = countOccurrences(title, token);
        const contentHits = countOccurrences(content, token);
        score += titleHits * 5 + contentHits;
    }

    return score;
}

function truncate(content: string) {
    const maxLength = 1200;

    if (content.length <= maxLength) {
        return content;
    }

    return `${content.slice(0, maxLength)}\n...`;
}

export async function searchKnowledgeText(query: string, limit = 4) {
    const chunks = await loadKnowledgeChunks();
    const tokens = buildTokens(query);
    const matches = chunks
        .map((chunk) => ({
            chunk,
            score: scoreChunk(chunk, query, tokens)
        }))
        .filter((match) => match.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);

    if (matches.length === 0) {
        return `知识库未命中：${query}`;
    }

    return matches
        .map(({ chunk, score }, index) => {
            return [
                `#${index + 1} ${chunk.title}`,
                `score: ${score}`,
                `source: ${knowledgeFile}:${chunk.startLine}-${chunk.endLine}`,
                truncate(chunk.content)
            ].join("\n");
        })
        .join("\n\n---\n\n");
}

export const searchKnowledge = tool({
    name: "search_knowledge",
    description: "按关键词查询知识库内容",
    parameters: z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(6).optional()
    }),
    async execute({ query, limit = 4 }) {
        return searchKnowledgeText(query, limit);
    }
});
