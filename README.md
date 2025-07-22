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

## Deploy the Anchor Program
Copy the both program keypair into the `.keys` directory.

There are two ways to deploy your application.
- Manual deployment using anchor CLI
- Using `build_and_deploy.sh` script

### Manual Deployment
Use the anchor CLI commands to build and deploy the program.
There are multiple workspaces defined in the `Anchor.toml` file. You can choose to deploy any of them.
You can mention required program name and keypair file in the command.

```sh
anchor build && anchor deploy --program-name PROGRAM_NAME --program-keypair ..keys/KEYPAIR.json

eg: anchor build && anchor deploy --program-name converter-program --program-keypair ./.keys/converter_program-keypair.json
anchor build && anchor deploy --program-name integrating-contract --program-keypair ./keys/integrating_contract-keypair.json
```

## Subscribe to Solana Logs
If you need to check solana logs, run the following command in a separate terminal.
```sh
solana logs -ul
```

