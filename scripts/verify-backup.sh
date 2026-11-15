#!/usr/bin/env bash
# =============================================================================
# LuminaFM Enterprise CMMS - Backup Verification & DR Health Check
# =============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_STORAGE_PATH:-/var/backups/luminafm}"

echo "================================================================="
echo "[LuminaFM DR Check] Auditing Backup Archives in ${BACKUP_DIR}"
echo "================================================================="

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "[LuminaFM DR Check] ERROR: Backup directory ${BACKUP_DIR} does not exist."
  exit 1
fi

MANIFESTS=($(find "${BACKUP_DIR}" -maxdepth 1 -name "*.manifest.json"))

if [ "${#MANIFESTS[@]}" -eq 0 ]; then
  echo "[LuminaFM DR Check] WARNING: No backup manifests detected. Backups required."
  exit 0
fi

PASSED=0
FAILED=0

for MANIFEST in "${MANIFESTS[@]}"; do
  BACKUP_FILE="${MANIFEST%.manifest.json}.sql.gz"
  if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[FAIL] Backup file missing for manifest: ${MANIFEST}"
    FAILED=$((FAILED + 1))
    continue
  fi

  EXPECTED_SHA=$(grep -o '"sha256Checksum": *"[^"]*"' "${MANIFEST}" | cut -d'"' -f4)
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL_SHA=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  else
    ACTUAL_SHA=$(shasum -a 256 "${BACKUP_FILE}" | awk '{print $1}')
  fi

  if [ "${EXPECTED_SHA}" = "${ACTUAL_SHA}" ]; then
    echo "[PASS] ${BACKUP_FILE} (SHA-256 verified)"
    PASSED=$((PASSED + 1))
  else
    echo "[FAIL] ${BACKUP_FILE} checksum mismatch!"
    FAILED=$((FAILED + 1))
  fi
done

echo "================================================================="
echo "[LuminaFM DR Check] Audit Summary: ${PASSED} Passed, ${FAILED} Failed"
echo "================================================================="

if [ "${FAILED}" -gt 0 ]; then
  exit 1
fi
exit 0
