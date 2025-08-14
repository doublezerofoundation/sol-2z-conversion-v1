import { expect } from "chai";
import { AdminClient } from "../core/admin-client";
import { UserClient } from "../core/user-client";
import { CommonScenario } from "./common-scenario";
import { TOKEN_DECIMALS } from "../core/constants";
import { getConfig } from "../core/utils/config-util";

export class UserQueryScenario extends CommonScenario {
    private readonly user: UserClient;

    constructor(admin: AdminClient, user: UserClient) {
        super(admin);
        this.user = user;
    }

    public async getPriceAndVerify(): Promise<void> {
        const result = await this.user.getPriceCommand();

        const swapRateRegex = /swap_rate:\s(\d+),/m;
        const askPriceRegex = /conversion rate:\s(\d+.\d+)\s2Z\sper\sSOL/m;
        const swapRate = result.match(swapRateRegex)?.[1];
        const askPrice = result.match(askPriceRegex)?.[1];

        expect(swapRate).to.not.be.null;
        expect(askPrice).to.not.be.null;

        expect(Number(askPrice)).to.be.lessThan(Number(swapRate) / TOKEN_DECIMALS);
    }

    public async getPriceAndVerifyFail(errorMessage: string): Promise<void> {
        try {
            await this.getPriceAndVerify();
            expect.fail("Get Price should fail");
        } catch (error) {
            expect(error!.toString()).to.contain(errorMessage);
        }
    }

    public async getQuantityAndVerify(): Promise<void> {
        const result = await this.user.getQuantityCommand();

        const quantityRegex = /In\slamports:\s(\d+)\s/m;
        const quantity = result.match(quantityRegex)?.[1];

        expect(quantity).to.not.be.null;

        const config = getConfig();

        expect(Number(quantity)).to.be.equal(config.sol_quantity);
    }

    public async getQuantityAndVerifyFail(errorMessage: string): Promise<void> {
        try {
            await this.getQuantityAndVerify();
            expect.fail("Get Quantity should fail");
        } catch (error) {
            expect(error!.toString()).to.contain(errorMessage);
        }
    }
}