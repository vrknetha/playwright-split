export interface TestResult {
  workerIndex: number;
  status: string;
  duration: number;
  startTime: string;
  steps: Array<{ title: string; duration: number }>;
}

export interface Test {
  title: string;
  ok: boolean;
  tags: string[];
  results: TestResult[];
  filePath: string;
}

export interface Report {
  suites: Suite[];
}

export interface Suite {
  title: string;
  file: string;
  suites: Suite[];
  specs: Spec[];
}

export interface Spec {
  title: string;
  file: string;
  tests: Test[];
}

export interface SplitFile {
  totalDurationMinutes: number;
  files: Array<{ file: string; duration: number }>;
}
