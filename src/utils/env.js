import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '../..')

// Try to load .env from multiple locations
const envPaths = [
  path.join(projectRoot, '.env'), // Worktree root
  path.join(projectRoot, '../../../.env'), // Parent project
]

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}
