import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import path from "path";
import fs from "fs";
import * as anchor from "@coral-xyz/anchor";

export function getDefaultKeyPair(): Keypair {
    const keypairPath = path.resolve(
        process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`
    );
    const secretKeyString = fs.readFileSync(keypairPath, 'utf8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return anchor.web3.Keypair.fromSecretKey(secretKey);
}

export async function accountExists(
    connection: Connection,
    publicKey: PublicKey
): Promise<boolean> {
    return (await connection.getAccountInfo(publicKey)) !== null;
}

export async function airdropToActivateAccount(
    connection: Connection,
    pubkey: PublicKey,
    amount = 10 * LAMPORTS_PER_SOL
): Promise<void> {
    const balance = await connection.getBalance(pubkey);
    if (balance < amount) {
        await airdrop(connection, pubkey, amount);
    }
}

export async function airdrop(
    connection: Connection,
    pubkey: PublicKey,
    amount = 10
): Promise<void> {
    const tx = await connection.requestAirdrop(pubkey, amount);
    await connection.confirmTransaction({
        signature: tx,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
        blockhash: (await connection.getLatestBlockhash()).blockhash
    });
}