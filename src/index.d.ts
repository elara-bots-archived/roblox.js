declare module "@elara-services/roblox.js" {

    export interface RobloxOptions {
        cookie?: string;
        debug?: boolean;
        apis?: {
            rover?: boolean;
            bloxlink?: boolean;
        }
    }

    export interface RobloxStatus {
        status: boolean;
        message?: string;
    }

    type Response = Promise<RobloxStatus|object|null>;
    // @ts-ignore
    export = class Roblox {
        public constructor(options?: RobloxOptions);
        public rover: boolean;
        public bloxlink: boolean;
        public debug: boolean;
        public options: RobloxOptions;
        public isVerifed(user: string|number): Promise<boolean>;
        public fetch(user: string|number, basic?: boolean): Promise<RobloxStatus|object>;
        public get(user: string|number, basic?: boolean): Promise<RobloxStatus|object>;
        public fetchByUsername(name: string): Response;
        public fetchRover(id: string, basic?: boolean): Response;
        public fetchBloxlink(id: string, basic?: boolean): Response;
        public fetchBasicRobloxInfo(id: string): Response | Promise<{
            status: boolean;
            description: string;
            created: string;
            isBanned: boolean;
            externalAppDisplayName: string|null;
            id: number;
            name: string;
            displayName: string
        }>;
        public fetchRoblox(id: string|number): Response;
        public showDiscordMessageData(res: object, user?: object, options?: {
            showButtons?: boolean,
            color?: number,
            emoji?: string,
            secondEmoji?: string
        }): {
            embeds: object[],
            components: object[]
        }


        // Private Methods
        private cookie: string;
        private _request(url: string, headers?: object, method?: string, returnJSON?: boolean): Promise<object|string|null>;
        private _debug(...args: any): void;
        private privateFetch(url: string): Promise<object|null>;
        private privateGet(url: string): Promise<object|null>;
        
    }
}