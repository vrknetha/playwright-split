#!/usr/bin/env ts-node

import { Command } from "commander";
import {
  mergeReports,
  splitTests,
  saveSplitFiles,
  readPlaywrightReport,
} from "../src/utils";
import * as fs from "fs";
import logger from "../src/logger";

const program = new Command();

program
  .name("split-tests")
  .description(
    "Splits Playwright tests based on their durations, optionally splitting only failed tests, and supports merging multiple reports."
  )
  .requiredOption(
    "--report <reportPath>",
    "Path to the Playwright report JSON file or merged report file"
  )
  .requiredOption(
    "--splits <numSplits>",
    "Number of splits to divide the tests into"
  )
  .requiredOption("--output <outputDir>", "Directory to save the split files")
  .option(
    "--merge <reportDir>",
    "Directory containing Playwright report JSON files to merge"
  )
  .option("--failed-tests", "Only split the failed tests")
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log(
      "  $ split-tests --report path/to/report.json --splits 3 --output splits"
    );
    console.log(
      "  $ split-tests --report path/to/report.json --splits 3 --output splits --failed-tests"
    );
    console.log(
      "  $ split-tests --merge path/to/reports --report path/to/merged-report.json --splits 3 --output splits"
    );
    console.log(
      "  $ split-tests --merge path/to/reports --report path/to/merged-report.json --splits 3 --output splits --failed-tests"
    );
  })
  .parse(process.argv);

const options = program.opts();

const reportPath = options.report;
const mergeDir = options.merge || "";
const numSplits = parseInt(options.splits, 10);
const outputDir = options.output;
const failedTestsOnly = options.failedTests || false;

(async () => {
  let tests;

  if (mergeDir) {
    tests = await mergeReports(mergeDir, failedTestsOnly);
    // Save the merged report
    const mergedReport = {
      suites: [{ specs: tests.map((test) => ({ tests: [test] })) }],
    };
    fs.writeFileSync(reportPath, JSON.stringify(mergedReport, null, 2), "utf8");
    logger.info(`Merged reports and saved to ${reportPath}`);
  } else {
    tests = await readPlaywrightReport(reportPath, failedTestsOnly);
  }

  const splits = await splitTests(tests, numSplits);
  await saveSplitFiles(splits, outputDir);

  logger.info(
    `Tests have been split into ${numSplits} parts and saved to ${outputDir}`
  );
})();
