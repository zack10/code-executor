import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { showMinimap } from '@replit/codemirror-minimap';

interface Language {
  id: number;
  name: string;
  ext: string;
  template: string;
  useCompiler?: boolean;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private editorView: EditorView | null = null;
  private currentBlobUrl: string | null = null;

  code = signal('');
  isRunning = signal(false);
  isPreviewMode = signal(false);
  previewHtml = signal<SafeHtml | null>(null);
  previewError = signal('');
  selectedLanguageId = signal(50);
  executionResult = signal<ExecutionResult | null>(null);
  currentLanguage = signal<Language | undefined>(undefined);
  previewHtmlRaw = signal('');
  previewUrl = signal<SafeResourceUrl | null>(null);
  output = signal<string>('Ready...');

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
      codemirrorLang: java(),
      template:
        'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
    },
    {
      id: 60,
      name: 'Go (1.13.5)',
      ext: 'go',
      codemirrorLang: javascript(),
      template: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    },
    {
      id: 72,
      name: 'Ruby (2.7.0)',
      ext: 'rb',
      codemirrorLang: python(),
      template: 'puts "Hello, World!"',
    },
    {
      id: 73,
      name: 'Rust (1.40.0)',
      ext: 'rs',
      codemirrorLang: rust(),
      template: 'fn main() {\n    println!("Hello, World!");\n}',
    },
    {
      id: 74,
      name: 'Typescript (3.8.3)',
      ext: 'ts',
      codemirrorLang: javascript({ typescript: true }),
      template: 'console.log("Hello, World!");',
    },
    {
      id: 82,
      name: 'SQL (SQLite 3.27.2)',
      ext: 'sql',
      codemirrorLang: sql(),
      template: `-- Create a table and insert data\nCREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);\nINSERT INTO users (name) VALUES ('Alice'), ('Bob');\n\n-- Select data\nSELECT * FROM users;`,
    },
    {
      id: 1001,
      name: 'Angular Component (Sandboxed)',
      ext: 'ts',
      codemirrorLang: javascript({ typescript: true }),
      useCompiler: true, // Flag to use compiler service
      template: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div style="padding: 30px; font-family: Arial, sans-serif;">
      <h1>{{ title }}</h1>
      
      <!-- Two-way binding -->
      <div style="margin: 20px 0;">
        <input [(ngModel)]="name" 
               placeholder="Enter your name"
               style="padding: 10px; width: 250px; border: 2px solid #3b82f6; border-radius: 6px;">
        <p *ngIf="name" style="color: #3b82f6; font-size: 18px;">
          Hello, {{ name }}! 👋
        </p>
      </div>
      
      <!-- Counter with *ngIf -->
      <div style="margin: 20px 0;">
        <p style="font-size: 20px;">Count: {{ count }}</p>
        <button (click)="increment()" style="margin: 5px;">Increment</button>
        <button (click)="decrement()" style="margin: 5px;">Decrement</button>
        <button (click)="reset()" style="margin: 5px;">Reset</button>
        
        <p *ngIf="count > 5" style="color: #ef4444;">
          Count is greater than 5!
        </p>
      </div>
      
      <!-- List with *ngFor -->
      <div style="margin: 20px 0;">
        <h3>Todo List:</h3>
        <ul style="list-style: none; padding: 0;">
          <li *ngFor="let item of items; let i = index" 
              style="padding: 8px; margin: 5px 0; background: #f3f4f6; border-radius: 4px;">
            {{ i + 1 }}. {{ item }}
          </li>
        </ul>
        <button (click)="addItem()">Add Item</button>
      </div>
    </div>
  \`,
  styles: [\`
    h1 {
      color: #3b82f6;
      font-size: 28px;
      margin-bottom: 20px;
    }
    
    button {
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
    }
    
    button:hover {
      background: #2563eb;
    }
    
    input {
      font-size: 14px;
    }
    
    input:focus {
      outline: none;
      border-color: #2563eb;
    }
  \`]
})
export class AppComponent {
  title = 'Full Angular Features Demo';
  name = '';
  count = 0;
  items = ['Learn Angular', 'Build awesome apps', 'Deploy to production'];

  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  reset() {
    this.count = 0;
  }

  addItem() {
    this.items.push(\`New item \${this.items.length + 1}\`);
  }
}`,
    },
  ];

  constructor() {
    // This effect runs every time previewUrl is updated
    effect(() => {
      const url = this.previewUrl();
      if (url && this.previewFrame) {
        this.setupErrorTrap();
      }
    });
  }

  ngOnInit() {
    const lang = this.languages.find((l) => l.id === this.selectedLanguageId());
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  // Enhanced editor setup with full autocomplete
  getBasicExtensions(): Extension[] {
    return [
      lineNumbers(),
      history(),
      foldGutter(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        activateOnTyping: true,
        override: [],
        closeOnBlur: true,
        maxRenderedOptions: 100,
        defaultKeymap: true,
      }),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),
    ];
  }

  initializeEditor() {
    if (this.editorView) {
      this.editorView.destroy();
    }

    const lang = this.currentLanguage();

    const startState = EditorState.create({
      doc: this.code(),
      extensions: [
        ...this.getBasicExtensions(),
        lang?.codemirrorLang || javascript(),
        oneDark,

        showMinimap.of({
          displayText: 'characters',
          showOverlay: 'always',
          create: (view: EditorView) => {
            const dom = document.createElement('div');
            dom.className = 'cm-minimap';
            return { dom };
          },
        }),

        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.code.set(update.state.doc.toString());
          }
        }),

        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            fontSize: '15px',
          },
          '.cm-minimap': {
            width: '80px',
            backgroundColor: '#0d1117',
            borderLeft: '1px solid #30363d',
          },
          '.cm-tooltip-autocomplete': {
            backgroundColor: '#1e1e1e',
            border: '1px solid #454545',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
          },
          '.cm-tooltip-autocomplete ul': {
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            fontSize: '13px',
          },
          '.cm-tooltip-autocomplete ul li': {
            padding: '4px 8px',
          },
          '.cm-tooltip-autocomplete ul li[aria-selected]': {
            backgroundColor: '#094771',
            color: '#ffffff',
          },
          '.cm-completionIcon': {
            width: '1em',
            marginRight: '0.5em',
          },
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
    this.previewHtml.set(null);

    this.initializeEditor();
  }

  encodeBase64(str: string): string {
    return btoa(
      encodeURIComponent(str).replaceAll(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCodePoint(Number.parseInt(p1, 16));
      }),
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
          .join(''),
      );
    } catch (e) {
      console.error('Failed to decode base64:', e);
      return atob(str);
    }
  }

  runCode() {
    const currentLang = this.currentLanguage();

    // Check if should use Angular compiler
    if (currentLang?.useCompiler) {
      this.compileAngularComponent(this.code());
      return;
    }

    // Use Judge0 for all other languages
    this.runInJudge0();
  }

  compileAngularComponent(sourceCode: string) {
    this.isRunning.set(true);
    this.isPreviewMode.set(true);
    this.output.set('Compiling Angular component... \nThis may take 1 minute.');
    this.previewError.set('');
    this.previewHtml.set(null);

    const compilerUrl = 'http://192.168.64.130:3001/compile';

    this.http.post<any>(compilerUrl, { code: sourceCode }).subscribe({
      next: (result) => {
        if (result.success) {
          const rawHtml = this.createPreviewHtml(result.files);

          // 1. Create the Blob and URL
          const blob = new Blob([rawHtml], { type: 'text/html' });
          if (this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
          this.currentBlobUrl = URL.createObjectURL(blob);

          // 2. THIS TRIGGERS THE @if IN THE TEMPLATE
          this.previewHtmlRaw.set(rawHtml);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobUrl));

          // 3. WAIT FOR RENDER
          // We use requestAnimationFrame or setTimeout to wait for the DOM to update
          setTimeout(() => {
            this.setupErrorTrap();
          }, 0);

          this.output.set('✓ Rendered');
        } else {
          this.previewError.set(result.error);
        }
        this.isRunning.set(false);
      },
      error: (err) => {
        // This catches the 400 error from the server
        const errorMsg = err.error?.logs || err.error?.error || 'Unknown Error';

        // Clean up the Angular CLI logs to show only the relevant part to the user
        const userFriendlyError = this.formatAngularError(errorMsg);

        this.output.set(userFriendlyError);
        this.previewError.set('Check the console for errors');
        this.isRunning.set(false);
      },
    });
  }

  // Clean up the string for the UI
  formatErrorMessage(rawLogs: string): string {
    if (!rawLogs) return '';

    return (
      rawLogs
        // 1. Strip ANSI color codes (the [31m stuff)
        .replaceAll(/\u001B\[[0-9;]*[mK]/g, '')
        // 2. Remove the "COMPILATION_COMPLETE" flag from the view
        .replace('COMPILATION_COMPLETE', '')
        // 3. Trim extra whitespace
        .trim()
    );
  }

  // Helper to clean up the messy CLI output
  formatAngularError(logs: string): string {
    // Look for the "Error:" keyword in Angular logs
    const errorIndex = logs.indexOf('Error:');
    if (errorIndex !== -1) {
      return `❌ ${logs.substring(errorIndex).split('at')[0]}`;
    }
    return logs;
  }

  private setupErrorTrap() {
    const iframe = this.previewFrame.nativeElement;

    // Clean up any old listeners first
    iframe.onload = null;

    iframe.onload = () => {
      const frameWin = iframe.contentWindow;
      if (frameWin) {
        frameWin.onerror = (msg, url, line, col, error) => {
          this.output.set(`❌ Runtime Error: ${msg}\nLine: ${line}, Column: ${col}`);
          return false;
        };
      }
    };
  }

  // 5. helper method to create preview HTML
  // Use the logic we discussed earlier to stitch the files together
  createPreviewHtml(files: any): string {
    let html = files['index.html'] || '';
    // Clean up template tags
    html = html.replace('<base href="/">', '');
    html = html.replaceAll(/<script\b[^>]*src="[^"]*"[^>]*><\/script>/g, '');
    html = html.replaceAll(/<link rel="stylesheet" [^>]*href="styles.css"[^>]*>/g, '');

    const style = files['styles.css'] ? `<style>${files['styles.css']}</style>` : '';

    let scripts = '';
    ['polyfills.js', 'runtime.js', 'main.js'].forEach((name) => {
      if (files[name]) {
        scripts += `<script type="module">${files[name]}</script>\n`;
      }
    });

    return html.replace('</head>', `${style}</head>`).replace('</body>', `${scripts}</body>`);
  }

  runInJudge0() {
    console.log('Starting execution...');
    this.isRunning.set(true);
    this.output.set('');
    this.executionResult.set(null);
    this.isPreviewMode.set(false);

    const encodedCode = this.encodeBase64(this.code());

    const payload = {
      source_code: encodedCode,
      language_id: this.selectedLanguageId(),
    };

    console.log('Sending request...');

    this.http
      .post<ExecutionResult>(
        'http://192.168.64.130:2358/submissions/?base64_encoded=true&wait=true',
        payload,
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
