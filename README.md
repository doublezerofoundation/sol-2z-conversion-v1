# DoubleZero Fee Conversion System #

This repository contains on-chain and off-chain implementation for DoubleZero Fee Conversion System on solana. \
This system consists of following components. 

1) Converter Program - Core On-chain program written in anchor, to handle the functionalities of the system.
2) Mock Double Zero Transfer Program - On-chain program written in anchor to mock the transfer functionality. 
It provides CPIs which is used by converter program to simulate actual transfer.
3) Admin CLI - CLI interface for admins to control the system.
4) User CLI - CLI interface for user to interact with the system.
5) Common CLI - Includes common functionalities for Admin CLI & User CLI.
6) E2E Test Suite - End to end tests for the system using the solana local test validator.


### Setup Dependencies

#### Solana CLI - 2.2.20
```sh
sh -c "$(curl -sSfL https://release.anza.xyz/v2.2.20/install)"
```
#### Anchor - 0.31.1
Make sure you have avm (Anchor Version Manager) installed. Choose this version using this command.
```sh
avm use 0.31.1
```

#### Rust - 1.88.0
Make sure you have rustc installed. Choose this version using this command.
```sh
rustup default 1.88.0
```

## Set Up Local Validator
Make sure to update the Solana CLI config to localhost.
```sh
solana config set -ul
```
If you wish to deploy the program in the local net, If the validator is not already running, run the command below 
```sh
solana-test-validator
```

## Subscribe to Solana Logs
If you need to check solana logs, run the following command in a separate terminal.
```sh
solana logs -ul
```
### Setting Up the Config Files
Create a `config.json` file at the root directory. Both Admin CLI and User CLI refer to this config file.\

The file should contain the following items.
```json
{
  "rpc_url": "http://127.0.0.1:8899",
  "program_id": "YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z",
  "double_zero_program_id": "8S2TYzrr1emJMeQ4FUgKhsLyux3vpMhMojMTNKzPebww",
  "oracle_pubkey": "3FsydTFGUYNQJH7hx97wJiVYhtiDK3gx4ujXNyf1t8Rj",
  "sol_quantity": 25000000000,
  "slot_threshold": 134,
  "price_maximum_age": 324,
  "skip_preflight": false,
  "price_oracle_end_point": "https://clic19jsil.execute-api.us-east-1.amazonaws.com/dev4/api/v1/swap-rate",
  "coefficient": 4500,
  "max_discount_rate": 5000,
  "min_discount_rate": 500
}
```
- `rpc_url`: The `Deploying cluster` from last step.
- `program_id`: Public key of the anchor program.
- `double_zero_program_id`: Public key of the Double Zero Program.
- `skip_preflight`: Setting this to `true` will disable transaction preflight checks (which normally simulate the transaction and catch errors before sending) and enable error logging in the database.
- `oracle_pubkey`: Public key of the oracle program.
- `sol_quantity`: Quantity of SOL to be converted in a single transaction (in Lamports).
- `slot_threshold`: Slot threshold for storing the trade history.
- `price_maximum_age`: Maximum age of the oracle price.
- `coefficient`: Coefficient of the discount calculation curve in basis points. (0-100000000) *see note below*
- `max_discount_rate`: Maximum discount rate in basis points. (0-10000)
- `min_discount_rate`: Minimum discount rate in basis points. (0-10000)

### Note
*The formula for calculating the `coefficient` is:*

$$
\gamma = \frac{D_{max} - D_{min}}{N} * 10000
$$

- `N`: Desired number of slots between two trades where the discount rate will go from `D_{min}` to `D_{max}`.
- Multiply the result by 10000 to preserve the precision.

Example:
```
D_{max} = 5000 (50%)
D_{min} = 500 (5%)
N = 10000 (10000 slots)
```
$$
\gamma = \frac{5000 - 500}{10000} = 0.45
$$

$$
\gamma * 10000 = 4500
$$


## Deploy the Anchor Program
### Keypair for the programs
Create "./keys" directory\
Generate keypair for both the programs and copy keypair into the `.keys` directory.

### Two ways of Deploying
There are two ways to deploy your application.
- Manual deployment using anchor CLI
- Using `build_and_deploy.sh` script

### Manual Deployment
Use the anchor CLI commands to build and deploy the program.
There are multiple workspaces defined in the `Anchor.toml` file. You can choose to deploy any of them.
You can mention required program name and keypair file in the command.

```sh
anchor build && anchor deploy --program-name PROGRAM_NAME --program-keypair ..keys/KEYPAIR.json

eg: anchor build && anchor deploy --program-name converter-program --program-keypair ./.keys/converter-program-keypair.json
```

### Using `build_and_deploy.sh` script
You can also use the `build_and_deploy.sh` script to build and deploy the program. This script will build the program and
deploy it to the environment.

#### Options
- `-h, --help` Display this help message and exit.
- `--w <value>` Specify the workspace to process. Available workspaces
  - on-chain 
  - admin-cli
  - mock-double-zero-program
  - user-cli
  - run-tests
- `--restart-validator` If it is on-chain local deployment, then start/ restart the validator.
- `--m <value>` Set the mode of operation.
  - For on-chain workspace and run-tests
    - For On-chain workspace & Mock Double Zero Program
        - `deploy_only`: Only deploy the specified workspace(s).
        - `build_only`: Only build the specified workspace(s).
        - `build_and_deploy`: Build and then deploy the specified workspace(s).
    - For run-tests workspace
      - `unit`: Running unit tests.
      - `e2e`: Running e2e tests.
  - For CLI workspaces, there are no mode

#### Example Usage
Build and Deploy a Single Workspace
```sh
./build_and_deploy.sh -w on-chain --restart-validator
./build_and_deploy.sh -w mock-double-zero-program --restart-validator
./build_and_deploy.sh -w run-tests --mode unit
```

### Export the Private Key
To use CLI, It is essential to export the private key\
To set up the private key as an environment variable, run:

```sh
export PRIVATE_KEY=MAIN_PRIVATE_KEY

eg: export PRIVATE_KEY=226,222,1,3 ...
```
NOTE: Ensure this account is prefunded with adequate SOL

## Admin CLI

### Initialize the system 
This command Initializes the system by creating the configuration registry, fills_registry, deny_list_registry and program state account.
```sh
cargo run -p admin-cli -- init
```
 
### View Configuration
Displays current configuration registry contents.
```sh
cargo run -p admin-cli -- view-config
```

### Update Configuration
Updates the configuration of the system.
```sh
cargo run -p admin-cli -- update-config
```

The command reads the `config.json` file and updates the configuration of the system according to the values in the file.

### View System State
Displays current system state.
```sh
cargo run -p admin-cli -- view-system-state
```

### Activate or Pause the System
This command activates or pauses the system. If the system is paused, no new trades can be executed.
```sh
cargo run -p admin-cli -- toggle-system-state --activate
cargo run -p admin-cli -- toggle-system-state --pause
```

### Set Admin
Sets the admin of the system. Only the program deployer can set/change the admin.
```sh
cargo run -p admin-cli -- set-admin -a <ADMIN_ACCOUNT>
```

- `-a`: Admin account public key.

### Add Dequeuer
Add a dequeuer address to the authorized list
```sh
cargo run -p admin-cli -- add-dequeuer -a <DEQUEUER_ACCOUNT>
```

- `-a`: Dequeuer account public key.

### Remove Dequeuer
Remove a dequeuer address from the authorized list
```sh
cargo run -p admin-cli -- remove-dequeuer -a <DEQUEUER_ACCOUNT>
```

- `-a`: Dequeuer account public key.

### Add to DenyList
Adds an address to the deny list registry
```sh
cargo run -p admin-cli -- add-to-deny-list -a <USER_ACCOUNT>
```

- `-a`: User account public key.
 
### Remove From DenyList
Removes an address from the deny list registry
```sh
cargo run -p admin-cli -- remove-from-deny-list -a <USER_ACCOUNT>
```

- `-a`: User account public key.
 
### View DenyList
Displays all addresses in the deny list registry
```sh
cargo run -p admin-cli -- view-deny-list 
```

### View Fill Registry
View Fills Registry, which tracks individual fill records and overall aggregate statistics
```sh
cargo run -p admin-cli -- view-deny-list 
```

### Init Mock Transfer Program
Initializes Mock Transfer Program Accounts
```sh
cargo run -p admin-cli -- init-mock-program
```

### Airdrop to Mock Vault
Sends specified amount of SOL to Mock Vault
```sh
cargo run -p admin-cli -- airdrop-to-mock-vault -a <AMOUNT>
```
- `AMOUNT`: SOL amount to be airdropped.


### Mock Token Mint
Mints Mock 2Z token to specified address.
```sh
cargo run -p admin-cli -- mock-token-mint -a <AMOUNT> -t <DESTINATION_TOKEN_ACCOUNT>
```

- `-a`: Token Amount to be minted
- `-t`: Destination token account address. (Optional, If not specified, defaults to signer's Associated Token Account)

### Mint to Protocol Treasury Token Account
Mints specified amount of Mock 2Z token to protocol Treasury Account
```sh
cargo run -p admin-cli -- mint-to-mock-protocol-treasury -a <AMOUNT>
```
- `-a`: 2Z Token amount to be minted.


## User CLI

### Get Current Price
Calculates the current discount rate and estimates the ask price (in 2Z tokens) for the given SOL quantity.
```sh
cargo run -p user-cli -- get-price
```

### Get Current Quantity
Displays the current SOL quantity that can be purchased by spending 2Z tokens.
```sh
cargo run -p user-cli -- get-quantity
```

### Buy SOL
Initiates SOL purchase. Trade executes at bid price if ask price ≤ bid price; otherwise cancels.
```sh
cargo run -p user-cli -- buy-sol -p <bid_price> -f <SOURCE_ACCOUNT>
```

- `-p`: User's maximum acceptable purchase price
- `-f`: Source token account address. (Optional, If not specified, defaults to signer's Associated Token Account)

### Get Fills Info
View Fills Registry, which tracks individual fill records and overall aggregate statistics
```sh
cargo run -p user-cli -- get-fills-info 
```

## Integration CLI
### Dequeue Fills
Dequeues fills up to specified SOL amount. Returns total SOL and 2Z amounts processed. Only callable by authorized integrating contracts.
```sh
cargo run -p integration-cli -- dequeue-fills -a <max_sol_amount>
```

- `-a`: Maximum SOL amount to dequeue in this operation

## E2E Test Suite

### Setup the Test Environment
Install the dependencies for the e2e test suite.
```sh
cd e2e
npm install
```

### Run the Tests
Run the tests using the `test_runner.sh` script with the following command.
```sh
./test_runner.sh --test-type <test-type>

# eg: 
./test_runner.sh --test-type unit
./test_runner.sh --test-type e2e
```

- `test-type`: Type of tests to run.
  - `unit`: Running unit tests.
  - `e2e`: Running e2e tests.

The tests are run using the solana local test validator. The `test_runner.sh` script starts a local validator for each test script provided in the config file.\
- To add a new e2e test suite, add the test script to the `package.json` file in the `e2e` directory.
- To add a new unit test, add the test script to the `Anchor.toml` file in the `on-chain` directory.

Afterwards, add the test script to the `test_runner.sh` script.