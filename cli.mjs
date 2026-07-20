#!/usr/bin/env node

import { parseArgs } from "node:util";

async function main() {
    const [command, ...commandArgs] = process.argv.slice(2);

    if (command === "market") {
        await queryMarket(commandArgs);
        return;
    }
    if (command === "projects") {
        await queryProjects(commandArgs);
        return;
    }

    printHelp();
    process.exitCode = 1;
}

async function queryMarket(args) {
    const { values } = parseArgs({
        args,
        options: {
            keyword: {
                type: "string",
                short: "k"
            },
            server: {
                type: "string",
                default: "http://127.0.0.1:18080"
            }
        }
    });

    const url = new URL("/api/v1/market", values.server);

    if (values.keyword) {
        url.searchParams.set("keyword", values.keyword);
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`请求失败：HTTP ${response.status}`);
    }

    const result = await response.json();

    console.table(
        result.data.items.map((company) => ({
            企业: company.shortName,
            挂牌代码: company.listingCode,
            行业: company.industry,
            地区: company.region
        }))
    );
}
async function queryProjects(args) {
    const { values } = parseArgs({
        args,
        options: {
            status: {
                type: "string",
                short: "s",
                default: "ALL"
            },
            server: {
                type: "string",
                default: "http://127.0.0.1:18080"
            }
        }
    });

    const url = new URL("/api/v1/projects", values.server);

    if (values.status) {
        url.searchParams.set("status", values.status);
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`请求失败：HTTP ${response.status}`);
    }

    const result = await response.json();

    console.table(
            result.data.items.map((company) => ({
                名字: company.title,
                融资金额: company.financingAmount+company.financingUnit,
                行业: company.industry,
                地区: company.region
            }))
    );
}
function printHelp() {
    console.log(`
  股权交易中心 CLI

  用法：
    equity market --keyword 云链
    equity market -k 智造
    equity market --server http://127.0.0.1:18080
  `);
}

main().catch((error) => {
    console.error(`执行失败：${error.message}`);
    process.exitCode = 1;
});