# Icon Resources

## Current Status

This directory contains placeholder icons for development. For production, replace these with proper branded icons.

## Icon Requirements

### System Tray Icon

#### macOS
- **File**: `trayTemplate.png`
- **Size**: 16x16 to 32x32 pixels recommended (will be resized to 16x16)
- **Format**: PNG with transparency
- **Design**: Black icon with transparent background (system will invert for dark mode)
- **Note**: Must use template image format for proper visibility in menu bar

#### Windows & Linux
- **File**: `icon.png`
- **Size**: 16x16 pixels (or larger, will be resized)
- **Format**: PNG with transparency
- **Design**: Full color icons work best

### Application Icons (for future use)

#### macOS
- **File**: `icon.icns`
- **Sizes**: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- **Format**: ICNS (Apple Icon Image)

#### Windows
- **File**: `icon.ico`
- **Sizes**: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- **Format**: ICO (Windows Icon)

#### Linux
- **File**: `icon.png`
- **Size**: 512x512 or larger
- **Format**: PNG with transparency

## Creating Production Icons

1. Design the icon at the highest resolution (1024x1024)
2. Use a tool like `electron-icon-builder` or `png2icons` to generate all sizes
3. Replace the placeholder files in this directory

## Placeholder Icon

The current `icon.png` is a simple placeholder for development purposes. It displays a "C" character to represent Clipify.
