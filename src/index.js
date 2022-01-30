const [ moment, fetch, pack, formatDate, formatNum ] = [ 
    require("moment"),
    require("@elara-services/fetch"), 
    require(`../package.json`),
    (date, format = "f") => `<t:${Math.floor(new Date(date).getTime() / 1000)}${format ? `:${format}` : ""}>`,
    (num) => num.toLocaleString()
];

module.exports = class Roblox {
    /**
     * @param {object} [options] 
     * @param {string} [options.cookie]
     * @param {boolean} [options.debug]
     * @param {object} [options.apis]
     * @param {boolean} [options.apis.rover]
     * @param {boolean} [options.apis.bloxlink]
     */
    constructor(options) {
        this.rover = Boolean(options?.apis?.rover ?? true);
        this.bloxlink = Boolean(options?.apis?.bloxlink ?? true);
        this.debug = Boolean(options?.debug ?? false);
        this.options = options;
        if(!this.bloxlink && !this.rover) throw new Error(`[ROBLOX:API:ERROR]: You can't disable both RoVer or Bloxlink APIs... how else will you fetch the information?`);
    };

    /** @private */
    get cookie() { return this.options?.cookie ?? ""; };
    get fetch() { return this.get; };

    
    async get(user, basic = false) {
        if(typeof user === "string" && user.match(/<@!?/gi)) {
            let r = await this.fetchRoVer(user.replace(/<@!?|>/gi, ""), basic);
            if(!r || r.status !== true) return this.status(r?.message ?? "I was unable to fetch the Roblox information for that user.");
            return r;
        } else {
            let search = await (isNaN(parseInt(user)) ? this.fetchByUsername(user) : this.fetchRoblox(parseInt(user)));
            if(!search || search.status !== true) return this.status(search?.message ?? "I was unable to fetch the Roblox information for that user.");
            return search;
        };
    };

    /**
     * @param {string} name 
     * @returns {Promise<object|null>}
     */
    async fetchByUsername(name){
        let res = await this._request(`https://api.roblox.com/users/get-by-username?username=${name}`);
        if (!res || !res.Id) return null
        return this.fetchRoblox(res.Id);
    };

    /**
     * @param {string} id 
     * @param {boolean} [basic=false] - If the basic information should be returned.
     * @returns {Promise<object|null>}
     */
    async fetchRoVer(id, basic = false){
        if(!this.rover) return this.fetchBloxLink(id, basic);
        let r = await this.privateGet(`https://verify.eryn.io/api/user/${id}`);
        if(!r) return this.fetchBloxLink(id, basic);
        if (basic) return this.fetchBasicRobloxInfo(r.robloxId);
        return this.fetchRoblox(r.robloxId);
    };

    /**
     * @param {string} id 
     * @param {boolean} [basic=false] - If the basic information should be returned.
     * @returns {Promise<object|null>}
     */
    async fetchBloxLink(id, basic = false) {
        if(!this.bloxlink) return null;
        let r = await this.privateGet(`https://api.blox.link/v1/user/${id}`);
        if(!r || typeof r.primaryAccount !== "string") return this.status(`I was unable to find an account with that userID!`);
        if (basic) return this.fetchBasicRobloxInfo(r.primaryAccount);
        return this.fetchRoblox(r.primaryAccount)
    };

    /**
     * @param {string} id 
     * @returns {Promise<object>}
     */
    async fetchBasicRobloxInfo(id) {
        let res = await this.privateFetch(`https://users.roblox.com/v1/users/${id}`);
        if (!res) return { status: false, message: `Unable to fetch their Roblox account.` }
        return {
            status: true,
            ...res
        }
    }

    /**
     * @param {string|number} id 
     * @returns {Promise<object|null>}
     */
    async fetchRoblox(id){
        try{
            let [ newProfile, userReq, g, onlineStatus ] = await Promise.all([
                this.privateFetch(`https://www.roblox.com/users/profile/profileheader-json?userId=${id}`),
                this.privateFetch(`https://users.roblox.com/v1/users/${id}`),
                this.privateFetch(`https://groups.roblox.com/v1/users/${id}/groups/roles`),
                this.privateFetch(`https://api.roblox.com/users/${id}/onlinestatus`)
            ])
            if(!userReq) return this.status(`I was unable to find an account with that user ID!`);
            if(!g) g = [];
            let [bio, joinDate, pastNames, userStatus, friends, followers, following, groups, avatar, defAvatar] = [ 
                "", "", "", "Offline", 0, 0, 0, [],
                await this._request(`${pack.links.AVATAR_URL}/${userReq.name}`),
                pack.links.DEFAULT_AVATAR
            ]
            if(!avatar) avatar = defAvatar;
            else if(avatar?.status) avatar = avatar?.avatar;
            else avatar = defAvatar;
            if(newProfile) {
                bio = userReq ? userReq.description : "";
                friends = newProfile.FriendsCount ?? 0;
                followers = newProfile.FollowersCount ?? 0;
                following = newProfile.FollowingsCount ?? 0;
                pastNames = (newProfile.PreviousUserNames.split("\r\n") ?? []).join(", ");
                joinDate = {
                    full: userReq ? userReq.created : "",
                    format: userReq ? moment(userReq.created).format("L") : ""
                };
                userStatus = newProfile.LastLocation ?? "Offline";
            }
    
            if(g && g.data && Array.isArray(g.data) && g.data.length !== 0){
            for (const c of g.data){
                groups.push({
					name: c?.group?.name ?? "",
					id: c?.group?.id ?? 0,
					role_id: c?.role?.id,
					rank: c?.role?.rank,
					role: c?.role?.name,
					members: c?.group?.memberCount ?? 0,
					url: `https://roblox.com/groups/${c?.group?.id ?? 0}`,
					primary: c?.isPrimaryGroup ?? false,
					inclan: false,
					emblem: { id: 0, url: "" },
					owner: c?.group?.owner ?? null,
					shout: c?.group?.shout ?? null,
					raw: c
				})
            }
            };
            return {
                status: true,
                user: {
                    username: userReq.name ?? "Unknown",
                    id: userReq.id ?? 0,
                    online: userStatus ?? "Offline",
                    url: `https://roblox.com/users/${id}/profile`,
                    avatar,
                    bio: bio ?? null,
                    joined: joinDate ?? null,
                    lastnames: pastNames ? pastNames.split(', ').filter(g => g !== "None") : [],
                    counts: {
                      friends: friends ?? 0,
                      followers: followers ?? 0,
                      following: following ?? 0
                    }
                },
                groups: groups ?? [],
                activity: onlineStatus ?? null
            }
        }catch(err){
            if(err.message.toString().toLowerCase() === "cannot destructure property `body` of 'undefined' or 'null'." || err.message.toString() === "Cannot destructure property 'body' of '(intermediate value)' as it is undefined.") return this.status(`Not Found`)
            return this.status(`Error while trying to fetch the information\n${err.message}`)
        }
    };

    /**
     * @param {string|number} user 
     * @returns {Promise<boolean>}
     */
    async isVerified(user) {
        let r = await this.get(user, true);
        if(!r || r.status !== true) return Promise.resolve(false);
        return Promise.resolve(true);
    };

    /**
     * @private
     * @param {string} url 
     * @param {object} headers 
     * @param {string} method 
     * @param {boolean} returnJSON 
     * @returns {Promise<object|null|any>}
     */
    async _request(url, headers = undefined, method = "GET", returnJSON = true) {
        try {
            let body = fetch(url, method)
            if (headers) body.header(headers)
            let res = await body.send()
            .catch(() => ({ statusCode: 500 }));
            this._debug(`Requesting (${method}, ${url}) and got ${res.statusCode}`);
            if (res.statusCode !== 200) return null;
            return res[returnJSON ? "json" : "text"]();
        } catch (err) {
            this._debug(`ERROR while making a request to (${method}, ${url}) `, err);
            return null;
        }
    };

    /**
     * @private
     */
    _debug(...args) {
        if (!this.debug) return;
        return console.log(`[${pack.name.toUpperCase()}, v${pack.version}]: `, ...args);
    }

    /**
     * @private
     * @param {string} [url]
     * @returns {Promise<object|void>}
     */
    async privateFetch(url = "") {
        return this._request(url, this.cookie ? {
            "Cookie": this.cookie.replace(/%TIME_REPLACE%/gi, new Date().toLocaleString())
        } : undefined);
    };
    /**
     * @private
     * @param {string} message 
     * @param {boolean} status 
     * @returns {object}
     */
    status(message, status = false) { return { status, message } };

    /**
     * @private
     * @param {string} url 
     * @returns {Promise<object|void>}
     */
    async privateGet(url) {
        try{
            let res = await this._request(url)
            if (!res || res.status !== "ok") return null;
            return res;
        }catch{
            return null;
        }
    };


    /**
     * @param {object} res - Information from the Roblox.js response
     * @param {object} user - Discord.js user class
     * @param {object} [options]
     * @param {boolean} [options.showButtons=true] - Show the link buttons for Profile and Avatar
     * @param {string} [options.emoji="▫"] 
     * @param {string} [options.secondEmoji="◽"] 
     * @param {number} [options.color=11701759] - The embed color
     */
    showDiscordMessageData(res, user = null, { showButtons = true, emoji = "▫", secondEmoji = "◽", color = 11701759 } = {}) {
        let [ fields, warning ] = [ [], false ];

        if (res.activity){
            let gameURL = "";
            if (res.activity.PlaceId) gameURL = `https://roblox.com/games/${res.activity.PlaceId}`;
            fields.push(
                { 
                    name: `Activity`, 
                    value: `${emoji}Status: ${res.activity.LastLocation}${gameURL ? `\n${emoji}Game: [URL](${gameURL} "Click here to view the game!")` : ""}\n${emoji}Last Seen: ${formatDate(res.activity.LastOnline)} (${formatDate(res.activity.LastOnline, "R")})`
                }
            )
        }
        if (res.user.bio) fields.push({ name: `Bio`, value: res.user.bio.slice(0, 1024) });
        if (res.groups.length){
            for (const g of res.groups.sort((a, b) => b.primary - a.primary).slice(0, 4)) {
                fields.push({
                    name: `${g.primary ? "[Primary] " : ""}${g.name}`,
                    value: `${emoji}ID: ${g.id}\n${emoji}Rank: ${g.rank}\n${emoji}Role: ${g.role}\n${emoji}Link: [URL](${g.url})`,
                    inline: g.primary ? false : true
                })
            }
            if (res.groups.length > 4) warning = true;
        }

        return {
            embeds: [{
                thumbnail: { url: res.user.avatar },
                timestamp: new Date(),
                fields,
                color,
                description: [
                    `${emoji}Username: ${res.user.username}`,
                    `${emoji}ID: ${res.user.id}`,
                    `${emoji}Past Names: ${res.user.lastnames.map(g => `\`${g || "None"}\``).join(", ") || "None"}`,
                    `${emoji}Joined: ${formatDate(res.user.joined.full, "f")} (${formatDate(res.user.joined.full, "R")})`,
                    `${emoji}Counts:`,
                    `${secondEmoji}Groups: ${formatNum(res.groups.length)}`,
                    `${secondEmoji}Friends: ${formatNum(res.user.counts.friends)}`,
                    `${secondEmoji}Followers: ${formatNum(res.user.counts.followers)}`,
                    `${secondEmoji}Following: ${formatNum(res.user.counts.following)}`,
                ].join("\n"),
                author: { name: `Roblox Info for ${user ? `${user.tag} (${user.id})` : `ID: ${res.user.id}`}`,  icon_url: user?.displayAvatarURL?.({dynamic: true}) ?? `https://cdn.discordapp.com/emojis/411630434040938509.png`, url: `https://my.elara.services/support` },
                footer: { text: warning ? `This will only show up to 4 groups!` : `` }
            }],
            components: showButtons ? [
                {
                    type: 1,
                    components: [
                        { type: 2, style: 5, label: "Profile", url: res.user.url, emoji: { id: "411630434040938509" } },
                        { type: 2, style: 5, label: "Avatar", url: res.user.avatar, emoji: { id: "719431405989396530" } }
                    ]
                }
            ] : []
        }
    }
};