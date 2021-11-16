const [ { get }, moment, links ] = [ require("superagent"), require("moment"), { AVATAR_API: "https://my.elara.services/api/avatars/r", DEFAULT_AVATAR: `https://cdn.superchiefyt.xyz/api/bot/i_n_a.png` } ]

module.exports = class RobloxAPI {
    /**
     * @param {object} [options] 
     * @param {string} [options.cookie]
     * @param {object} [options.apis]
     * @param {boolean} [options.apis.rover]
     * @param {boolean} [options.apis.bloxlink]
     */
    constructor(options) {
        this.rover = Boolean(options?.apis?.rover ?? true);
        this.bloxlink = Boolean(options?.apis?.bloxlink ?? true);
        this.options = options;
        if(!this.bloxlink && !this.rover) throw new Error(`[ROBLOX:API:ERROR]: You can't disable both RoVer or Bloxlink APIs... how else will you fetch the information?`);
    };
    /** @private */
    get cookie() { return this.options?.cookie ?? ""; };
    get fetch() { return this.get; };

    
    async get(user) {
        if(typeof user === "string" && user.match(/<@!?/gi)) {
            let r = await this.fetchRoVer(user.replace(/<@!?|>/gi, ""));
            if(!r || r.status !== true) return this.status(r?.message ?? "I was unable to fetch the Roblox information for that user.");
            return r;
        } else {
            let search = await (isNaN(parseInt(user)) ? this.fetchByUsername(user) : this.fetchRoblox(parseInt(user)));
            if(!search || search.status !== true) return this.status(search?.message ?? "I was unable to fetch the Roblox information for that user.");
            return search;
        };
    };

    /**
     * @private
     * @param {string} name 
     * @returns {Promise<object|null>}
     */
    async fetchByUsername(name){
        let res = await get(`https://api.roblox.com/users/get-by-username?username=${name}`).catch(() => null);
        if(!res) return null;
        if(res.status !== 200) return null;
        return await this.fetchRoblox(res.body.Id);
    };
    /**
     * @private
     * @param {string} [url]
     * @returns {Promise<object|void>}
     */
    async privateFetch(url = "") {
        let res = await get(url)
        .set("Cookie", this.cookie.replace(/%TIME_REPLACE%/gi, new Date().toLocaleString()))
        .catch(() => ({ status: 500 }));
        if(res.status !== 200) return null;
        return res.body ?? null;
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
            let res = await get(url).catch(() => null);
            if(!res || res.status !== 200 || !res.body) return null;
            if(res.body.status !== "ok") return null;
            return res.body;
        }catch{
            return null;
        }
    };
    /**
     * @private
     * @param {string} id 
     * @returns {Promise<object|null>}
     */
    async fetchRoVer(id){
        if(!this.rover) return this.fetchBloxLink(id);
        let r = await this.privateGet(`https://verify.eryn.io/api/user/${id}`);
        if(!r) return await this.fetchBloxLink(id);
        return await this.fetchRoblox(r.robloxId);
    };

    /**
     * @private
     * @param {string} id 
     * @returns {Promise<object|null>}
     */
    async fetchBloxLink(id) {
        if(!this.bloxlink) return null;
        let r = await this.privateGet(`https://api.blox.link/v1/user/${id}`);
        if(!r) return this.status(`I was unable to find an account with that userID!`);
        if(typeof r.primaryAccount !== "string") return this.status(`I was unable to find an account with that userID!`);
        return await this.fetchRoblox(r.primaryAccount)
    };
    /**
     * @private
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
                "", "", "", "Offline", 0, 0, 0, [] , 
                await get(`${links.AVATAR_API}/${userReq.name}`).catch(() => {return {status: 404}}),
                links.DEFAULT_AVATAR
            ]
            if(!avatar || avatar.status !== 200) avatar = defAvatar;
            if(avatar?.body?.status !== true) avatar = defAvatar;
            if(avatar?.body?.status === true) avatar = avatar?.body?.avatar;
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
        let r = await this.get(user);
        if(!r || r.status !== true) return Promise.resolve(false);
        return Promise.resolve(true);
    };
};