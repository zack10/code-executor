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
import { TerminalCleanPipe } from './terminal-clean-pipe';
import { WebContainerService } from './web-container.service';

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
  imports: [CommonModule, FormsModule, TerminalCleanPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('terminalOutput') terminalRef!: ElementRef;
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly webcontainerService = inject(WebContainerService);
  private editorView: EditorView | null = null;
  private currentBlobUrl: string | null = null;
  private iframeInitialized = false;

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
  previewHeight = signal(500);

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

  isContainerReady = false;

  constructor() {
    // This effect runs every time previewUrl is updated
    effect(() => {
      // 1. We 'read' the signal to track changes
      this.output();

      // 2. We use requestAnimationFrame to wait for the browser to render the new HTML
      requestAnimationFrame(() => {
        if (this.terminalRef?.nativeElement) {
          const el = this.terminalRef.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  ngOnInit() {
    // Suppress WebContainer's frame_start.js error
    window.addEventListener(
      'error',
      (e) => {
        if (e.filename?.includes('frame_start.js')) {
          e.preventDefault();
          return false;
        }
        return true;
      },
      true,
    );

    const lang = this.languages.find((l) => l.id === this.selectedLanguageId());
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  /**
   * Gets the basic extensions for the CodeMirror editor
   * @returns Array of CodeMirror extensions
   */
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

  /**
   * Initializes the CodeMirror editor
   */
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

  /**
   * Handles language selection changes
   * @param langId The selected language ID
   */
  onLanguageChange(langId: number | string) {
    const id = typeof langId === 'string' ? Number.parseInt(langId, 10) : langId;
    this.selectedLanguageId.set(id);

    const lang = this.languages.find((l) => l.id === id);
    this.currentLanguage.set(lang);
    this.code.set(lang?.template || '');
    this.output.set('');
    this.executionResult.set(null);
    this.previewHtml.set(null);
    this.iframeInitialized = false; // Add this line
    this.isContainerReady = false;

    this.initializeEditor();
  }

  /**
   * Encodes a string to base64, handling UTF-8 characters
   * @param str The input string
   * @returns The base64 encoded string
   */
  encodeBase64(str: string): string {
    return btoa(
      encodeURIComponent(str).replaceAll(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCodePoint(Number.parseInt(p1, 16));
      }),
    );
  }

  /**
   * Decodes a base64 encoded string, handling UTF-8 characters
   * @param str The base64 encoded string
   * @returns The decoded string
   */
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

  /**
   * Runs the code based on the selected language
   * @returns void
   */
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

  /**
   * Compiles an Angular component using the external compiler service
   * @param sourceCode The Angular component source code
   */
  compileAngularComponent_old(sourceCode: string) {
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

  /**
   *
   * @param sourceCode
   * @returns
   */
  async compileAngularComponent(sourceCode: string) {
    this.isRunning.set(true);
    this.isPreviewMode.set(true);
    this.output.set(''); // Clear logs for a fresh run

    try {
      const webcontainer = await this.webcontainerService.init();

      // ⚡ FAST UPDATE: If container is already running
      if (this.isContainerReady) {
        this.output.update((v) => v + '\n⚡ Updating source...');
        await webcontainer.fs.writeFile('/src/app.component.ts', sourceCode);
        this.isRunning.set(false);
        return;
      }

      // 🏗️ FIRST TIME SETUP
      this.output.set('🏗️ Booting WebContainer...\n');

      const files = {
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: 'angular-live',
              type: 'module',
              dependencies: {
                '@angular/animations': '17.3.0',
                '@angular/common': '17.3.0',
                '@angular/compiler': '17.3.0',
                '@angular/core': '17.3.0',
                '@angular/forms': '17.3.0',
                '@angular/platform-browser': '17.3.0',
                '@angular/platform-browser-dynamic': '17.3.0',
                '@angular/router': '17.3.0',
                '@angular-devkit/build-angular': '17.3.0',
                '@angular/compiler-cli': '17.3.0',
                '@analogjs/vite-plugin-angular': '1.3.0',
                vite: '5.2.10',
                typescript: '5.4.5',
                rxjs: '7.8.1',
                'zone.js': '0.14.4',
                tslib: '2.6.2',
                tinyglobby: '0.2.0',
                postcss: '8.4.38',
              },
              scripts: { dev: 'vite --host' },
            }),
          },
        },
        'vite.config.ts': {
          file: {
            contents: `
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  }
});
`,
          },
        },
        'tsconfig.json': {
          file: {
            contents: JSON.stringify(
              {
                compilerOptions: {
                  target: 'ES2022',
                  useDefineForClassFields: false,
                  module: 'ESNext',
                  lib: ['ESNext', 'DOM'],
                  moduleResolution: 'Node',
                  experimentalDecorators: true,
                  emitDecoratorMetadata: true,
                  skipLibCheck: true,
                  baseUrl: './',
                  types: ['vite/client'],
                },
              },
              null,
              2,
            ),
          },
        },
        src: {
          directory: {
            'main.ts': {
              file: {
                contents: `
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

console.log('🚀 main.ts loaded');

// Add error handling
bootstrapApplication(AppComponent)
  .then(() => {
    console.log('✅ Angular app bootstrapped successfully');
  })
  .catch(err => {
    console.error('❌ Bootstrap error:', err);
    const appRoot = document.querySelector('app-root');
    if (appRoot) {
      appRoot.innerHTML = '<div style="color: red; padding: 20px; white-space: pre-wrap;">Bootstrap Error:\\n' + err.message + '\\n\\n' + (err.stack || '') + '</div>';
    }
  });
`,
              },
            },
            'app.component.ts': {
              file: {
                contents: sourceCode,
              },
            },
          },
        },
        'index.html': {
          file: {
            contents: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Angular Preview</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
    .loading { color: #666; }
    .error { color: red; padding: 20px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <app-root><div class="loading">Loading Angular...</div></app-root>
  <script type="module" src="/src/main.ts"></script>
  
  <script>
    // Add global error handler to catch unhandled errors
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.message, e.filename, e.lineno);
      const appRoot = document.querySelector('app-root');
      if (appRoot) {
        appRoot.innerHTML = '<div class="error">Error: ' + e.message + '\\n' + e.filename + ':' + e.lineno + '</div>';
      }
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled rejection:', e.reason);
      const appRoot = document.querySelector('app-root');
      if (appRoot) {
        appRoot.innerHTML = '<div class="error">Promise rejection: ' + e.reason + '</div>';
      }
    });
    
    // Check if Angular loaded after 5 seconds
    setTimeout(() => {
      const appRoot = document.querySelector('app-root');
      if (appRoot && appRoot.children.length === 1 && appRoot.textContent.includes('Loading')) {
        console.error('Angular failed to bootstrap - app-root is still showing loading message');
        appRoot.innerHTML = '<div class="error">Angular failed to bootstrap. Check the browser console for errors.</div>';
      }
    }, 5000);
  </script>
</body>
</html>`,
          },
        },
      };

      await webcontainer.mount(files);

      // 📦 INSTALL STEP
      this.output.update((val) => val + '📦 npm install\n');
      const installProcess = await webcontainer.spawn('npm', ['install', '--legacy-peer-deps']);

      installProcess.output.pipeTo(
        new WritableStream({
          write: (data) => {
            if (data.includes('\x1b[1;1H') || data.includes('\x1b[2J')) {
              this.output.set('');
              return;
            }

            if (data.includes('\x1b[1G')) {
              this.output.update((current) => {
                const lastNewline = current.lastIndexOf('\n');
                const base = lastNewline > -1 ? current.substring(0, lastNewline + 1) : '';
                return base + data;
              });
            } else {
              this.output.update((v) => v + data);
            }
          },
        }),
      );

      const installCode = await installProcess.exit;
      if (installCode !== 0) throw new Error('Installation failed');

      // 🚀 RUN STEP
      this.output.update((val) => val + '\n🚀 Starting Dev Server...\n');
      const devProcess = await webcontainer.spawn('npm', ['run', 'dev']);

      devProcess.output.pipeTo(
        new WritableStream({
          write: (data) => this.output.update((val) => val + data),
        }),
      );

      // 🌐 SERVER READY - CRITICAL FIX HERE
      webcontainer.on('server-ready', (port, url) => {
        console.log('Server ready on port:', port);
        console.log('Server URL:', url);

        // Prevent duplicate initialization
        if (this.iframeInitialized) {
          console.log('Iframe already initialized, skipping');
          return;
        }

        this.output.update((v) => v + `\n✅ Dev server ready at ${url}\n`);

        // Use Angular's zone to ensure change detection
        setTimeout(() => {
          const iframeEl = this.previewFrame?.nativeElement;
          if (!iframeEl) {
            console.error('Iframe element not found');
            return;
          }

          // Clear any existing content and handlers
          iframeEl.onload = null;
          iframeEl.onerror = null;

          // Set up load handler BEFORE setting src
          iframeEl.onload = () => {
            console.log('✅ Iframe loaded successfully');
            this.isContainerReady = true;
            this.isRunning.set(false);
          };

          iframeEl.onerror = (e) => {
            console.error('❌ Iframe load error:', e);
            this.output.update((v) => v + '\n❌ Failed to load preview');
            this.isRunning.set(false);
          };

          console.log('Setting iframe src to:', url);
          iframeEl.src = url;
          this.iframeInitialized = true;
        }, 1500); // Give Vite extra time to fully initialize
      });
    } catch (error: any) {
      this.output.update((val) => val + `\n\n❌ Error: ${error.message}`);
      this.isRunning.set(false);
    }
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

  /**
   * Helper to clean up the messy CLI output from Angular compilation errors
   * @param logs Raw logs from Angular CLI
   * @returns Formatted error message
   */
  formatAngularError(logs: string): string {
    // Look for the "Error:" keyword in Angular logs
    const errorIndex = logs.indexOf('Error:');
    if (errorIndex !== -1) {
      return `❌ ${logs.substring(errorIndex).split('at')[0]}`;
    }
    return logs;
  }

  /**
   * Sets up a global error trap inside the iframe to catch runtime errors
   */
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

  /**
   *  Creates a complete HTML document for previewing
   * @param files Object with file names as keys and content as values
   * @returns Complete HTML string
   */
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

  /**
   * Runs the code using the Judge0 API
   */
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

  private cleanTerminalOutput(text: string): string {
    if (!text) return '';

    return (
      text
        // 1. Kill the ANSI codes (The ones causing [32m etc.)
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
        // 2. Kill the "Home" and "Clear" codes explicitly
        .replace(/\x1B\[1;1H|\x1B\[0J|\x1B\[2J/g, '')
        // 3. Remove the Backspace + Spinner junk
        .replace(/.\x08/g, '')
        // 4. Collapse the giant Vite empty gaps (3+ newlines into 1)
        .replace(/\n{3,}/g, '\n\n')
        // 5. Final safety: strip any stray Escape characters
        .replace(/\x1B/g, '')
    );
  }

  copyLogs() {
    const plainText = this.cleanTerminalOutput(this.output());
    navigator.clipboard.writeText(plainText);
    // Optional: show a "Copied!" toast
  }

  ngOnDestroy() {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  consoleVisible = signal(true);
  consoleMinimized = signal(false);
  consoleHeight = signal(30); // percentage
  isResizing = false;
  private startY = 0;
  private startHeight = 0;

  toggleConsole() {
    this.consoleVisible.set(!this.consoleVisible());
  }

  minimizeConsole() {
    this.consoleMinimized.update((val) => !val);
  }

  maximizeConsole() {
    if (this.consoleHeight() < 90) {
      this.consoleHeight.set(90);
    } else {
      this.consoleHeight.set(30);
    }
  }

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
    this.startY = event.clientY;
    this.startHeight = this.consoleHeight();

    document.body.classList.add('resizing');

    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isResizing) return;

      const containerHeight = (event.target as HTMLElement).parentElement?.offsetHeight || 600;
      const deltaY = e.clientY - this.startY;
      const deltaPercent = (deltaY / containerHeight) * 100;

      let newConsoleHeight = this.startHeight - deltaPercent;

      // Clamp between 10% and 90%
      newConsoleHeight = Math.max(10, Math.min(90, newConsoleHeight));

      this.consoleHeight.set(newConsoleHeight);
    };

    const mouseUpHandler = () => {
      this.isResizing = false;
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }
}
