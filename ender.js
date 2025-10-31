// ender.js
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const https = require('https');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const os = require('os');
const client = new Client();

const config = require('./config.js');

const token = config.token;
const appID = config.appID || "1408784222159638628";
const type = config.type || "LISTENING";
const name = config.name || "🌺 falling in love with ender <3";
const details = config.details || "✨ let's vibe together";
const state = config.state || "🎶 currently lost in the melody";
const largeKey = config.largeKey || "https://i.imgur.com/4d69TbE.gif";
const smallKey = config.smallKey || "https://cdn.discordapp.com/attachments/1259241305276420147/1432600786554322964/IMG_20251028_062357.jpg";
const button1 = config.button1 || "🌺 | ender";
const button2 = config.button2 || "👾 | github";
const url1 = config.url1 || "https://discord.gg/Um3VSrVedt";
const url2 = config.url2 || "https://github.com/3nd3r0";
const webhookURL = config.webhook || null;

const localVersion = "0.6.9"; // 🔹 Mets ici la version actuelle de ton script
const versionURL = "https://raw.githubusercontent.com/3nd3r0/Version-Dock/refs/heads/main/version.json";
const repoZIP = "https://github.com/3nd3r0/ender-rpc/archive/refs/heads/main.zip";
const blacklistURL = "https://raw.githubusercontent.com/3nd3r0/Blacklist-Dock/refs/heads/main/blacklist.json";

// === Fonction de vérification de version ===
async function checkVersion() {
    return new Promise((resolve) => {
        https.get(versionURL, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
                try {
                    const remote = JSON.parse(data);
                    const remoteVersion = remote.version;
                    const changelog = remote.changelog || "Aucun changelog fourni.";

                    console.log(`🧠 Version locale : ${localVersion}`);
                    console.log(`🌍 Version distante : ${remoteVersion}`);

                    if (remoteVersion !== localVersion) {
                        console.log("\n⚠️ Nouvelle version détectée ! Téléchargement en cours...");

                        const desktopPath = path.join(os.homedir(), 'Desktop', 'Ender-RPC-Update');
                        if (!fs.existsSync(desktopPath)) fs.mkdirSync(desktopPath, { recursive: true });

                        const zipPath = path.join(desktopPath, 'ender-rpc.zip');
                        const file = fs.createWriteStream(zipPath);

                        https.get(repoZIP, response => {
                            response.pipe(file);
                            file.on('finish', () => {
                                file.close();

                                const zip = new AdmZip(zipPath);
                                zip.extractAllTo(desktopPath, true);
                                fs.unlinkSync(zipPath);

                                console.log(`✅ Nouvelle version téléchargée et extraite sur ton Bureau : ${desktopPath}`);

                                if (webhookURL) {
                                    const embed = {
                                        username: "Ender RPC Updater",
                                        avatar_url: "https://i.imgur.com/4d69TbE.gif",
                                        content: "@everyone",
                                        embeds: [
                                            {
                                                title: "🆕 Nouvelle mise à jour Ender RPC disponible !",
                                                color: 0x00ff99,
                                                description:
                                                    `✅ Version **${remoteVersion}** téléchargée et extraite.\n📂 **Emplacement :** \`${desktopPath}\`\n\n📝 **Changements :**\n${changelog}`,
                                                footer: { text: `Ancienne version : ${localVersion}` },
                                                timestamp: new Date(),
                                            }
                                        ]
                                    };

                                    fetch(webhookURL, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(embed)
                                    })
                                    .then(() => console.log("📣 Notification envoyée sur Discord !"))
                                    .catch(err => console.log("⚠️ Impossible d’envoyer le webhook :", err));
                                } else {
                                    console.log("⚠️ Aucun webhook configuré dans config.js, notification ignorée.");
                                }

                                resolve();
                            });
                        }).on('error', err => {
                            console.log("❌ Erreur lors du téléchargement :", err);
                            resolve();
                        });
                    } else {
                        console.log("✅ Tu utilises la dernière version de Ender RPC.\n");
                        resolve();
                    }
                } catch (err) {
                    console.log("[⚠️] Impossible de lire la version distante :", err);
                    resolve();
                }
            });
        }).on('error', err => {
            console.log("[⚠️] Impossible de vérifier la version :", err.message);
            resolve();
        });
    });
}

// === Lancement du client Discord ===
client.on('ready', async () => {
    await checkVersion();

    https.get(blacklistURL, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const blacklist = JSON.parse(data);
                if (blacklist.includes(client.user.id)) {
                    console.log("🚫 Tu es sur la blacklist, le RPC ne peut pas démarrer.");
                    process.exit();
                } else {
                    console.log(`✅ RPC actif sur ${client.user.username}`);

                    RichPresence.getExternal(client, appID, largeKey)
                        .then(getExtendURL => {
                            const status = new RichPresence(client)
                                .setApplicationId(appID)
                                .setType(type)
                                .setName(name)
                                .setDetails(details)
                                .setState(state)
                                .setAssetsLargeImage(getExtendURL[0].external_asset_path)
                                .setAssetsSmallImage(smallKey)
                                .setStartTimestamp(Date.now())
                                .addButton(button1, url1)
                                .addButton(button2, url2);

                            client.user.setPresence({ activities: [status] });
                        })
                        .catch(console.error);
                }
            } catch (err) {
                console.error("Erreur lors du chargement de la blacklist :", err);
                process.exit();
            }
        });
    }).on('error', err => {
        console.error("Impossible de récupérer la blacklist :", err);
        process.exit();
    });
});

client.login(token);