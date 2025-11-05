#!/bin/bash

# Script to migrate Tauri imports to Electron platform adapter

echo "Migrating Tauri imports to Electron..."

# Find all TypeScript/TSX files in src/renderer
find src/renderer/src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/__tests__/*" ! -path "*/test/*" | while read file; do
  # Skip if file doesn't contain tauri imports
  if ! grep -q "@tauri-apps" "$file"; then
    continue
  fi
  
  echo "Processing: $file"
  
  # Replace common Tauri imports with platform adapter
  sed -i '' 's/import { invoke } from "@tauri-apps\/api\/core"/import { invoke } from "..\/services\/platformAdapter"/g' "$file"
  sed -i '' 's/import { invoke } from "@tauri-apps\/api\/core"/import { invoke } from "..\/..\/services\/platformAdapter"/g' "$file"
  sed -i '' 's/import { listen } from "@tauri-apps\/api\/event"/import { listen } from "..\/services\/platformAdapter"/g' "$file"
  sed -i '' 's/import { listen } from "@tauri-apps\/api\/event"/import { listen } from "..\/..\/services\/platformAdapter"/g' "$file"
  sed -i '' 's/import { writeText } from "@tauri-apps\/plugin-clipboard-manager"/import { writeClipboard as writeText } from "..\/services\/platformAdapter"/g' "$file"
  sed -i '' 's/import { writeText } from "@tauri-apps\/plugin-clipboard-manager"/import { writeClipboard as writeText } from "..\/..\/services\/platformAdapter"/g' "$file"
  
done

echo "Migration complete!"
