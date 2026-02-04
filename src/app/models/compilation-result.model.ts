export interface CompilationResult {
  success: boolean;
  framework: 'angular' | 'react' | 'vue';
  files: Record<string, string>;
  compilationTime: number;
}
