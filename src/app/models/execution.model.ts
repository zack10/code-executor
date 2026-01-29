export interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
  status: {
    id: number;
    description: string;
  };
}
