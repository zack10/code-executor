export interface Language {
  id: number;
  name: string;
  ext: string;
  template: string;
  useCompiler?: boolean;
  framework?: 'angular' | 'react';
  codemirrorLang: any;
}
