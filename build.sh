#!/bin/bash
# Script to build all systems independently. To build for release, add flag `--release`

# Build all systems
cd genesis && cargo build $1 && echo "Genesis built" \
&& cd ../merchant && cargo build $1 && echo "Merchant built" \
&& cd ../mining && cargo build $1 && echo "Mining built" \
&& cd ../navigation && cargo build $1 && echo "Navigation built" \
&& cd ../physics && cargo build $1 && echo "Physics built" \
&& cd ../radar && cargo build $1 && echo "Radar built" \
&& cd ../stacktrader-types && cargo build $1 && echo "Stacktrader-types built" \

if [ $? -eq 0 ]
then
    echo "Stacktrader build success"
    exit 0
else
    echo "Stacktrader build failure"
    exit 1
fi