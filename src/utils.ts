import * as fs from "fs";
import * as path from "path";
import logger from "./logger";
import { Test, Report, Suite, SplitFile } from "./types";

export async function readPlaywrightReport(
  reportPath: string,
  failedTestsOnly: boolean = false
): Promise<Test[]> {
  const report: Report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const tests: Test[] = [];

  function extractTests(suite: Suite) {
    suite.suites?.forEach(extractTests);
    suite.specs?.forEach((spec) => {
      spec.tests.forEach((test) => {
        test.filePath = path.resolve(process.cwd(), spec.file);
        if (
          !failedTestsOnly ||
          (failedTestsOnly &&
            test.results.some((result) => result.status !== "passed"))
        ) {
          tests.push(test);
        }
      });
    });
  }

  report.suites.forEach(extractTests);
  logger.debug(
    `Read ${tests.length} tests from report with failedTestsOnly=${failedTestsOnly}`
  );
  return tests;
}

export async function mergeReports(
  reportDir: string,
  failedTestsOnly: boolean = false
): Promise<Test[]> {
  const allTests: Test[] = [];
  const reportFiles = fs
    .readdirSync(reportDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of reportFiles) {
    const reportPath = path.join(reportDir, file);
    const tests = await readPlaywrightReport(reportPath, failedTestsOnly);
    allTests.push(...tests);
  }

  logger.debug(
    `Merged ${allTests.length} tests from ${reportFiles.length} reports`
  );
  return allTests;
}

export async function splitTests(
  tests: Test[],
  numSplits: number
): Promise<SplitFile[]> {
  const sortedTests = tests.sort(
    (a, b) => b.results[0].duration - a.results[0].duration
  );
  const splits: Test[][] = Array.from({ length: numSplits }, () => []);
  const durations: number[] = Array.from({ length: numSplits }, () => 0);

  sortedTests.forEach((test) => {
    const minIndex = durations.indexOf(Math.min(...durations));
    splits[minIndex].push(test);
    durations[minIndex] += test.results[0].duration;
  });

  splits.forEach((split, index) => {
    logger.debug(
      `Split ${index + 1}: ${split.length} tests, total duration: ${
        durations[index]
      }ms`
    );
  });

  const splitFiles: SplitFile[] = splits.map((split, index) => {
    const totalDurationMinutes = Math.round(durations[index] / 60000);
    const files = split.map((test) => ({
      file: path.relative(process.cwd(), test.filePath),
      duration: test.results[0].duration,
    }));
    return { totalDurationMinutes, files };
  });

  return splitFiles;
}

export async function saveSplitFiles(
  splits: SplitFile[],
  outputDir: string
): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });
  splits.forEach((split, index) => {
    const filePath = path.join(outputDir, `split-${index + 1}.json`);
    fs.writeFileSync(filePath, JSON.stringify(split, null, 2), "utf8");
    logger.debug(`Saved split ${index + 1} to ${filePath}`);
  });
}

export async function getTestMatchFromEnv(): Promise<string[]> {
  const splitIndex = parseInt(process.env.SPLIT_INDEX1 || "", 10) - 1;
  const outputDir = process.env.OUTPUT_DIR || "splits";
  const splitFile = path.join(outputDir, `split-${splitIndex + 1}.json`);
  let testMatch: string[] = [];

  if (!isNaN(splitIndex) && splitIndex >= 0 && fs.existsSync(splitFile)) {
    const split = JSON.parse(fs.readFileSync(splitFile, "utf8"));
    testMatch = split.files.map((file: { file: string }) =>
      path.resolve(process.cwd(), file.file)
    );
    logger.debug(`Loaded test match from ${splitFile}`);
  } else {
    logger.debug("No valid split file found");
  }

  return testMatch;
}
