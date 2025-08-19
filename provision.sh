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
  if [[ $workspace == "deployment" ]]; then
    show_deployment_help
    exit 1
  fi

  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Provision Script"
  echo ""
  echo "OPTIONS:"
  echo "  -w, --workspace Workspace      Set the workspace (on-chain, admin-cli, user-cli, integration-cli, mock-double-zero-program, deployment)."
  echo "  -m, --mode                     Set the mode of operation ([deploy_only, build_only, build_and_deploy] for on-chain & mock-double-zero-program, [unit, e2e] for tests)."
  echo "  -rv, --restart-validator       Start/ Restart validator (Only in the local net, Only for on-chain deployment)"
  echo "  -sc --sub-command              Sub command for handle deployment (Required for deployment workspace)"
  echo "  -a, --action                   deployment Action (Required for deployment workspace)"
  echo "  --release-tag                  Release tag of the off-chain"
  echo "  -e,--env                       Deployment Environment"
  echo "  -r,--region                    Deployment Region"
  echo "  -h, --help                     Show this help message"
  echo "Example:"
  echo "  ./build_and_deploy.sh -w on-chain --mode build_and_deploy --restart-validator"
  echo "  ./build_and_deploy.sh -w run-tests --mode unit"
}

VALID_SUB_COMMANDS=("account" "environment" "regional" "release")
ACTIONS=("create" "destroy" "publish-artifacts" "upgrade" "publish-and-upgrade" "help")


handle_on_chain() {
  cmd=(./on-chain/build_and_deploy.sh)
  [[ "$restart_validator" == true ]] && cmd+=("--restart-validator")
  [[ -n "$mode" ]] && cmd+=("-m" "$mode")
  "${cmd[@]}"
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

show_deployment_help() {
    if [[ -z $SUB_COMMAND ]]; then
      validate_subcommand
    fi
    if [[ -z $ACTION ]]; then
      log_error "-a|--action is required"
    fi
    if [[ -n $SUB_COMMAND ]]; then
      show_sub_command_help
    fi


}
show_sub_command_help() {
    pushd "./deployment/script" > /dev/null

    validate_subcommand
    echo "$PWD"


    if [[ $SUB_COMMAND == "account" ]]; then
      echo "Run account provision"
      ./account_creation.sh --help
    elif [[ $SUB_COMMAND == "environment" ]]; then
      echo "Run environment provision"
      ./env_creation.sh --help
    elif [[ $SUB_COMMAND == "regional" ]]; then
      echo "Run regional provision"
      ./regional_creation.sh --help
    elif [[ $SUB_COMMAND == "release" ]]; then
      echo "Run release provision"
      ./release.sh --help
    fi

    popd > /dev/null



}
validate_subcommand() {
  echo $SUB_COMMAND
  if [[ -z "$SUB_COMMAND" ]]; then
    log_error "Sub Command is required for workplace: ${workspace}"
    log_error "Available Sub commands: ${VALID_SUB_COMMANDS[*]}"
    exit 1

  fi
  if [[ ! " ${VALID_SUB_COMMANDS[*]} " =~ " ${SUB_COMMAND} " ]]; then
      log_error "Invalid sub command: ${SUB_COMMAND} for workplace ${workspace}. Valid commands: ${VALID_SUB_COMMANDS[*]}"
      exit 1
  fi
}

valid_action() {
    if [[ ! " ${ACTIONS[*]} " =~ " ${ACTION} " ]]; then
        log_error "Invalid action: ${ACTION}. Valid commands: ${ACTIONS[*]}"
        exit 1
    fi

}

handle_deployment() {
  echo "Deployment trigger"
  validate_subcommand
  valid_action
  echo "$PWD"
  pushd "./deployment/script" > /dev/null


  if [[ $SUB_COMMAND == "account" ]]; then
    echo "Run account provision"
    ./account_creation.sh --action "$ACTION" --region "$REGION"
  elif [[ $SUB_COMMAND == "environment" ]]; then
    echo "Run environment provision"
    ./env_creation.sh --action "$ACTION" --region "$REGION" --env "$ENV" --release-tag "$RELEASE_TAG"
  elif [[ $SUB_COMMAND == "regional" ]]; then
    echo "Run regional provision"
    ./regional_creation.sh --action "$ACTION" --region "$REGION"
  elif [[ $SUB_COMMAND == "release" ]]; then
    echo "Run release provision"
    ./release.sh --action "$ACTION" --region "$REGION" --env "$ENV" --release-tag "$RELEASE_TAG"
  fi

  popd > /dev/null

}


cd "$(dirname "$0")" || exit 1

echo "================================================================================================"
echo "         					PROVISION (DOUBLE ZERO) "
echo "================================================================================================"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -w|--workspace)
            workspace="$2"
            shift 2
            ;;
        -sc|--sub-command)
            SUB_COMMAND="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -m|--mode)
            mode="$2"
            shift 2
            ;;
        -rv|--restart-validator)
            restart_validator=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        --release-tag)
            RELEASE_TAG="$2"
            shift 2
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
  deployment)
    handle_deployment
    ;;
  *)
    log_error "Invalid workspace specified. Please use 'converter-program', 'admin-cli', 'integration-cli' or 'user-cli'."
    exit 1
    ;;
esac

exit 0