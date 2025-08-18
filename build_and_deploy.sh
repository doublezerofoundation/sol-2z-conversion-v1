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
  echo "  -w, --workspace Workspace      Set the workspace (on-chain, admin-cli, user-cli, integration-cli, mock-double-zero-program)."
  echo "  -m, --mode Mode  -m, --mode Mode   Set the mode of operation ([deploy_only, build_only, build_and_deploy] for on-chain & mock-double-zero-program, [unit, e2e] for tests)."
  echo "  -r, --restart-validator Start/ Restart validator (Only in the local net, Only for on-chain deployment)"
  echo "  -h, --help          Show this help message"
  echo ""
  echo "Example:"
  echo "  ./build_and_deploy.sh -w on-chain --mode build_and_deploy --restart-validator"
  echo "  ./build_and_deploy.sh -w run-tests --mode unit"
}

handle_on_chain() {
  cmd=(./on-chain/build_and_deploy.sh)
  [[ "$restart_validator" == true ]] && cmd+=("--restart-validator")
  [[ -n "$mode" ]] && cmd+=("-m" "$mode")
  "${cmd[@]}"
  
  # Copy converter program IDL to indexer-service
  copy_idl_to_indexer
}

copy_idl_to_indexer() {
  log_section "Copying Converter Program IDL to Indexer Service..."
  
  local source_idl="./on-chain/target/idl/converter_program.json"
  local dest_idl_dir="./off-chain/indexer-service/idl"
  local dest_idl="$dest_idl_dir/converter_program.json"
  
  # Check if source IDL exists
  if [[ ! -f "$source_idl" ]]; then
    log_error "Source IDL file not found: $source_idl"
    log_error "Make sure the on-chain program has been built successfully."
    return 1
  fi
  
  # Create destination directory if it doesn't exist
  if [[ ! -d "$dest_idl_dir" ]]; then
    log_info "Creating IDL directory: $dest_idl_dir"
    mkdir -p "$dest_idl_dir"
  fi
  
  # Copy the IDL file
  log_info "Copying IDL from: $source_idl"
  log_info "Copying IDL to: $dest_idl"
  
  if cp "$source_idl" "$dest_idl"; then
    log_success "Successfully copied converter_program.json to indexer-service/idl/"
    
    # Show file info
    local file_size=$(du -h "$dest_idl" | cut -f1)
    local file_date=$(date -r "$dest_idl" '+%Y-%m-%d %H:%M:%S')
    log_info "IDL file size: $file_size"
    log_info "IDL file date: $file_date"
  else
    log_error "Failed to copy IDL file"
    return 1
  fi
}

handle_mock_double_zero_program() {
  cmd=(./mock-double-zero-program/build_and_deploy.sh)
  [[ "$restart_validator" == true ]] && cmd+=("--restart-validator")
  [[ -n "$mode" ]] && cmd+=("-m" "$mode")
  "${cmd[@]}"
}

handle_run_tests() {
  cmd=(./on-chain/run_tests.sh)
  [[ -n "$mode" ]] && cmd+=("-m" "$mode")
  "${cmd[@]}"
}

handle_cli_build() {
  local cli_name="$1"
  log_section "Building ${cli_name^} CLI..."
  if [[ -n "$mode" ]]; then
    log_info "Ignoring Mode Input as ${cli_name^} CLI only supports build_only mode"
  fi
  cargo build --package "$cli_name-cli"
  log_info "Successfully built the $cli_name-cli program"
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
            log_warning "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Handle workspaces
case "$workspace" in
  converter-program|on-chain)
    handle_on_chain
    ;;
  mock-double-zero-program)
    handle_mock_double_zero_program
    ;;
  admin-cli)
    handle_cli_build "admin"
    ;;
  user-cli)
    handle_cli_build "user"
    ;;
  integration-cli)
    handle_cli_build "integration"
    ;;
  run-tests)
    handle_run_tests
    ;;
  *)
    log_error "Invalid workspace specified. Please use 'converter-program', 'admin-cli', 'integration-cli' or 'user-cli'."
    exit 1
    ;;
esac

exit 0