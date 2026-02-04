import { CommonModule } from '@angular/common';
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
import { javascript } from '@codemirror/lang-javascript';
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
import { CodeExecutorService } from './code-executor.service';
import { LANGUAGES_LIST } from './constants/languages';
import { CompilationResult } from './models/compilation-result.model';
import { ExecutionResult } from './models/execution.model';
import { Language } from './models/languages.model';
import { StringUtilsService } from './string-utils.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly codeExecutorService = inject(CodeExecutorService);
  private readonly stringUtilsService = inject(StringUtilsService);

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
  compilationResult = signal<CompilationResult | null>(null);
  isCopied = signal(false);

  languages: Language[] = LANGUAGES_LIST;

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
          create: () => {
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
    this.previewUrl.set(null);
    this.previewHtmlRaw.set('');
    this.compilationResult.set(null);
    this.isPreviewMode.set(false);
    this.previewError.set('');
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    this.initializeEditor();
  }

  /**
   * Compiles and runs front-end framework code (Angular or React)
   * @param sourceCode The source code to compile
   * @param framework The front-end framework to use ('angular' or 'react')
   */
  compileFrameworkComponent(sourceCode: string, framework: string) {
    this.isRunning.set(true);
    this.isPreviewMode.set(true);
    this.output.set(`Compiling ${framework}...`);

    this.previewUrl.set(null); // Clears the iframe src
    this.previewHtmlRaw.set(''); // Resets the raw HTML signal
    this.compilationResult.set(null); // Resets the compilation result signal
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    this.codeExecutorService.frontEndExecutorProgram(sourceCode, framework).subscribe({
      next: (result: CompilationResult) => {
        if (result.success) {
          this.compilationResult.set(result);
          const rawHtml = this.createPreviewHtml(result.files);
          this.previewHtmlRaw.set(rawHtml);

          const blob = new Blob([rawHtml], { type: 'text/html' });
          this.currentBlobUrl = URL.createObjectURL(blob);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobUrl));

          setTimeout(() => this.setupErrorTrap(), 0);
          this.output.set('✓ Rendered Successfully');
        }
        this.isRunning.set(false);
      },
      error: (err) => {
        this.compilationResult.set(err.error || null);
        // If compilation fails, we keep previewUrl as null so the iframe stays empty or hidden
        const errorMsg = err.error?.logs || err.error?.error || 'Unknown Compilation Error';
        this.output.set(this.formatErrorMessage(errorMsg));
        this.isRunning.set(false);

        // Explicitly ensure preview is cleared on error
        this.previewUrl.set(null);
      },
    });
  }

  /**
   * Runs the code based on the selected language
   * @returns void
   */
  runCode() {
    const currentLang = this.currentLanguage();

    if (currentLang?.useCompiler) {
      // Pass the framework type (angular or react)
      this.compileFrameworkComponent(this.code(), currentLang.framework || 'angular');
      return;
    }

    this.runInJudge0();
  }

  /**
   * Helper to clean up the messy CLI output from various compilation errors
   * @param rawLogs
   * @returns
   */
  formatErrorMessage(rawLogs: string): string {
    if (!rawLogs) return '';

    return (
      rawLogs
        // Strip ANSI color codes
        .replaceAll(/[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-ac-prst]/g, '')
        // Remove Vite's "Clear Screen" sequence
        .replaceAll('\u001b[1;1H\u001b[0J', '') // Changed from regex to string
        // Remove your backend flag
        .replaceAll('COMPILATION_COMPLETE', '')
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
          let errorMsg = '';
          if (typeof msg === 'string') {
            errorMsg = msg;
          } else if (error?.message) {
            errorMsg = error.message;
          } else if (error instanceof Error) {
            errorMsg = error.toString();
          } else {
            errorMsg = 'Unknown error';
          }
          this.output.set(`❌ Runtime Error: ${errorMsg}\nLine: ${line}, Column: ${col}`);
          return false;
        };
      }
    };
  }

  /**
   * Creates a complete HTML document for previewing
   * @param files Object with file names as keys and content as values
   * @returns Complete HTML string
   */
  createPreviewHtml(files: any): string {
    const framework = this.currentLanguage()?.framework;

    // Determine the default mount point based on framework
    let defaultHtml = '<div id="root"></div>'; // React Default
    if (framework === 'vue') {
      defaultHtml = '<div id="app"></div>'; // Vue Default
    } else if (framework === 'angular') {
      defaultHtml = '<app-root></app-root>'; // Angular Default
    }

    // Use provided index.html or fallback to our default mount point
    let htmlContent = files['index.html'] || defaultHtml;

    // Aggressively strip external references that cause 404/HTML-fallback errors
    htmlContent = htmlContent.replaceAll(/<script\b[^>]*src="[^"]*"[^>]*><\/script>/g, '');
    htmlContent = htmlContent.replaceAll(/<link\b[^>]*href="[^"]*"[^>]*>/g, '');
    htmlContent = htmlContent.replaceAll('<base href="/">', '');

    let scriptTags = '';
    const fileKeys = Object.keys(files);

    // Define execution order
    // Angular needs specific order; Vue/React usually just have one main bundle
    const angularPriority = ['polyfills.js', 'runtime.js', 'main.js'];

    const sortedKeys = [...fileKeys].sort((a, b) => {
      const indexA = angularPriority.indexOf(a);
      const indexB = angularPriority.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });

    // Process and "Neutralize" JavaScript
    sortedKeys.forEach((name) => {
      if (name.endsWith('.js') && !name.endsWith('.js.map')) {
        let code = files[name];

        // Remove source map comments
        code = code.replaceAll(/\/\/# sourceMappingURL=.*/g, '');

        // Neutralize Vite's modulepreload fetcher
        code = code.replaceAll(/fetch\(.\.href,.\)/g, 'Promise.resolve()');

        scriptTags += `<script type="module">${code}</script>\n`;
      }
    });

    // Extract Styles
    const cssKey = fileKeys.find((key) => key.endsWith('.css'));
    const styleTag = cssKey ? `<style>${files[cssKey]}</style>` : '';

    // Assemble Final Document
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    ${styleTag}
</head>
<body>
    ${htmlContent}
    ${scriptTags}
</body>
</html>`.trim();
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
    this.isCopied.set(false);

    const encodedCode = this.stringUtilsService.encodeBase64(this.code());

    console.log('Sending request...');

    this.codeExecutorService.executeProgram(encodedCode, this.selectedLanguageId()).subscribe({
      next: (result) => {
        console.log('Got result:', result);
        this.executionResult.set(result);

        let output = '';

        if (result.compile_output) {
          output += '=== Compilation Error ===\n';
          output += this.stringUtilsService.decodeBase64(result.compile_output);
        } else if (result.stderr) {
          output += '=== Error ===\n';
          output += this.stringUtilsService.decodeBase64(result.stderr);
        } else if (result.stdout) {
          output += this.stringUtilsService.decodeBase64(result.stdout);
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

  /**
   * Copies the current output to the clipboard
   */
  copyOutput() {
    const textToCopy = this.output();
    if (!textToCopy || textToCopy === 'Ready...') return;

    if (!navigator.clipboard) {
      this.fallbackCopyTextToClipboard(textToCopy);
      return;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      this.showCopyFeedback();
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  /**
   * Fallback for non-secure contexts (http)
   * @param text The text to copy
   */
  private fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Ensure it's not visible but part of the DOM
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showCopyFeedback();
      } else {
        console.error('Fallback: unable to copy');
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
  }

  private showCopyFeedback() {
    this.isCopied.set(true);
    setTimeout(() => {
      this.isCopied.set(false);
    }, 2000);
  }

  ngOnDestroy() {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }
}
