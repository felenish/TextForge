; TextForge Studio — Inno Setup script
; Build: iscc /DAppVersion=0.1.1 installer\TextForge.iss

#ifndef AppVersion
  #define AppVersion "0.1.1"
#endif

#define AppName      "TextForge Studio"
#define AppPublisher "TextForge"
#define AppExeName   "TextForge.Desktop.exe"
#define PublishDir   "..\publish\win-x64"

[Setup]
AppId={{A7F3C2D1-9B4E-4F8A-BC12-3D5E7A091234}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://github.com/felenish/TextForge
AppSupportURL=https://github.com/felenish/TextForge/issues
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=output
OutputBaseFilename=TextForge-Studio-{#AppVersion}-win-x64-Setup
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DisableProgramGroupPage=yes
CloseApplications=yes
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} {#AppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}";           Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#AppName}";     Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; \
  Description: "Launch {#AppName}"; \
  Flags: nowait postinstall

[Code]
// WebView2 is pre-installed on Win 10/11 via Windows Update in 2026.
// This check shows a helpful message on the rare machine where it is missing.
function IsWebView2Installed(): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(
    HKLM,
    'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv', Version
  ) and (Version <> '0.0.0.0') and (Version <> '');
  if not Result then
    Result := RegQueryStringValue(
      HKCU,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', Version
    ) and (Version <> '0.0.0.0') and (Version <> '');
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if not IsWebView2Installed() then
      MsgBox(
        'TextForge Studio requires the Microsoft WebView2 Runtime.' + #13#10 +
        'Please visit https://developer.microsoft.com/en-us/microsoft-edge/webview2/ ' +
        'and install the Evergreen Standalone runtime, then launch TextForge Studio.',
        mbInformation, MB_OK
      );
  end;
end;
