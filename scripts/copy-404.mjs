import { copyFileSync, existsSync } from 'fs'

if (existsSync('dist/index.html')) {
  copyFileSync('dist/index.html', 'dist/404.html')
  console.log('Created dist/404.html for GitHub Pages SPA routing')
}
