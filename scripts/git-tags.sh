#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: git-tags.sh <command>

Commands:
  recreate-latest    Delete latest tag (local+origin) and recreate it at HEAD, then push
  new:patch          Create a new patch tag (increments patch) and push
  new:bug            Create a new patch tag with '-bug' suffix and push
  new:feature        Increment minor, reset patch, append '-feature', create tag and push
EOF
}

if [ $# -lt 1 ]; then
  usage
  exit 2
fi

cmd="$1"

latest_tag() {
  git describe --tags --abbrev=0 2>/dev/null || git for-each-ref --sort=-creatordate refs/tags --format='%(refname:strip=2)' | head -n1 || true
}

strip_prefix_v() {
  local t="$1"
  if [[ "$t" == v* ]]; then echo "${t#v}"; else echo "$t"; fi
}

preserve_prefix() {
  local t="$1"
  if [[ "$t" == v* ]]; then echo "v"; else echo ""; fi
}

case "$cmd" in
  recreate-latest)
    TAG=$(latest_tag)
    if [ -z "$TAG" ]; then
      echo "No tags found" >&2
      exit 1
    fi
    echo "Recreating tag: $TAG"
    git tag -d "$TAG" 2>/dev/null || true
    git push --delete origin "$TAG" 2>/dev/null || true
    git tag -a "$TAG" -m "recreated $TAG"
    git push origin "$TAG"
    ;;

  new:patch)
    L=$(latest_tag)
    if [ -z "$L" ]; then PREFIX="v"; VER="0.0.0"; else PREFIX=$(preserve_prefix "$L"); VER=$(strip_prefix_v "$L"); fi
    IFS=. read -r MAJ MIN PAT <<< "${VER}"
    MAJ=${MAJ:-0}; MIN=${MIN:-0}; PAT=${PAT:-0}
    PAT=$((PAT+1))
    NEW="${MAJ}.${MIN}.${PAT}"
    TAG="${PREFIX}${NEW}"
    echo "Creating tag $TAG"
    git tag -a "$TAG" -m "release $TAG"
    git push origin "$TAG"
    ;;

  new:bug)
    L=$(latest_tag)
    if [ -z "$L" ]; then PREFIX="v"; VER="0.0.0"; else PREFIX=$(preserve_prefix "$L"); VER=$(strip_prefix_v "$L"); fi
    IFS=. read -r MAJ MIN PAT <<< "${VER}"
    MAJ=${MAJ:-0}; MIN=${MIN:-0}; PAT=${PAT:-0}
    PAT=$((PAT+1))
    NEW="${MAJ}.${MIN}.${PAT}-bug"
    TAG="${PREFIX}${NEW}"
    echo "Creating bug tag $TAG"
    git tag -a "$TAG" -m "bugfix $TAG"
    git push origin "$TAG"
    ;;

  new:feature)
    L=$(latest_tag)
    if [ -z "$L" ]; then PREFIX="v"; VER="0.0.0"; else PREFIX=$(preserve_prefix "$L"); VER=$(strip_prefix_v "$L"); fi
    IFS=. read -r MAJ MIN PAT <<< "${VER}"
    MAJ=${MAJ:-0}; MIN=${MIN:-0}; PAT=${PAT:-0}
    MIN=$((MIN+1)); PAT=0
    NEW="${MAJ}.${MIN}.${PAT}-feature"
    TAG="${PREFIX}${NEW}"
    echo "Creating feature tag $TAG"
    git tag -a "$TAG" -m "feature $TAG"
    git push origin "$TAG"
    ;;

  *)
    usage
    exit 2
    ;;
esac

exit 0
