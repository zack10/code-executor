import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

// CodeMirror imports
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup, EditorView } from 'codemirror';

interface Language {
  id: number;
  name: string;
  ext: string;
  template: string;
  codemirrorLang: any;
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
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  private readonly http = inject(HttpClient);

  private editorView: EditorView | null = null;

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
      codemirrorLang: cpp(),
      template:
        '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    },
    {
      id: 54,
      name: 'C++ (GCC 9.2.0)',
      ext: 'cpp',
      codemirrorLang: cpp(),
      template:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    },
    {
      id: 62,
      name: 'Java (OpenJDK 13)',
      ext: 'java',
      codemirrorLang: java(),
      template:
        'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    },
    {
      id: 71,
      name: 'Python (3.8.1)',
      ext: 'py',
      codemirrorLang: python(),
      template: 'print("Hello, World!")',
    },
    {
      id: 63,
      name: 'JavaScript (Node.js 12)',
      ext: 'js',
      codemirrorLang: javascript(),
      template: 'console.log("Hello, World!");',
    },
    {
      id: 68,
      name: 'PHP (7.4.1)',
      ext: 'php',
      codemirrorLang: php(),
      template: '<?php\necho "Hello, World!\\n";',
    },
    {
      id: 51,
      name: 'C# (Mono 6.6.0)',
      ext: 'cs',
      codemirrorLang: java(), // C# uses Java highlighting
      template:
        'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
    },
    {
      id: 60,
      name: 'Go (1.13.5)',
      ext: 'go',
      codemirrorLang: javascript(), // Go uses JavaScript highlighting
      template: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    },
    {
      id: 72,
      name: 'Ruby (2.7.0)',
      ext: 'rb',
      codemirrorLang: python(), // Ruby uses Python highlighting
      template: 'puts "Hello, World!"',
    },
    {
      id: 73,
      name: 'Rust (1.40.0)',
      ext: 'rs',
      codemirrorLang: rust(),
      template: 'fn main() {\n    println!("Hello, World!");\n}',
    },
  ];

  constructor() {}

  ngOnInit() {
    const lang = this.languages.find((l) => l.id === this.selectedLanguageId());
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  initializeEditor() {
    if (this.editorView) {
      this.editorView.destroy();
    }

    const lang = this.currentLanguage();

    const startState = EditorState.create({
      doc: this.code(),
      extensions: [
        basicSetup,
        lang?.codemirrorLang || javascript(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.code.set(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { padding: '16px 0' },
          '.cm-gutters': { backgroundColor: '#0d1117', borderRight: '1px solid #30363d' },
        }),
      ],
    });

    this.editorView = new EditorView({
      state: startState,
      parent: this.editorContainer.nativeElement,
    });
  }

  onLanguageChange(langId: number | string) {
    const id = typeof langId === 'string' ? Number.parseInt(langId, 10) : langId;
    this.selectedLanguageId.set(id);

    const lang = this.languages.find((l) => l.id === id);
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
    this.output.set('');
    this.executionResult.set(null);

    // Reinitialize editor with new language
    this.initializeEditor();
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

  ngOnDestroy() {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }
}
