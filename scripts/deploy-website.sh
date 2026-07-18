#!/bin/bash

# --- Time Capsule Deploy Script ---
# Script ini mengotomatiskan proses build dan deployment ke Cloudflare Pages secara aman.

set -e

# Warna output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Reset warna

echo -e "${BLUE}=== Memulai Proses Deployment Time Capsule ===${NC}"

# 1. Memuat Variabel Lingkungan Cloudflare
CF_ENV_FILE="/home/belajarcarabelajar/cloudflare/.env"

if [ -f "$CF_ENV_FILE" ]; then
    echo -e "${GREEN}[OK]${NC} Memuat kredensial Cloudflare dari $CF_ENV_FILE"
    # Memuat variabel dari berkas env Cloudflare
    while IFS='=' read -r key value || [ -n "$key" ]; do
        [[ -z "$key" || "$key" == \#* ]] && continue
        # Remove single and double quotes at the boundaries
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        export "$key=$value"
    done < "$CF_ENV_FILE"
else
    echo -e "${RED}[ERROR]${NC} Berkas kredensial Cloudflare tidak ditemukan di $CF_ENV_FILE."
    exit 1
fi

# Terjemahkan variabel jika menggunakan format CF_API_TOKEN / CF_ACCOUNT_ID atau VITE_CF_API_TOKEN / VITE_CF_ACCOUNT_ID
if [ ! -z "$CF_API_TOKEN" ]; then
    export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
elif [ ! -z "$VITE_CF_API_TOKEN" ]; then
    export CLOUDFLARE_API_TOKEN="$VITE_CF_API_TOKEN"
fi

if [ ! -z "$CF_ACCOUNT_ID" ]; then
    export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"
elif [ ! -z "$VITE_CF_ACCOUNT_ID" ]; then
    export CLOUDFLARE_ACCOUNT_ID="$VITE_CF_ACCOUNT_ID"
fi

# Validasi kredensial minimal
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo -e "${RED}[ERROR]${NC} Kredensial Cloudflare (API Token / Account ID) tidak lengkap."
    exit 1
fi

# 2. Penyesuaian PATH untuk Kompatibilitas Node.js (Wrangler)
# Memprioritaskan /usr/bin agar wrangler berjalan di bawah Node v22, bukan pembungkus Bun (v24)
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# 3. Proses Build Aplikasi Web
echo -e "\n${BLUE}=== Langkah 1: Membangun Aplikasi (Build) ===${NC}"
if command -v bun &> /dev/null; then
    echo -e "Menjalankan build dengan Bun..."
    bun run build
else
    echo -e "${YELLOW}[WARNING]${NC} Bun tidak terdeteksi. Mencoba menggunakan npm..."
    npm run build
fi

# 4. Proses Deployment ke Cloudflare Pages
echo -e "\n${BLUE}=== Langkah 2: Mengunggah Aset ke Cloudflare Pages ===${NC}"
if [ -d "apps/web/dist" ]; then
    npx -y wrangler pages deploy apps/web/dist --project-name time-capsule
    echo -e "\n${GREEN}=== SUCCESS: Aplikasi berhasil dideploy! ===${NC}"
else
    echo -e "${RED}[ERROR]${NC} Folder build 'apps/web/dist' tidak ditemukan. Harap pastikan proses build berhasil."
    exit 1
fi
