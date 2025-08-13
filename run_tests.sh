#!/bin/bash
set -e  # Exit immediately if any command fails

UNIT_TESTS=(
    system-initialize-test
    config-update-test
    dequeuer-management-test
    deny-list-test
    conversion-price-test
    admin-change-test
    mock-transfer-program-test
    buy-sol-test
)

TEST_TYPE="unit"
FAILED_TESTS=()
EXIT_CODE=0

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
  echo "Script for running tests for Converter Program"
  echo ""
  echo "OPTIONS:"
  echo "  -m, --mode      Set the type of the test (unit, e2e)."
  echo "  -h, --help          Show this help message"
  echo ""
  echo "Example:"
  echo "  ./run_tests.sh -t unit"
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
        FAILED_TESTS+=("$TEST_SCRIPT")
        EXIT_CODE=1
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

build_and_deploy_converter_program() {
    log_section "Build & Deploy Converter program..."
    cmd=(./on-chain/build_and_deploy.sh )

    if ! "${cmd[@]}"; then
        log_error "Converter Program deployment failed"
        FAILED_TESTS+=("$TEST_SCRIPT")
        EXIT_CODE=1
        return 1
    fi
    log_success "Successfully deployed the converter program into the network!"
}

build_and_deploy_mock_double_zero_program() {
    log_section "Build & Deploy Mock Double Zero program..."
    cmd=(./mock-double-zero-program/build_and_deploy.sh )

    if ! "${cmd[@]}"; then
        log_error "Mock Double Zero Program deployment failed"
        FAILED_TESTS+=("$TEST_SCRIPT")
        EXIT_CODE=1
        return 1
    fi
    log_success "Successfully deployed the Mock Double Zero Program into the network!"
}

extract_failed_tests() {
    local TEST_SCRIPT=$1
    local LOG_FILE=$2
    local FAILURE_COUNT=$(grep -o "[0-9]\+ failing" "$LOG_FILE" | head -1 | awk '{print $1}')

    if [ -z "$FAILURE_COUNT" ]; then
        FAILURE_COUNT=0
    fi

    if [ "$FAILURE_COUNT" -gt 0 ]; then
        log_error "$FAILURE_COUNT test(s) failed in $TEST_SCRIPT"
        FAILED_TEST_DETAILS+="${TEST_SCRIPT}:${FAILURE_COUNT},"
        echo "RECORDED FAILURE: ${TEST_SCRIPT}:${FAILURE_COUNT}"
    fi
}

prepare_test() {
  restart_validator
  build_and_deploy_converter_program
  build_and_deploy_mock_double_zero_program
}

run_test() {
    local TEST_SCRIPT=$1
    local TEST_OUTPUT_FILE="../test-logs/anchor-$TEST_SCRIPT.log"
    log_section "Running test: $TEST_SCRIPT"


    log_info "Executing test..."
    echo "▶️ anchor run $TEST_SCRIPT -- --skip-deploy"

    anchor run "$TEST_SCRIPT" -- --skip-deploy | tee "$TEST_OUTPUT_FILE"
    local TEST_RESULT=${PIPESTATUS[0]}

    if [ "$TEST_RESULT" -ne 0 ]; then
        log_error "Test '$TEST_SCRIPT' FAILED with exit code $TEST_RESULT"
        FAILED_TESTS+=("$TEST_SCRIPT")

        extract_failed_tests "$TEST_SCRIPT" "$TEST_OUTPUT_FILE"

        if [ -z "$LOG_FILES" ]; then
            LOG_FILES="$TEST_OUTPUT_FILE"
        else
            LOG_FILES="$LOG_FILES,$TEST_OUTPUT_FILE"
        fi

        EXIT_CODE=1
    else
        log_success "Test '$TEST_SCRIPT' passed"
        if [ -z "$LOG_FILES" ]; then
            LOG_FILES="$TEST_OUTPUT_FILE"
        else
            LOG_FILES="$LOG_FILES,$TEST_OUTPUT_FILE"
        fi
    fi

    echo "----------------------------------------------"
    return "$TEST_RESULT"
}

print_test_summary() {
    log_section "TEST SUMMARY"

    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        log_success "ALL TESTS PASSED!"
    else
        log_error "FAILED TESTS: ${#FAILED_TESTS[@]}"
        for test in "${FAILED_TESTS[@]}"; do
            echo "   - $test"
        done

        echo ""
        log_error "See test output above for specific test failures."
    fi

    return $EXIT_CODE
}

cd "$(dirname "$0")" || exit 1
LOG_FILES=""
FAILED_TEST_DETAILS=""
mkdir -p test-logs

echo "================================================================================================"
echo "         					RUN_TESTS (CONVERTER PROGRAM) "
echo "================================================================================================"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -m|--mode)
            TEST_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_warning "Unknown option: $1"
            log_warning "Please choose either unit or e2e"
            show_help
            exit 1
            ;;
    esac
done

#  restart the validator, builds and deploys it
log_section "PREPARING TEST SETUP"
prepare_test

# Handle test type
case "$TEST_TYPE" in
  unit)
    ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    pushd "$ROOT_DIR/on-chain" > /dev/null

    log_section "RUNNING UNIT TESTS"
    for test_script in "${UNIT_TESTS[@]}"; do
        run_test "$test_script" || true
    done
    ;;
  *)
    log_error "Invalid test type: '$TEST_TYPE'. Use -t unit or -t e2e."
    kill_validator
    exit 1
    ;;
esac

kill_validator
print_test_summary
exit $EXIT_CODE