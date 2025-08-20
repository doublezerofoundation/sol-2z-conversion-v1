import {TOKEN_DECIMAL} from "../constants";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

export const ORACLE_KEYPAIR = Keypair.generate();

export interface OraclePriceData {
    swapRate: number;
    timestamp: number;
    signature: string;
    // solPriceUsd?: string;
    // twozPriceUsd?: string;
}

// Mock the price oracle data
export const getOraclePriceDataFor = async (swapRate: number, timestamp: number): Promise<OraclePriceData> => {
    const swapRateInt = Math.floor(swapRate * TOKEN_DECIMAL);
    const attestation = await generateRandomAttestation(swapRateInt, timestamp);

    return {
        swapRate: swapRateInt,
        timestamp,
        signature: attestation,
    } as OraclePriceData;
}

export const getOraclePriceData = async (): Promise<OraclePriceData> => {
    const swapRate = (Math.random() * 3) + 19; // 19 - 22 range
    const timestamp = Date.now();

    return getOraclePriceDataFor(swapRate, timestamp);
}

const generateRandomAttestation = async (swapRate: number, timestamp: number): Promise<string> => {
    const messageString = `${swapRate}|${timestamp}`;
    const message = new TextEncoder().encode(messageString);

    // Directly sign using tweetnacl + Keypair
    const signedBytes = nacl.sign.detached(message, ORACLE_KEYPAIR.secretKey);

    const base64SignedBytes = Buffer.from(signedBytes).toString("base64");
    return base64SignedBytes;
};