import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { Language } from '../models/languages.model';

export const LANGUAGES_LIST: Language[] = [
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
    framework: 'angular',
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
            <span style='display: flex; justify-content: space-between;'>
                <p>{{ i + 1 }}. {{ item }}</p>
                <button class="danger-btn" (click)="removeAt(i)">X</button>
            </span>
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

	.danger-btn {
      background-color: #BA381C;
    }

	.danger-btn:hover {
	  background-color: #96331D;
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

  removeAt(index: number): string[] {
    return this.items?.splice(index, 1);
  }
}`,
  },
  {
    id: 1002,
    name: 'React (Vite + TSX)',
    ext: 'tsx',
    codemirrorLang: javascript({ jsx: true, typescript: true }),
    useCompiler: true,
    framework: 'react',
    template: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#61dafb' }}>Hello React!</h1>
      <p>Count is: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}`,
  },
  {
    id: 1003,
    name: 'Vue 3 (SFC)',
    ext: 'vue',
    codemirrorLang: javascript({ typescript: true }), // Vue templates use JS/TS
    useCompiler: true,
    framework: 'vue',
    template: `<script setup>
import { ref } from 'vue';

const count = ref(0);
const msg = ref('Hello Vue!');

const increment = () => {
  count.value++;
};
</script>

<template>
  <div class="vue-container">
    <h1>{{ msg }}</h1>
    <p>Count is: <span class="count">{{ count }}</span></p>
    <button @click="increment">Increment</button>
    
    <div v-if="count > 5" class="bonus">
      You've reached a high score!
    </div>
  </div>
</template>

<style scoped>
.vue-container {
  padding: 30px;
  font-family: 'Arial', sans-serif;
  text-align: center;
}
h1 { color: #42b883; }
.count { font-weight: bold; color: #35495e; }
button {
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
.bonus { margin-top: 15px; color: #ff6b6b; font-weight: bold; }
</style>`,
  },
];
