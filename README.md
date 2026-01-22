# CodeExecutor

**CodeExecutor** is a web-based code editor and execution platform that allows users to write, edit, and run code directly in the browser. It supports multiple programming languages and provides an interactive development environment with real-time code execution capabilities powered by WebContainer/Docker technology.

## Architecture Overview

### Code Execution Backend

CodeExecutor leverages **Judge0** as its code execution engine, which runs on an Ubuntu server and uses **isolate** to securely execute user code. This sandboxing approach ensures that code submissions are executed in isolated, lightweight containers, preventing malicious or runaway code from affecting the host system or other users' submissions. Judge0 supports a wide range of programming languages and provides reliable, secure code execution.

### Web Application Frontend

The frontend is built with **Angular**, a modern TypeScript-based framework that delivers a responsive and intuitive user interface. The application uses **Docker** and **WebContainer** technology to enable the execution and testing of web applications directly in the browser. This allows developers to build and preview Angular applications in real-time without requiring a local development environment.

### Future Frameworks

We're expanding platform support with **React** and **Vue.js** coming soon. These frameworks will also be executable within the browser using the same WebContainer technology, providing a unified platform for full-stack web development.

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
