# DoubleZero Fee Conversion System #

This repository contains on-chain and off-chain implementation for DoubleZero Fee Conversion System on solana.

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
  "oracle_pubkey": "3fgp23WcdX4Sex6jRG444b3fZZXtgS4go8XaA8is3FSc",
  "sol_quantity": 2121,
  "slot_threshold": 134,
  "price_maximum_age": 324,
  "max_fills_storage": 234,
  "skip_preflight": true,
  "steepness": 9000,
  "max_discount_rate": 5000
}
```
- `rpc_url`: The `Deploying cluster` from last step.
- `program_id`: Public key of the anchor program.
- `skip_preflight`: Setting this to `true` will disable transaction preflight checks (which normally simulate the transaction and catch errors before sending) and enable error logging in the database.
- `oracle_pubkey`: Public key of the oracle program.
- `sol_quantity`: Quantity of SOL to be converted in a single transaction.
- `slot_threshold`: Slot threshold for storing the trade history.
- `price_maximum_age`: Maximum age of the oracle price.
- `max_fills_storage`: Maximum number of fills to be stored.
- `steepness`: Steepness of the discount calculation curve in basis points. (0-10000)
- `max_discount_rate`: Maximum discount rate in basis points. (0-10000)

## Deploy the Anchor Program
### Keypair for the programs
Create "./keys" directory\
Generate keypair for both the programs and copy keypairs into the `.keys` directory.

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
  - user-cli
- `--restart-validator` If it is on-chain local deployment, then start/ restart the validator.
- `--m <value>` Set the mode of operation.
  - For on-chain workspace
      - `deploy_only`: Only deploy the specified workspace(s).
      - `build_only`: Only build the specified workspace(s).
      - `build_and_deploy`: Build and then deploy the specified workspace(s).
  - For CLI workspaces, there are no mode

#### Example Usage
Build and Deploy a Single Workspace
```sh
./build_and_deploy.sh -w on-chain --restart-validator
```

If you want to build and deploy all the workspaces, you can run the following command.
```sh
./build_and_deploy.sh
```

## Admin CLI

### Initialize the system 
This command Initializes the system by creating the configuration registry, fills_registry, deny_list_registry and program state account.
```sh
cargo run -p admin-cli -- init
```

### Withdraw 2Z Tokens 
Transfers specified tokens from protocol treasury to designated account.
```sh
cargo run -p admin-cli -- withdraw-tokens -a <TOKEN_AMOUNT> -t <DESTINATION_ACCOUNT>
```

- `-a`: Amount of 2Z tokens to withdraw from protocol treasury.
- `-t`: Destination token account address.

 
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

### Activate or Pause the System
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
cargo run -p user-cli -- buy-sol -p <bid_price>
```

- `-p`: User's maximum acceptable purchase price
