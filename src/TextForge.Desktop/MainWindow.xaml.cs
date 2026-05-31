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
    private static readonly string[] _quotes =
    [
        "\"There is nothing to writing. All you do is sit down at a typewriter and bleed.\" — Ernest Hemingway",
        "\"You can always edit a bad page. You can't edit a blank page.\" — Jodi Picoult",
        "\"Start writing, no matter what. The water does not flow until the faucet is turned on.\" — Louis L'Amour",
        "\"A word after a word after a word is power.\" — Margaret Atwood",
        "\"If there's a book that you want to read, but it hasn't been written yet, then you must write it.\" — Toni Morrison",
        "\"The first draft is just you telling yourself the story.\" — Terry Pratchett",
        "\"You have to write the book that wants to be written.\" — Madeleine L'Engle",
        "\"Fill your paper with the breathings of your heart.\" — William Wordsworth",
        "\"A story has no beginning or end; arbitrarily one chooses that moment of experience from which to look back or from which to look ahead.\" — Graham Greene",
        "\"Either write something worth reading or do something worth writing.\" — Benjamin Franklin",
        "\"The scariest moment is always just before you start.\" — Stephen King",
        "\"Writing is an exploration. You start from nothing and learn as you go.\" — E.L. Doctorow",
        "\"One day I will find the right words, and they will be simple.\" — Jack Kerouac",
        "\"Writing is thinking. To write well is to think clearly.\" — David McCullough",
        "\"We write to taste life twice, in the moment and in retrospect.\" — Anaïs Nin",
    ];

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

    private const int ResizeBorder = 6; // must match WindowChrome ResizeBorderThickness

    private IntPtr HwndHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        switch (msg)
        {
            case 0x0024: // WM_GETMINMAXINFO
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
                break;
            }

            case 0x0084: // WM_NCHITTEST — restore resize cursors swallowed by WebView2
            {
                // Skip when maximized; there is nothing to resize.
                if (WindowState == WindowState.Maximized)
                    break;

                GetWindowRect(hwnd, out var rc);
                int x = (short)(lParam.ToInt32() & 0xFFFF);
                int y = (short)((lParam.ToInt32() >> 16) & 0xFFFF);

                bool left   = x < rc.left   + ResizeBorder;
                bool right  = x > rc.right  - ResizeBorder;
                bool top    = y < rc.top    + ResizeBorder;
                bool bottom = y > rc.bottom - ResizeBorder;

                if      (top    && left)  { handled = true; return (IntPtr)13; } // HTTOPLEFT
                else if (top    && right) { handled = true; return (IntPtr)14; } // HTTOPRIGHT
                else if (bottom && left)  { handled = true; return (IntPtr)16; } // HTBOTTOMLEFT
                else if (bottom && right) { handled = true; return (IntPtr)17; } // HTBOTTOMRIGHT
                else if (top)             { handled = true; return (IntPtr)12; } // HTTOP
                else if (bottom)          { handled = true; return (IntPtr)15; } // HTBOTTOM
                else if (left)            { handled = true; return (IntPtr)10; } // HTLEFT
                else if (right)           { handled = true; return (IntPtr)11; } // HTRIGHT
                break;
            }
        }
        return IntPtr.Zero;
    }

    [DllImport("user32")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
    [DllImport("user32")] static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);
    [DllImport("user32")] static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)] struct WinPoint(int x, int y) { public int X = x, Y = y; }
    [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MONITORINFO { public int cbSize; public RECT rcMonitor, rcWork; public uint dwFlags; }
    [StructLayout(LayoutKind.Sequential)] struct MINMAXINFO { public WinPoint ptReserved, ptMaxSize, ptMaxPosition, ptMinTrackSize, ptMaxTrackSize; }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "TextForge", "WebView2");

        if (Directory.Exists(userDataFolder))
        {
            try { Directory.Delete(userDataFolder, true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }

        QuoteText.Text = _quotes[Random.Shared.Next(_quotes.Length)];

        var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
        await WebView.EnsureCoreWebView2Async(env);
        WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        WebView.CoreWebView2.Settings.IsNonClientRegionSupportEnabled = true;
        WebView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
        WebView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
        WebView.CoreWebView2.PermissionRequested += OnPermissionRequested;
#if DEBUG
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
#else
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
#endif
        WebView.CoreWebView2.Navigate($"http://localhost:{_port}");
        _ = CollapseOverlayAfterDelayAsync();
    }

    private async Task CollapseOverlayAfterDelayAsync()
    {
        await Task.Delay(TimeSpan.FromSeconds(3));
        LoadingOverlay.Visibility = Visibility.Collapsed;
        WebView.Visibility = Visibility.Visible;
    }

    private static void OnPermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs e)
    {
        if (e.PermissionKind == CoreWebView2PermissionKind.ClipboardRead)
            e.State = CoreWebView2PermissionState.Allow;
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

            default:
                try
                {
                    using var doc = JsonDocument.Parse(raw);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("type", out var typeProp) &&
                        typeProp.GetString() == "open-url" &&
                        root.TryGetProperty("url", out var urlProp))
                    {
                        var url = urlProp.GetString();
                        if (!string.IsNullOrWhiteSpace(url))
                            System.Diagnostics.Process.Start(
                                new System.Diagnostics.ProcessStartInfo(url) { UseShellExecute = true });
                    }
                }
                catch { /* not JSON or unknown type — ignore */ }
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
