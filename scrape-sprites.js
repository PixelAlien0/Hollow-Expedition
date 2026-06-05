const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status ${res.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', reject);
    });
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')           // Replace spaces with _
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '_');        // Replace multiple - or _ with single _
}

async function main() {
    console.log("=========================================");
    console.log("🏮 SMMO-DB Item Sprite Downloader 🏮");
    console.log("=========================================");
    console.log("This script scrapes item names and sprites from smmo-db.com");
    console.log("without requiring any login cookies.");
    console.log("");

    const startIdStr = await question("1. Start Item ID (e.g. 180700): ") || "180700";
    const endIdStr = await question("2. End Item ID (e.g. 180800): ") || "180800";
    const delayStr = await question("3. Delay between downloads in ms (default 1000): ") || "1000";
    const outputDirName = await question("4. Output directory path (default: ./public/sprites): ") || "./public/sprites";

    const startId = parseInt(startIdStr, 10);
    const endId = parseInt(endIdStr, 10);
    const delay = parseInt(delayStr, 10);
    const outputDir = path.resolve(process.cwd(), outputDirName);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n[Info] Output target: ${outputDir}`);
    console.log(`[Info] Range: IDs ${startId} to ${endId}`);
    console.log(`[Info] Throttle: ${delay}ms delay between requests`);
    console.log("-----------------------------------------");

    for (let id = startId; id <= endId; id++) {
        const itemPageUrl = `https://smmo-db.com/items/show/${id}`;
        console.log(`[${id}/${endId}] Fetching page: ${itemPageUrl}`);

        try {
            const html = await fetchHtml(itemPageUrl);

            // Extract item name
            const nameMatch = html.match(/<h3 class="text-xl text-neutral-200 font-bold">([^<]+)<\/h3>/);
            if (!nameMatch) {
                console.log(`   Skipping ID ${id}: Item not found or has different page structure.`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            const itemName = nameMatch[1].trim();
            const slug = slugify(itemName);

            // Extract image URL (supports png, gif, webp, etc.)
            const imgMatch = html.match(/src="(https:\/\/web\.simple-mmo\.com\/img\/[^"]+\.(png|gif|jpg|jpeg|webp))"/i);
            if (!imgMatch) {
                console.log(`   Skipping ID ${id}: Image URL not found.`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const imgUrl = imgMatch[1];
            const extMatch = imgUrl.match(/\.(png|gif|jpg|jpeg|webp)$/i);
            const ext = extMatch ? extMatch[0].toLowerCase() : '.png';
            const filename = `${slug}_${id}${ext}`;
            const filepath = path.join(outputDir, filename);

            console.log(`   Found: "${itemName}" -> Downloading: ${imgUrl}`);
            await downloadFile(imgUrl, filepath);
            console.log(`   Saved as ${filename}`);
        } catch (err) {
            console.error(`   Error fetching ID ${id}: ${err.message}`);
        }

        // Delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log("\nDownload complete!");
    rl.close();
}

main().catch(err => {
    console.error("Fatal Error:", err);
    rl.close();
});
