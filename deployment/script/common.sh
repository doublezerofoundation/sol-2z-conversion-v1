function print_warning() {
	echo -e "\033[0;33mWARNING: $1\033[0m"
}

function print_error_and_exit() {
    local timestamp=$(date +%Y-%m-%dT%H:%M:%S.%N%z)
    echo -e "\e[0;31m[$timestamp] ==> [ERROR] $1\e[0m"
    exit -2
}
function get_operator_approval() {
    if [[ ! $AUTO_APPROVE -eq 1 ]]; then
        arr=("$@")
        warning_msg="${arr[0]}"
        accepted_inputs_array=("${arr[@]:1}")
        echo -en "\e[1;32m"$warning_msg"\e[0m"
        read answer
        if [[ ! ${accepted_inputs_array[*]} =~ (^|[[:space:]])"$answer"($|[[:space:]]) ]]; then
            print_error_and_exit "Operator approval not granted. exiting !!!"
        fi
    fi
}