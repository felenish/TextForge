using System.ComponentModel;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using TextForge.Desktop.Services;

namespace TextForge.Desktop;

public partial class MainWindow : Window
{
    private readonly int _port;
    private bool _forceClose;
    private TaskCompletionSource<bool>? _saveAllTcs;

    // Update state — set by background check, consumed when app signals ready.
    private UpdateInfo? _pendingUpdate;
    private bool _appReady;

    public MainWindow(int port)
    {
        _port = port;
        InitializeComponent();
        Loaded += OnLoaded;
        Closing += OnClosing;
    }

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        ((HwndSource)PresentationSource.FromVisual(this)).AddHook(HwndHook);
    }

    private IntPtr HwndHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == 0x0024) // WM_GETMINMAXINFO
        {
            var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);
            var monitor = MonitorFromWindow(hwnd, 0x2);
            if (monitor != IntPtr.Zero)
            {
                var info = new MONITORINFO { cbSize = Marshal.SizeOf<MONITORINFO>() };
                GetMonitorInfo(monitor, ref info);
                mmi.ptMaxPosition = new WinPoint(
                    Math.Abs(info.rcWork.left - info.rcMonitor.left),
                    Math.Abs(info.rcWork.top - info.rcMonitor.top));
                mmi.ptMaxSize = new WinPoint(
                    info.rcWork.right - info.rcWork.left,
                    info.rcWork.bottom - info.rcWork.top);
            }
            Marshal.StructureToPtr(mmi, lParam, true);
            handled = true;
        }
        return IntPtr.Zero;
    }

    [DllImport("user32")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
    [DllImport("user32")] static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [StructLayout(LayoutKind.Sequential)] struct WinPoint(int x, int y) { public int X = x, Y = y; }
    [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MONITORINFO { public int cbSize; public RECT rcMonitor, rcWork; public uint dwFlags; }
    [StructLayout(LayoutKind.Sequential)] struct MINMAXINFO { public WinPoint ptReserved, ptMaxSize, ptMaxPosition, ptMinTrackSize, ptMaxTrackSize; }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "TextForge Studio", "WebView2");
        var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
        await WebView.EnsureCoreWebView2Async(env);
        WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        WebView.CoreWebView2.Settings.IsNonClientRegionSupportEnabled = true;
        WebView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
        WebView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
#if DEBUG
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
#else
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
#endif
        WebView.CoreWebView2.Navigate($"http://localhost:{_port}");
    }

    private void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        // Fire update check in background; result is held until React signals app-ready.
        _ = CheckForUpdateAsync();
    }

    private async Task CheckForUpdateAsync()
    {
        var info = await UpdateService.CheckAsync();
        if (info is null) return;

        await Dispatcher.InvokeAsync(() =>
        {
            _pendingUpdate = info;
            if (_appReady) PostUpdateAvailable(info);
        });
    }

    private void PostUpdateAvailable(UpdateInfo info)
    {
        var msg = JsonSerializer.Serialize(new { type = "update-available", version = info.Version });
        WebView.CoreWebView2.PostWebMessageAsString(msg);
    }

    private void OnWebMessageReceived(
        object? sender,
        CoreWebView2WebMessageReceivedEventArgs e)
    {
        var raw = e.TryGetWebMessageAsString();

        switch (raw)
        {
            case "save-complete":
                _saveAllTcs?.TrySetResult(true);
                break;

            case "app-ready":
                _appReady = true;
                if (_pendingUpdate is not null)
                    PostUpdateAvailable(_pendingUpdate);
                break;

            case "do-update":
                _ = DoUpdateAsync();
                break;
        }
    }

    private async Task DoUpdateAsync()
    {
        var info = _pendingUpdate;
        if (info is null) return;

        // 1. Save all open scenes.
        var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        _saveAllTcs = tcs;
        WebView.CoreWebView2.PostWebMessageAsString("save-all");
        await Task.WhenAny(tcs.Task, Task.Delay(TimeSpan.FromSeconds(15)));
        _saveAllTcs = null;

        // 2. Download the installer.
        string installerPath;
        try
        {
            installerPath = await UpdateService.DownloadAsync(info);
        }
        catch
        {
            // Download failed — notify React so the banner can reset.
            WebView.CoreWebView2.PostWebMessageAsString(
                JsonSerializer.Serialize(new { type = "update-error" }));
            return;
        }

        // 3. Launch the installer then close.
        UpdateService.LaunchInstaller(installerPath);
        DoClose();
    }

    private async void OnClosing(object? sender, CancelEventArgs e)
    {
        if (_forceClose)
            return;

        e.Cancel = true;

        string[] dirty;
        try
        {
            using var client = new HttpClient();
            var response = await client.GetAsync($"http://localhost:{_port}/api/workspace/dirty");
            if (!response.IsSuccessStatusCode) { DoClose(); return; }
            var json = await response.Content.ReadAsStringAsync();
            dirty = JsonSerializer.Deserialize<string[]>(json) ?? [];
        }
        catch
        {
            DoClose(); return;
        }

        if (dirty.Length == 0) { DoClose(); return; }

        var dialog = new ExitConfirmDialog(dirty.Length) { Owner = this };
        dialog.ShowDialog();

        switch (dialog.Result)
        {
            case ExitConfirmResult.Cancel:
                return;

            case ExitConfirmResult.Discard:
                DoClose(); return;

            case ExitConfirmResult.SaveAll:
                var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                _saveAllTcs = tcs;
                WebView.CoreWebView2.PostWebMessageAsString("save-all");
                await Task.WhenAny(tcs.Task, Task.Delay(TimeSpan.FromSeconds(15)));
                _saveAllTcs = null;
                DoClose(); return;
        }
    }

    private void DoClose()
    {
        _forceClose = true;
        Close();
    }
}
