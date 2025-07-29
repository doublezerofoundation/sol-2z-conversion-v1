#!/bin/bash
set -e  # Exit immediately if any command fails

workspace=""
mode=""
restart_validator=false

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️ INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️ WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Build and deploy script for Converter Program"
  echo ""
  echo "OPTIONS:"
  echo "  -m, --mode TAG        Set the mode of operation (deploy_only, build_only, build_and_deploy)."
  echo "  -r, --restart-validator Start/ Restart validator (Only in the local net, Only for on-chain deployment)"
  echo "  -h, --help          Show this help message"
  echo ""
  echo "Example:"
  echo "  ./build_and_deploy.sh --mode build_and_deploy --restart-validator"
}


cd "$(dirname "$0")" || exit 1

echo "================================================================================================"
echo "         					BUILD_AND_DEPLOY (DOUBLE ZERO) "
echo "================================================================================================"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -w|--workspace)
            workspace="$2"
            shift 2
            ;;
        -m|--mode)
            mode="$2"
            shift 2
            ;;
        -r|--restart-validator)
            restart_validator=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Handle modes
case "$workspace" in
  converter-program|on-chain)
    cmd=(./on-chain/build_and_deploy.sh)
    [[ "$restart_validator" == true ]] && cmd+=("--restart-validator")
    [[ -n "$mode" ]] && cmd+=("-m" "$mode")

    "${cmd[@]}"
    ;;
  admin-cli)
    log_section "Building Admin CLI..."
    if [[ -n "$mode" ]]; then
        log_info "Ignoring Mode Input as Admin CLI has build_only mode"
    fi
    cargo build --package admin-cli
    log_info "Successfully built the admin-cli program"
    ;;
  user-cli)
    log_section "Building User CLI..."
    if [[ -n "$mode" ]]; then
        log_info "Ignoring Mode Input as Admin CLI has build_only mode"
    fi
    cargo build --package user-cli
    log_info "Successfully built the user-cli program"
    ;;
  *)
    log_error "Invalid workspace specified. Please use 'converter-program', 'build_only', or 'build_and_deploy'."
    exit 1
    ;;
esac

exit 0