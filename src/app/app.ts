import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

interface Language {
  id: number;
  name: string;
  ext: string;
  template: string;
}

interface ExecutionResult {
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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  @ViewChild('editor') editorElement?: ElementRef;
  private readonly http = inject(HttpClient);

  code = signal('');
  output = signal('');
  isRunning = signal(false);
  selectedLanguageId = signal(50);
  executionResult = signal<ExecutionResult | null>(null);
  currentLanguage = signal<Language | undefined>(undefined);

  languages: Language[] = [
    {
      id: 50,
      name: 'C (GCC 9.2.0)',
      ext: 'c',
      template:
        '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    },
    {
      id: 54,
      name: 'C++ (GCC 9.2.0)',
      ext: 'cpp',
      template:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    },
    {
      id: 62,
      name: 'Java (OpenJDK 13)',
      ext: 'java',
      template:
        'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    },
    { id: 71, name: 'Python (3.8.1)', ext: 'py', template: 'print("Hello, World!")' },
    {
      id: 63,
      name: 'JavaScript (Node.js 12)',
      ext: 'js',
      template: 'console.log("Hello, World!");',
    },
    { id: 68, name: 'PHP (7.4.1)', ext: 'php', template: '<?php\necho "Hello, World!\\n";' },
    {
      id: 51,
      name: 'C# (Mono 6.6.0)',
      ext: 'cs',
      template:
        'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
    },
    {
      id: 60,
      name: 'Go (1.13.5)',
      ext: 'go',
      template: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    },
    { id: 72, name: 'Ruby (2.7.0)', ext: 'rb', template: 'puts "Hello, World!"' },
    {
      id: 73,
      name: 'Rust (1.40.0)',
      ext: 'rs',
      template: 'fn main() {\n    println!("Hello, World!");\n}',
    },
    {
      id: 74,
      name: 'Typescript (3.8.3)',
      ext: 'ts',
      template: 'console.log("Hello, World!");',
    },
  ];

  constructor() {}

  ngOnInit() {
    const lang = this.languages.find((l) => l.id === this.selectedLanguageId());
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
  }

  onLanguageChange(langId: number | string) {
    const id = typeof langId === 'string' ? Number.parseInt(langId, 10) : langId;
    this.selectedLanguageId.set(id);

    const lang = this.languages.find((l) => l.id === id);
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
    this.output.set('');
    this.executionResult.set(null);
  }

  onCodeChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.code.set(target.value);
  }

  encodeBase64(str: string): string {
    return btoa(
      encodeURIComponent(str).replaceAll(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCodePoint(Number.parseInt(p1, 16));
      })
    );
  }

  decodeBase64(str: string): string {
    try {
      return decodeURIComponent(
        atob(str)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.codePointAt(0)?.toString(16)).slice(-2);
          })
          .join('')
      );
    } catch (e) {
      console.error('Failed to decode base64:', e);
      return atob(str);
    }
  }

  runCode() {
    console.log('Starting execution...');
    this.isRunning.set(true);
    this.output.set('');
    this.executionResult.set(null);

    const encodedCode = this.encodeBase64(this.code());

    const payload = {
      source_code: encodedCode,
      language_id: this.selectedLanguageId(),
    };

    console.log('Sending request...');

    this.http
      .post<ExecutionResult>(
        'http://192.168.64.130:2358/submissions/?base64_encoded=true&wait=true',
        payload
      )
      .subscribe({
        next: (result) => {
          console.log('Got result:', result);
          this.executionResult.set(result);

          let output = '';

          if (result.compile_output) {
            output += '=== Compilation Error ===\n';
            output += this.decodeBase64(result.compile_output);
          } else if (result.stderr) {
            output += '=== Error ===\n';
            output += this.decodeBase64(result.stderr);
          } else if (result.stdout) {
            output += this.decodeBase64(result.stdout);
          } else {
            output = 'No output';
          }

          this.output.set(output);
          console.log('Setting isRunning to false');
          this.isRunning.set(false);
        },
        error: (error: any) => {
          console.error('Execution error:', error);
          this.output.set(`Error: ${error.message || 'Failed to execute code'}`);
          console.log('Setting isRunning to false (error)');
          this.isRunning.set(false);
        },
        complete: () => {
          console.log('Request completed');
        },
      });
  }
}
