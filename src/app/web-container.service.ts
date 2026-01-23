import { Injectable } from '@angular/core';
import { WebContainer } from '@webcontainer/api';

@Injectable({
  providedIn: 'root',
})
export class WebContainerService {
  private instancePromise: Promise<WebContainer> | null = null;
  private webcontainerInstance!: WebContainer;

  async init() {
    if (this.instancePromise) return this.instancePromise;

    this.instancePromise = WebContainer.boot().then((instance) => {
      this.webcontainerInstance = instance;
      return instance;
    });

    return this.instancePromise;
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
