import { config } from "dotenv";

class Config {
    private static instance: Config;
    public readonly token: string;

    private constructor() {
        // Load environment variables from .env file
        config();
        
        this.token = process.env.TELEGRAM_BOT_TOKEN || "";

        if (!this.token)
            throw new Error("Please set a value to TELEGRAM_BOT_TOKEN");
    }

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }
}

export default Config;
