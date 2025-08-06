import {createAccount, TOKEN_2022_PROGRAM_ID} from "@solana/spl-token";
import {getDefaultKeyPair} from "./accounts";
import {Connection, Keypair, PublicKey} from "@solana/web3.js";

export async function createTokenAccount(
    connection: Connection,
    mint: PublicKey,
    owner: PublicKey = getDefaultKeyPair().publicKey
) {
    return await createAccount(
        connection,
        getDefaultKeyPair(),
        mint,
        owner,
        Keypair.generate(),
        undefined,
        TOKEN_2022_PROGRAM_ID
    )
}

export async function getTokenBalance(
    connection: Connection,
    tokenAccount: PublicKey,
): Promise<number> {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.uiAmount;
}