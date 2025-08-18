import { Session, SessionType } from "./session";

export class AdminSession extends Session {
    constructor(keyPairPath?: string, rpcUrl?: string) {
        super(keyPairPath, rpcUrl);
    }

    protected getSessionType(): SessionType {
        return SessionType.ADMIN;
    }

    protected getBinaryPath(): string {
        return "./cli/admin-cli";
    }
}