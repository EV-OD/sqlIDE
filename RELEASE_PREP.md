# ER Maker - Release Preparation Guide

## Critical Issues & Solutions

### ❌ Issue 1: Missing `my.cnf.dist.template`
**Status:** ✅ FIXED
- Created template at `src-tauri/bundled/mariadb/linux-x86_64/my.cnf.dist.template`
- Updated `.gitignore` to allow `.template` files

### ❌ Issue 2: MariaDB Bundles Too Large for Git (343MB+)
**Status:** ⚠️ NEEDS DECISION

**Problem:** Bundled MariaDB binaries are gitignored but required for builds.

**Recommended Solution:** Create pre-packaged minimal MariaDB bundles and distribute via GitHub Releases

#### Steps to prepare for release:

1. **Create minimal bundles for each platform:**
   ```bash
   # You need to download and prepare MariaDB for:
   # - linux-x86_64 (already have)
   # - windows-x86_64 (download from mariadb.org)
   # - macos-x86_64 (download from mariadb.org)  
   # - macos-aarch64 (download from mariadb.org)
   
   # For each platform, run:
   pnpm run mariadb:build
   ```

2. **Upload bundle archives to a GitHub pre-release:**
   ```bash
   # Create archives
   cd src-tauri/bundled/mariadb
   tar -czf mariadb-linux-x86_64.tar.gz linux-x86_64/
   # (repeat for other platforms)
   
   # Create a GitHub pre-release called "mariadb-bundles"
   # Upload all platform tar.gz files there
   ```

3. **Update CI workflow** to download bundles before build

### ❌ Issue 3: Missing Platform Bundles
**Status:** ⚠️ ACTION REQUIRED

Currently only have: `linux-x86_64`

Need to prepare:
- `windows-x86_64` - Download Windows MariaDB zip
- `macos-x86_64` - Download macOS Intel DMG
- `macos-aarch64` - Download macOS ARM64 DMG

### ❌ Issue 4: CI Workflow Needs Bundle Download Step
**Status:** ⚠️ NEEDS IMPLEMENTATION

Current workflow will fail because:
1. `pnpm build` triggers `prebuild`
2. `prebuild` runs `mariadb:build` 
3. But `mariadb:build` expects bundles in `src-tauri/bundled/mariadb/`
4. These are gitignored and won't exist in CI

## Option A: Skip MariaDB bundling in CI (Quick Fix)

Make MariaDB optional for now:

```yaml
# In .github/workflows/release.yml, before "Build frontend"
- name: Check for MariaDB bundle
  run: |
    if [ ! -d "src-tauri/bundled/mariadb" ]; then
      echo "MariaDB bundle not found - app will ship without offline DB"
      mkdir -p src-tauri/bundled/mariadb
    fi
```

Update `src-tauri/src/lib.rs` `mariadb_bundle_exists` to return false gracefully if missing.

## Option B: Download Bundles in CI (Proper Solution)

1. Create a GitHub release named `mariadb-bundles-v1` with platform archives
2. Add CI step to download before build:

```yaml
- name: Download MariaDB bundle
  run: |
    platform="linux-x86_64"  # Set per matrix
    curl -L -o mariadb.tar.gz \
      https://github.com/EV-OD/sqlIDE/releases/download/mariadb-bundles-v1/mariadb-${platform}.tar.gz
    mkdir -p src-tauri/bundled/mariadb
    tar -xzf mariadb.tar.gz -C src-tauri/bundled/mariadb/
```

## Immediate Next Steps

1. ✅ Commit template and .gitignore changes
2. ⚠️ Decide: Ship without MariaDB (Option A) or prepare bundles (Option B)?
3. ⚠️ If Option B: Download/prepare Windows & macOS MariaDB
4. ⚠️ Update release.yml workflow
5. ⚠️ Test build locally with `pnpm tauri build`

## Files Modified

- ✅ `src-tauri/bundled/mariadb/linux-x86_64/my.cnf.dist.template` (created)
- ✅ `.gitignore` (updated to allow templates)
- ⚠️ `.github/workflows/release.yml` (needs update)
