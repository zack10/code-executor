import { TestBed } from '@angular/core/testing';

import { CodeExecutorService } from './code-executor.service';

describe('CodeExecutorService', () => {
  let service: CodeExecutorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodeExecutorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
