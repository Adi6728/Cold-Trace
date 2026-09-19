#!/bin/bash
sed -i 's/DOCKER_SOCK="${SOCK##unix:\/\/}"/DOCKER_SOCK="\/\/var\/run\/docker.sock"/g' /c/fabric/fabric-samples/test-network/network.sh
sed -i 's/DOCKER_SOCK="${SOCK##unix:\/\/}"/DOCKER_SOCK="\/\/var\/run\/docker.sock"/g' /c/fabric/fabric-samples/test-network/addOrg3/addOrg3.sh
