#!/bin/bash
set -e  # Exit immediately if any command fails

mode=""
amount=""
restart_validator=false
MINT_KEYPAIR_PATH="./.keys/2z_token_mint.json"
MINT_AUTHORITY_KEYPAIR_PATH="./.keys/2z_token_mint_authority.json"
PROTOCOL_TREASURY_KEYPAIR_PATH="./.keys/2z_protocol_treasury.json"
PROTOCOL_TREASURY_TOKEN_ACCOUNT_KEYPAIR_PATH="./.keys/2z_protocol_treasury_token_account.json"

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
  echo "Setup Dev script for Converter Program"
  echo ""
  echo "OPTIONS:"
  echo "  -m, --mode Mode      Set the mode of operation ('setup_mint', 'setup_ata', or 'mint')."
  echo "  -a, --amount Amount      Set the amount for mint operation."
  echo "  -h, --help          Show this help message"
  echo ""
  echo "Example:"
  echo "  ./build_and_deploy.sh --mode build_and_deploy --restart-validator"
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

setup_mint_and_token_account() {
  log_section "Token Setup"
  # setting to local net
  solana config set --url localhost
  generate_key_pair "2Z Protocol Treasury wallet" $PROTOCOL_TREASURY_KEYPAIR_PATH
  generate_key_pair "2Z Token Mint" $MINT_KEYPAIR_PATH
  generate_key_pair "2Z Token Mint Authority" $MINT_AUTHORITY_KEYPAIR_PATH
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
    spl-token --program-2022 create-token $MINT_KEYPAIR_PATH --mint-authority "$MINT_AUTHORITY_KEYPAIR_PATH"> /dev/null
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
    spl-token mint "$MINT_ADDRESS" 500 "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS" --mint-authority "$MINT_AUTHORITY_KEYPAIR_PATH" > /dev/null
    TOKEN_BALANCE=$(spl-token balance --address "$PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS" | tr -d '\n')
  fi
  log_info "TOKEN BALANCE OF 2Z PROTOCOL TREASURY $TOKEN_BALANCE"

  log_success "2Z Token Setup Completed"
  log_info "🧾 Mint Address         : $MINT_ADDRESS"
  log_info "💼 Treasury Wallet      : $PROTOCOL_TREASURY_ADDRESS"
  log_info "🏦 Token Account (2Z Protocol Treasury): $PROTOCOL_TREASURY_TOKEN_ACCOUNT_ADDRESS"
}

setup_user_token_account() {
  MINT_KEYPAIR_PATH="./.keys/2z_token_mint.json"
  MINT_ADDRESS=$(solana-keygen pubkey "$MINT_KEYPAIR_PATH")
  ATA_ADDRESS=$(spl-token address --token "$MINT_ADDRESS" --verbose | awk '/Associated token address:/ { print $NF }')

  # Check if ATA exists or not
  if solana account "$ATA_ADDRESS" > /dev/null 2>&1; then
    log_info "User 2Z ATA already exists at ATA_ADDRESS. Skipping creation."
  else
    log_info "User 2Z ATA not found. Creating new ATA..."
    ATA_ADDRESS=$(spl-token create-account $MINT_ADDRESS | grep -oP '(?<=Creating account )\w+')
    log_success "User 2Z ATA successfully created at $ATA_ADDRESS."
  fi
}

mint_user_ata_account() {
  MINT_ADDRESS=$(solana-keygen pubkey "$MINT_KEYPAIR_PATH")
  ATA_ADDRESS=$(spl-token address --token "$MINT_ADDRESS" --verbose | awk '/Associated token address:/ { print $NF }')
  if [[ -z "$amount" ]]; then
    log_warning "No mint amount specified. Defaulting to 5 2Z Tokens"
    amount="5"
  fi
  spl-token mint "$MINT_ADDRESS" "$amount" "$ATA_ADDRESS" --mint-authority "$MINT_AUTHORITY_KEYPAIR_PATH"
  log_success "Minted $amount Tokens to $ATA_ADDRESS"
}

cd "$(dirname "$0")" || exit 1

echo "================================================================================================"
echo "         					SETUP DEV (CONVERTER PROGRAM) "
echo "================================================================================================"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -m|--mode)
            mode="$2"
            shift 2
            ;;
        -a|--amount)
          amount="$2"
          shift 2
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
case "$mode" in
  setup_mint)
    setup_mint_and_token_account
    ;;
  setup_ata)
    setup_user_token_account
    ;;
  mint)
    mint_user_ata_account
    ;;
  *)
    log_error "Invalid mode specified. Please use 'setup_mint', 'setup_ata', or 'mint'."
    exit 1
    ;;
esac

exit 0