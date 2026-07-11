#define MyAppName "HackNippou"
#define MyAppVersion "1.0.0"
#define MyAppExeName "HackNippou.exe"
#define BuildDir "HackNippou-win32-x64"

[Setup]
AppId={{A6B2E17F-51A0-49E5-8A6D-5D82A3D4D001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}

DefaultDirName={localappdata}\{#MyAppName}
DefaultGroupName={#MyAppName}

PrivilegesRequired=lowest
DisableProgramGroupPage=yes
Compression=lzma2
SolidCompression=yes
OutputBaseFilename=HackNippouSetup
WizardStyle=modern
SetupIconFile=image/HackNippouInstall.ico

[Languages]
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"

[Files]
; Electron本体
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; 初回のみ設定ファイルを配置
Source: "settings_dist.json"; DestDir: "{userappdata}\{#MyAppName}"; DestName: "settings.json"; Flags: onlyifdoesntexist

[Icons]
Name: "{autoprograms}\HackNippou"; \
    Filename: "{app}\HackNippou.exe"; \
    IconFilename: "{app}\HackNippou.exe"

Name: "{autodesktop}\今日もお疲れ様でした"; \
    Filename: "{app}\HackNippou.exe"; \
    IconFilename: "{app}\HackNippou.exe"


[Tasks]
Name: desktopicon; Description: "デスクトップにショートカットを作成"; Flags: unchecked

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "HackNippou を起動"; Flags: nowait postinstall skipifsilent