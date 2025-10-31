const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const path = require('path');
const AdmZip = require('adm-zip'); // npm install adm-zip
const { Client, RichPresence } = require('discord.js-selfbot-v13');

const client = new Client();
const config = require('./config.js');

// ----------------- Auto Updater Configuration -----------------
const localVersion = "0.6.9"; // <--- your current version
const versionURL = "https://raw.githubusercontent.com/3nd3r0/Version-Dock/refs/heads/main/version.json";
const repoZipURL = "https://github.com/3nd3r0/ender-rpc/archive/refs/heads/main.zip";
// ---------------------------------------------------------------

// --- Loop protection ---
const updateFlagPath = path.join(__dirname, 'updating.flag');
if (fs.existsSync(updateFlagPath)) {
    console.log("[Updater] Update failed previously, skipping restart loop.");
    fs.unlinkSync(updateFlagPath); // reset flag to allow next time
}

// Helper functions
function isNewer(remote, local) {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        if ((r[i] || 0) > (l[i] || 0)) return true;
        if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
}

function downloadFile(url, dest, cb) {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
        if (response.statusCode !== 200) {
            cb(new Error(`HTTP ${response.statusCode}`));
            return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(cb));
    }).on('error', err => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        cb(err);
    });
}

function extractAndReplace(zipPath, extractTo, cb) {
    try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractTo, true);
        cb();
    } catch (err) {
        cb(err);
    }
}

// --- Send DM to user after update ---
async function sendUpdateDM(status, version, error = null) {
    try {
        if (!client.user) {
            await client.login(config.token);
            await new Promise(resolve => setTimeout(resolve, 2000)); // wait for login
        }
        const user = await client.users.fetch(client.user.id);

        let message = "";
        if (status === "success") {
            message = `✅ **Ender RPC** has updated successfully to version **${version}**!`;
        } else if (status === "failed") {
            message = `⚠️ **Ender RPC update failed.**\nError: \`${error}\``;
        }

        await user.send(message);
        console.log("[Updater] Sent update notification to your DM.");
    } catch (err) {
        console.error("[Updater] Could not send DM notification:", err);
    }
}

// --- Auto-update function ---
function checkForUpdate(callback) {
    console.log("[Updater] Checking for updates...");

    https.get(versionURL, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const remoteVersion = JSON.parse(data).version.trim();
                console.log(`[Updater] Local version: ${localVersion}`);
                console.log(`[Updater] Remote version: ${remoteVersion}`);

                if (isNewer(remoteVersion, localVersion)) {
                    console.log("[Updater] New version found! Updating...");
                    const zipPath = path.join(__dirname, 'update.zip');
                    fs.writeFileSync(updateFlagPath, "1"); // mark update in progress

                    downloadFile(repoZipURL, zipPath, err => {
                        if (err) {
                            console.error("[Updater] Download error:", err);
                            sendUpdateDM("failed", remoteVersion, err.message);
                            fs.unlinkSync(updateFlagPath);
                            return callback();
                        }

                        extractAndReplace(zipPath, __dirname, err => {
                            fs.unlinkSync(zipPath);
                            if (err) {
                                console.error("[Updater] Extraction error:", err);
                                sendUpdateDM("failed", remoteVersion, err.message);
                                fs.unlinkSync(updateFlagPath);
                                return callback();
                            }

                            console.log("[Updater] Update complete. Restarting...");
                            sendUpdateDM("success", remoteVersion);
                            exec(`node "${__filename}"`, () => {
                                fs.unlinkSync(updateFlagPath);
                                process.exit();
                            });
                        });
                    });
                } else {
                    console.log("[Updater] Already up to date.");
                    callback();
                }
            } catch (err) {
                console.error("[Updater] Error parsing version info:", err);
                callback();
            }
        });
    }).on('error', err => {
        console.error("[Updater] Could not check updates:", err);
        callback();
    });
}

// --- Your RPC Configuration ---
var token = config.token;
var appID = config.appID || "1408784222159638628";
var type = config.type || "LISTENING";
var name = config.name || "🌺 falling in love with ender <3";
var details = config.details || "✨ let's vibe together";
var state = config.state || "🎶 currently lost in the melody";
var largeKey = config.largeKey || "https://i.imgur.com/4d69TbE.gif";
var smallKey = config.smallKey || "https://cdn.discordapp.com/attachments/1259241305276420147/1432600786554322964/IMG_20251028_062357.jpg";
var button1 = config.button1 || "🌺 | ender";
var button2 = config.button2 || "👾 | github";
var url1 = config.url1 || "https://discord.gg/Um3VSrVedt";
var url2 = config.url2 || "https://github.com/3nd3r0";
var startTime = config.startTime || "";

const blacklistURL = "https://raw.githubusercontent.com/3nd3r0/Blacklist-Dock/refs/heads/main/blacklist.json";

// --- Flexible start time system ---
function getStartTimestamp(timeString) {
    if (!timeString) return Date.now();
    try {
        const parts = timeString.split(":").map(Number);
        const hours = parts[0] || 0;
        const minutes = parts[1] || 0;
        const now = new Date();
        if (hours > 23 || minutes > 59) {
            const offsetHours = Math.min(hours, 99);
            return Date.now() - offsetHours * 3600000;
        }
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (start > now) start.setDate(start.getDate() - 1);
        return start.getTime();
    } catch {
        return Date.now();
    }
}
const startTimestamp = getStartTimestamp(startTime);

// --- Launch RPC after update check ---
checkForUpdate(() => {
    client.on('ready', () => {
        console.log("=====================================");
        console.log("       🌸 Ender’s RPC Active 🌸");
        console.log("=====================================");

        https.get(blacklistURL, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const blacklist = JSON.parse(data);
                    if (blacklist.includes(client.user.id)) {
                        console.log("You're blacklisted and cannot use this code.");
                        process.exit();
                    } else {
                        console.log(`RPC launched successfully for ${client.user.username}`);
                        console.log(`Start time: ${startTime || "Now"}`);
                        console.log(`Current version: ${localVersion}`);

                        RichPresence.getExternal(client, appID, largeKey).then(getExtendURL => {
                            const status = new RichPresence(client)
                                .setApplicationId(appID)
                                .setType(type)
                                .setName(name)
                                .setDetails(details)
                                .setState(state)
                                .setAssetsLargeImage(getExtendURL[0].external_asset_path)
                                .setAssetsSmallImage(smallKey)
                                .setStartTimestamp(startTimestamp)
                                .addButton(button1, url1)
                                .addButton(button2, url2);

                            client.user.setPresence({ activities: [status] });
                        }).catch(console.error);
                    }
                } catch (err) {
                    console.error("Error loading the blacklist:", err);
                    process.exit();
                }
            });
        }).on('error', err => {
            console.error("Unable to retrieve the blacklist:", err);
            process.exit();
        });
    });

    client.login(token);
});