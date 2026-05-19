using System.ComponentModel;
using System.Net.Http;
using System.Text.Json;
using System.Windows;

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

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();
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
