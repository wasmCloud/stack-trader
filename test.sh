#!/bin/bash
# Script to test all systems independently. To test verbosely, add flag `--verbose`

# test all systems
cd genesis && cargo test $1 && echo "Genesis tested" \
&& cd ../merchant && cargo test $1 && echo "Merchant tested" \
&& cd ../mining && cargo test $1 && echo "Mining tested" \
&& cd ../navigation && cargo test $1 && echo "Navigation tested" \
&& cd ../physics && cargo test $1 && echo "Physics tested" \
&& cd ../radar && cargo test $1 && echo "Radar tested" \
&& cd ../stacktrader-types && cargo test $1 && echo "Stacktrader-types tested" \

if [ $? -eq 0 ]
then
    echo "Stacktrader test success"
    exit 0
else
    echo "Stacktrader test failure"
    exit 1
fi
