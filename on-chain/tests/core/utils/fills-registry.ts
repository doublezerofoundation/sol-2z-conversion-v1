import {PublicKey} from "@solana/web3.js";
import {getProgramStatePDA} from "./pda-helper";

export async function getFillsRegistryAccountAddress(program) : Promise<PublicKey> {
    const stateAccountPDA: PublicKey = getProgramStatePDA(program.programId);
    const stateAccount = await program.account.programStateAccount.fetch(stateAccountPDA);
    return stateAccount.fillsRegistryAddress;
}

export async function getFillsRegistryAccount(program) : Promise<PublicKey> {
    const fillsRegistryAddress = await getFillsRegistryAccountAddress(program);
    console.log(fillsRegistryAddress);
    return await program.account.tempFillsRegistry.fetch(fillsRegistryAddress);
}