using System.ComponentModel;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;

namespace TextForge.Desktop;

public partial class MainWindow : Window
{
    private readonly int _port;
    private bool _forceClose;
    private TaskCompletionSource<bool>? _saveAllTcs;

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
            var monitor = MonitorFromWindow(hwnd, 0x2); // MONITOR_DEFAULTTONEAREST
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
#if DEBUG
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
#else
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
#endif
        WebView.CoreWebView2.Navigate($"http://localhost:{_port}");
    }

    private void OnWebMessageReceived(object? sender, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (e.TryGetWebMessageAsString() == "save-complete")
            _saveAllTcs?.TrySetResult(true);
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
