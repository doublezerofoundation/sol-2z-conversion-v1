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
    "program_id": "FsZxrms3iCqqRvyX536GYixU9sWiv9J4WTZbwxCMprHR",
}
```
- `rpc_url`: The `Deploying cluster` from last step.
- `program_id`: Public key of the anchor program.

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
anchor build && anchor deploy --program-name integrating-contract --program-keypair ./keys/integrating-contract-keypair.json
```

### Using `build_and_deploy.sh` script
You can also use the `build_and_deploy.sh` script to build and deploy the program. This script will build the program and
deploy it to the environment.

#### Options
- `-h, --help` Display this help message and exit.
- `--workspace <value>` Specify the workspace(s) to process. Use a comma-separated list for multiple workspaces (e.g., `programs/converter-program,programs/integrating-contract`). If no workspace is specified, all workspaces will be processed.
- `--mode <value>` Set the mode of operation. Default will be `build_and_deploy`. Available modes:
    - `deploy_only`: Only deploy the specified workspace(s).
    - `build_only`: Only build the specified workspace(s).
    - `build_and_deploy`: Build and then deploy the specified workspace(s).

#### Example Usage
Build and Deploy a Single Workspace
```sh
./build_and_deploy.sh --workspace programs/my_program --mode build_and_deploy
```

Deploy Multiple Workspaces
```sh
./build_and_deploy.sh --workspace programs/my_program,programs/another_program --mode deploy_only
```

Build all workspaces
```sh
./build_and_deploy.sh --mode build_only
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
Transfers specified tokens from protocol treasury to designated account.
```sh
cargo run -p admin-cli -- update-config
```

- `-a`: Amount of 2Z tokens to withdraw from protocol treasury.
- `-t`: Destination token account address.

### Activate or Pause the System
```sh
cargo run -p admin-cli -- toggle-system-state --activate
cargo run -p admin-cli -- toggle-system-state --pause
```

## User CLI

### Get Current Price
Displays current configuration registry contents.
```sh
cargo run -p user-cli -- get-price
```

### Get Current Price
Displays current configuration registry contents.
```sh
cargo run -p user-cli -- get-quantity
```

### Buy SOL
Initiates SOL purchase. Trade executes at bid price if ask price ≤ bid price; otherwise cancels.
```sh
cargo run -p user-cli -- buy-sol -p <bid_price>
```

- `-p`: User's maximum acceptable purchase price
