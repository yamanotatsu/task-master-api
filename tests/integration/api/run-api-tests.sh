#!/bin/bash

# Task Master API Test Runner
# This script runs comprehensive API tests with proper setup and reporting

echo "🧪 Task Master API Test Suite"
echo "============================"
echo ""

# Set environment variables
export NODE_ENV=test
export ANTHROPIC_API_KEY=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

# Check if API server is running
check_api_server() {
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ API server is already running on port 3000"
        return 0
    else
        echo "❌ API server is not running"
        return 1
    fi
}

# Function to run tests
run_tests() {
    local test_type=$1
    local test_file=$2
    
    echo ""
    echo "📋 Running $test_type tests..."
    echo "--------------------------------"
    
    # Run the specific test file
    npm test -- "$test_file" --verbose
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $test_type tests passed!"
    else
        echo "❌ $test_type tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Main execution
main() {
    # Check if we should start the API server
    if [ "$1" != "--no-server" ]; then
        if ! check_api_server; then
            echo "Starting API server..."
            npm run api &
            API_PID=$!
            
            # Wait for server to be ready
            echo "Waiting for API server to start..."
            for i in {1..30}; do
                if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                    echo "✅ API server is ready!"
                    break
                fi
                sleep 1
            done
        fi
    fi
    
    # Run comprehensive tests
    echo ""
    echo "🚀 Starting comprehensive API tests"
    echo ""
    
    # Track overall success
    all_passed=true
    
    # Run comprehensive test suite
    if ! run_tests "Comprehensive" "tests/integration/api/comprehensive-api.test.js"; then
        all_passed=false
    fi
    
    # Run edge cases test suite
    if ! run_tests "Edge Cases" "tests/integration/api/edge-cases.test.js"; then
        all_passed=false
    fi
    
    # Generate test report
    echo ""
    echo "📊 Test Summary"
    echo "==============="
    
    if [ "$all_passed" = true ]; then
        echo "✅ All tests passed successfully!"
        exit_code=0
    else
        echo "❌ Some tests failed. Please check the output above."
        exit_code=1
    fi
    
    # Cleanup
    if [ ! -z "$API_PID" ]; then
        echo ""
        echo "Stopping API server..."
        kill $API_PID 2>/dev/null
    fi
    
    exit $exit_code
}

# Handle script arguments
case "$1" in
    --help)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --no-server    Don't start the API server (assumes it's already running)"
        echo "  --help         Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  ANTHROPIC_API_KEY    API key for Anthropic (will be set automatically)"
        echo ""
        ;;
    *)
        main "$@"
        ;;
esac