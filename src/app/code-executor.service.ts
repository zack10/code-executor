import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CompilationResult } from './models/compilation-result.model';
import { ExecutionResult } from './models/execution.model';

@Injectable({
  providedIn: 'root',
})
export class CodeExecutorService {
  private readonly http = inject(HttpClient);
  private readonly backendHost = globalThis.location.hostname;
  private readonly urlJudge0API = `http://${this.backendHost}/judge0/submissions/?base64_encoded=true&wait=true`;
  private readonly urlFrontEndExecutorAPI = `http://${this.backendHost}/front-compiler/compile`;

  /**
   * Executes the given code in the specified programming language using the Judge0 API.
   * @param code - The source code to be executed, encoded in base64.
   * @param languageId - The ID of the programming language.
   * @returns An Observable that emits the execution result.
   */
  executeProgram(code: string, languageId: number): Observable<ExecutionResult> {
    const payload = {
      source_code: code,
      language_id: languageId,
    };

    return this.http.post<ExecutionResult>(this.urlJudge0API, payload);
  }

  /**
   * Executes the given source code using the Front-End Executor API.
   * @param sourceCode - The source code to be executed.
   * @param framework - The front-end framework to be used (e.g., 'angular', 'react').
   * @returns An Observable that emits the compilation result.
   */
  frontEndExecutorProgram(sourceCode: string, framework: string): Observable<CompilationResult> {
    const payload = {
      code: sourceCode,
      framework: framework,
    };

    return this.http.post<CompilationResult>(this.urlFrontEndExecutorAPI, payload);
  }
}
