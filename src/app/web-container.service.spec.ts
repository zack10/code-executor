import { TestBed } from '@angular/core/testing';

import { WebContainerService } from './web-container.service';

describe('WebContainerService', () => {
  let service: WebContainerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebContainerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
