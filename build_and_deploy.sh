#!/bin/bash
set -e  # Exit immediately if any command fails

workspace=()
mode=""
instance_id=""

cd "$(dirname "$0")" || exit 1

echo "================================================================================================"
echo "         					BUILD_AND_DEPLOY (DoubleZero) "
echo "================================================================================================"
echo " input $*"

function print_title() {
	echo -e "\033[1;34m$1\033[0m"
}

function print_message() {
	echo -e "\033[0;35m $1\033[0m"
}

function print_error() {
	echo -e "\033[0;31mERROR: $1\033[0m"
	exit 1
}

function print_warning() {
	echo -e "\033[0;33mWARNING: $1\033[0m"
}

function print_yellow() {
	echo -e "\033[0;33m$1\033[0m"
}

function print_alert() {
	echo -e "\033[2;33m$1\033[0m"
}

function show_help() {
    echo "Usage: build_and_deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message and exit."
    echo "  --workspace <value>  Specify the workspace(s) to process (comma-separated)."
    echo "  --mode <value>       Set the mode of operation (deploy_only, build_only, build_and_deploy)."
    echo ""
    echo "Example:"
    echo "  ./build_and_deploy.sh --workspace programs/my_program --mode build_and_deploy"
    exit 0
}

while [[ -n "$1" ]]; do
  case "$1" in
    -h | --help)
      show_help
      ;;
    --workspace)
      if [[ -z "$2" ]]; then
        echo "workspace empty"
        workspace=("all")
        echo "workspace: ${workspace[*]}"
      else
        IFS=',' read -r -a workspace <<< "$2"
        shift
        echo "workspace: ${workspace[*]}"
      fi
      ;;
    --mode)
      if [[ -z "$2" ]]; then
        print_error "--mode needs a value"
      else
        mode="$2"
        shift
      fi
      ;;
    *)
      print_warning "Unknown argument: $1"
      show_help
      exit 1
      ;;
  esac
  shift
done

# Default values outside the loop
if [[ ${#workspace[@]} -eq 0 ]]; then
  echo "No workspace specified, defaulting to 'all'."
  workspace=("all")
fi

if [[ -z "$mode" ]]; then
  echo "No mode specified, defaulting to 'build_and_deploy'."
  mode="build_and_deploy"
fi


function build_only() {
	for w in "${workspace[@]}"; do
    if [[ "$w" == "all" ]]; then
      echo "'all' detected for workspace, extracting all workspaces from ./Cargo.toml..."
      workspace_array=($(extract_workspaces "true"))

      echo "workspaces detected: ${workspace_array[*]}"

      if [[ ${#workspace_array[@]} -eq 0 ]]; then
        print_error "No workspaces extracted from Cargo.toml."
      fi

      anchor build || print_error "Anchor build failed."
      for workspace_id in "${workspace_array[@]}"; do
              if [[ "$workspace_id" != programs/* ]]; then
                cargo build -p "$workspace_id" || print_error "Cargo build failed for $workspace_id."
              fi
            done
    elif [[ "$w" == programs/* ]]; then
      program_id="${w#programs/}"
      anchor build --program-name "$program_id" || print_error "Anchor build failed for $program_id."
    else
      cargo build -p "$w" || print_error "Cargo build failed for $w."
    fi
  done
}

function build_and_deploy() {
  if [[ ${#workspace[@]} -eq 0 ]]; then
    echo "No workspaces detected. Exiting..."
    exit 1
  fi

  for w in "${workspace[@]}"; do
    if [[ "$w" == "all" ]]; then
      echo "'all' detected for workspace, extracting all workspaces from ./Cargo.toml..."
      workspace_array=($(extract_workspaces "true"))

      echo "workspaces detected: ${workspace_array[*]}"

      if [[ ${#workspace_array[@]} -eq 0 ]]; then
        print_error "No workspaces extracted from Cargo.toml."
      fi

      anchor build || print_error "Anchor build failed."
      for workspace_id in "${workspace_array[@]}"; do
        if [[ "$workspace_id" != programs/* ]]; then
          cargo build -p "$workspace_id" || print_error "Cargo build failed for $workspace_id."
        fi
      done

      for program_id in "${workspace_array[@]}"; do
        if [[ "$program_id" == programs/* ]]; then
          anchor deploy --program-name "${program_id#programs/}" --program-keypair ./.keys/${program_id#programs/}-keypair.json || {
            print_error "Failed to deploy program ${program_id#programs/}."
          }
        fi
      done
    elif [[ "$w" == programs/* ]]; then
      program_id="${w#programs/}"
      RUSTUP_TOOLCHAIN=nightly-2025-03-18 anchor build --program-name "$program_id" || print_error "Anchor build failed for $program_id."
      anchor deploy --program-name "$program_id" --program-keypair ./.keys/${program_id}-keypair.json || print_error "Anchor deploy failed for $program_id."
    else
      cargo build -p "$w" || print_error "Cargo build failed for $w."
    fi
  done
}


function deploy_only() {
	for w in "${workspace[@]}"; do
    if [[ "$w" == "all" ]]; then
      echo "'all' detected for workspace, extracting workspaces starting with 'programs/' from ./Cargo.toml..."
      workspace_array=($(extract_workspaces "false"))
      echo "workspaces detected: ${workspace_array[*]}"

      if [[ ${#workspace_array[@]} -eq 0 ]]; then
        echo "No workspaces detected. Exiting..."
        exit 1
      fi

      for program_id in "${workspace_array[@]}"; do
          anchor deploy --program-name "${program_id#programs/}" --program-keypair ./.keys/${program_id#programs/}-keypair.json || print_error "Anchor deploy failed for ${program_id#programs/}."
      done

    elif [[ "$w" == programs/* ]]; then
      program_id="${w#programs/}"
      anchor deploy --program-name "$program_id" --program-keypair ./.keys/${program_id}-keypair.json || print_error "Anchor deploy failed for $program_id."
    fi
  done
}

function extract_workspaces() {
    local get_all=$1  # First argument to the function

    if [[ ! -f ./Cargo.toml ]]; then
        echo "Error: Cargo.toml file not found!"
        return 1
    fi

    if [[ "$get_all" == "true" ]]; then
        # Extract all workspaces without filtering
        awk '/\[workspace\]/,/resolver/ {
            if ($1 ~ /members/) {
                getline
                while ($0 !~ /\]/) {
                    print $0
                    getline
                }
            }
        }' ./Cargo.toml | tr -d ' ",'
    else
        # Extract only workspaces starting with "programs/"
        awk '/\[workspace\]/,/resolver/ {
            if ($1 ~ /members/) {
                getline
                while ($0 !~ /\]/) {
                    if ($0 ~ /programs\//) {
                        print $0
                    }
                    getline
                }
            }
        }' ./Cargo.toml | tr -d ' ",'
    fi
}

if [ "$mode" == "deploy_only" ]; then
    deploy_only
    print_title "Successfully deployed the programs ${workspace[*]} into the network!"
    exit 0
elif [ "$mode" == "build_only" ]; then
    build_only
    print_title "Successfully built the programs ${workspace[*]}"
    exit 0
elif [ "$mode" == "build_and_deploy" ]; then
    build_and_deploy
    print_title "Successfully built and deployed the programs ${workspace[*]} into the network!"
    exit 0
else
    print_title "Invalid mode specified. Please use 'deploy_only', 'build_only' or 'build_and_deploy'"
    exit 1
fi
