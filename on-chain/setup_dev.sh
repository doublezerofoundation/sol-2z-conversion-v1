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

    log_info "Waiting for validator to initialize (20 seconds)..."
    sleep 20

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
        log_error "Program deployment failed"
        return 1
    fi

    log_success "Program deployed successfully"
}

generate_key_pair() {
  mkdir -p "./.keys"
  log_info "🔑 Checking keys for $1..."
  KEYPAIR_PATH=$2
  if [[ -f "$KEYPAIR_PATH" ]]; then
      log_info "$1 keypair already exists at $KEYPAIR_PATH, skipping generation."
  else
    mkdir -p "$(dirname "$KEYPAIR_PATH")"
    solana-keygen new --outfile "$KEYPAIR_PATH" --no-bip39-passphrase --force --silent > /dev/null 2>&1
  fi

  PUBKEY=$(solana-keygen pubkey "$KEYPAIR_PATH" 2>/dev/null)
  log_success "Public Key of $1: $PUBKEY"
}

setup_dev() {
  log_section "Token Setup"
  # setting to local net
  solana config set --url localhost
  MINT_KEYPAIR_PATH="./.keys/2z_token_mint.json"
  PROTOCOL_TREASURY_KEYPAIR_PATH="./.keys/2z_protocol_treasury.json"
  PROTOCOL_TREASURY_TOKEN_ACCOUNT_KEYPAIR_PATH="./.keys/2z_protocol_treasury_token_account.json"

  generate_key_pair "2Z Protocol Treasury wallet" $PROTOCOL_TREASURY_KEYPAIR_PATH
  generate_key_pair "2Z Token Mint" $MINT_KEYPAIR_PATH
  generate_key_pair "2Z Protocol Treasury Token Account" $PROTOCOL_TREASURY_TOKEN_ACCOUNT_KEYPAIR_PATH

  MINT_ADDRESS=$(solana-keygen pubkey "$MINT_KEYPAIR_PATH")
  PROTOCOL_TREASURY_ADDRESS=$(solana-keygen pubkey "$PROTOCOL_TREASURY_KEYPAIR_PATH")
  PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS=$(solana-keygen pubkey "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_KEYPAIR_PATH")

  solana airdrop 500 "$PROTOCOL_TREASURY_ADDRESS" > /dev/null

  # Check if mint account already exists
  if solana account "$MINT_ADDRESS" > /dev/null 2>&1; then
    log_info "2Z Mint already exists at $MINT_ADDRESS. Skipping creation."
  else
    log_info "2Z Mint not found. Creating new token mint..."
    spl-token --program-2022 create-token $MINT_KEYPAIR_PATH  > /dev/null
    log_success "2Z Mint is created at $MINT_KEYPAIR_PATH."
  fi

  # Check if Protocol Treasury Account exists or not
  if solana account "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS" > /dev/null 2>&1; then
    log_info "ATA already exists at $PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS. Skipping creation."
  else
    log_info "ATA not found. Creating new token account..."
    spl-token --program-2022 create-account "$MINT_ADDRESS" "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_KEYPAIR_PATH"  > /dev/null
    log_success "Protocol Treasury ATA successfully created at $PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS."
  fi

  TOKEN_BALANCE=$(spl-token balance --address "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS" | tr -d '\n')
  if [ "$TOKEN_BALANCE" -lt 500 ]; then
    log_info "💸 Minting 500 2Z tokens to the treasury..."
    spl-token mint "$MINT_ADDRESS" 500 "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS" > /dev/null
    TOKEN_BALANCE=$(spl-token balance --address "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS" | tr -d '\n')
  fi
  log_info "TOKEN BALANCE OF 2Z PROTOCOL TREASURY $TOKEN_BALANCE"

  log_success "2Z Token Setup Completed"
  log_info "🧾 Mint Address         : $MINT_ADDRESS"
  log_info "💼 Treasury Wallet      : $PROTOCOL_TREASURY_ADDRESS"
  log_info "🏦 Token Account (2Z Protocol Treasury): $PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS"

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
            echo "Unknown option: $1"
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
  setup_dev)
    setup_dev
    ;;
  deploy_only)
    deploy_program
    log_info "Successfully deployed the converter program into the network!"
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