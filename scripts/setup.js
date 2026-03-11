#!/usr/bin/env node
/**
 * Setup script for initial project configuration
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

console.log('🚀 Alpha-Forge Setup\n')

// Check if .env exists
const envPath = path.join(projectRoot, '.env')
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found!')
  console.log('   Copy .env.example to .env and add your FMP API key:\n')
  console.log(`   cp ${path.join(projectRoot, '.env.example')} ${envPath}`)
  console.log('\n   Then add your API key to the .env file\n')
}

// Check Node version
const nodeVersion = process.versions.node
const majorVersion = parseInt(nodeVersion.split('.')[0])
if (majorVersion < 18) {
  console.error('❌ Node 18+ required (you have ' + nodeVersion + ')')
  process.exit(1)
}

// Check if node_modules exists
const modulesPath = path.join(projectRoot, 'node_modules')
if (!fs.existsSync(modulesPath)) {
  console.log('⚠️  node_modules not found')
  console.log('   Run: npm install\n')
} else {
  console.log('✅ Dependencies installed')
}

// Check log directories
const logDirs = [
  path.join(projectRoot, 'logs', 'data-errors'),
  path.join(projectRoot, 'logs', 'pipeline')
]

logDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`✅ Created ${path.relative(projectRoot, dir)}`)
  }
})

console.log('\n✨ Setup complete!\n')
console.log('Next steps:')
console.log('  1. cp .env.example .env')
console.log('  2. Add your FMP API key to .env')
console.log('  3. npm install')
console.log('  4. npm start -- AAPL\n')
