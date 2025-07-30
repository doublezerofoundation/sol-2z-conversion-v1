# Deny List Tests

This document explains the deny-list feature tests for the DoubleZero converter program.

## Overview

The deny-list functionality allows authorized administrators to:
- Add addresses to a deny list registry
- Remove addresses from the deny list registry
- View the current state of the deny list

## Test Structure

### Test Files
- `tests/deny-list-tests.ts` - Main test file containing all deny-list test cases
- `tests/core/test-flow/deny-list.ts` - Helper functions for deny-list operations

### Test Categories

#### 1. Add to Deny List Tests
- ✅ Successfully add an address to the deny list
- ✅ Successfully add multiple addresses to the deny list
- ✅ Fail to add the same address twice (duplicate prevention)
- ✅ Fail when non-authority tries to add to deny list
- ✅ Update metadata correctly when adding addresses

#### 2. Remove from Deny List Tests
- ✅ Successfully remove an address from the deny list
- ✅ Fail to remove an address that is not in the deny list
- ✅ Fail when non-authority tries to remove from deny list
- ✅ Update metadata correctly when removing addresses

#### 3. Edge Cases and Constraints
- ✅ Handle adding addresses up to the maximum limit
- ✅ Maintain list integrity after multiple operations
- ✅ Correctly handle empty deny list operations

## Running the Tests

### Prerequisites
1. Make sure you have a local Solana validator running
2. Ensure the converter program is deployed
3. System must be initialized (tests will auto-initialize if needed)

### Commands

#### Run deny-list tests only:
```bash
anchor run deny-list-test
```

#### Run all tests:
```bash
anchor test
```

#### Run with custom mocha options:
```bash
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/deny-list-tests.ts
```

## Test Features

### Automatic System Initialization
The tests automatically check if the system is initialized and will initialize it if needed using the default configuration.

### Comprehensive Validation
Each test validates:
- State changes in the deny list registry
- Metadata updates (timestamp, update count)
- Error conditions and constraints
- Authority checks

### Helper Functions
The test framework provides reusable helper functions:
- `addToDenyListAndVerify()` - Add address and verify success
- `addToDenyListShouldFail()` - Verify failed addition with expected error
- `removeFromDenyListAndVerify()` - Remove address and verify success
- `removeFromDenyListShouldFail()` - Verify failed removal with expected error
- `fetchDenyListRegistry()` - Get current deny list state
- `verifyDenyListState()` - Verify deny list contains expected addresses

## Test Data

The tests use predefined test addresses:
- `testAddress1`: `11111111111111111111111111111112`
- `testAddress2`: `11111111111111111111111111111113`
- `testAddress3`: `11111111111111111111111111111114`

Additional addresses are generated as needed for specific test cases.

## Error Handling

The tests validate proper error handling for:
- Duplicate address additions
- Removing non-existent addresses
- Unauthorized access attempts
- Invalid account states

## Cleanup

Tests include proper cleanup to avoid interference between test runs, including:
- Removing test addresses when needed
- Handling partial state from previous test runs
- Graceful handling of cleanup failures
