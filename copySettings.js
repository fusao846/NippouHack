const fs = require('fs');
const path = require("path");

const settingsPath = path.join(
  "C:\\Users\\16015\\AppData\\Roaming\\HackNippou",
  "settings.json"
);
console.log("settingsPath", settingsPath);
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
console.log("settings", settings);
settings.login_id = "";
settings.password = "";
fs.writeFileSync("settings_dist.json", JSON.stringify(settings, null, 2), 'utf-8');
console.log("settings_dist.json updated");
