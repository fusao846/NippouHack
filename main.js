const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { Menu } = require('electron');
const fs = require('fs');
const Store = require('electron-store').default;
const os = require('os');
const path = require("path");
const SETTINGS_KEY = 'settings';

Menu.setApplicationMenu(null); // メニューバーを消す

let mainWin;
let hiddenWin;

let settings = {};
let LOGIN_ID = '';
let LOGIN_PW = '';
let LOGIN_URL = '';
let DEV_TOOL = false;
let BROWSER_OPEN = false;
let BROWSER_DEV_TOOL = false;
const WIDTH = 1200;
const HEIGHT = 700;


const settingsPath = path.join(
  app.getPath("userData"),
  "settings.json"
);
const getSettings = () => {

  console.log("settingsPath", settingsPath);
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  console.log("settings", settings);
  LOGIN_ID = settings.login_id;
  LOGIN_PW = settings.password;
  LOGIN_URL = settings.url;
  DEV_TOOL = settings.dev_tool;
  BROWSER_OPEN = settings.browser_open;
  BROWSER_DEV_TOOL = settings.browser_dev_tool;
  console.log("LOGIN_ID", LOGIN_ID);
  console.log("LOGIN_PW", LOGIN_PW);
  console.log("LOGIN_URL", LOGIN_URL);
}

getSettings();

const store = new Store({
  projectName: 'NippouHack'
});


ipcMain.handle('store-get', (_, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (_, key, value) => {
  store.set(key, value);
});


function getLocalIPv4() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4かつ内部ループバックでないもの
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function checkNetworkType(ip) {
  if (!ip) return 'unknown';

  if (ip.startsWith('172.')) {
    return '社内LAN';
  }

  if (ip.startsWith('192.168.')) {
    return '社外';
  }

  return 'その他';
}


function createWindow() {
  mainWin = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: __dirname + '/preload.js'
    }
  });
  mainWin.on("close", (e) => {
    app.quit();
  });

  mainWin.loadFile('index.html');
  //開発者ツール
  if (DEV_TOOL) {
    mainWin.webContents.openDevTools();
  }

  // true:ブラウザ表示
  hiddenWin = new BrowserWindow(
    {
      show: BROWSER_OPEN,
      width: 400,
      height: HEIGHT / 2,
      frame: false,
      alwaysOnTop: true,
      focusable: false,
      webPreferences: {
        backgroundThrottling: false,
      }
    });

  // 起動時処理
  init();
}

app.whenReady().then(createWindow);

// ✅ 起動時一括処理
async function init() {
  try {
    console.log("★開始");
    getSettings();
    const ip = getLocalIPv4();
    console.log('IP:', ip);
    const networkResult = checkNetworkType(ip);
    console.log('Network:', networkResult);
    if (networkResult !== '社内LAN') {
      await sleep(2000);
      mainWin.webContents.send('init-dates',
        {
          status: 'ERROR_NETWORK',
          message: '社内LANに接続していません\n社内LANに接続してから再度起動してください'
        },
        settings, null, null);
      return;
    }
    console.log("★ログイン情報確認");
    console.log("LOGIN_ID", LOGIN_ID);
    console.log("LOGIN_PW", LOGIN_PW);
    console.log("settings", settings);
    if (!LOGIN_ID || !LOGIN_PW) {
      await sleep(2000);
      mainWin.webContents.send('init-dates',
        {
          status: 'ERROR_LOGIN',
          message: `ログイン情報が設定されていません\n${settingsPath}を確認してください`
        },
        settings, null, null);
      return;
    }
    hiddenWin.setIgnoreMouseEvents(true);
    // ①ログイン
    await hiddenWin.loadURL(LOGIN_URL);
    // 隠しブラウザの開発者ツール表示
    if (BROWSER_DEV_TOOL) {
      hiddenWin.webContents.openDevTools({ mode: 'detach' });
    }
    hiddenWin.webContents.on('did-finish-load', async () => {
      hiddenWin.webContents.setZoomFactor(0.7);
    });
    const syncWindowPosition = () => {
      if (!mainWin || !hiddenWin) return;

      const [mainX, mainY] = mainWin.getPosition();
      const [mainW, mainH] = mainWin.getSize();
      hiddenWin.setPosition(mainX + mainW - 3, mainY);
      hiddenWin.setBounds(200, mainH);
    };
    mainWin.once('ready-to-show', syncWindowPosition);
    hiddenWin.once('ready-to-show', syncWindowPosition);
    mainWin.on('move', syncWindowPosition);
    mainWin.on('resize', syncWindowPosition);
    mainWin.on('close', () => {
      hiddenWin.close();
    });
    await hiddenWin.webContents.executeJavaScript(`
      document.querySelector('input[name="loginid"]').value = "${LOGIN_ID}";
      document.querySelector('input[name="loginpw"]').value = "${LOGIN_PW}";
      document.querySelector('form').submit();
    `);

    await sleep(2000);

    console.log("★ログイン完了");

    // ②メニュー待ち＆クリック
    await hiddenWin.webContents.executeJavaScript(`
      let loginOK = false;
      let waitCount = 0;
      new Promise(resolve => {
        const timer = setInterval(() => {
          const el = Array.from(document.querySelectorAll('.topmenusel'))
            .find(e => e.innerText.includes('作業時間入力'));
          if (el) {
            loginOK = true;
            el.click();
            clearInterval(timer);
            resolve();
          }
          waitCount++;
          if (waitCount > 10) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
      console.log('LOGIN OK:', loginOK);
    `);
    const bodyText = await hiddenWin.webContents.executeJavaScript('document.body.innerText');
    const loginOK = bodyText.includes('作業時間入力');
    console.log("★メニュー遷移完了:", loginOK);
    if (!loginOK) {
      await sleep(2000);
      mainWin.webContents.send('init-dates',
        {
          status: 'ERROR_LOGIN',
          message: `ログインに失敗しました\n設定ファイルを確認してください`
        },
        settings, null, null);
      return;
    }

    console.log("★メニュー遷移完了");

    await sleep(2000);


    // ③④ 未入力日取得
    const dates = await hiddenWin.webContents.executeJavaScript(`
      (() => {
        const result = [];

        document.querySelectorAll('td').forEach(td => {
          const wktime = td.querySelector('.wktime');
          if (!wktime) return;

          if (wktime.innerText.includes('未入力')) {
            const dateEl = td.querySelector('.fs8');
            if (dateEl) {
              result.push(dateEl.innerText.trim());
            }
          }
        });

        return result;
      })();
    `);

    console.log("★取得:", dates);
    const fs = require('fs');
    const path = require('path');
    const dirPath = path.join(__dirname, 'project_list.json');
    const projectListData = JSON.parse(fs.readFileSync(dirPath, 'utf-8'));
    console.log("★projectData取得:", projectListData.length);

    // ✅ rendererへ送る
    mainWin.webContents.send('init-dates', { status: 'OK' }, settings, dates, projectListData);

  } catch (e) {
    console.error("★エラー:", e);
  }
}

// util
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

ipcMain.handle('submitWork', async (event, param) => {
  console.log('★submitWork tasks', param);
  if (param.action === 'close') {
    app.quit();
    return;
  }
  if (param.action === 'editSettings') {
    const child = spawn('notepad.exe', [settingsPath]);
    await new Promise((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });
    return;
  }
  if (param.action === 'init') {
    await init();
    return;
  }

  console.log('★submitWork date', param.date);

  try {
    console.log(`★${param.projectCode}`);
    const jsScript = `
      document.f1.drDate.value = "${param.date}";
      document.f1.projectcd.value = "${param.projectCode}";
      if (typeof selProcess === 'function') {
        selProcess();
      }
      document.f1.processcd.value = "${param.processCode}";
      document.f1.jijikan.value = "${param.hour}";
      document.f1.mode.value = "inputwktime";
      /* SUBMIT */
      document.f1.submit();
    `;
    console.log('★SCRIPT', jsScript);
    await hiddenWin.webContents.executeJavaScript(jsScript);
    console.log('★SCRIPT DONE');
  } catch (e) {
    console.log('★catch error', e);
  }
  // SUBMITコメント時はここもコメント
  await waitForLoad();
  return;
});

function waitForLoad() {
  return new Promise(resolve => {
    const wc = hiddenWin.webContents;

    const handler = () => {
      wc.removeListener('did-finish-load', handler);
      resolve();
    };

    wc.on('did-finish-load', handler);
  });
}