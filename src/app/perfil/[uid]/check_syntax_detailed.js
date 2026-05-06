import fs from 'fs';

const content = fs.readFileSync('c:/Sites/Futebol/src/app/perfil/[uid]/page.tsx', 'utf8');

let braceStack = [];
let parenStack = [];

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') braceStack.push(i + 1);
        if (char === '}') braceStack.pop();
        if (char === '(') parenStack.push(i + 1);
        if (char === ')') parenStack.pop();
    }
}

console.log('Open Braces at lines:', braceStack);
console.log('Open Parens at lines:', parenStack);
