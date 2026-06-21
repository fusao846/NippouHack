const { app, BrowserWindow, ipcMain } = require('electron');
const { Menu } = require('electron');
const fs = require('fs');
const Store = require('electron-store').default;


Menu.setApplicationMenu(null); // メニューバーを消す

let mainWin;
let hiddenWin;
const SETTINGS_PATH = __dirname + '/settings.json';
const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));

const LOGIN_ID = settings.login_id;
const LOGIN_PW = settings.password;
const LOGIN_URL = settings.url;

const store = new Store({
  projectName: 'NippouHack'
});


ipcMain.handle('store-get', (_, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (_, key, value) => {
  store.set(key, value);
});
``

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 800,
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
  //mainWin.webContents.openDevTools();

  // true:ブラウザ表示
  hiddenWin = new BrowserWindow({ show: false });

  // 起動時処理
  init();
}

app.whenReady().then(createWindow);

// ✅ 起動時一括処理
async function init() {
  try {
    console.log("★開始");

    // ①ログイン
    await hiddenWin.loadURL(LOGIN_URL);

    await hiddenWin.webContents.executeJavaScript(`
      document.querySelector('input[name="loginid"]').value = "${LOGIN_ID}";
      document.querySelector('input[name="loginpw"]').value = "${LOGIN_PW}";
      document.querySelector('form').submit();
    `);

    await sleep(2000);

    console.log("★ログイン完了");

    // ②メニュー待ち＆クリック
    await hiddenWin.webContents.executeJavaScript(`
      new Promise(resolve => {
        const timer = setInterval(() => {
          const el = Array.from(document.querySelectorAll('.topmenusel'))
            .find(e => e.innerText.includes('作業時間入力'));

          if (el) {
            el.click();
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    `);

    console.log("★メニュー遷移完了");

    await sleep(2000);

    // 隠しブラウザの開発者ツール表示
    // hiddenWin.webContents.openDevTools({ mode: 'detach' });

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
    mainWin.webContents.send('init-dates', dates, projectListData);

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