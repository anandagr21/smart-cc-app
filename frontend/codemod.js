const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = __dirname;
const IGNORE_DIRS = ['node_modules', '.expo', 'dist', 'assets'];

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        walk(fullPath, callback);
      }
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
        callback(fullPath);
      }
    }
  }
}

let modifiedFiles = 0;

walk(FRONTEND_DIR, (filePath) => {
  // Skip the codemod itself
  if (filePath === __filename || filePath.endsWith('babel.config.js')) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;

  // Regex to find all import statements
  // e.g. import { something } from "../../lib/api";
  // Matches: import ... from '...' or "..."
  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
  
  newContent = newContent.replace(importRegex, (match, importPath) => {
    // Only process relative imports that go UP (../) or start with (./)
    // Actually we only want to absolutize cross-domain, which means it starts with ../
    // We can also absolutize ./ if it's deeply nested but the user said:
    // "same folder -> relative, nearby sibling -> relative"
    // To implement "cross-domain", we check if the resolved path goes OUT of the current domain.
    // A simple rule: if it goes up more than 1 level (../../) or goes out of the current top-level dir.
    // Let's resolve the path and see if it's an internal frontend module.
    if (!importPath.startsWith('.')) return match;
    if (importPath.startsWith('./')) return match; // Keep same-folder relative
    
    const fileDir = path.dirname(filePath);
    const resolvedPath = path.resolve(fileDir, importPath);
    
    // Check if it's within frontend
    if (!resolvedPath.startsWith(FRONTEND_DIR)) return match;

    // Get the relative path from frontend root
    const rootRelativePath = path.relative(FRONTEND_DIR, resolvedPath);
    
    // Determine if we should absolutize. 
    // If the import is going across domains, e.g. from features/X to components/Y, it will look like ../../components/Y
    // A good heuristic: if rootRelativePath is not in the same top-level folder as the current file, or if the user explicitly used ../../
    
    // Let's just absolutize any import that uses '../' if it resolves to a cross-folder or if it's just cleaner.
    // Actually, the safest is to absolutize anything that uses '../' to reach a completely different top-level dir (like components, lib, theme).
    // Let's just make ALL '../' imports absolute except if they stay within the same feature folder?
    // User said: "nearby sibling -> relative".
    // For simplicity and safety, any import that uses '../' and resolves within frontend can be converted to `@/${rootRelativePath}`.
    // Wait, the user said: "cross-feature/domain -> @/". 
    // Let's check if the top-level directory of the current file and the resolved path match.
    // e.g. file is frontend/features/cards/components/A.tsx
    // importPath is ../../personality/components/B
    // resolved is frontend/features/personality/components/B
    // They share 'features', but not 'features/cards'. 
    
    // Let's absolutize it if the distance to root is shorter than the relative path, or if it crosses top-level boundaries.
    // Easiest robust way: if it starts with '../../', it's definitely going far.
    // Let's just convert any '../' to `@/`. It's unambiguous and adheres to "root-based imports".
    // Wait, user said: "nearby sibling -> relative. You do NOT need to aggressively absolutize same-directory imports."
    // OK, so we skip `./`. What about `../components/Sibling.tsx`?
    
    // Let's convert ALL `../` to `@/` IF the resolved path is in a different major folder, 
    // OR just convert ALL `../` that go up 2 or more levels (`../../`).
    let shouldConvert = false;
    
    if (importPath.includes('../../')) {
      shouldConvert = true;
    } else {
      // It's `../something`. Check if it crosses top-level boundaries.
      const currentTopLevel = path.relative(FRONTEND_DIR, fileDir).split(path.sep)[0];
      const targetTopLevel = rootRelativePath.split(path.sep)[0];
      if (currentTopLevel !== targetTopLevel) {
        shouldConvert = true;
      }
    }
    
    if (shouldConvert) {
      // Reconstruct the import string
      const newImportPath = `@/${rootRelativePath.replace(/\\/g, '/')}`;
      return match.replace(importPath, newImportPath);
    }
    
    return match;
  });

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    modifiedFiles++;
    console.log(`Modified: ${path.relative(FRONTEND_DIR, filePath)}`);
  }
});

console.log(`Done. Modified ${modifiedFiles} files.`);
