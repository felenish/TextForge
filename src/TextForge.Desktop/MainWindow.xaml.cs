using System.ComponentModel;
using System.Net.Http;
using System.Text.Json;
using System.Windows;

namespace TextForge.Desktop;

public partial class MainWindow : Window
{
    private readonly int _port;
    private bool _forceClose;

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
#if DEBUG
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        WebView.CoreWebView2.Navigate("http://localhost:5173");
#else
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
        WebView.CoreWebView2.Navigate($"http://localhost:{_port}");
#endif
    }

    private async void OnClosing(object? sender, CancelEventArgs e)
    {
        if (_forceClose)
            return;

        e.Cancel = true;

        try
        {
            using var client = new HttpClient();
            var response = await client.GetAsync($"http://localhost:{_port}/api/workspace/dirty");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var dirty = JsonSerializer.Deserialize<string[]>(json) ?? [];
                if (dirty.Length > 0)
                {
                    var result = MessageBox.Show(
                        "You have unsaved changes. Save before closing?",
                        "TextForge Studio",
                        MessageBoxButton.YesNoCancel,
                        MessageBoxImage.Warning);
                    if (result == MessageBoxResult.Cancel)
                        return;
                }
            }
        }
        catch
        {
            // If the dirty-check fails, allow close
        }

        _forceClose = true;
        Close();
    }
}
