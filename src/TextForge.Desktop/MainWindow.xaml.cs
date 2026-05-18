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
#else
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
#endif
        WebView.CoreWebView2.Navigate($"http://localhost:{_port}");
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
                        "You have unsaved changes. Exit anyway? Changes will be lost.",
                        "TextForge Studio — Unsaved Changes",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Warning);
                    if (result == MessageBoxResult.No)
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
