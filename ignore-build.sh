#!/usr/bin/env bash
set -e

MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"

if echo "$MSG" | grep -qiE '\bdeploy\b'; then
  echo "Commit message obsahuje 'deploy' → build povolen."
  # exit code != 0 => Vercel build NEignoruje
  exit 1
else
  echo "Commit message NEobsahuje 'deploy' → build přeskočen."
  # exit code 0 => Vercel build IGNORUJE
  exit 0
fi
