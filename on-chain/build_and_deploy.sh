#!/bin/bash
set -e  # Exit immediately if any command fails

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
  echo "  -m, --mode Mode      Set the mode of operation (deploy_only, build_only, build_and_deploy)."
  echo "  -r, --restart-validator Start/ Restart validator (Only in the local net)"
  echo "  -h, --help          Show this help message"
  echo ""
  echo "Example:"
  echo "  ./build_and_deploy.sh --mode build_and_deploy --restart-validator"
}

restart_validator() {
    log_section "Restarting or starting the validator..."

    if pgrep -f "solana-test-validator" > /dev/null; then
        log_warning "Validator is already running. Stopping it..."
        kill_validator
    fi

    log_info "Starting solana-test-validator..."
    solana-test-validator -r --quiet &

    local pid=$!
    log_info "Validator started with PID: $pid"

    log_info "Waiting for validator to initialize (10 seconds)..."
    sleep 10

    if ! kill -0 "$pid" 2>/dev/null; then
        log_error "Validator failed to start properly"
        return 1
    fi

    log_success "Validator started successfully"
}

kill_validator() {
    log_info "Stopping Solana test validator..."

    local pids
    pids=$(pgrep -f "solana-test-validator")

    if [ -n "$pids" ]; then
        log_info "Killing validator process(es): $pids"
        kill -9 "$pids" 2>/dev/null || true
        sleep 2
        log_success "Validator stopped"
    else
        log_info "No running validator found."
    fi
}

build_program() {
    log_section "Building program..."

    if ! anchor build; then
        log_error "Program build failed"
        return 1
    fi

    log_success "Program built successfully"
}

deploy_program() {
    log_section "Deploying Anchor program..."

    if ! anchor deploy \
        --program-name converter-program \
        --program-keypair .keys/converter-program-keypair.json; then
        log_error "Converter Program deployment failed"
        return 1
    fi
    log_success "Successfully deployed the converter program into the network!"

}

cd "$(dirname "$0")" || exit 1

echo "================================================================================================"
echo "         					BUILD_AND_DEPLOY (CONVERTER PROGRAM) "
echo "================================================================================================"

while [[ $# -gt 0 ]]; do
    case "$1" in
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
            log_warning "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [[ -z "$mode" ]]; then
  echo "No mode specified, defaulting to 'build_and_deploy'."
  mode="build_and_deploy"
fi

if [ "$restart_validator" = true ]; then
  restart_validator
  log_info "Successfully restarted the validator!"
fi

# Handle modes
case "$mode" in
  deploy_only)
    deploy_program
    ;;
  build_only)
    build_program
    log_info "Successfully built the converter program"
    ;;
  build_and_deploy)
    build_program
    deploy_program
    log_info "Successfully built and deployed the converter program into the network!"
    ;;
  *)
    log_error "Invalid mode specified. Please use 'deploy_only', 'build_only', or 'build_and_deploy'."
    exit 1
    ;;
esac

exit 0