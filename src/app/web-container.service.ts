import { Injectable } from '@angular/core';
import { WebContainer } from '@webcontainer/api';

@Injectable({
  providedIn: 'root',
})
export class WebContainerService {
  private webcontainerInstance!: WebContainer;

  async init() {
    if (!this.webcontainerInstance) {
      // Boot the container
      this.webcontainerInstance = await WebContainer.boot();
    }
    return this.webcontainerInstance;
  }

  async mountFiles(files: any) {
    await this.webcontainerInstance.mount(files);
  }

  async runCommand(command: string, args: string[]) {
    const process = await this.webcontainerInstance.spawn(command, args);
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        },
      }),
    );
    return process.exit;
  }
}
