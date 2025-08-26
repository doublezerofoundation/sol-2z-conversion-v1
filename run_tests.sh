#!/bin/bash

# -------------------- Config --------------------
UNIT_TESTS=(
    system-initialize-test
    admin-change-test
    config-update-test
    deny-list-test
    conversion-price-test
    system-state-test
    buy-sol-test
    dequeue-fills-test
    migration-test
)

E2E_TESTS=(
    admin-flow
    user-flow
)

TEST_TYPE="unit"
QUIET_MODE=0
BASE_RPC_PORT=8899
DEBUG_MODE=0

# -------------------- CLI Args --------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        --test-type)
            TEST_TYPE="$2"
            shift 2
            ;;
        --quiet)
            QUIET_MODE=1
            shift
            ;;
        --debug)
            DEBUG_MODE=1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# -------------------- Globals --------------------
FAILED_TESTS=()
COMPLETED_COUNT=0
FAILED_COUNT=0

# Determine active test list based on --test-type
if [ "$TEST_TYPE" == "e2e" ]; then
    ACTIVE_TESTS=("${E2E_TESTS[@]}")
elif [ "$TEST_TYPE" == "unit" ]; then
    ACTIVE_TESTS=("${UNIT_TESTS[@]}")
else
    echo "Invalid test type: $TEST_TYPE"
    exit 1
fi

TOTAL_TESTS=${#ACTIVE_TESTS[@]}

# -------------------- Logging --------------------
log_info() { [[ $QUIET_MODE -eq 0 ]] && echo -e "ℹ️  \033[38;5;250m[INFO]\033[0m $1"; }
log_success() { [[ $QUIET_MODE -eq 0 ]] && echo -e "✔️  \033[38;5;108m[SUCCESS]\033[0m $1"; }
log_warning() { [[ $QUIET_MODE -eq 0 ]] && echo -e "⚠️  \033[38;5;179m[WARNING]\033[0m $1"; }
log_error() { echo -e "✖️  \033[38;5;203m[ERROR]\033[0m $1"; }
log_section() {
    [[ $QUIET_MODE -eq 0 ]] && {
        echo ""
        echo -e "\n\033[38;5;244m──────────────────────────────────────────────\033[0m"
        echo -e "🔹 \033[38;5;245m$1\033[0m"
        echo -e "\033[38;5;244m──────────────────────────────────────────────\033[0m\n"
    }
}

print_header() {
    echo -e "\n\033[38;5;245m╔════════════════════════════════════════════════════════════════╗\033[0m"
    echo -e "              \033[38;5;250m⬤  ⬤  DOUBLE ZERO TEST RUNNER  ⬤  ⬤\033[0m"
    echo -e "\033[38;5;245m╚════════════════════════════════════════════════════════════════╝\033[0m\n"
}

print_footer() {
    local PASSED_COUNT=$((TOTAL_TESTS - FAILED_COUNT))

    echo -e "\n\033[38;5;245m╔════════════════════════════════════════════════════════════════╗\033[0m"
    echo -e "              \033[38;5;250m⬤  ⬤  END OF TEST RUN  ⬤  ⬤\033[0m"
    echo -e "\033[38;5;245m╠════════════════════════════════════════════════════════════════╣\033[0m"
    printf "    \033[38;5;108m✔️  Passed:\033[0m %2d    \033[38;5;203m✖️  Failed:\033[0m %2d    \033[38;5;250m🧪 Total:\033[0m %2d\n" $PASSED_COUNT $FAILED_COUNT $TOTAL_TESTS
    echo -e "\033[38;5;245m╚════════════════════════════════════════════════════════════════╝\033[0m\n"
}

print_status_bar() {
    echo -ne "\r\033[K[Completed: $COMPLETED_COUNT/$TOTAL_TESTS] [Failures: $FAILED_COUNT]"
}

# -------------------- Validator Management --------------------
start_validator() {
    local RPC_PORT=$1
    local RPC_URL="http://127.0.0.1:$RPC_PORT"

    # Stop any running validator
    VALIDATOR_PID=$(pgrep -f "solana-test-validator")
    if [ -n "$VALIDATOR_PID" ]; then
        stop_validator $VALIDATOR_PID
    fi
    wait_for_port_release $RPC_PORT

    solana-test-validator --reset --quiet --rpc-port $RPC_PORT &> /dev/null &
    wait_for_validator $RPC_URL
}

stop_validator() {
    local PID=$1
    kill -9 $PID 2>/dev/null || true
}

wait_for_validator() {
    local RPC_URL=$1
    local RETRIES=10
    local SLEEP_TIME=3

    for ((i=1; i<=RETRIES; i++)); do
        RESPONSE=$(curl -s -X POST $RPC_URL \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}')

        if echo "$RESPONSE" | grep -q "solana-core"; then
            log_success "Validator is up at $RPC_URL"
            return 0
        fi

        log_info "Waiting for validator at $RPC_URL (Attempt $i/$RETRIES)..."
        sleep $SLEEP_TIME
    done

    log_error "Validator did not respond at $RPC_URL after $RETRIES attempts."
    exit 1
}

wait_for_port_release() {
    local PORT=$1
    local RETRIES=10
    local SLEEP_TIME=1

    for ((i=1; i<=RETRIES; i++)); do
        if ! lsof -i :$PORT > /dev/null 2>&1; then
            log_info "Port $PORT is free."
            return 0
        fi

        log_info "Waiting for port $PORT to be free (Attempt $i/$RETRIES)..."
        sleep $SLEEP_TIME
    done

    log_error "Port $PORT did not become free after $RETRIES attempts."
    exit 1
}

# -------------------- Program Management --------------------
build_program() {
    local PROGRAM_NAME=$1
    log_info "Building the $PROGRAM_NAME program..."
    anchor build -- --features test > /dev/null
    yarn install > /dev/null
}

deploy_program() {
    local RPC_URL=$1
    local PROGRAM_NAME=$2
    log_info "Deploying $PROGRAM_NAME program to $RPC_URL"
    anchor deploy --provider.cluster $RPC_URL --program-name $PROGRAM_NAME --program-keypair ./.keys/$PROGRAM_NAME-keypair.json
}

# -------------------- CLI Management --------------------
build_cli() {
    log_info "Running cargo build for the CLIs..."
    cargo build > /dev/null
    log_success "CLI built successfully"
}

copy_cli_to_e2e() {
    log_info "Copying the CLI binaries to the E2E directory..."
    mkdir -p ./e2e/cli
    cp ./target/debug/admin-cli ./e2e/cli/
    cp ./target/debug/user-cli ./e2e/cli/
    cp ./target/debug/integration-cli ./e2e/cli/
    cp ./config.json ./e2e/cli/
    log_success "CLI copied to the E2E directory"
}

# -------------------- Test Runner --------------------
run_test() {
    local TEST_SCRIPT=$1
    local RPC_PORT=$2
    local RPC_URL="http://127.0.0.1:$RPC_PORT"

    print_status_bar
    log_section "Running Test: $TEST_SCRIPT (RPC: $RPC_PORT)"

    start_validator $RPC_PORT

    # Deploy the programs to the validator
    cd ./mock-double-zero-program || exit 1
    deploy_program $RPC_URL "mock-double-zero-program"
    cd ../on-chain || exit 1
    deploy_program $RPC_URL "converter-program"

    if [ "$TEST_TYPE" == "e2e" ]; then
        cd ../e2e || exit 1
        npm run $TEST_SCRIPT
        RESULT=$?
    else
        anchor run $TEST_SCRIPT --provider.cluster $RPC_URL
        RESULT=$?
    fi

    if [ $RESULT -eq 0 ]; then
        log_success "Test Passed: $TEST_SCRIPT"
    else
        log_error "Test Failed: $TEST_SCRIPT"
        FAILED_TESTS+=("$TEST_SCRIPT")
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi

    COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
    print_status_bar
    echo ""
    cd ../ || exit 1
}

# -------------------- Main Execution --------------------
print_header
trap 'killall -9 solana-test-validator 2>/dev/null || true' EXIT

# Build the double zero converter program
cd ./on-chain || exit 1
build_program "converter-program"

# Build the mock double zero transfer program
cd ../mock-double-zero-program || exit 1
build_program "mock-double-zero-program"
cd ../

# Build the admin and user CLI
if [ "$TEST_TYPE" == "e2e" ]; then
    build_cli
    copy_cli_to_e2e

    # Install the dependencies for the e2e test suite
    cd ./e2e || exit 1
    npm install > /dev/null
    cd ../
fi

for TEST_SCRIPT in "${ACTIVE_TESTS[@]}"; do
    run_test $TEST_SCRIPT $BASE_RPC_PORT
done

# -------------------- Summary --------------------
echo ""
print_status_bar
echo ""

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    log_success "All $TEST_TYPE tests passed successfully. 🎉"
else
    log_warning "Some $TEST_TYPE tests failed:"
    for FAILED_TEST in "${FAILED_TESTS[@]}"; do
        echo -e "✖️  \033[38;5;203m$FAILED_TEST\033[0m"
    done
fi

print_footer

# Stop any running validators
stop_validator

exit 0
