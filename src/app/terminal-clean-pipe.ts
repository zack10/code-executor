import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'terminalClean',
})
export class TerminalCleanPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value
      .replaceAll(/\x1B\[[0-9;]*[A-Za-z]/g, '') // Remove ANSI
      .replaceAll(/\x1B/g, '') // Remove stray Esc
      .replaceAll(/.\x08/g, '') // Fix Spinner
      .replaceAll(/\n{3,}/g, '\n\n'); // Collapse Vite gaps
  }
}
