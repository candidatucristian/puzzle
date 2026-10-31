# Project Rules & Constraints

## 1. No Unrequested Automated Tests (Token Conservation)
- **NEVER** run automated tests (`npx playwright test`, `npm test`, `node --test`), linters (`npm run lint`), or production builds (`npm run build`) automatically after making changes.
- Only run tests, linters, or builds when the user **explicitly** asks you to run them.
- Verify visual or code changes lightweightly (e.g., inspecting rendered output images directly with `read_file`) without launching heavy test suites.

## 2. Authentic 3D Blender Cycles Assets (No AI-Generated Images)
- **NEVER** use AI image generation for rooms, props, or UI assets.
- Build and render visual assets in 3D using **Blender Cycles** (`C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe`) with physically plausible lighting, realistic roughness floors, and worn materials (no plastic clearcoat or mirror-like gloss).

