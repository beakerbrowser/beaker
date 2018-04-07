#!/usr/bin/env bash.origin.script

echo "ARGS: $@"

BO_parse_args "ARGS" "$@"

tag="beaker/$(basename $(pwd))"
containerPath="${ARGS_OPT_path}"
sitePath="$(pwd)"
runCommand="${ARGS_OPT_command}"

unset ${!DOCKER*}

docker build \
    -t "${tag}" \
    "${containerPath}"

docker run \
    --mount type=bind,source=${sitePath},destination=/site,consistency=cached \
    "${tag}" \
    ${runCommand}
