export async function writeSolanaEvent(
     txHash: string,
     eventId: string,
     eventType: string,
     data: Record<string, any>,
     slot: number,
     timestamp: number
) {
// TODO: Insert into solana-event table with PK txHash, SK eventId
}

export async function writeSolanaError(
txHash: string,
errorCode: string,
logs: string[],
slot: number,
timestamp: number
) {
// TODO: Insert into solana-error table
}

export async function writeFillDequeue(
txHash: string,
actionId: string,
data: Record<string, any>,
slot: number,
timestamp: number
) {
// TODO: Insert into fill-dequeue table
}

export async function writeDenyListAction(
txHash: string,
actionId: string,
data: Record<string, any>,
slot: number,
timestamp: number
) {
// TODO: Insert into deny-list-action table
}