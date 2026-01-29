export interface CompilationResult {
  success: boolean;
  framework: 'angular' | 'react';
  files: Record<string, string>;
  compilationTime: number;
}
