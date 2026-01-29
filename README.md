# CodeExecutor

**CodeExecutor** is a web-based code editor and execution platform that allows users to write, edit, and run code directly in the browser. It supports multiple programming languages and provides an interactive development environment with real-time code execution capabilities powered by WebContainer/Docker technology.

## Architecture Overview

### Built with Angular 21
The entire CodeExecutor platform is built with **Angular 21**, a modern TypeScript-based framework that delivers a responsive and intuitive user interface. The application provides a unified platform for code execution across different use cases with two distinct execution approaches.

### Code Execution Methods

#### Programming Languages (via Judge0)
For traditional programming languages (such as C, C++, Python, Java, etc.), CodeExecutor integrates with the **Judge0** API. Judge0 runs on an Ubuntu server and uses **isolate** to securely execute user code in sandboxed, lightweight containers. This ensures that code submissions are executed in isolated environments, preventing malicious or runaway code from affecting the host system or other submissions.

#### Web Applications (Angular, React, Vue.js)
For web application execution, CodeExecutor provides two secure approaches:

1. **Docker Approach**: Executes the uploaded Angular/React/VueJS code within an isolated Docker container. The compiled files are generated inside the container and returned to the client, ensuring complete isolation and security.

2. **WebContainer Approach**: Leverages browser-based WebContainer technology to build and execute Angular applications entirely locally within the browser environment. This approach eliminates the need for a backend Express.js server to create Docker images and manage file compilation, providing a streamlined, client-side execution experience.

### Future Frameworks
React and Vue.js support is coming soon, with both frameworks compatible with both Docker and WebContainer execution approaches.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
