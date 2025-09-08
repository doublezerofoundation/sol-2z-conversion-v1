import { Session, SessionType } from "./session";

export class UserSession extends Session {
    constructor(keyPairPath?: string, rpcUrl?: string) {
        super(keyPairPath, rpcUrl);
    }

    protected getSessionType(): SessionType {
        return SessionType.USER;
    }

    protected getBinaryPath(): string {
        return "./cli/user-cli";
    }
}