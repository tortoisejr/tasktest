#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Hospital Data Sharing Network Setup ===${NC}"

# Set fabric samples path
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/

# Directory for docker-compose and connection profiles
cd ../test-network

# Function to check if previous command succeeded
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success: $1${NC}"
    else
        echo -e "${RED}✗ Failed: $1${NC}"
        exit 1
    fi
}

# Stop any existing network
echo -e "${YELLOW}Stopping any existing network...${NC}"
./network.sh down
check_success "Network stopped"

# Bring up the test network
echo -e "${YELLOW}Starting Hyperledger Fabric test network...${NC}"
./network.sh up createChannel -c hospitalchannel -ca
check_success "Network started and channel created"

# Package the hospital chaincode first
echo -e "${YELLOW}Packaging Hospital Chaincode...${NC}"
# ./network.sh deployCC -ccn hospital -ccp ../../chaincode/hospital-chaincode/ -ccl go -c hospitalchannel -ccv 1.0 -ccs 1
./network.sh deployCC -ccn hospital -ccp ../chaincode/hospital-chaincode/ -ccl go -c hospitalchannel -ccv 1.0 -ccs 1
check_success "Hospital chaincode deployed"

echo -e "${GREEN}=== Network Setup Completed Successfully ===${NC}"
echo -e "${GREEN}Channel: hospitalchannel${NC}"
echo -e "${GREEN}Chaincode: hospital${NC}"
echo -e "${YELLOW}You can now run the hospital applications.${NC}"
